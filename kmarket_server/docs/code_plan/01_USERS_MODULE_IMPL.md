# Users 模块实施计划

> 基于 [01_USERS_MODULE.md](../module_plan/01_USERS_MODULE.md) 设计文档的代码实现计划

---

## 1. 数据库表结构

### 1.1 表概览

| 表名 | 所属模块 | 职责 | 状态 |
|------|----------|------|:----:|
| `users` | Users | 用户账户信息和余额 | ✅ 已完成 (claimable) |
| `transactions` | Users | 余额流水记录 | ✅ 已完成 |
| `bets` | Trade | 下注订单记录 | ✅ 已实现 (Trade模块) |

### 1.2 users 表 - 用户账户

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK, Auto | 用户ID |
| `address` | varchar(42) | Unique, Index | 钱包地址 (小写) |
| `balance` | decimal(36,18) | Default '0' | 可用余额 (可下注/可提现) |
| `claimable` | decimal(36,18) | Default '0' | **[新增]** 待领取余额 |
| ~~`frozenBalance`~~ | decimal(36,18) | Default '0' | ~~冻结余额~~ (废弃) |
| `withdrawNonce` | int | Default 0 | 提现计数器 (防重放) |
| `isActive` | boolean | Default true | 账户状态 |
| `createdAt` | timestamp | Auto | 创建时间 |
| `updatedAt` | timestamp | Auto | 更新时间 |

> **资金流向**:
> - 下注: `balance` → `bets` 表
> - 结算: → `claimable` (待领取)
> - 领取: `claimable` → `balance`

### 1.3 transactions 表 - 余额流水

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | bigint | PK, Auto | 流水ID |
| `userId` | int | FK, Index | 用户ID |
| `type` | enum | Not Null | 变动类型 |
| `status` | enum | Default PENDING | 状态 |
| `amount` | decimal(36,18) | Not Null | 变动金额 |
| `balanceBefore` | decimal(36,18) | Default '0' | 变动前余额 |
| `balanceAfter` | decimal(36,18) | Default '0' | 变动后余额 |
| `txHash` | varchar(66) | nullable, Index | 链上交易哈希 |
| `metadata` | jsonb | nullable | 扩展数据 |
| `refType` | varchar(20) | nullable | **[新增]** 关联业务类型 |
| `refId` | varchar(100) | nullable | **[新增]** 关联业务ID |
| `remark` | varchar(255) | nullable | **[新增]** 备注 |
| `createdAt` | timestamp | Auto, Index | 创建时间 |

**type 枚举值:**

| 值 | 说明 | 余额影响 |
|------|------|----------|
| `deposit` | 充值 | balance +amount |
| `withdraw` | 提现 | balance -amount |
| `bet` | 下注扣款 | balance -amount |
| `win` | 结算赢 | claimable +payout |
| `lose` | 结算输退款 | claimable +refund |
| `claim` | 领取待领取余额 | claimable → balance |
| `refund` | 订单取消退款 | balance +amount |
| `admin_adjust` | 管理员调整 | ±amount |

### 1.4 bets 表 - 下注订单 (Trade 模块)

> Users 模块只需从此表聚合 `status='active'` 的订单金额作为"在押资金"

```sql
SELECT COALESCE(SUM(amount), 0) FROM bets WHERE userId = ? AND status = 'active'
```

---

## 2. REST API 业务流程

### 2.1 F01 - 获取登录 Nonce

**路由**: `POST /api/users/auth/nonce`

**业务流程**:
```
1. 前端请求 → { address: "0x..." }
2. 后端生成随机 Nonce: "Sign this message to login KMarket: {timestamp}-{random}"
3. 返回 { nonce, expiresAt }
4. 前端使用此 nonce 让用户签名
```

**状态**: ✅ 已实现

---

### 2.2 F02 - 钱包签名登录

**路由**: `POST /api/users/auth/login`

**业务流程**:
```
1. 前端请求 → { address, message, signature }
2. 后端使用 ecrecover 验证签名
   └── 签名无效 → 返回 401 UnauthorizedException
3. 根据 address 查找用户，不存在则自动创建
4. 生成 JWT Token (7天有效期)
5. 返回 { accessToken, user: { id, address } }
```

**状态**: ✅ 已实现

---

### 2.3 F03 - 获取余额

**路由**: `GET /api/users/balance` (需 JWT)

**业务流程**:
```
1. 从 JWT 解析 userId
2. 查询 users 表获取 balance 和 claimable
3. 调用 getInBetsAmount() 聚合 bets 表活跃订单
4. 计算总资产: total = available + claimable + inBets
5. 返回 { available, claimable, inBets, total }
```

**响应格式**:
```json
{
  "available": "1000.000000",
  "claimable": "150.000000",
  "inBets": "50.000000",
  "total": "1200.000000"
}
```

**状态**: ✅ 已完成

---

### 2.4 F04 - 获取余额流水

**路由**: `GET /api/users/balance/logs` (需 JWT)

**业务流程**:
```
1. 从 JWT 解析 userId
2. 解析查询参数: page, limit, type(可选)
3. 查询 transactions 表
   └── type 有值 → WHERE type = ?
4. 返回分页结果 { items, total, page, limit }
```

**状态**: ✅ 已完成

---

### 2.5 F05 - 领取待领取余额 **[新增]**

**路由**: `POST /api/users/claim` (需 JWT)

**业务流程**:
```
1. 从 JWT 解析 userId
2. 查询用户 claimable 余额
   └── claimable = 0 → 返回错误 "无可领取金额"
3. 开启事务
4. balance += claimable
5. claimable = 0
6. 记录流水 (type: claim)
7. 提交事务
8. 返回 { claimed, newBalance }
```

**响应格式**:
```json
{
  "claimed": "150.000000",
  "newBalance": "1150.000000"
}
```

**状态**: ✅ 已完成

---

## 3. Service 内部接口业务流程

### 3.1 S04 - addBalance (增加余额)

**调用方**: ChainModule (充值同步)

**业务流程**:
```
1. 开启事务
2. SELECT ... FOR UPDATE 锁定用户行
3. 计算新余额: newBalance = balance + amount
4. UPDATE users SET balance = newBalance
5. INSERT INTO transactions (记录流水)
6. 提交事务
7. 返回更新后的用户
```

**参数**:
```typescript
addBalance(userId, amount, {
  type: TransactionType.DEPOSIT,
  refType: 'chain_deposit',
  refId: txHash,
  txHash: txHash,
  remark: 'Block #12345'
})
```

---

### 3.2 S05 - deductBalance (扣减余额)

**调用方**: TradeModule (下注扣款)

**业务流程**:
```
1. 开启事务
2. SELECT ... FOR UPDATE 锁定用户行
3. 检查余额: balance >= amount
   └── 余额不足 → throw InsufficientBalanceException
4. 计算新余额: newBalance = balance - amount
5. UPDATE users SET balance = newBalance
6. INSERT INTO transactions (记录流水)
7. 提交事务
```

---

### 3.3 S06 - settleWin (结算赢)

**调用方**: TradeModule (结算引擎)

**业务流程**:
```
1. 计算赔付金额: payout = 本金 × 赔率
2. 开启事务
3. SELECT ... FOR UPDATE 锁定用户行
4. UPDATE users SET claimable += payout  ← 进入待领取余额
5. INSERT INTO transactions (type: WIN, refType: 'bet', refId: betId)
6. 提交事务
```

**示例**: 用户下注 100，赔率 1.85，赢了获得 185 (进入 claimable)

> **注意**: 赔付进入 `claimable` 而非 `balance`，用户需手动领取

---

### 3.4 S07 - settleLose (结算输)

**调用方**: TradeModule (结算引擎)

**业务流程**:
```
1. 计算退款金额: refund = 本金 / 赔率
2. 如果 refund > 0:
   └── 开启事务
   └── UPDATE users SET claimable += refund  ← 进入待领取余额
   └── INSERT INTO transactions (type: LOSE, refType: 'bet', refId: betId)
3. 如果 refund = 0:
   └── 不产生流水 (全亏)
```

**示例**: 用户下注 100，赔率 2.0，输了退还 50 (进入 claimable)

> **注意**: 退款进入 `claimable` 而非 `balance`，用户需手动领取

---

### 3.5 S08 - getInBetsAmount (获取在押资金)

**调用方**: getBalance()

**业务流程**:
```
1. 执行聚合查询:
   SELECT COALESCE(SUM(amount), 0) 
   FROM bets 
   WHERE userId = ? AND status = 'active'
2. 返回聚合结果字符串
```

---

### 3.6 S09 - addBalanceFromDeposit (幂等充值)

**调用方**: ChainModule (链上事件同步)

**业务流程**:
```
1. 检查 txHash 是否已处理:
   SELECT * FROM transactions WHERE txHash = ?
   └── 已存在 → 跳过，返回 null
2. 不存在 → 调用 addBalance(...)
```

**目的**: 防止重复充值 (链上事件可能重复推送)

---

### 3.7 S10 - claim (领取待领取余额) **[新增]**

**调用方**: UsersController

**业务流程**:
```
1. 开启事务
2. SELECT ... FOR UPDATE 锁定用户行
3. 检查 claimable > 0
   └── claimable = 0 → throw BadRequestException
4. claimed = claimable
5. balance += claimable
6. claimable = 0
7. INSERT INTO transactions (type: CLAIM, amount: claimed)
8. 提交事务
9. 返回 { claimed, newBalance }
```

---

## 4. 数据库变更

### 4.1 transactions 表 - 新增字段

| 字段 | 类型 | 约束 |
|------|------|------|
| `refType` | varchar(20) | nullable |
| `refId` | varchar(100) | nullable |
| `remark` | varchar(255) | nullable |

### 4.2 users 表 - 新增字段

| 字段 | 类型 | 约束 |
|------|------|------|
| `claimable` | decimal(36,18) | Default '0' |

### 4.3 TransactionType 枚举调整

| 移除 | 保留 | 新增 |
|------|------|------|
| ~~LOSS~~ | DEPOSIT | LOSE |
| ~~FREEZE~~ | WITHDRAW | CLAIM |
| ~~UNFREEZE~~ | BET / WIN / REFUND | ADMIN_ADJUST |

---

## 5. 实施步骤

### Phase 1: 数据层
1. `user.entity.ts` - 新增 `claimable` 字段，标记 `frozenBalance` 为 @deprecated
2. `transaction.entity.ts` - 添加 refType/refId/remark 字段 + 调整枚举 (增加 LOSE, CLAIM)

### Phase 2: Service 层
1. 重构 `addBalance()` / `deductBalance()` 参数
2. 实现 `settleWin()` / `settleLose()` - 赔付进入 claimable
3. 实现 `claim()` - 领取逻辑
4. 实现 `getInBetsAmount()` / `addBalanceFromDeposit()`
5. 调整 `getBalance()` 返回 claimable 字段
6. 调整 `getTransactions()` 支持 type 过滤

### Phase 3: Controller + DTO
1. 创建 `balance.dto.ts` (包含 claimable)
2. 新增 `POST /api/users/claim` 接口
3. 调整路由和响应格式

---

## 6. 文件变更清单

| 操作 | 文件 | 变更说明 |
|:----:|------|----------|
| MODIFY | `src/users/entities/user.entity.ts` | 新增 claimable 字段 |
| MODIFY | `src/users/entities/transaction.entity.ts` | 新增字段 + 调整枚举 |
| MODIFY | `src/users/users.service.ts` | 新增 claim()，调整结算逻辑 |
| MODIFY | `src/users/users.controller.ts` | 新增 claim 接口 |
| NEW | `src/users/dto/balance.dto.ts` | 余额响应 DTO (含 claimable) |
| NEW | `src/users/dto/claim.dto.ts` | 领取响应 DTO |
| MODIFY | `src/users/dto/index.ts` | 导出新 DTO |
