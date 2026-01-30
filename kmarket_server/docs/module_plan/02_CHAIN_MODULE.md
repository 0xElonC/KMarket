# Chain 模块设计文档

> Chain Module - 链上数据获取与合约事件监听

---

## 1. 模块概述

### 1.1 核心职责

| 功能 | 说明 | 状态 |
|------|------|------|
| **合约事件监听** | 监听 Deposit/Withdraw 等事件 | ⏳ 待ABI |
| **提现签名** | 生成 EIP-712 提现凭证 | ⏳ 待ABI |
| **链上数据查询** | 查询用户链上余额等 | ⏳ 待ABI |
| **签名验证** | 验证用户下注签名 | ⏳ 待ABI |

### 1.2 模块依赖

```
┌─────────────────────────────────────────────────────────┐
│                     ChainModule                          │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Deposit    │  │  Withdraw   │  │  Signature  │     │
│  │  Listener   │  │  Signer     │  │  Verify     │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         ▼                ▼                ▼             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ethers.js v6                        │   │
│  │  Provider | Contract | Wallet | TypedDataEncoder │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 Blockchain RPC                   │   │
│  │          (Polygon / Arbitrum / Base)             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技术选型

### 2.1 Web3 库对比

| 库 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| **ethers.js v6** | 类型完善、体积小、稳定 | API 变化较大 | ✅ 推荐 |
| viem | 新一代、性能好 | 生态较新 | 可选 |
| web3.js | 老牌、文档多 | 体积大、类型差 | ❌ |

**选择: ethers.js v6**

### 2.2 已安装依赖

```bash
npm install ethers@^6
```

---

## 3. ethers.js v6 使用指南

### 3.1 Provider (连接区块链)

```typescript
import { JsonRpcProvider, WebSocketProvider } from 'ethers';

// HTTP Provider (用于普通查询)
const httpProvider = new JsonRpcProvider('https://polygon-rpc.com');

// WebSocket Provider (用于事件监听)
const wsProvider = new WebSocketProvider('wss://polygon-rpc.com');

// 查询区块号
const blockNumber = await httpProvider.getBlockNumber();
```

### 3.2 Contract (合约交互)

```typescript
import { Contract } from 'ethers';

// 合约实例 (只读)
const contract = new Contract(
  '0x合约地址',
  ['event Deposit(address indexed user, uint256 amount)'], // ABI
  provider
);

// 监听事件
contract.on('Deposit', (user, amount, event) => {
  console.log(`User ${user} deposited ${amount}`);
});

// 查询合约状态
const balance = await contract.balanceOf(userAddress);
```

### 3.3 Wallet (签名交易)

```typescript
import { Wallet } from 'ethers';

// 从私钥创建钱包
const wallet = new Wallet(privateKey, provider);

// 签名消息
const signature = await wallet.signMessage('Hello');

// 发送交易
const tx = await wallet.sendTransaction({
  to: '0x...',
  value: parseEther('0.1'),
});
```

### 3.4 TypedDataEncoder (EIP-712 签名)

```typescript
import { TypedDataEncoder } from 'ethers';

// EIP-712 Domain
const domain = {
  name: 'KMarket',
  version: '1',
  chainId: 137,
  verifyingContract: '0x合约地址',
};

// 类型定义
const types = {
  Withdraw: [
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

// 数据
const value = {
  user: '0x用户地址',
  amount: parseEther('100'),
  nonce: 1,
};

// 服务端签名
const signature = await wallet.signTypedData(domain, types, value);

// 验证签名
const recoveredAddress = verifyTypedData(domain, types, value, signature);
```

### 3.5 事件监听模式

```typescript
// 方式1: 实时监听 (WebSocket)
contract.on('Deposit', handler);

// 方式2: 历史查询 + 监听
const filter = contract.filters.Deposit();
const events = await contract.queryFilter(filter, fromBlock, toBlock);

// 方式3: 轮询 (适合 HTTP Provider)
setInterval(async () => {
  const latestBlock = await provider.getBlockNumber();
  const events = await contract.queryFilter(filter, lastBlock, latestBlock);
  // 处理事件...
}, 5000);
```

---

## 4. 配置设计

### 4.1 环境变量

```env
# 区块链 RPC
RPC_URL=https://polygon-rpc.com
RPC_WS_URL=wss://polygon-rpc.com

# 合约地址 (待部署后填写)
VAULT_CONTRACT_ADDRESS=0x...

# 服务端签名私钥 (用于生成提现凭证)
SERVER_PRIVATE_KEY=0x...

# 链 ID
CHAIN_ID=137
```

### 4.2 配置文件

```typescript
// src/common/config/configuration.ts
export default () => ({
  chain: {
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',
    rpcWsUrl: process.env.RPC_WS_URL,
    vaultAddress: process.env.VAULT_CONTRACT_ADDRESS || '',
    serverPrivateKey: process.env.SERVER_PRIVATE_KEY || '',
    chainId: parseInt(process.env.CHAIN_ID || '137', 10),
  },
});
```

---

## 5. 模块结构 (预规划)

```
src/chain/
├── abis/
│   └── KMarketVault.json       # 合约 ABI (待补充)
├── services/
│   ├── provider.service.ts     # Provider 管理
│   ├── deposit-listener.service.ts   # 充值监听 (待实现)
│   ├── withdraw-signer.service.ts    # 提现签名 (待实现)
│   └── signature-verify.service.ts   # 签名验证 (待实现)
├── dto/
│   └── withdraw.dto.ts
├── chain.controller.ts
├── chain.module.ts
└── index.ts
```

---

## 6. 待开发功能

> 以下功能需要合约 ABI 后才能详细设计

### 6.1 充值监听 (DepositListener)

```typescript
// 伪代码 - 待 ABI 后实现
@Injectable()
export class DepositListenerService implements OnModuleInit {
  async onModuleInit() {
    // 监听合约 Deposit 事件
    this.contract.on('Deposit', async (user, amount, event) => {
      // 1. 查找用户
      // 2. 调用 usersService.addBalance()
      // 3. 记录已处理的区块
    });
  }
}
```

### 6.2 提现签名 (WithdrawSigner)

```typescript
// 伪代码 - 待 ABI 后实现
@Injectable()
export class WithdrawSignerService {
  async createWithdrawCoupon(userId: number, amount: string) {
    // 1. 验证用户余额
    // 2. 扣减数据库余额
    // 3. 生成 EIP-712 签名
    // 4. 返回 Coupon
    return {
      user: userAddress,
      amount: amount,
      nonce: withdrawNonce,
      signature: signature,
    };
  }
}
```

### 6.3 签名验证 (SignatureVerify)

```typescript
// 伪代码 - 待 ABI 后实现
@Injectable()
export class SignatureVerifyService {
  verifyBetSignature(bet: CreateBetDto): boolean {
    // 1. 构建 EIP-712 数据
    // 2. 恢复签名地址
    // 3. 对比请求地址
    return recoveredAddress === bet.userAddress;
  }
}
```

---

## 7. 下一步

1. ⏳ 等待合约开发完成，获取 ABI
2. ⏳ 确定 EIP-712 类型定义
3. ⏳ 实现充值监听服务
4. ⏳ 实现提现签名服务
5. ⏳ 实现下注签名验证

---

## 附录: ethers.js v6 常用 API

```typescript
import {
  // Providers
  JsonRpcProvider,
  WebSocketProvider,
  
  // Contract
  Contract,
  Interface,
  
  // Wallet & Signing
  Wallet,
  verifyMessage,
  verifyTypedData,
  
  // Utils
  parseEther,
  formatEther,
  parseUnits,
  formatUnits,
  isAddress,
  getAddress,
  
  // ABI
  AbiCoder,
  
  // Types
  TypedDataEncoder,
} from 'ethers';
```
