# Market 模块设计文档

> Market Module - 行情数据与下注网格生成

---

## 1. 模块概述

### 1.1 核心职责

| 功能 | 说明 |
|------|------|
| **行情对接** | 连接 Binance WebSocket 获取秒级价格 |
| **数据缓存** | 将价格和下注网格缓存到 Redis |
| **区块管理** | 滑动窗口生成/更新/移除下注区块 |
| **赔率计算** | 基于价格距离 + 时间距离计算赔率 |

### 1.2 核心概念

**每个代币 = 一个市场**（如 ETH 市场），不再有多个滚动市场的概念。

**2D 下注网格**：
- **横轴（时间）**：每秒一个时间列，共 360 列（6 分钟）
- **纵轴（价格）**：每个 Tick 一行（如 ±20 Tick = 41 行）
- **每个格子**：一个独立的下注区块，有独立赔率

```
        时间轴 (横向 360 列，每列 1 秒)
        ┃ 锁定区间 (0~3分钟) ┃ 可下注区间 (3~6分钟)  ┃
        ┃   共 180 秒        ┃   共 180 秒           ┃
        ┃ locked=true        ┃ locked=false          ┃
        ┃ 赔率保留锁定值      ┃ 赔率动态计算          ┃
━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━→ 时间
  当前   ┃                    ┃ +3分钟              ┃ +6分钟
        
纵轴 (价格区间):
+10%  ┃ [🔒2.8x] [🔒2.7x]...┃ [2.8x] [2.7x] [2.6x] ... ┃
 +5%  ┃ [🔒1.8x] [🔒1.7x]...┃ [1.8x] [1.7x] [1.6x] ... ┃
  0%  ┃ [🔒1.1x] [🔒1.1x]...┃ [1.1x] [1.1x] [1.1x] ... ┃
 -5%  ┃ [🔒1.8x] [🔒1.7x]...┃ [1.8x] [1.7x] [1.6x] ... ┃
-10%  ┃ [🔒2.8x] [🔒2.7x]...┃ [2.8x] [2.7x] [2.6x] ... ┃

🔒 = 已锁定，不可下注，但赔率值保留（用于已下注订单的结算）
```

---

## 2. 区块滑动窗口机制

### 2.1 核心逻辑

```
Redis 中始终缓存 6 分钟 = 360 秒 的区块

每秒执行一次 tick:
1. 移除已过期区块（结算时间 < 当前时间）
2. 锁定 3 分钟内的区块（赔率不再变化，odds=0 表示不可下注）
3. 动态更新 3~6 分钟区块的赔率（基于当前价格重新计算）
4. 补充生成新区块（保持队列始终有 360 秒）
```

### 2.2 区块生命周期

```
生成 ──▶ 可下注 ──▶ 锁定 ──▶ 结算 ──▶ 移除
  │         │         │        │
  │    3~6分钟后   0~3分钟后   到期    移除
  │      动态赔率    赔率锁定   判定输赢
```

### 2.3 每秒 Tick 处理流程

```typescript
// 定时任务：每秒执行
@Cron('* * * * * *')
async tickMarket(symbol: string) {
  const now = Date.now();
  const currentPrice = await this.getCurrentPrice(symbol);
  
  // 1. 获取当前区块队列
  let timeSlices = await this.redis.getTimeSlices(symbol);
  
  // 2. 移除已过期的时间片（结算时间 < 当前时间）
  timeSlices = timeSlices.filter(ts => ts.settlementTime > now);
  
  // 3. 处理每个时间片
  for (const slice of timeSlices) {
    const timeToSettle = slice.settlementTime - now;
    
    if (timeToSettle <= 3 * 60 * 1000) {
      // 3分钟内：锁定，赔率不再变化
      if (!slice.locked) {
        slice.locked = true;
        // 所有 tick 的 odds 保持当前值
      }
    } else {
      // 3分钟外：动态计算赔率
      slice.basePrice = currentPrice;
      slice.locked = false;
      for (const tick of slice.ticks) {
        tick.odds = this.calculateOdds(tick.priceTick, timeToSettle, currentPrice);
      }
    }
  }
  
  // 4. 补充生成新时间片（保持 360 秒）
  const lastTime = timeSlices[timeSlices.length - 1]?.settlementTime || now;
  const targetTime = now + 6 * 60 * 1000;
  
  let nextTime = lastTime + 1000;
  while (nextTime <= targetTime) {
    const newSlice = this.generateTimeSlice(symbol, nextTime, currentPrice);
    timeSlices.push(newSlice);
    nextTime += 1000;
  }
  
  // 5. 写回 Redis
  await this.redis.setTimeSlices(symbol, timeSlices);
}
```

---

## 3. 数据结构

### 3.1 时间片 (TimeSlice)

每个时间片代表一个"秒"，包含该秒所有价格区间的赔率：

```typescript
interface TimeSlice {
  id: string;              // "ETHUSDT:1706518800"
  symbol: string;          // "ETHUSDT"
  settlementTime: number;  // 结算时间戳 (毫秒)
  basePrice: string;       // 生成时的基准价格
  locked: boolean;         // 是否已锁定 (3分钟内)
  ticks: TickOdds[];       // 各价格区间的赔率
  createdAt: number;       // 首次生成时间
  updatedAt: number;       // 最后更新时间
}

interface TickOdds {
  priceTick: number;       // Tick 编号 (-20 到 +20)
  priceRange: {
    lower: string;         // 价格下限
    upper: string;         // 价格上限
  };
  odds: number;            // 赔率 (锁定后 = 0 表示不可下注)
}
```

### 3.2 Redis 存储设计

```typescript
// 时间片队列 (Sorted Set)
key: 'market:ETHUSDT:slices'
type: ZSET
score: settlementTime
member: JSON(TimeSlice)

// 当前价格 (String)
key: 'price:ETHUSDT:latest'
value: '2900.50'
TTL: 10s

// 秒级 K 线 (Hash)
key: 'kline:ETHUSDT:1s:{timestamp}'
value: { open, high, low, close, volume }
TTL: 600s (10分钟历史)
```

### 3.3 操作命令

```typescript
// 获取可下注区块 (3~6分钟)
const bettableSlices = await redis.zrangebyscore(
  'market:ETHUSDT:slices',
  now + 3 * 60 * 1000,  // +3分钟
  now + 6 * 60 * 1000   // +6分钟
);

// 移除过期区块
await redis.zremrangebyscore(
  'market:ETHUSDT:slices',
  0,
  now  // 当前时间之前的都移除
);
```

---

## 4. Binance WebSocket 对接

### 4.1 数据源

```typescript
// Binance WebSocket URL
const WS_URL = 'wss://stream.binance.com:9443/ws';

// 订阅 ETH/USDT 逐笔成交
const subscribeMsg = {
  method: 'SUBSCRIBE',
  params: ['ethusdt@trade'],
  id: 1,
};

// 消息格式
interface TradeMessage {
  e: 'trade';
  s: 'ETHUSDT';
  p: '2900.50';     // 成交价格
  T: 1706457600000; // 成交时间戳
}
```

### 4.2 价格处理

```typescript
async onTrade(trade: TradeMessage) {
  const price = trade.p;
  const symbol = trade.s;
  
  // 更新最新价格
  await this.redis.set(`price:${symbol}:latest`, price, 'EX', 10);
  
  // 聚合秒级 K 线
  const second = Math.floor(trade.T / 1000);
  await this.updateKline(symbol, second, price);
}
```

---

## 5. 赔率算法

### 5.1 核心公式

```
Odds = BaseOdds + (PriceFactor × TimeFactor)

其中：
- BaseOdds = 1.1 (保底赔率)
- PriceFactor = 价格距离权重 (越远越高)
- TimeFactor = 时间衰减权重 (越久越低)
```

### 5.2 完整实现

```typescript
interface OddsConfig {
  baseOdds: number;      // 1.1
  tickSize: number;      // 0.5%
  maxOdds: number;       // 20.0
  minOdds: number;       // 1.05
}

function calculateOdds(
  priceTick: number,
  timeToSettleMs: number,
  config: OddsConfig
): number {
  // 价格距离系数
  const distance = Math.abs(priceTick) * config.tickSize;
  let priceFactor: number;
  
  if (distance >= 50) {
    priceFactor = 20.0;  // 封顶
  } else if (distance <= 1) {
    priceFactor = distance * 0.3;
  } else if (distance <= 5) {
    priceFactor = 0.3 + (distance - 1) * 0.4;
  } else if (distance <= 10) {
    priceFactor = 1.9 + (distance - 5) * 0.5;
  } else {
    priceFactor = 4.4 + (distance - 10) * 0.3;
  }
  
  // 时间衰减系数 (3~6分钟映射到 0~1)
  const secondsAhead = timeToSettleMs / 1000;
  const normalizedTime = (secondsAhead - 180) / 180; // 0 at +3min, 1 at +6min
  const timeFactor = 1 - 0.5 * normalizedTime;
  
  // 最终赔率
  let odds = config.baseOdds + priceFactor * timeFactor;
  odds = Math.max(config.minOdds, Math.min(config.maxOdds, odds));
  
  return Math.round(odds * 100) / 100;
}
```

### 5.3 赔率示例

| 价格区间 | +3分钟 | +4分钟 | +5分钟 | +6分钟 |
|----------|--------|--------|--------|--------|
| **+10%** | 5.2    | 4.5    | 3.8    | 3.2    |
| **+5%**  | 3.0    | 2.6    | 2.2    | 1.9    |
| **+2%**  | 1.7    | 1.5    | 1.4    | 1.3    |
| **0%**   | 1.2    | 1.15   | 1.12   | 1.1    |
| **-5%**  | 3.0    | 2.6    | 2.2    | 1.9    |

---

## 6. 结算规则

### 6.1 输赢判定

```typescript
// 结算价格落入所选区间 = 赢
function isWin(
  settlementPrice: number,
  basePrice: number,
  priceTick: number,
  tickSize: number
): boolean {
  const lower = basePrice * (1 + (priceTick - 0.5) * tickSize / 100);
  const upper = basePrice * (1 + (priceTick + 0.5) * tickSize / 100);
  
  return settlementPrice >= lower && settlementPrice < upper;
}
```

### 6.2 赔付计算

```typescript
if (isWin) {
  // 赢：本金 × 赔率
  payout = amount * odds;
} else {
  // 输：退还部分本金 (赔率越高亏越多)
  refund = amount / odds;
  
  // 示例：
  // 赔率 2.0 → 退还 50%
  // 赔率 5.0 → 退还 20%
}
```

---

## 7. API 设计

### 7.1 获取下注网格

```
GET /api/market/{symbol}/grid
```

**Response**:
```json
{
  "success": true,
  "data": {
    "symbol": "ETHUSDT",
    "currentPrice": "2900.50",
    "currentTime": 1706518800000,
    "lockWindowEnd": 1706518980000,
    "bettableSlices": [
      {
        "settlementTime": 1706518980000,
        "basePrice": "2900.50",
        "locked": false,
        "ticks": [
          { "priceTick": 10, "priceRange": { "lower": "3045", "upper": "3059" }, "odds": 3.2 },
          { "priceTick": 5, "priceRange": { "lower": "2972", "upper": "2987" }, "odds": 1.9 },
          { "priceTick": 0, "priceRange": { "lower": "2885", "upper": "2914" }, "odds": 1.1 },
          // ... 更多 ticks
        ]
      },
      // ... 更多时间片 (共 180 个可下注)
    ]
  }
}
```

### 7.2 获取 K 线数据

```
GET /api/market/{symbol}/kline?interval=1s&limit=360
```

### 7.3 WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `subscribe` | C→S | 订阅市场 |
| `price` | S→C | 实时价格推送 |
| `grid:update` | S→C | 下注网格更新 |

---

## 8. 模块结构

```
src/market/
├── services/
│   ├── binance-ws.service.ts       # Binance WebSocket
│   ├── price-cache.service.ts      # 价格缓存
│   ├── block-manager.service.ts    # 区块滑动窗口管理
│   ├── odds-calculator.service.ts  # 赔率计算
│   └── settlement.service.ts       # 结算引擎
├── dto/
│   ├── time-slice.dto.ts
│   └── grid.dto.ts
├── market.gateway.ts               # WebSocket
├── market.controller.ts            # REST API
└── market.module.ts
```

---

## 9. 配置参数

```typescript
export const marketConfig = {
  // Binance
  binanceWsUrl: 'wss://stream.binance.com:9443/ws',
  symbols: ['ETHUSDT'],
  
  // 下注窗口
  windowDuration: 6 * 60,    // 6 分钟 = 360 秒
  lockDuration: 3 * 60,      // 3 分钟锁定
  
  // Tick 配置
  tickSize: 0.5,             // 每 Tick 0.5%
  tickRange: 20,             // 上下各 20 个 Tick
  
  // 赔率配置
  odds: {
    baseOdds: 1.1,
    maxOdds: 20.0,
    minOdds: 1.05,
  },
};
```

---

## 10. MVP 功能清单

| 功能 | 状态 |
|------|------|
| Binance WS 价格订阅 | ⏳ |
| Redis 价格缓存 | ⏳ |
| 区块滑动窗口生成 | ⏳ |
| 赔率动态计算 | ⏳ |
| 获取下注网格 API | ⏳ |
| K 线数据 API | ⏳ |
| 结算引擎 | ⏳ |
