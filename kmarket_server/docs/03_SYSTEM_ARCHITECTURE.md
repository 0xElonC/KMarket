# KMarket 系统架构总览

> 版本日期: 2026-01-30

---

## 1. 模块概览

```mermaid
graph TB
    subgraph Frontend["前端 (Web3)"]
        FE[用户界面]
    end
    
    subgraph Backend["后端 (NestJS)"]
        UM[Users Module]
        CM[Chain Module]
        MM[Market Module]
        TM[Trade Module]
    end
    
    subgraph External["外部服务"]
        BN[Binance WebSocket]
        RD[Redis]
        BC[Blockchain RPC]
    end
    
    subgraph Database["数据存储"]
        DB[(PostgreSQL)]
    end
    
    FE --> UM
    FE --> CM
    FE --> MM
    FE --> TM
    
    CM --> BC
    MM --> BN
    MM --> RD
    UM --> DB
    TM --> DB
    CM --> DB
    
    TM --> UM
    TM --> MM
    CM --> UM
```

---

## 2. API 端点清单

### 2.1 Users Module (`/api/users`)

| 端点 | 方法 | 认证 | 说明 |
|------|------|:----:|------|
| `/auth/nonce` | POST | ❌ | 获取登录 Nonce |
| `/auth/login` | POST | ❌ | 钱包签名登录 |
| `/balance` | GET | ✅ | 获取余额信息 |
| `/claim` | POST | ✅ | 领取待领取余额 |
| `/balance/logs` | GET | ✅ | 查询流水记录 |

### 2.2 Chain Module (`/api/chain`)

| 端点 | 方法 | 认证 | 说明 |
|------|------|:----:|------|
| `/withdraw-request` | POST | ✅ | 请求提现凭证 |
| `/vault-balance` | GET | ✅ | 查询链上 Vault 余额 |
| `/status` | GET | ❌ | 获取链服务状态 |

### 2.3 Market Module (`/api/market`)

| 端点 | 方法 | 认证 | 说明 |
|------|------|:----:|------|
| `/price` | GET | ❌ | 获取当前价格 |
| `/kline` | GET | ❌ | 获取 K 线历史 |
| `/grid` | GET | ❌ | 获取下注网格 |

### 2.4 Trade Module (`/api/trade`)

| 端点 | 方法 | 认证 | 说明 |
|------|------|:----:|------|
| `/bet` | POST | ✅ | 下注 |
| `/positions` | GET | ✅ | 查询当前持仓 |
| `/history` | GET | ✅ | 查询历史订单 |

---

## 3. 核心业务流程

### 3.1 用户注册/登录

```mermaid
sequenceDiagram
    participant U as 用户钱包
    participant FE as 前端
    participant BE as UsersModule

    U->>FE: 连接钱包
    FE->>BE: POST /auth/nonce
    BE-->>FE: {nonce: "xxx"}
    FE->>U: 请求签名 (nonce)
    U-->>FE: 签名结果
    FE->>BE: POST /auth/login {address, signature}
    BE->>BE: 验证签名, 创建/查找用户
    BE-->>FE: {accessToken, user}
    FE->>FE: 保存 JWT Token
```

---

### 3.2 充值流程

```mermaid
sequenceDiagram
    participant U as 用户钱包
    participant BC as Blockchain
    participant DL as DepositListenerService
    participant US as UsersService
    participant DB as Database

    U->>BC: 调用 Vault.deposit(amount)
    BC->>BC: 触发 Deposited 事件
    DL->>BC: 监听事件 (WebSocket/Polling)
    BC-->>DL: {user, amount, txHash}
    DL->>US: addBalanceFromDeposit(userId, amount, txHash)
    US->>DB: 检查 txHash 幂等
    alt 新交易
        US->>DB: UPDATE users SET balance += amount
        US->>DB: INSERT transactions (type=DEPOSIT)
        US-->>DL: 成功
    else 已处理
        US-->>DL: 跳过 (幂等)
    end
```

---

### 3.3 下注流程

```mermaid
sequenceDiagram
    participant FE as 前端
    participant TC as TradeModule
    participant BM as BlockManager
    participant US as UsersService
    participant DB as Database

    FE->>TC: POST /bet {symbol, amount, priceTick, settlementTime}
    TC->>BM: getSlice(settlementTime)
    alt 区块无效/已锁定
        BM-->>TC: null / locked
        TC-->>FE: 400 Error
    end
    TC->>TC: 查找 Tick, 获取 odds
    TC->>US: deductBalance(userId, amount)
    alt 余额不足
        US-->>TC: InsufficientBalance
        TC-->>FE: 400 余额不足
    end
    TC->>DB: INSERT bets (...)
    TC-->>FE: 200 {id, odds, settlementTime, ...}
```

---

### 3.4 结算流程 (事件驱动)

```mermaid
sequenceDiagram
    participant BN as Binance WebSocket
    participant BS as BinanceService
    participant EE as EventEmitter
    participant SS as SettlementService
    participant US as UsersService
    participant DB as Database

    BN->>BS: K 线数据 (k.x=true 闭合)
    BS->>EE: emit('market.kline.closed', {price, timestamp})
    EE->>SS: handleKlineClosed()
    SS->>DB: SELECT bets WHERE settlementTime <= timestamp AND status='active'
    
    loop 每笔订单
        SS->>SS: price ∈ [tickLower, tickUpper)?
        alt 赢
            SS->>US: settleWin(userId, amount*odds)
            US->>DB: claimable += payout
        else 输
            SS->>US: settleLose(userId, amount/odds)
            US->>DB: claimable += refund
        end
        SS->>DB: UPDATE bets SET status, payout
    end
```

---

### 3.5 领取流程

```mermaid
sequenceDiagram
    participant FE as 前端
    participant UC as UsersController
    participant US as UsersService
    participant DB as Database

    FE->>UC: POST /users/claim
    UC->>US: claim(userId)
    US->>DB: SELECT claimable FROM users WHERE id=?
    alt claimable > 0
        US->>DB: UPDATE users SET balance += claimable, claimable = 0
        US->>DB: INSERT transactions (type=CLAIM)
        US-->>UC: {claimed: "100", newBalance: "500"}
    else claimable = 0
        US-->>UC: {claimed: "0", newBalance: "400"}
    end
    UC-->>FE: 200 OK
```

---

### 3.6 提现流程

```mermaid
sequenceDiagram
    participant FE as 前端
    participant CC as ChainController
    participant WS as WithdrawSignerService
    participant US as UsersService
    participant U as 用户钱包
    participant BC as Blockchain

    FE->>CC: POST /chain/withdraw-request {amount}
    CC->>US: deductBalance(userId, amount)
    alt 余额不足
        US-->>CC: Error
        CC-->>FE: 400 余额不足
    end
    CC->>WS: createWithdrawCoupon(userId, address, amount)
    WS->>WS: 生成 EIP-712 签名
    WS-->>CC: {coupon: {amount, nonce, deadline, signature}}
    CC-->>FE: 200 {coupon}
    
    FE->>U: 调用 Vault.withdraw(coupon)
    U->>BC: 链上提现
    BC-->>U: 交易成功
```

---

## 4. 业务闭环验证

### 4.1 资金闭环

```
充值 → balance ↑
  ↓
下注 → balance ↓, bet(active) ↑
  ↓
结算 → bet(settled), claimable ↑
  ↓
领取 → claimable → balance ↑
  ↓
提现 → balance ↓ → 链上资产 ↑
```

### 4.2 关键不变量

| 检查项 | 公式 |
|--------|------|
| 用户资产守恒 | `balance + claimable + inBets = totalDeposited - totalWithdrawn + netProfit` |
| 结算完整性 | 所有 `settlementTime <= now` 的 `active` 订单应被结算 |
| 幂等性保证 | 同一 `txHash` 不会重复入账 |

### 4.3 已验证闭环

| 场景 | 状态 |
|------|:----:|
| 登录 → 充值 → 查余额 | ✅ |
| 查网格 → 下注 → 查持仓 | ✅ |
| K 线闭合 → 自动结算 → 领取 | ✅ |
| 请求提现签名 → 链上提现 | ✅ |

---

## 5. 服务依赖关系

```mermaid
graph LR
    subgraph Trade
        BetService --> BlockManagerService
        BetService --> UsersService
        SettlementService --> BetService
        SettlementService --> UsersService
        SettlementService --> OddsCalculatorService
    end
    
    subgraph Market
        BlockManagerService --> OddsCalculatorService
        BlockManagerService --> PriceStoreService
        BinanceService --> PriceStoreService
        BinanceService -.->|事件| SettlementService
    end
    
    subgraph Chain
        DepositListenerService --> UsersService
        WithdrawSignerService --> UsersService
    end
    
    subgraph Users
        UsersService
        AuthService
    end
```

---

## 6. 配置清单

| 配置项 | 环境变量 | 说明 |
|--------|----------|------|
| 数据库 | `DATABASE_URL` | PostgreSQL 连接 |
| Redis | `REDIS_URL` | K 线缓存 |
| 链 RPC | `CHAIN_RPC_URL` | 区块链节点 |
| Vault 合约 | `VAULT_ADDRESS` | 充提合约地址 |
| 服务器私钥 | `SERVER_PRIVATE_KEY` | 签名提现凭证 |
| JWT 密钥 | `JWT_SECRET` | 用户认证 |
