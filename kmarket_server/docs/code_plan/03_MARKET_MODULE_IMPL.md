# Market 模块实施计划

> 基于 [03_MARKET_MODULE.md](../module_plan/03_MARKET_MODULE.md) 设计文档的代码实现计划

---

## 1. 模块现状分析

### 1.1 已实现功能

| 功能 | 文件 | 状态 | 说明 |
|------|------|:----:|------|
## 1. 模块现状分析

### 1.1 已实现功能

| 功能 | 文件 | 状态 | 说明 |
|------|------|:----:|------|
| 价格监听 | `binance.service.ts` | ✅ | 重命名为 `BinanceService`，订阅 `@kline_1s` |
| 价格存储 | `price-store.service.ts` | ✅ | 已增强支持 Redis 和 K 线逻辑 |
| API 接口 | `market.controller.ts` | ✅ | 新增 `/grid` 接口 |
| WebSocket | `market.gateway.ts` | ✅ | **[已移除]** 前端采用 HTTP 轮询 |

### 1.2 待实现功能

| 功能 | 优先级 | 说明 |
|------|:------:|------|
| 赔率计算服务 | ✅ 完成 | 核心业务逻辑 |
| 区块管理服务 | ✅ 完成 | 滑动窗口、锁定、生成逻辑 |
| 结算服务 | ✅ 完成 | 判定输赢、调用 Users 模块 |
| Redis 集成 | ✅ 完成 | 生产环境必需，MVP 可选但建议实现 |

---

## 2. Binance 数据源说明

### 2.1 订阅内容

改为订阅 **秒级 K 线 (Kline 1s)**，确保数据的权威性和结算的准确性。

- **Stream Name**: `<symbol>@kline_1s` (e.g., `ethusdt@kline_1s`)
- **推送频次**: 每秒推送一次更新 (包含当前秒的 OHLC)

### 2.2 数据用途与处理逻辑

1. **实时价格更新**:
   - 监听每个 websocket 消息的 `k.c` (Close Price，当前即时价格)。
   - 更新内存/Redis 中的 `CurrentPrice`，用于前端展示和计算动态赔率。
   - **Action**: `redis.set('price:{symbol}:current', price, 'EX', 10)`

2. **K 线历史存储**:
   - 当收到 `k.x = true` (K线闭合) 标志时，表示这一秒的数据已归档。
   - 将完整的 K 线数据 (OHLCV) 存入 Redis Hash 结构，用于前端图表回溯。
   - **Key**: `kline:{symbol}:1s` (Hash)
   - **Field**: `timestamp` (秒级时间戳)
   - **Value**: JSON `{o, h, l, c, v}`
   - **TTL**: 保留最近 1 小时 (3600 秒) 即可，过期清理。

3. **Settlement 结算判定**:
   - **核心依据**: 必须等待 `k.x = true` 的消息。
   - 当某秒的 K 线收盘时，该 K 线的 `c` (Close) 价格即为该时间戳的**最终结算价**。
   - 触发 `SettlementService`：
     - 找到所有 `settlementTime == k.t` (K线开始时间) 的下注区块。
     - 使用 `k.c` 作为裁判价格进行输赢判定。
     - *注*: Binance 1s K线的 `t` 是这一秒的起始时间，如 `12:00:00`，该 K 线代表 `12:00:00` ~ `12:00:01` 期间的价格。我们约定区块的 `settlementTime` 对应 K 线的 `t`。

---

## 3. 数据结构设计

### 3.1 TimeSlice (时间片)

```typescript
export interface TimeSlice {
  id: string;               // 唯一标识
  symbol: string;           // 交易对
  settlementTime: number;   // 结算时间戳 (对应 K 线 start time)
  basisPrice: string;       // 生成基准价 (用于计算涨跌幅百分比)
  locked: boolean;          // 是否锁定 (3分钟内)
  status: 'pending' | 'settled'; // 状态
  ticks: TickOdds[];        // 赔率列表
}
```

### 3.2 Redis Storage Strategies

| Key | Type | Use Case | TTL |
|-----|------|----------|-----|
| `price:{symbol}:current` | String | 最新的实时价格 (k.c) | 10s |
| `kline:{symbol}:1s` | Hash | 历史 K 线数据 (timestamp -> data) | 1h |
| `market:{symbol}:grid` | String | 序列化的当前网格 (缓存 API) | - |
| `market:{symbol}:settled:{time}` | String | 已结算区块的最终价格 (防重复) | 24h |

---

## 4. Service 层设计

### 4.1 S01 - OddsCalculatorService (赔率计算) **[新增]**

**职责**: 提供纯函数的赔率计算能力

**接口**:
```typescript
calculateOdds(
    priceTick: number, 
    timeToSettleMs: number, 
    priceDistance: number
): number
```

---

### 4.2 S02 - BlockManagerService (区块管理) **[新增]**

**职责**: 核心调度器，管理 360 秒滑动窗口

**核心流程 (tick)**:
1. 获取当前价格 (from PriceStore)
2. **清理**: 移除过期区块
3. **更新**: 遍历所有活跃区块
   - `timeToSettle <= 3min` 且未锁定 -> 设置 `locked=true`
   - `timeToSettle > 3min` -> 调用 `calculateOdds` 更新动态赔率
4. **补充**: 确保队列尾部补齐到 360 秒
5. **缓存**: 更新 Redis / 内存状态 (供 Controller 查询)

---

### 4.3 S03 - SettlementService (结算服务) **[新增]**

**机制**: **事件驱动 (Event-Driven)** 优先，确保时序准确。

**核心流程**:

1. **触发源**: `BinanceService` 收到 `k.x=true` (K线闭合) 消息。
   - 这是一个确定的"时间节点"，标志着 BINANCE 官方确认了这一秒的 Close Price。
   - `BinanceService` **异步**发出事件 `Event: market.kline.closed` payload: `{ symbol, price, timestamp }`。
   - **关键点**: WebSocket 接收线程**不会等待**结算完成，确保价格流推送不受结算逻辑阻塞。

2. **结算执行**: `SettlementService` 监听该事件 (Async Handler)。
   - 立即查找 `settlementTime === timestamp` 的 Block (时间片)。
   - 对该 Block 执行结算逻辑 (判定输赢、分发奖励)。
   - 标记 Block 为 `settled`。

3. **兜底机制 (Safety Net)**:
   - `BlockManager` 的 `tick()` 循环中会检查：如果有 Block 超过结算时间 5 秒仍未结算 (可能因 WS 丢包导致漏掉事件)，则主动调用 Binance API (REST) 查询该秒 K 线进行补单结算。

---

## 5. API 设计 (HTTP Poll Only)

### 5.1 获取下注网格

**路由**: `GET /api/market/grid?symbol=ETHUSDT`

**说明**: 前端每秒（或每几秒）轮询此接口获取最新网格状态。

**Response**:
```json
{
  "success": true,
  "data": {
    "symbol": "ETHUSDT",
    "currentPrice": "2900.50",
    "currentTime": 1706518800000,
    "slices": [
       // 返回完整的 360 个切片，或者仅返回可视区域
       // 建议 MVP 返回完整数据，数据量约为 360 * 40 个对象，可能较大
       // 优化: 仅返回 status 变更的 slice id 列表 + 新增的 slice + 完整的头部 slice
    ]
  }
}
```

> **注意**: 由于移除了 WebSocket，前端轮询频率决定了用户看到的赔率延迟。建议 API 响应增加缓存头 (Cache-Control) 或 ETag 以减少带宽。

---

## 6. 实施步骤

### Phase 1: 基础服务准备
1. 重构 `PriceListener` 为 `BinanceService`，明确订阅 `@trade`
2. 增强 `PriceStoreService`

### Phase 2: 核心区块管理
1. 创建 `BlockManagerService`
2. 实现 `tick()` 循环和滑动窗口
3. 实现内存/Redis 存储供 API 查询

### Phase 3: 接口暴露
1. 更新 `MarketController` 实现 `/grid` 接口
2. **移除** `MarketGateway` 相关代码

### Phase 4: 结算对接
1. 创建 `SettlementService`
2. 实现结算逻辑

---

## 7. 文件变更清单

| 操作 | 文件 | 说明 |
|:----:|------|------|
| NEW | `src/market/services/odds-calculator.service.ts` | 赔率计算器 |
| NEW | `src/market/services/block-manager.service.ts` | 区块管理器 |
| NEW | `src/market/services/settlement.service.ts` | 结算服务 |
| MODIFY | `src/market/price-listener.service.ts` | 明确订阅逻辑 |
| DELETE | `src/market/market.gateway.ts` | **移除 WS 网关** |
| MODIFY | `src/market/market.controller.ts` | 新增 grid 接口 |

---

## 7. 依赖注入关系

```mermaid
graph TD
  MarketController --> PriceStoreService
  MarketController --> BlockManagerService
  
  MarketGateway --> PriceStoreService
  MarketGateway --> BlockManagerService
  
  BlockManagerService --> PriceStoreService
  BlockManagerService --> OddsCalculatorService
  BlockManagerService --> Redis (Optional)
  
  SettlementService --> BlockManagerService (监听结算)
  SettlementService --> UsersService
```
