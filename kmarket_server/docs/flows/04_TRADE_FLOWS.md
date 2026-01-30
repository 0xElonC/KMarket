# 功能流程详解 - Trade Module

> 交易服务 - 下注、持仓、结算、历史

---

## 1. 下注功能

### 1.1 下注接口

**端点**: `POST /api/trade/bet`

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TradeController
    participant BS as BetService
    participant BM as BlockManagerService
    participant US as UsersService
    participant DB as Database

    C->>TC: POST /bet {symbol, amount, priceTick, settlementTime}
    TC->>BS: placeBet(userId, dto)
    
    Note over BS: Step 1: 验证时间片
    BS->>BM: getSlice(settlementTime)
    alt 时间片不存在
        BM-->>BS: null
        BS-->>TC: BadRequest("无效的结算时间")
    end
    alt 时间片已锁定
        BS-->>TC: BadRequest("区块已锁定")
    end
    
    Note over BS: Step 2: 获取赔率
    BS->>BS: tick = slice.ticks.find(t => t.priceTick === dto.priceTick)
    alt Tick 无效
        BS-->>TC: BadRequest("无效的价格区间")
    end
    
    Note over BS: Step 3: 扣款
    BS->>US: deductBalance(userId, amount, {type: BET})
    alt 余额不足
        US-->>BS: BadRequestException
        BS-->>TC: BadRequest("余额不足")
    end
    
    Note over BS: Step 4: 创建订单
    BS->>DB: INSERT bets (userId, symbol, amount, priceTick, tickLower, tickUpper, basePrice, odds, settlementTime, status='active')
    DB-->>BS: savedBet
    
    BS-->>TC: BetResponseDto
    TC-->>C: 200 OK
```

**请求体**:
```json
{
  "symbol": "ETHUSDT",
  "amount": "100.000000000000000000",
  "priceTick": 5,
  "settlementTime": 1706600180000
}
```

**响应体**:
```json
{
  "id": 12345,
  "symbol": "ETHUSDT",
  "amount": "100.000000000000000000",
  "priceTick": 5,
  "priceRange": {"lower": "2525.00", "upper": "2537.50"},
  "basePrice": "2500.00",
  "odds": "2.35",
  "settlementTime": "2026-01-30T12:03:00Z",
  "status": "active",
  "createdAt": "2026-01-30T12:00:00Z"
}
```

---

## 2. 持仓查询

### 2.1 查询当前持仓

**端点**: `GET /api/trade/positions`

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TradeController
    participant BS as BetService
    participant DB as Database

    C->>TC: GET /positions?symbol=ETHUSDT
    TC->>BS: getActiveBets(userId, symbol)
    BS->>DB: SELECT * FROM bets WHERE userId=? AND status='active' ORDER BY settlementTime
    DB-->>BS: Bet[]
    
    loop 每个持仓
        BS->>BS: remainingSeconds = (settlementTime - now) / 1000
    end
    
    BS->>BS: totalInBets = SUM(bet.amount)
    BS-->>TC: {items, totalInBets}
    TC-->>C: 200 OK
```

**响应体**:
```json
{
  "items": [
    {
      "id": 12345,
      "symbol": "ETHUSDT",
      "amount": "100",
      "priceTick": 5,
      "priceRange": {"lower": "2525.00", "upper": "2537.50"},
      "odds": "2.35",
      "settlementTime": "2026-01-30T12:03:00Z",
      "remainingSeconds": 120,
      "status": "active"
    }
  ],
  "totalInBets": "100"
}
```

---

## 3. 结算功能

### 3.1 事件驱动结算

**服务**: `SettlementService`

```mermaid
sequenceDiagram
    participant BN as Binance WebSocket
    participant BS as BinanceService
    participant EE as EventEmitter
    participant SS as SettlementService
    participant BetS as BetService
    participant US as UsersService
    participant DB as Database

    BN->>BS: K 线数据 (k.x=true)
    BS->>EE: emit('market.kline.closed', {symbol, price, timestamp})
    
    EE->>SS: @OnEvent('market.kline.closed')
    SS->>SS: 检查 timestamp 是否已处理
    SS->>BetS: getExpiredBets(new Date(timestamp))
    BetS->>DB: SELECT * FROM bets WHERE status='active' AND settlementTime <= ?
    DB-->>BetS: Bet[]
    
    SS->>SS: 过滤 symbol 匹配的订单
    
    loop 每笔订单
        SS->>SS: isWin = (price >= tickLower && price < tickUpper)
        
        alt 赢
            SS->>SS: payout = amount × odds
            SS->>US: settleWin(userId, payout, betId)
            US->>DB: UPDATE users SET claimable += payout
            US->>DB: INSERT transactions (type=WIN)
            SS->>DB: UPDATE bets SET status='won', payout=?
        else 输
            SS->>SS: refund = amount / odds
            SS->>US: settleLose(userId, refund, betId)
            US->>DB: UPDATE users SET claimable += refund
            US->>DB: INSERT transactions (type=LOSE)
            SS->>DB: UPDATE bets SET status='lost', payout=?
        end
        
        SS->>DB: UPDATE bets SET settlementPrice=?, settledAt=NOW()
    end
```

### 3.2 判定逻辑

```mermaid
graph TD
    A[获取结算价格] --> B{price >= tickLower?}
    B -->|No| C[判定: 输]
    B -->|Yes| D{price < tickUpper?}
    D -->|No| C
    D -->|Yes| E[判定: 赢]
    
    C --> F[refund = amount / odds]
    E --> G[payout = amount × odds]
    
    F --> H[claimable += refund]
    G --> H
```

---

## 4. 历史查询

### 4.1 查询历史订单

**端点**: `GET /api/trade/history`

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TradeController
    participant BS as BetService
    participant DB as Database

    C->>TC: GET /history?page=1&limit=20
    TC->>BS: getBetHistory(userId, page, limit)
    
    Note over BS: 分页查询
    BS->>DB: SELECT * FROM bets WHERE userId=? ORDER BY createdAt DESC LIMIT ? OFFSET ?
    DB-->>BS: items[]
    BS->>DB: SELECT COUNT(*) FROM bets WHERE userId=?
    DB-->>BS: total
    
    Note over BS: 统计汇总
    BS->>DB: SELECT * FROM bets WHERE userId=?
    DB-->>BS: allBets[]
    BS->>BS: 计算 totalWagered, totalPayout, wins, losses
    BS->>BS: netProfit = totalPayout - totalWagered
    
    BS-->>TC: {items, total, page, limit, summary}
    TC-->>C: 200 OK
```

**响应体**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "summary": {
    "totalBets": 100,
    "wins": 45,
    "losses": 55,
    "totalWagered": "10000.00",
    "totalPayout": "9500.00",
    "netProfit": "-500.00"
  }
}
```

---

## 5. 数据流总结

```mermaid
graph LR
    subgraph 下注阶段
        A[用户下注] --> B[验证网格]
        B --> C[扣减余额]
        C --> D[创建订单]
    end
    
    subgraph 等待阶段
        D --> E[订单状态: active]
        E --> F[等待结算时间]
    end
    
    subgraph 结算阶段
        F --> G[K线闭合事件]
        G --> H[查询到期订单]
        H --> I[判定输赢]
        I --> J[赔付/退款 -> claimable]
        J --> K[订单状态: won/lost]
    end
    
    subgraph 领取阶段
        K --> L[用户领取]
        L --> M[claimable -> balance]
    end
```
