# Chain 模块实施计划

> 基于 [02_CHAIN_MODULE.md](../module_plan/02_CHAIN_MODULE.md) 设计文档的代码实现计划

---

## 1. 模块现状分析

### 1.1 已实现功能

| 功能 | 文件 | 状态 | 说明 |
|------|------|:----:|------|
| 充值监听 | `deposit-listener.service.ts` | ✅ | WebSocket 模式已支持 |
| 提现签名 | `withdraw-signer.service.ts` | ✅ | EIP-712 签名已支持 |
| 签名验证 | `signature-verify.service.ts` | ⚠️ | 下注签名已废弃，待调整 |
| 合约 ABI | `abis/KMarketVault.json` | ✅ | Deposit/Withdraw 事件 |
| 控制器 | `chain.controller.ts` | ✅ | 提现请求接口 |

### 1.2 待实现/优化功能

| 功能 | 优先级 | 说明 |
|------|:------:|------|
| Provider 统一管理 | ✅ 完成 | ProviderService 统一管理 |
| HTTP 轮询模式 | ✅ 完成 | WebSocket 不可用时自动切换 |
| 链上余额查询 | ✅ 完成 | ChainQueryService 已实现 |
| 动态 chainId | ✅ 完成 | 从配置读取 |
| 服务状态接口 | ✅ 完成 | GET /chain/status |

---

## 2. 配置层设计

### 2.1 环境变量

| 变量名 | 说明 | 默认值 | 状态 |
|--------|------|--------|:----:|
| `RPC_URL` | HTTP RPC 地址 | `https://polygon-rpc.com` | ✅ 已有 |
| `RPC_WS_URL` | WebSocket RPC 地址 | - | ✅ 已添加 |
| `VAULT_ADDRESS` | Vault 合约地址 | - | ✅ 已有 |
| `SERVER_PRIVATE_KEY` | 服务端签名私钥 | - | ✅ 已有 |
| `CHAIN_ID` | 链 ID | `137` | ✅ 已添加 |
| `START_BLOCK` | 监听起始区块 | `0` | ✅ 已添加 |
| `POLL_INTERVAL` | 轮询间隔 (ms) | `5000` | ✅ 已添加 |

### 2.2 configuration.ts 配置结构

```typescript
chain: {
  rpcUrl: string;      // HTTP RPC
  rpcWsUrl: string;    // [新增] WebSocket RPC
  vaultAddress: string;
  serverPrivateKey: string;
  chainId: number;     // [新增] 链 ID
  startBlock: number;  // [新增] 监听起始区块
  pollInterval: number; // [新增] 轮询间隔
}
```

---

## 3. Service 层设计

### 3.1 S01 - ProviderService (Provider 统一管理) **[新增]**

**职责**: 统一管理区块链 Provider 连接

**提供接口**:
```typescript
getHttpProvider(): JsonRpcProvider | null
getWsProvider(): WebSocketProvider | null
getActiveProvider(): Provider | null
getVaultContract(): Contract | null
getVaultContractWithProvider(provider: Provider): Contract | null
getChainId(): number
hasWebSocket(): boolean
```

**业务流程**:
```
1. onModuleInit 时初始化:
   ├── 创建 HttpProvider (必需)
   ├── 尝试创建 WsProvider (可选)
   └── 实例化 Vault 合约
2. 提供统一的 Provider 获取接口
3. onModuleDestroy 时清理 WebSocket 连接
```

**状态**: ✅ 已完成

---

### 3.2 S02 - DepositListenerService (充值监听)

**职责**: 监听链上 Deposit 事件，同步用户余额

**现有能力**:
- WebSocket 实时监听 ✅

**需要增强**:
- HTTP 轮询模式 (WebSocket 不可用时) ⏳
- 起始区块配置 ⏳
- 已处理区块记录 ⏳
- 服务状态查询 ⏳

**业务流程**:
```
onModuleInit:
├── 优先模式: WebSocket 实时监听
│   └── contract.on('Deposit', handler)
│
└── 备选模式: HTTP 轮询
    ├── 初始化 lastProcessedBlock
    └── setInterval 定时查询事件

handleDepositEvent(user, amount, event):
├── 解析事件数据
├── 查找或创建用户
├── 调用 usersService.addBalanceFromDeposit()
└── 记录处理日志
```

**状态**: ✅ 已完成

---

### 3.3 S03 - WithdrawSignerService (提现签名)

**职责**: 生成 EIP-712 提现凭证

**现有能力**:
- EIP-712 签名 ✅
- 余额验证与扣减 ✅
- Nonce 递增 ✅

**需要调整**:
- 动态 chainId (从 ProviderService 获取) ⏳
- 注入 ProviderService 依赖 ⏳

**业务流程**:
```
createWithdrawCoupon(userId, userAddress, amount):
├── 验证余额充足
├── 扣减 balance (调用 usersService)
├── 递增 withdrawNonce
├── 构建 EIP-712 数据
│   ├── domain: { name, version, chainId, verifyingContract }
│   └── message: { user, amount, nonce, expiry }
├── 使用服务端私钥签名
└── 返回 Coupon { user, amount, nonce, expiry, signature }
```

**状态**: ✅ 已完成

---

### 3.4 S04 - ChainQueryService (链上查询) **[新增]**

**职责**: 提供链上数据查询能力

**提供接口**:
```typescript
getVaultBalance(userAddress: string): Promise<ChainBalance | null>
getBlockNumber(): Promise<number | null>
getChainId(): number
```

**业务流程**:
```
getVaultBalance(userAddress):
├── 获取 Vault 合约实例
├── 调用 contract.balanceOf(userAddress)
├── 获取当前区块号
└── 返回 { address, vaultBalance, blockNumber }
```

**状态**: ✅ 已完成

---

### 3.5 S05 - SignatureVerifyService (签名验证)

**职责**: 验证用户签名 (通用消息签名)

**现有能力**:
- 下注签名验证 (已废弃需求)

**调整说明**:
- 根据设计文档，下注不再需要签名验证
- 保留通用签名验证能力供未来使用

**状态**: ✅ 已保留 (通用签名验证)

---

## 4. REST API 业务流程

### 4.1 F01 - 请求提现凭证

**路由**: `POST /api/chain/withdraw-request` (需 JWT)

**业务流程**:
```
1. 从 JWT 解析 userId 和 address
2. 解析请求参数 { amount }
3. 调用 withdrawSignerService.createWithdrawCoupon()
4. 返回 { user, amount, nonce, expiry, signature }
```

**状态**: ✅ 已实现

---

### 4.2 F02 - 查询链上 Vault 余额 **[新增]**

**路由**: `GET /api/chain/vault-balance` (需 JWT)

**业务流程**:
```
1. 从 JWT 解析 address
2. 调用 chainQueryService.getVaultBalance(address)
3. 返回 { address, vaultBalance, blockNumber }
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "address": "0x1234...abcd",
    "vaultBalance": "1000000000000000000",
    "blockNumber": 12345678
  }
}
```

**状态**: ✅ 已实现

---

### 4.3 F03 - 获取服务状态 **[新增]**

**路由**: `GET /api/chain/status` (无需认证)

**业务流程**:
```
1. 获取 depositListener 状态 (mode, isListening, lastBlock)
2. 获取 chainId
3. 获取当前区块号
4. 获取服务端签名地址
5. 返回综合状态信息
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "chainId": 137,
    "blockNumber": 12345678,
    "depositListener": {
      "isListening": true,
      "mode": "websocket",
      "lastBlock": 12345678
    },
    "serverAddress": "0xsigner..."
  }
}
```

**状态**: ✅ 已实现

---

## 5. 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                       ChainModule                            │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ ProviderService │ ◄── 核心：管理所有 Provider            │
│  └────────┬────────┘                                        │
│           │                                                  │
│     ┌─────┴─────┬─────────────┬─────────────┐              │
│     ▼           ▼             ▼             ▼              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │Deposit  │ │Withdraw │ │Chain    │ │Signature│           │
│ │Listener │ │Signer   │ │Query    │ │Verify   │           │
│ └────┬────┘ └────┬────┘ └─────────┘ └─────────┘           │
│      │           │                                          │
│      └─────┬─────┘                                          │
│            ▼                                                 │
│      ┌───────────┐                                          │
│      │UsersModule│ (余额操作)                               │
│      └───────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 实施步骤

### Phase 1: 配置层更新

1. **configuration.ts** - 新增 chain 配置字段
2. **.env** - 添加环境变量模板

### Phase 2: Provider 服务

1. **[NEW] provider.service.ts** - 实现 Provider 统一管理
2. **services/index.ts** - 导出新服务

### Phase 3: 服务层重构

1. **deposit-listener.service.ts** - 添加 HTTP 轮询支持
2. **withdraw-signer.service.ts** - 注入 ProviderService，动态 chainId
3. **[NEW] chain-query.service.ts** - 实现链上查询服务

### Phase 4: 控制器扩展

1. **chain.controller.ts** - 新增 vault-balance 和 status 接口
2. **chain.module.ts** - 注册新服务和导出

### Phase 5: 验证

1. 编译测试 `npm run build`
2. 启动测试 `npm run start:dev`
3. API 测试 `curl http://localhost:3000/chain/status`

---

## 7. 文件变更清单

| 操作 | 文件 | 变更说明 |
|:----:|------|----------|
| MODIFY | `src/common/config/configuration.ts` | 新增 chainId, rpcWsUrl 等字段 |
| MODIFY | `.env` | 添加链相关环境变量 |
| NEW | `src/chain/services/provider.service.ts` | Provider 统一管理服务 |
| NEW | `src/chain/services/chain-query.service.ts` | 链上数据查询服务 |
| MODIFY | `src/chain/services/deposit-listener.service.ts` | 添加 HTTP 轮询支持 |
| MODIFY | `src/chain/services/withdraw-signer.service.ts` | 动态 chainId |
| MODIFY | `src/chain/services/index.ts` | 导出新服务 |
| MODIFY | `src/chain/chain.module.ts` | 注册新服务 |
| MODIFY | `src/chain/chain.controller.ts` | 新增 API 接口 |

---

## 8. 接口定义

### 8.1 ChainBalance (响应类型)

```typescript
interface ChainBalance {
  address: string;
  vaultBalance: string;
  blockNumber: number;
}
```

### 8.2 ListenerStatus (状态类型)

```typescript
interface ListenerStatus {
  isListening: boolean;
  mode: 'websocket' | 'polling';
  lastBlock: number;
}
```

### 8.3 ChainStatus (综合状态)

```typescript
interface ChainStatus {
  chainId: number;
  blockNumber: number | null;
  depositListener: ListenerStatus;
  serverAddress: string | null;
}
```
