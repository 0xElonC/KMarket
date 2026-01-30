# 功能流程详解 - Chain Module

> 链服务 - 充值监听、提现签名、链上查询

---

## 1. 充值监听

### 1.1 监听链上事件

**服务**: `DepositListenerService`

```mermaid
sequenceDiagram
    participant BC as Blockchain
    participant PV as ProviderService
    participant DL as DepositListenerService
    participant US as UsersService
    participant DB as Database

    Note over DL: 服务启动时初始化
    DL->>PV: getVaultContract()
    PV-->>DL: Vault Contract Instance
    
    loop WebSocket 监听
        BC->>DL: Event: Deposited(user, amount)
        DL->>DL: 解析事件, 获取 txHash
        DL->>US: findByAddress(userAddress)
        alt 用户不存在
            US->>DB: INSERT users (address)
        end
        DL->>US: addBalanceFromDeposit(userId, amount, txHash)
        US->>DB: 检查 txHash 幂等
        alt 新交易
            US->>DB: balance += amount
            US->>DB: INSERT transactions
        end
    end
```

### 1.2 Fallback 轮询

```mermaid
sequenceDiagram
    participant Cron as 定时任务
    participant DL as DepositListenerService
    participant PV as ProviderService
    participant BC as Blockchain

    loop 每 30 秒
        Cron->>DL: pollDeposits()
        DL->>PV: getBlockNumber()
        PV->>BC: eth_blockNumber
        BC-->>PV: currentBlock
        DL->>DL: fromBlock = lastProcessedBlock + 1
        DL->>BC: queryFilter(Deposited, fromBlock, currentBlock)
        BC-->>DL: events[]
        loop 每个事件
            DL->>DL: processDeposit(event)
        end
        DL->>DL: lastProcessedBlock = currentBlock
    end
```

---

## 2. 提现签名

### 2.1 请求提现凭证

**端点**: `POST /api/chain/withdraw-request`

```mermaid
sequenceDiagram
    participant C as Client
    participant CC as ChainController
    participant WS as WithdrawSignerService
    participant US as UsersService
    participant DB as Database

    C->>CC: POST /withdraw-request {amount} (JWT)
    CC->>WS: createWithdrawCoupon(userId, address, amount)
    WS->>US: deductBalance(userId, amount, {type: WITHDRAW})
    alt 余额不足
        US-->>WS: BadRequestException
        WS-->>CC: Error
        CC-->>C: 400 余额不足
    end
    WS->>US: incrementWithdrawNonce(userId)
    US->>DB: UPDATE users SET withdrawNonce += 1
    DB-->>US: newNonce
    WS->>WS: 构建 EIP-712 消息
    WS->>WS: 使用服务器私钥签名
    WS-->>CC: {coupon: {amount, nonce, deadline, signature}}
    CC-->>C: 200 OK
```

### 2.2 用户链上提现

```mermaid
sequenceDiagram
    participant FE as 前端
    participant U as 用户钱包
    participant BC as Blockchain
    participant VC as Vault 合约

    FE->>U: 调用 withdraw(coupon)
    U->>BC: 发送交易
    BC->>VC: withdraw(amount, nonce, deadline, signature)
    VC->>VC: 验证 EIP-712 签名
    VC->>VC: 验证 nonce 未使用
    VC->>VC: 验证 deadline 未过期
    alt 验证失败
        VC-->>BC: revert
    end
    VC->>U: 转账 USDC
    VC->>BC: emit Withdrawn(user, amount)
    BC-->>U: 交易成功
```

---

## 3. 链上查询

### 3.1 查询 Vault 余额

**端点**: `GET /api/chain/vault-balance`

```mermaid
sequenceDiagram
    participant C as Client
    participant CC as ChainController
    participant CQ as ChainQueryService
    participant BC as Blockchain

    C->>CC: GET /vault-balance (JWT)
    CC->>CQ: getVaultBalance(userAddress)
    CQ->>BC: vault.balanceOf(userAddress)
    BC-->>CQ: balance (wei)
    CQ->>BC: provider.getBlockNumber()
    BC-->>CQ: blockNumber
    CQ-->>CC: {address, vaultBalance, blockNumber}
    CC-->>C: 200 OK
```

### 3.2 获取链服务状态

**端点**: `GET /api/chain/status`

```mermaid
sequenceDiagram
    participant C as Client
    participant CC as ChainController
    participant DL as DepositListenerService
    participant CQ as ChainQueryService
    participant WS as WithdrawSignerService

    C->>CC: GET /status
    CC->>DL: getStatus()
    DL-->>CC: {isListening, lastBlock, mode}
    CC->>CQ: getChainId()
    CQ-->>CC: chainId
    CC->>CQ: getBlockNumber()
    CQ-->>CC: blockNumber
    CC->>WS: getServerAddress()
    WS-->>CC: serverAddress
    CC->>CQ: isReady()
    CQ-->>CC: boolean
    CC-->>C: 200 {chainId, blockNumber, depositListener, serverAddress, isReady}
```
