# KMarket API 接口文档

> 版本: v1.0 | 更新日期: 2026-01-30

**Base URL**: `http://localhost:3000/api`

---

## 目录

1. [认证](#1-认证)
2. [用户余额](#2-用户余额)
3. [链服务](#3-链服务)
4. [行情数据](#4-行情数据)
5. [交易](#5-交易)

---

## 通用说明

### 认证方式

需要认证的接口在 Header 中携带 JWT Token：

```
Authorization: Bearer <accessToken>
```

### 响应格式

所有接口返回统一格式：

```json
{
  "success": true,
  "data": { ... },
  "message": null
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "message": "错误描述"
}
```

### 金额格式

所有金额字段均为 **字符串类型**，单位为 Wei (18 位小数)。

示例：`"100000000000000000000"` 表示 100.0

---

## 1. 认证

### 1.1 获取登录 Nonce

生成随机 Nonce 用于钱包签名。

```
POST /users/auth/nonce
```

**认证**: 不需要

**请求体**: 无

**响应示例**:

```json
{
  "success": true,
  "data": {
    "nonce": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 1.2 钱包登录

使用钱包签名进行登录/注册。

```
POST /users/auth/login
```

**认证**: 不需要

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| address | string | ✅ | 钱包地址 (0x...) |
| signature | string | ✅ | 对 nonce 的签名 |
| nonce | string | ✅ | 从 /auth/nonce 获取 |

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "signature": "0x...",
  "nonce": "550e8400-e29b-41d4-a716-446655440000"
}
```

**签名消息格式**:

```
Sign this message to login to KMarket:
Nonce: {nonce}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "balance": "0",
      "claimable": "0"
    }
  }
}
```

---

## 2. 用户余额

### 2.1 获取余额信息

```
GET /users/balance
```

**认证**: ✅ 需要

**响应示例**:

```json
{
  "success": true,
  "data": {
    "available": "1000000000000000000000",
    "claimable": "50000000000000000000",
    "inBets": "200000000000000000000",
    "total": "1250000000000000000000"
  }
}
```

**字段说明**:

| 字段 | 说明 |
|------|------|
| available | 可用余额 (可下注/可提现) |
| claimable | 待领取余额 (结算后的赔付/退款) |
| inBets | 在押资金 (活跃订单锁定) |
| total | 总资产 = available + claimable + inBets |

---

### 2.2 领取余额

将待领取余额转入可用余额。

```
POST /users/claim
```

**认证**: ✅ 需要

**请求体**: 无

**响应示例**:

```json
{
  "success": true,
  "data": {
    "claimed": "50000000000000000000",
    "newBalance": "1050000000000000000000"
  }
}
```

---

### 2.3 查询流水记录

```
GET /users/balance/logs
```

**认证**: ✅ 需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| page | number | ❌ | 页码, 默认 1 |
| limit | number | ❌ | 每页数量, 默认 20, 最大 100 |
| type | string | ❌ | 类型过滤: DEPOSIT, WITHDRAW, BET, WIN, LOSE, CLAIM |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "type": "DEPOSIT",
        "amount": "1000000000000000000000",
        "status": "completed",
        "txHash": "0xabc...",
        "remark": "充值",
        "createdAt": "2026-01-30T10:00:00Z"
      },
      {
        "id": 2,
        "type": "BET",
        "amount": "-100000000000000000000",
        "status": "completed",
        "refType": "bet",
        "refId": "12345",
        "createdAt": "2026-01-30T10:05:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

## 3. 链服务

### 3.1 请求提现凭证

生成 EIP-712 签名的提现凭证，用于链上提现。

```
POST /chain/withdraw-request
```

**认证**: ✅ 需要

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| amount | string | ✅ | 提现金额 (Wei) |

```json
{
  "amount": "100000000000000000000"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "amount": "100000000000000000000",
    "nonce": 1,
    "deadline": 1706700000,
    "signature": "0x..."
  }
}
```

**前端使用**:

```javascript
// 调用合约提现
await vaultContract.withdraw(
  coupon.amount,
  coupon.nonce,
  coupon.deadline,
  coupon.signature
);
```

---

### 3.2 查询链上 Vault 余额

```
GET /chain/vault-balance
```

**认证**: ✅ 需要

**响应示例**:

```json
{
  "success": true,
  "data": {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "vaultBalance": "500000000000000000000",
    "blockNumber": 12345678
  }
}
```

---

### 3.3 获取链服务状态

```
GET /chain/status
```

**认证**: 不需要

**响应示例**:

```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "blockNumber": 12345678,
    "depositListener": {
      "isListening": true,
      "lastProcessedBlock": 12345670,
      "mode": "websocket"
    },
    "serverAddress": "0xserver...",
    "isReady": true
  }
}
```

---

## 4. 行情数据

### 4.1 获取当前价格

```
GET /market/price
```

**认证**: 不需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| symbol | string | ❌ | 交易对, 默认 ETHUSDT |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "symbol": "ETHUSDT",
    "price": "2500.50",
    "timestamp": 1706600000000
  }
}
```

---

### 4.2 获取 K 线历史

```
GET /market/kline
```

**认证**: 不需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| symbol | string | ❌ | 交易对, 默认 ETHUSDT |
| startTime | number | ❌ | 开始时间戳 (ms), 默认 1 小时前 |
| endTime | number | ❌ | 结束时间戳 (ms), 默认当前 |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "timestamp": 1706600000000,
      "open": "2500.00",
      "high": "2502.00",
      "low": "2498.00",
      "close": "2501.00"
    }
  ]
}
```

---

### 4.3 获取下注网格 ⭐

获取 6×6 下注宫格，按列返回数据。

```
GET /market/grid
```

**认证**: 不需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| symbol | string | ❌ | 交易对, 默认 ETHUSDT |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "symbol": "ETHUSDT",
    "currentPrice": "2500.50",
    "currentTime": 1706600000000,
    "intervalSec": 3,
    "col1": [
      { "odds": "2.85", "expiryTime": 1706599994000, "priceRange": { "min": 2550, "max": null, "label": "+2%↑", "percentMin": 2, "percentMax": 100 }, "tickId": "1706599994000_1", "status": "settled", "basisPrice": "2500.00", "isWinning": false },
      { "odds": "2.10", "expiryTime": 1706599994000, "priceRange": { "min": 2525, "max": 2550, "label": "+1%~+2%", "percentMin": 1, "percentMax": 2 }, "tickId": "1706599994000_2", "status": "settled", "basisPrice": "2500.00", "isWinning": false },
      { "odds": "1.55", "expiryTime": 1706599994000, "priceRange": { "min": 2500, "max": 2525, "label": "0~+1%", "percentMin": 0, "percentMax": 1 }, "tickId": "1706599994000_3", "status": "settled", "basisPrice": "2500.00", "isWinning": true },
      { "odds": "1.55", "expiryTime": 1706599994000, "priceRange": { "min": 2475, "max": 2500, "label": "-1%~0", "percentMin": -1, "percentMax": 0 }, "tickId": "1706599994000_4", "status": "settled", "basisPrice": "2500.00", "isWinning": false },
      { "odds": "2.10", "expiryTime": 1706599994000, "priceRange": { "min": 2450, "max": 2475, "label": "-2%~-1%", "percentMin": -2, "percentMax": -1 }, "tickId": "1706599994000_5", "status": "settled", "basisPrice": "2500.00", "isWinning": false },
      { "odds": "2.85", "expiryTime": 1706599994000, "priceRange": { "min": null, "max": 2450, "label": "-2%↓", "percentMin": -100, "percentMax": -2 }, "tickId": "1706599994000_6", "status": "settled", "basisPrice": "2500.00", "isWinning": false }
    ],
    "col2": [...],
    "col3": [...],
    "col4": [...],
    "col5": [...],
    "col6": [...],
    "update": true
  }
}
```

**网格布局**:

```
          col1    col2    col3    col4    col5    col6
         T-6s    T-3s    T+3s    T+6s    T+9s   T+12s
        ───────────────────────────────────────────────
Row 1   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  大涨 +2%↑
Row 2   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  中涨 +1%~+2%
Row 3   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  小涨 0~+1%
Row 4   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  小跌 -1%~0
Row 5   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  中跌 -2%~-1%
Row 6   │ 锁定  │ 锁定  │ 可下注 │ 可下注 │ 可下注 │ 可下注 │  大跌 -2%↓
```

**字段说明**:

| 字段 | 说明 |
|------|------|
| col1-col6 | 6 列数据，每列包含 6 个格子 |
| intervalSec | 列间隔 (3 秒) |
| update | 是否发生滑动 (用于前端优化) |
| odds | 当前赔率 |
| expiryTime | 到期时间戳 (ms) |
| tickId | 唯一标识，格式 `{expiryTime}_{row}` |
| status | 状态: settled/locked/betting |
| priceRange.label | 价格区间标签 |
| isWinning | 是否中奖区间 (仅 settled)

---

## 5. 交易

### 5.1 下注 ⭐

```
POST /trade/bet
```

**认证**: ✅ 需要

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| symbol | string | ✅ | 交易对 |
| amount | string | ✅ | 下注金额 (Wei) |
| tickId | string | ✅ | 格子ID (从网格接口获取) |

```json
{
  "symbol": "ETHUSDT",
  "amount": "100000000000000000000",
  "tickId": "1706600180000_3"
}
```

**tickId 格式**: `{expiryTime}_{rowIndex}`
- `expiryTime`: 到期时间戳 (ms)
- `rowIndex`: 行索引 (1-6)
  - 1: +2%↑ (大涨)
  - 2: +1%~+2% (中涨)
  - 3: 0~+1% (小涨)
  - 4: -1%~0 (小跌)
  - 5: -2%~-1% (中跌)
  - 6: -2%↓ (大跌)

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "symbol": "ETHUSDT",
    "tickId": "1706600180000_3",
    "rowIndex": 3,
    "amount": "100000000000000000000",
    "priceRange": {
      "min": "2500.00",
      "max": "2525.00",
      "label": "0~+1%"
    },
    "basisPrice": "2500.00",
    "odds": "1.60",
    "settlementTime": "2026-01-30T12:03:00Z",
    "status": "active",
    "createdAt": "2026-01-30T12:00:00Z"
  }
}
```

**错误码**:

| 错误 | 说明 |
|------|------|
| 区块已过期 | tickId 对应的区块不存在或已过期 |
| 区块已锁定 | 该格子距离结算时间 ≤6s，无法下注 |
| 余额不足 | 可用余额不足 |

---

### 5.2 查询当前持仓

```
GET /trade/positions
```

**认证**: ✅ 需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| symbol | string | ❌ | 按交易对过滤 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12345,
        "symbol": "ETHUSDT",
        "amount": "100000000000000000000",
        "priceTick": 5,
        "priceRange": {
          "lower": "2550.00",
          "upper": "2562.50"
        },
        "odds": "3.25",
        "settlementTime": "2026-01-30T12:03:00Z",
        "remainingSeconds": 120,
        "status": "active"
      }
    ],
    "totalInBets": "100000000000000000000"
  }
}
```

---

### 5.3 查询历史订单

```
GET /trade/history
```

**认证**: ✅ 需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| page | number | ❌ | 页码, 默认 1 |
| limit | number | ❌ | 每页数量, 默认 20 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12340,
        "symbol": "ETHUSDT",
        "amount": "100000000000000000000",
        "priceTick": 3,
        "priceRange": {
          "lower": "2525.00",
          "upper": "2537.50"
        },
        "basePrice": "2500.00",
        "odds": "2.50",
        "settlementTime": "2026-01-30T11:50:00Z",
        "settlementPrice": "2530.00",
        "status": "won",
        "payout": "250000000000000000000",
        "createdAt": "2026-01-30T11:47:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "summary": {
      "totalBets": 100,
      "wins": 45,
      "losses": 55,
      "totalWagered": "10000000000000000000000",
      "totalPayout": "9500000000000000000000",
      "netProfit": "-500000000000000000000"
    }
  }
}
```

---

## 6. 错误码参考

| HTTP Status | 说明 |
|-------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 无效 |
| 403 | 权限不足 |
| 500 | 服务器内部错误 |

---

## 7. 前端集成示例

### 7.1 登录流程

```typescript
// 1. 获取 Nonce
const { data: { nonce } } = await api.post('/users/auth/nonce');

// 2. 钱包签名
const message = `Sign this message to login to KMarket:\nNonce: ${nonce}`;
const signature = await signer.signMessage(message);

// 3. 登录
const { data } = await api.post('/users/auth/login', {
  address: await signer.getAddress(),
  signature,
  nonce,
});

// 4. 保存 Token
localStorage.setItem('token', data.accessToken);
```

### 7.2 下注流程

```typescript
// 1. 获取网格
const { data: grid } = await api.get('/market/grid');

// 2. 用户选择时间片和价格区间
const selectedSlice = grid.slices[0];
const selectedTick = selectedSlice.ticks.find(t => t.priceTick === 5);

// 3. 下注
const { data: bet } = await api.post('/trade/bet', {
  symbol: 'ETHUSDT',
  amount: ethers.parseEther('100').toString(),
  priceTick: 5,
  settlementTime: selectedSlice.settlementTime,
});
```

### 7.3 轮询更新

```typescript
// 每秒更新网格
setInterval(async () => {
  const { data } = await api.get('/market/grid');
  updateGrid(data);
}, 1000);

// 每秒更新价格
setInterval(async () => {
  const { data } = await api.get('/market/price');
  updatePrice(data);
}, 1000);
```
