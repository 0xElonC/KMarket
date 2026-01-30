# 功能流程详解 - Users Module

> 用户服务 - 认证、余额、流水

---

## 1. 认证功能

### 1.1 获取 Nonce

**端点**: `POST /api/users/auth/nonce`

```mermaid
sequenceDiagram
    participant C as Client
    participant AC as AuthController
    participant AS as AuthService

    C->>AC: POST /auth/nonce
    AC->>AS: generateNonce()
    AS->>AS: crypto.randomUUID()
    AS-->>AC: nonce string
    AC-->>C: {success: true, data: {nonce}}
```

**实现**: `src/users/auth.service.ts`
```typescript
generateNonce(): string {
    return crypto.randomUUID();
}
```

---

### 1.2 钱包登录

**端点**: `POST /api/users/auth/login`

```mermaid
sequenceDiagram
    participant C as Client
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as Database

    C->>AC: POST /auth/login {address, signature, nonce}
    AC->>AS: login(dto)
    AS->>AS: 验证签名 (ethers.verifyMessage)
    alt 签名无效
        AS-->>AC: UnauthorizedException
    end
    AS->>US: findOrCreate(address)
    US->>DB: SELECT * FROM users WHERE address=?
    alt 用户不存在
        US->>DB: INSERT INTO users (address, balance, claimable)
    end
    DB-->>US: User
    US-->>AS: User
    AS->>AS: 生成 JWT Token
    AS-->>AC: {accessToken, user}
    AC-->>C: 200 OK
```

---

## 2. 余额功能

### 2.1 查询余额

**端点**: `GET /api/users/balance`

```mermaid
sequenceDiagram
    participant C as Client
    participant UC as UsersController
    participant US as UsersService
    participant DB as Database

    C->>UC: GET /balance (JWT)
    UC->>US: getBalance(userId)
    US->>DB: SELECT balance, claimable FROM users WHERE id=?
    DB-->>US: {balance, claimable}
    US->>DB: SELECT SUM(amount) FROM bets WHERE userId=? AND status='active'
    DB-->>US: inBets
    US->>US: total = balance + claimable + inBets
    US-->>UC: {available, claimable, inBets, total}
    UC-->>C: 200 OK
```

**返回结构**:
```json
{
  "available": "1000.00",
  "claimable": "50.00",
  "inBets": "200.00",
  "total": "1250.00"
}
```

---

### 2.2 领取余额

**端点**: `POST /api/users/claim`

```mermaid
sequenceDiagram
    participant C as Client
    participant UC as UsersController
    participant US as UsersService
    participant DB as Database

    C->>UC: POST /claim (JWT)
    UC->>US: claim(userId)
    US->>DB: BEGIN TRANSACTION
    US->>DB: SELECT claimable FROM users WHERE id=? FOR UPDATE
    alt claimable = 0
        US->>DB: ROLLBACK
        US-->>UC: {claimed: "0", newBalance: "..."}
    end
    US->>DB: UPDATE users SET balance += claimable, claimable = 0
    US->>DB: INSERT transactions (type=CLAIM, amount=claimable)
    US->>DB: COMMIT
    US-->>UC: {claimed, newBalance}
    UC-->>C: 200 OK
```

---

### 2.3 扣减余额 (内部方法)

**调用方**: `BetService`, `WithdrawSignerService`

```mermaid
sequenceDiagram
    participant Caller as 调用方
    participant US as UsersService
    participant DB as Database

    Caller->>US: deductBalance(userId, amount, options)
    US->>DB: BEGIN TRANSACTION
    US->>DB: SELECT balance FROM users WHERE id=? FOR UPDATE
    alt balance < amount
        US->>DB: ROLLBACK
        US-->>Caller: BadRequestException("余额不足")
    end
    US->>DB: UPDATE users SET balance -= amount
    US->>DB: INSERT transactions (type=?, amount=?, refType=?, remark=?)
    US->>DB: COMMIT
    US-->>Caller: User
```

---

### 2.4 结算赢/输 (内部方法)

**调用方**: `SettlementService`

```mermaid
sequenceDiagram
    participant SS as SettlementService
    participant US as UsersService
    participant DB as Database

    SS->>US: settleWin(userId, payout, betId)
    US->>DB: BEGIN TRANSACTION
    US->>DB: UPDATE users SET claimable += payout WHERE id=?
    US->>DB: INSERT transactions (type=WIN, amount=payout, refId=betId)
    US->>DB: COMMIT
    US-->>SS: User
    
    Note over SS, DB: settleLose 流程类似, type=LOSE
```

---

## 3. 流水功能

### 3.1 查询流水

**端点**: `GET /api/users/balance/logs`

```mermaid
sequenceDiagram
    participant C as Client
    participant UC as UsersController
    participant US as UsersService
    participant DB as Database

    C->>UC: GET /balance/logs?page=1&limit=20&type=BET
    UC->>US: getTransactions(userId, limit, offset, type)
    US->>DB: SELECT * FROM transactions WHERE userId=? AND type=? ORDER BY createdAt DESC
    DB-->>US: items[]
    US->>DB: SELECT COUNT(*) FROM transactions WHERE userId=? AND type=?
    DB-->>US: total
    US-->>UC: {items, total}
    UC-->>C: 200 OK {items, total, page, limit}
```

**流水类型 (TransactionType)**:
- `DEPOSIT` - 充值
- `WITHDRAW` - 提现
- `BET` - 下注扣款
- `WIN` - 结算赢
- `LOSE` - 结算输退款
- `CLAIM` - 领取
