# 功能流程详解 - Market Module

> 行情服务 - K 线订阅、网格管理、赔率计算

---

## 1. K 线数据订阅

### 1.1 Binance WebSocket 连接

**服务**: `BinanceService`

```mermaid
sequenceDiagram
    participant BN as Binance Server
    participant BS as BinanceService
    participant PS as PriceStoreService
    participant EE as EventEmitter

    Note over BS: 服务启动
    BS->>BN: WebSocket Connect (wss://stream.binance.com)
    BS->>BN: Subscribe: ethusdt@kline_1s
    
    loop 每秒推送
        BN->>BS: K 线数据 {k: {o, h, l, c, t, T, x}}
        BS->>PS: updateCurrentPrice(symbol, k.c)
        BS->>EE: emit('market.price.updated', {symbol, price})
        
        alt k.x = true (K线闭合)
            BS->>PS: saveKLine(symbol, klineData)
            BS->>EE: emit('market.kline.closed', {symbol, price, timestamp})
        end
    end
```

### 1.2 断线重连

```mermaid
sequenceDiagram
    participant BS as BinanceService
    participant BN as Binance Server

    BS->>BN: WebSocket 连接
    Note over BN: 网络异常
    BN--xBS: Connection Lost
    BS->>BS: 触发 reconnect 逻辑
    BS->>BS: 等待 5s (指数退避)
    BS->>BN: WebSocket Reconnect
    BS->>BN: Re-subscribe
```

---

## 2. 价格存储

### 2.1 实时价格更新

**服务**: `PriceStoreService`

```mermaid
sequenceDiagram
    participant BS as BinanceService
    participant PS as PriceStoreService
    participant RD as Redis
    participant MEM as Memory Cache

    BS->>PS: updateCurrentPrice(symbol, price)
    PS->>MEM: currentPrices[symbol] = {price, timestamp}
    PS->>RD: SET price:{symbol} {price, timestamp}
```

### 2.2 K 线历史存储

```mermaid
sequenceDiagram
    participant BS as BinanceService
    participant PS as PriceStoreService
    participant RD as Redis

    BS->>PS: saveKLine(symbol, kline)
    PS->>RD: HSET kline:{symbol}:1s {timestamp} {klineData}
    PS->>RD: EXPIRE kline:{symbol}:1s 3600
```

### 2.3 K 线历史查询

**端点**: `GET /api/market/kline`

```mermaid
sequenceDiagram
    participant C as Client
    participant MC as MarketController
    participant PS as PriceStoreService
    participant RD as Redis

    C->>MC: GET /kline?symbol=ETHUSDT&startTime=X&endTime=Y
    MC->>PS: getKLineHistory(symbol, start, end)
    PS->>RD: HGETALL kline:{symbol}:1s
    RD-->>PS: {timestamp1: data1, timestamp2: data2, ...}
    PS->>PS: 过滤 [start, end] 范围
    PS-->>MC: KLineData[]
    MC-->>C: 200 OK
```

---

## 3. 网格管理

### 3.1 网格初始化

**服务**: `BlockManagerService`

```mermaid
sequenceDiagram
    participant SVC as Application Start
    participant BM as BlockManagerService
    participant PS as PriceStoreService
    participant OC as OddsCalculatorService

    SVC->>BM: onModuleInit()
    BM->>PS: getCurrentPrice(symbol)
    PS-->>BM: currentPrice
    
    loop t = now to now+360s
        BM->>BM: 创建 TimeSlice (settlementTime = t)
        loop tick = -20 to +20
            BM->>OC: calculateOdds(price, tick, timeToSettle)
            OC-->>BM: odds
            BM->>BM: 添加 Tick 到 TimeSlice
        end
    end
    BM->>BM: 启动每秒 Tick
```

### 3.2 每秒 Tick (滑动窗口)

```mermaid
sequenceDiagram
    participant Cron as @Cron('* * * * * *')
    participant BM as BlockManagerService
    participant PS as PriceStoreService
    participant OC as OddsCalculatorService

    Cron->>BM: tick()
    BM->>BM: 移除过期 slice (settlementTime < now)
    BM->>BM: 锁定临近 slice (settlementTime - now < 180s)
    
    BM->>PS: getCurrentPrice()
    PS-->>BM: currentPrice
    
    loop 未锁定的 slice
        BM->>OC: calculateOdds(price, tick, timeRemaining)
        OC-->>BM: newOdds
        BM->>BM: 更新 slice.ticks[].odds
    end
    
    BM->>BM: 添加新 slice (settlementTime = now + 360s)
```

### 3.3 获取网格

**端点**: `GET /api/market/grid`

```mermaid
sequenceDiagram
    participant C as Client
    participant MC as MarketController
    participant BM as BlockManagerService
    participant PS as PriceStoreService

    C->>MC: GET /grid?symbol=ETHUSDT
    MC->>BM: getGrid()
    BM-->>MC: TimeSlice[]
    MC->>PS: getCurrentPrice(symbol)
    PS-->>MC: currentPrice
    MC-->>C: 200 {symbol, currentPrice, currentTime, slices[]}
```

**返回结构**:
```json
{
  "symbol": "ETHUSDT",
  "currentPrice": "2500.00",
  "currentTime": 1706600000000,
  "slices": [
    {
      "id": "1706600180000",
      "settlementTime": 1706600180000,
      "basisPrice": "2500.00",
      "locked": false,
      "status": "betting",
      "ticks": [
        {"priceTick": -5, "priceRange": {"lower": "2437.50", "upper": "2450.00"}, "odds": 3.2},
        {"priceTick": 0, "priceRange": {"lower": "2487.50", "upper": "2512.50"}, "odds": 1.8}
      ]
    }
  ]
}
```

---

## 4. 赔率计算

### 4.1 计算逻辑

**服务**: `OddsCalculatorService`

```mermaid
graph TD
    A[输入: basePrice, tickIndex, timeToSettle] --> B[计算价格距离]
    B --> C[priceDistance = abs(tickIndex) * step]
    C --> D[计算时间因子]
    D --> E[timeFactor = 1 + timeDecay * timeToSettle]
    E --> F[计算原始赔率]
    F --> G[rawOdds = baseOdds + distanceBonus * priceDistance * timeFactor]
    G --> H[限制范围]
    H --> I[odds = clamp(rawOdds, minOdds, maxOdds)]
```

**公式**:
```
odds = baseOdds + (distanceBonus × |tickIndex| × step) × timeFactor
timeFactor = 1 + timeDecay × timeToSettle

约束: minOdds (1.1) <= odds <= maxOdds (20.0)
```

### 4.2 赔付计算

```typescript
// 赢
payout = amount × odds

// 输
refund = amount / odds
```
