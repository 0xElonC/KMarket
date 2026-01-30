# KMarket 智能合约技术文档

## 文档版本

- **版本**: v1.0.0
- **更新日期**: 2024-01-30
- **Solidity 版本**: 0.8.24
- **网络**: Polygon / Ethereum

---

## 目录

1. [合约概览](#合约概览)
2. [UserProxyWallet 用户代理钱包](#userproxywallet-用户代理钱包)
3. [Vault 资金托管合约](#vault-资金托管合约)
4. [TradingEngine 交易引擎](#tradingengine-交易引擎)
5. [ProxyWalletFactory 钱包工厂](#proxywalletfactory-钱包工厂)
6. [数据结构定义](#数据结构定义)
7. [错误码说明](#错误码说明)
8. [集成指南](#集成指南)

---

## 合约概览

### 合约关系图

```
┌─────────────────────────────────────────────┐
│          ProxyWalletFactory                 │
│  (创建和管理用户代理钱包)                     │
└────────────┬────────────────────────────────┘
             │ creates
             ↓
┌─────────────────────────────────────────────┐
│          UserProxyWallet                    │
│  (用户的链上账户代理)                        │
└────────────┬────────────────────────────────┘
             │ interacts with
             ↓
┌─────────────────────────────────────────────┐
│               Vault                         │
│  (集中托管所有 USDC)                         │
└────────────┬────────────────────────────────┘
             │ coordinated by
             ↓
┌─────────────────────────────────────────────┐
│          TradingEngine                      │
│  (批量结算和状态验证)                         │
└─────────────────────────────────────────────┘
```

### 核心设计原则

1. **资金托管在 Vault** - 所有 USDC 集中管理
2. **用户拥有控制权** - 通过 UserProxyWallet 保持最终控制
3. **链下高频交易** - 批量上链，降低 Gas 成本
4. **状态可验证** - Merkle Root 机制确保透明度

---

## UserProxyWallet 用户代理钱包

### 合约概述

每个用户拥有独立的代理钱包合约，负责追踪余额和接收结算。

**特点**：
- ✅ 不实际持有 USDC（资金在 Vault）
- ✅ 只记录余额状态
- ✅ 用户拥有最终控制权
- ✅ 支持紧急提现机制

### 状态变量

| 变量名 | 类型 | 可见性 | 说明 |
|--------|------|--------|------|
| `owner` | `address` | `public immutable` | 用户的 EOA 地址 |
| `vault` | `IVault` | `public immutable` | 主 Vault 合约 |
| `USDC` | `IERC20` | `public immutable` | USDC 代币合约 |
| `tradingEngine` | `ITradingEngine` | `public immutable` | 交易引擎合约 |
| `lastSettledNonce` | `uint256` | `public` | 最后结算的 nonce |
| `depositBalance` | `uint256` | `public` | 当前链上存款余额 |
| `emergencyRequestTime` | `uint256` | `public` | 紧急提现请求时间 |
| `EMERGENCY_DELAY` | `uint256` | `public constant` | 紧急提现延迟（7 天） |

### 事件

#### Deposited

```solidity
event Deposited(
    address indexed user,
    uint256 amount,
    uint256 newBalance
);
```

**触发时机**: 用户充值成功时

**参数说明**:
- `user`: 用户地址
- `amount`: 充值金额
- `newBalance`: 充值后的新余额

**使用示例**:
```javascript
proxyWallet.on('Deposited', (user, amount, newBalance) => {
  console.log(`用户 ${user} 充值 ${amount}, 新余额 ${newBalance}`);
});
```

---

#### Withdrawn

```solidity
event Withdrawn(
    address indexed user,
    uint256 amount,
    uint256 newBalance
);
```

**触发时机**: 用户提现成功时

**参数说明**:
- `user`: 用户地址
- `amount`: 提现金额
- `newBalance`: 提现后的新余额

---

#### Settled

```solidity
event Settled(
    uint256 indexed nonce,
    int256 balanceDelta,
    uint256 timestamp
);
```

**触发时机**: 链下交易结算到链上时

**参数说明**:
- `nonce`: 结算序号
- `balanceDelta`: 余额变化量（正为盈利，负为亏损）
- `timestamp`: 结算时间戳

---

#### EmergencyWithdrawRequested

```solidity
event EmergencyWithdrawRequested(
    address indexed user,
    uint256 timestamp
);
```

**触发时机**: 用户请求紧急提现时

---

#### EmergencyWithdrawExecuted

```solidity
event EmergencyWithdrawExecuted(
    address indexed user,
    uint256 amount
);
```

**触发时机**: 紧急提现执行成功时

---

#### EmergencyWithdrawCancelled

```solidity
event EmergencyWithdrawCancelled(
    address indexed user
);
```

**触发时机**: 用户取消紧急提现请求时

---

### 函数

#### deposit

```solidity
function deposit(uint256 amount) external onlyOwner nonReentrant
```

**功能**: 用户充值 USDC 到系统

**权限**: 仅 owner（用户本人）

**参数**:
- `amount`: 充值金额（USDC，6 decimals）

**前置条件**:
1. 用户已授权此合约 `amount` 数量的 USDC
2. `amount > 0`

**执行流程**:
1. 从用户转账 USDC 到 Vault
2. 更新 `depositBalance`
3. 通知 Vault 记账
4. 触发 `Deposited` 事件

**使用示例**:
```javascript
// 1. 授权
await usdc.approve(proxyWallet.address, ethers.utils.parseUnits("1000", 6));

// 2. 充值
await proxyWallet.deposit(ethers.utils.parseUnits("1000", 6));
```

**Gas 消耗**: 约 120,000 gas

---

#### withdraw

```solidity
function withdraw(uint256 amount) external onlyOwner nonReentrant
```

**功能**: 用户从系统提现 USDC

**权限**: 仅 owner

**参数**:
- `amount`: 提现金额

**前置条件**:
1. `amount <= depositBalance`
2. 链下余额已同步到链上（或用户已调用结算）

**执行流程**:
1. 检查余额充足
2. 更新 `depositBalance`
3. 请求 Vault 转账到用户 EOA
4. 触发 `Withdrawn` 事件

**重要提示**: 
- 如果链下有未结算的交易，需要先通过 TradingEngine 结算
- 提现金额不能超过 `depositBalance`

**使用示例**:
```javascript
await proxyWallet.withdraw(ethers.utils.parseUnits("500", 6));
```

**Gas 消耗**: 约 71,000 gas

---

#### settle

```solidity
function settle(
    int256 balanceDelta,
    uint256 nonce
) external onlyTradingEngine
```

**功能**: 链下交易结算到链上

**权限**: 仅 TradingEngine

**参数**:
- `balanceDelta`: 余额变化量（正为盈利，负为亏损）
- `nonce`: 新的结算序号

**前置条件**:
- `nonce > lastSettledNonce`

**执行流程**:
1. 验证 nonce 递增
2. 根据 `balanceDelta` 更新余额
3. 更新 `lastSettledNonce`
4. 触发 `Settled` 事件

**调用方式**:
```javascript
// 仅 TradingEngine 可调用
await tradingEngine.batchSettle({
  users: [user1, user2],
  balanceDeltas: [100e6, -50e6], // user1 赢 100, user2 输 50
  newNonces: [42, 15],
  timestamp: Date.now(),
  signature: signature
});
```

---

#### requestEmergencyWithdraw

```solidity
function requestEmergencyWithdraw() external onlyOwner
```

**功能**: 请求紧急提现（防止后端作恶）

**权限**: 仅 owner

**参数**: 无

**前置条件**:
- 未有进行中的紧急提现请求

**执行流程**:
1. 设置 `emergencyRequestTime = block.timestamp`
2. 触发 `EmergencyWithdrawRequested` 事件
3. 开始 7 天倒计时

**安全机制**:
- 7 天延迟给后端时间响应
- 用户保留最终控制权

---

#### executeEmergencyWithdraw

```solidity
function executeEmergencyWithdraw() external onlyOwner nonReentrant
```

**功能**: 执行紧急提现（7 天后）

**权限**: 仅 owner

**参数**: 无

**前置条件**:
- 已调用 `requestEmergencyWithdraw`
- 已过 7 天延迟期

**执行流程**:
1. 验证时间条件
2. 从 Vault 取回所有余额
3. 重置紧急提现状态
4. 触发 `EmergencyWithdrawExecuted` 事件

**使用场景**:
- 后端服务宕机
- 后端拒绝处理提现
- 用户希望完全退出

---

#### cancelEmergencyWithdraw

```solidity
function cancelEmergencyWithdraw() external onlyOwner
```

**功能**: 取消紧急提现请求

**权限**: 仅 owner

**参数**: 无

**使用场景**:
- 后端恢复正常
- 用户改变主意

---

### View 函数

#### getUSDCBalance

```solidity
function getUSDCBalance() external view returns (uint256)
```

**返回**: 用户的追踪余额（注意：实际 USDC 在 Vault）

---

#### isEmergencyPending

```solidity
function isEmergencyPending() external view returns (bool)
```

**返回**: 是否有进行中的紧急提现请求

---

#### emergencyTimeRemaining

```solidity
function emergencyTimeRemaining() external view returns (uint256)
```

**返回**: 紧急提现剩余等待时间（秒）

---

### 错误码

| 错误名 | 说明 |
|--------|------|
| `OnlyOwner()` | 仅 owner 可调用 |
| `OnlyTradingEngine()` | 仅 TradingEngine 可调用 |
| `InsufficientBalance()` | 余额不足 |
| `InvalidAmount()` | 金额无效（≤0） |
| `EmergencyAlreadyRequested()` | 已有紧急提现请求 |
| `EmergencyNotRequested()` | 未请求紧急提现 |
| `EmergencyDelayNotMet()` | 未满 7 天延迟 |
| `InvalidNonce()` | Nonce 无效 |

---

## Vault 资金托管合约

### 合约概述

集中托管所有用户的 USDC 资金和 LP 流动性。

**核心功能**:
- 托管所有用户 USDC
- 管理 LP 流动性池
- 处理充值/提现
- 风险管理和隔离

### 状态变量

| 变量名 | 类型 | 可见性 | 说明 |
|--------|------|--------|------|
| `USDC` | `IERC20` | `public immutable` | USDC 代币合约 |
| `tradingEngine` | `address` | `public` | 交易引擎地址 |
| `factory` | `address` | `public` | 工厂合约地址 |
| `totalUserBalance` | `uint256` | `public` | 所有用户总余额 |
| `totalLPBalance` | `uint256` | `public` | LP 总流动性 |
| `reserveBufferBps` | `uint256` | `public` | 风险准备金（基点） |
| `totalLockedBalance` | `uint256` | `public` | 锁定余额（活跃下注） |
| `authorizedProxies` | `mapping(address => bool)` | `public` | 授权的代理钱包 |
| `userToProxy` | `mapping(address => address)` | `public` | 用户到代理的映射 |
| `minLPDeposit` | `uint256` | `public` | 最小 LP 存款 |
| `lpLockPeriod` | `uint256` | `public` | LP 锁定期 |
| `lpUnlockTime` | `mapping(address => uint256)` | `public` | LP 解锁时间 |

### 常量

| 常量名 | 值 | 说明 |
|--------|-----|------|
| `BASIS_POINTS` | 10000 | 基点单位 |
| `DEFAULT_RESERVE_BUFFER_BPS` | 500 | 默认 5% 准备金 |
| `DEFAULT_LP_LOCK_PERIOD` | 1 days | 默认锁定期 |
| `DEFAULT_MIN_LP_DEPOSIT` | 100e6 | 最小 100 USDC |

### 事件

#### ProxyAuthorized

```solidity
event ProxyAuthorized(
    address indexed proxy,
    address indexed user
);
```

**触发时机**: 代理钱包被授权时

---

#### ProxyDeauthorized

```solidity
event ProxyDeauthorized(
    address indexed proxy
);
```

**触发时机**: 代理钱包授权被撤销时

---

#### TradingEngineUpdated

```solidity
event TradingEngineUpdated(
    address indexed oldEngine,
    address indexed newEngine
);
```

**触发时机**: 交易引擎地址更新时

---

#### DepositFromProxy

```solidity
event DepositFromProxy(
    address indexed user,
    address indexed proxy,
    uint256 amount
);
```

**触发时机**: 用户通过代理钱包充值时

**参数说明**:
- `user`: 用户地址
- `proxy`: 代理钱包地址
- `amount`: 充值金额

---

#### TransferToProxy

```solidity
event TransferToProxy(
    address indexed proxy,
    uint256 amount
);
```

**触发时机**: 向代理钱包转账时（提现或赔付）

---

#### LiquidityProvided

```solidity
event LiquidityProvided(
    address indexed provider,
    uint256 usdcAmount,
    uint256 lpTokens
);
```

**触发时机**: LP 提供流动性时

**参数说明**:
- `provider`: LP 提供者地址
- `usdcAmount`: 存入的 USDC 数量
- `lpTokens`: 铸造的 LP 代币数量

---

#### LiquidityWithdrawn

```solidity
event LiquidityWithdrawn(
    address indexed provider,
    uint256 lpTokens,
    uint256 usdcAmount
);
```

**触发时机**: LP 赎回流动性时

---

#### ReserveBufferUpdated

```solidity
event ReserveBufferUpdated(
    uint256 oldBps,
    uint256 newBps
);
```

**触发时机**: 风险准备金比例更新时

---

#### BalanceUpdated

```solidity
event BalanceUpdated(
    uint256 totalUserBalance,
    uint256 totalLPBalance,
    uint256 totalLockedBalance
);
```

**触发时机**: 任何余额变化时（用于监控）

---

### 管理函数

#### setTradingEngine

```solidity
function setTradingEngine(address _tradingEngine) external onlyOwner
```

**功能**: 设置交易引擎地址

**权限**: 仅 owner

---

#### setFactory

```solidity
function setFactory(address _factory) external onlyOwner
```

**功能**: 设置工厂合约地址

**权限**: 仅 owner

---

#### authorizeProxy

```solidity
function authorizeProxy(
    address proxy,
    address user
) external
```

**功能**: 授权代理钱包

**权限**: Owner 或 Factory

**参数**:
- `proxy`: 代理钱包地址
- `user`: 用户地址

---

#### deauthorizeProxy

```solidity
function deauthorizeProxy(address proxy) external onlyOwner
```

**功能**: 撤销代理钱包授权

---

#### setReserveBuffer

```solidity
function setReserveBuffer(uint256 newBps) external onlyOwner
```

**功能**: 更新风险准备金比例

**参数**:
- `newBps`: 新的基点值（最大 2000 = 20%）

---

#### setLPLockPeriod

```solidity
function setLPLockPeriod(uint256 newPeriod) external onlyOwner
```

**功能**: 设置 LP 锁定期

**参数**:
- `newPeriod`: 新的锁定期（秒，最大 30 天）

---

#### setMinLPDeposit

```solidity
function setMinLPDeposit(uint256 newMin) external onlyOwner
```

**功能**: 设置最小 LP 存款

---

### 代理钱包函数

#### depositFromProxy

```solidity
function depositFromProxy(
    address user,
    uint256 amount
) external onlyAuthorizedProxy nonReentrant
```

**功能**: 记录用户充值（资金已转入）

**权限**: 仅授权的代理钱包

**参数**:
- `user`: 用户地址
- `amount`: 充值金额

**重要**: USDC 已在调用前转入 Vault

---

#### transferToUser

```solidity
function transferToUser(
    address user,
    uint256 amount
) external nonReentrant
```

**功能**: 直接转账给用户（正常提现）

**权限**: 授权的代理钱包

**参数**:
- `user`: 用户 EOA 地址
- `amount`: 转账金额

**前置条件**:
- 流动性充足

---

#### emergencyTransferToUser

```solidity
function emergencyTransferToUser(
    address user,
    uint256 amount
) external nonReentrant
```

**功能**: 紧急转账（绕过流动性检查）

**权限**: 授权的代理钱包

**使用场景**: 用户执行紧急提现时

---

### LP 函数

#### provideLiquidity

```solidity
function provideLiquidity(
    uint256 amount
) external nonReentrant returns (uint256 lpTokens)
```

**功能**: LP 提供流动性，获得 LP 代币

**参数**:
- `amount`: USDC 数量（≥ minLPDeposit）

**返回**:
- `lpTokens`: 铸造的 LP 代币数量

**定价公式**:
- 首次: `lpTokens = amount` (1:1)
- 后续: `lpTokens = (amount * totalSupply) / totalLPBalance`

**使用示例**:
```javascript
// 1. 授权
await usdc.approve(vault.address, ethers.utils.parseUnits("10000", 6));

// 2. 提供流动性
const lpTokens = await vault.provideLiquidity(
  ethers.utils.parseUnits("10000", 6)
);
```

**Gas 消耗**: 约 160,000 gas

---

#### withdrawLiquidity

```solidity
function withdrawLiquidity(
    uint256 lpTokens
) external nonReentrant returns (uint256 usdcAmount)
```

**功能**: LP 赎回流动性

**参数**:
- `lpTokens`: 要销毁的 LP 代币数量

**返回**:
- `usdcAmount`: 获得的 USDC 数量

**前置条件**:
- 已过锁定期
- 流动性充足

**赎回公式**:
- `usdcAmount = (lpTokens * totalLPBalance) / totalSupply`

---

### 交易引擎函数

#### updateLockedBalance

```solidity
function updateLockedBalance(int256 delta) external onlyTradingEngine
```

**功能**: 更新锁定余额（下注时锁定，结算时释放）

**权限**: 仅 TradingEngine

**参数**:
- `delta`: 变化量（正为增加，负为减少）

---

#### settleBalances

```solidity
function settleBalances(
    int256 userDelta,
    int256 lpDelta
) external onlyTradingEngine
```

**功能**: 结算后更新用户和 LP 余额

**权限**: 仅 TradingEngine

**参数**:
- `userDelta`: 用户总余额变化
- `lpDelta`: LP 余额变化（通常为负 userDelta）

---

### View 函数

#### getAvailableLiquidity

```solidity
function getAvailableLiquidity() public view returns (uint256)
```

**功能**: 获取可用流动性

**计算公式**:
```
可用流动性 = 总资产 - 用户负债 - 风险准备金
         = USDC.balanceOf(vault)
           - (totalUserBalance + totalLockedBalance)
           - (totalLPBalance * reserveBufferBps / 10000)
```

---

#### getTotalAssets

```solidity
function getTotalAssets() external view returns (uint256)
```

**返回**: Vault 持有的总 USDC 数量

---

#### isAuthorizedProxy

```solidity
function isAuthorizedProxy(address proxy) external view returns (bool)
```

**返回**: 代理钱包是否已授权

---

#### getLPUnlockTime

```solidity
function getLPUnlockTime(address provider) external view returns (uint256)
```

**返回**: LP 的解锁时间戳

---

#### getLPTokenValue

```solidity
function getLPTokenValue(uint256 lpTokens) external view returns (uint256)
```

**功能**: 计算 LP 代币的 USDC 价值

**参数**:
- `lpTokens`: LP 代币数量

**返回**: 等值的 USDC 数量

---

### 错误码

| 错误名 | 说明 |
|--------|------|
| `OnlyTradingEngine()` | 仅交易引擎可调用 |
| `OnlyAuthorizedProxy()` | 仅授权代理可调用 |
| `ProxyAlreadyAuthorized()` | 代理已授权 |
| `ProxyNotAuthorized()` | 代理未授权 |
| `InvalidAmount()` | 金额无效 |
| `InsufficientLiquidity()` | 流动性不足 |
| `InsufficientBalance()` | 余额不足 |
| `LPStillLocked()` | LP 仍在锁定期 |
| `BelowMinDeposit()` | 低于最小存款 |
| `InvalidParameter()` | 参数无效 |

---

## TradingEngine 交易引擎

### 合约概述

处理批量结算和状态验证的核心合约。

**核心功能**:
- 批量结算链下交易
- 验证 sequencer 签名
- 提交和验证状态根
- 防止重放攻击

### 状态变量

| 变量名 | 类型 | 可见性 | 说明 |
|--------|------|--------|------|
| `sequencer` | `address` | `public` | 后端定序器地址 |
| `vault` | `IVault` | `public immutable` | Vault 合约 |
| `stateRoot` | `bytes32` | `public` | 当前状态根 |
| `lastUpdateTimestamp` | `uint256` | `public` | 最后更新时间 |
| `userNonces` | `mapping(address => uint256)` | `public` | 用户 nonce |
| `settlementBatchCount` | `uint256` | `public` | 结算批次计数 |
| `minStateRootInterval` | `uint256` | `public` | 状态根最小间隔 |
| `maxBatchSize` | `uint256` | `public` | 最大批次大小 |

### 数据结构

#### SettlementBatch

```solidity
struct SettlementBatch {
    address[] users;            // 用户列表
    int256[] balanceDeltas;     // 余额变化
    uint256[] newNonces;        // 新 nonce
    uint256 timestamp;          // 时间戳
    bytes signature;            // 签名
}
```

---

#### MarketSettlement

```solidity
struct MarketSettlement {
    uint256 marketId;           // 市场 ID
    uint256 finalPrice;         // 最终价格
    address[] winners;          // 赢家列表
    uint256[] payouts;          // 赔付金额
    address[] losers;           // 输家列表
    uint256[] losses;           // 亏损金额
    uint256 timestamp;
    bytes signature;
}
```

### 事件

#### SequencerUpdated

```solidity
event SequencerUpdated(
    address indexed oldSequencer,
    address indexed newSequencer
);
```

---

#### BatchSettled

```solidity
event BatchSettled(
    uint256 indexed batchId,
    uint256 userCount,
    uint256 timestamp
);
```

**参数说明**:
- `batchId`: 批次 ID
- `userCount`: 结算用户数
- `timestamp`: 结算时间

---

#### UserSettled

```solidity
event UserSettled(
    address indexed user,
    int256 balanceDelta,
    uint256 newNonce
);
```

**触发时机**: 每个用户结算时

---

#### MarketSettled

```solidity
event MarketSettled(
    uint256 indexed marketId,
    uint256 finalPrice,
    uint256 timestamp
);
```

---

#### StateRootSubmitted

```solidity
event StateRootSubmitted(
    bytes32 indexed newRoot,
    bytes32 indexed oldRoot,
    uint256 timestamp
);
```

**触发时机**: 状态根更新时

---

#### ConfigUpdated

```solidity
event ConfigUpdated(
    uint256 minInterval,
    uint256 maxBatch
);
```

---

### 管理函数

#### setSequencer

```solidity
function setSequencer(address newSequencer) external onlyOwner
```

**功能**: 更新 sequencer 地址

---

#### updateConfig

```solidity
function updateConfig(
    uint256 _minInterval,
    uint256 _maxBatch
) external onlyOwner
```

**功能**: 更新配置参数

---

### 结算函数

#### batchSettle

```solidity
function batchSettle(
    SettlementBatch calldata batch
) external onlySequencer
```

**功能**: 批量结算多个用户

**权限**: 仅 sequencer

**参数**:
- `batch`: 结算批次数据

**验证**:
1. ✓ 批次大小 ≤ maxBatchSize
2. ✓ 数组长度一致
3. ✓ Sequencer 签名有效
4. ✓ Nonce 递增

**执行流程**:
1. 验证批次数据
2. 遍历用户，调用 proxy.settle()
3. 更新 Vault 总余额
4. 触发事件

**使用示例**:
```javascript
const batch = {
  users: [user1, user2, user3],
  balanceDeltas: [100e6, -50e6, 200e6],
  newNonces: [42, 15, 8],
  timestamp: Date.now(),
  signature: "0x..."
};

await tradingEngine.batchSettle(batch);
```

**Gas 消耗**: 约 150,000 + (50,000 * userCount) gas

---

#### settleMarket

```solidity
function settleMarket(
    MarketSettlement calldata settlement
) external onlySequencer
```

**功能**: 结算特定市场

**权限**: 仅 sequencer

**参数**:
- `settlement`: 市场结算数据

---

### 状态根函数

#### submitStateRoot

```solidity
function submitStateRoot(
    bytes32 newRoot,
    uint256 timestamp,
    bytes calldata signature
) external onlySequencer
```

**功能**: 提交新的状态根

**权限**: 仅 sequencer

**参数**:
- `newRoot`: 新的 Merkle Root
- `timestamp`: 时间戳
- `signature`: Sequencer 签名

**前置条件**:
- 距上次提交 ≥ minStateRootInterval

**使用示例**:
```javascript
const stateRoot = merkleTree.getRoot();
const timestamp = Date.now();
const signature = await sequencer.signMessage(...);

await tradingEngine.submitStateRoot(stateRoot, timestamp, signature);
```

**Gas 消耗**: 约 100,000 gas

---

#### verifyAccountState

```solidity
function verifyAccountState(
    address user,
    uint256 balance,
    uint256 nonce,
    bytes32[] calldata proof
) external view returns (bool)
```

**功能**: 验证用户账户状态

**参数**:
- `user`: 用户地址
- `balance`: 声称的余额
- `nonce`: 声称的 nonce
- `proof`: Merkle Proof

**返回**: 验证是否通过

**使用场景**:
- 用户验证自己的余额
- 争议仲裁
- 审计检查

**使用示例**:
```javascript
const proof = await backend.getMerkleProof(userAddress);

const isValid = await tradingEngine.verifyAccountState(
  userAddress,
  balance,
  nonce,
  proof
);

if (isValid) {
  console.log("账户状态验证通过");
} else {
  console.log("警告：账户状态不匹配！");
}
```

---

### View 函数

#### isSequencer

```solidity
function isSequencer(address account) external view returns (bool)
```

---

#### getStateRoot

```solidity
function getStateRoot() external view returns (bytes32)
```

---

#### getUserNonce

```solidity
function getUserNonce(address user) external view returns (uint256)
```

---

### 错误码

| 错误名 | 说明 |
|--------|------|
| `OnlySequencer()` | 仅 sequencer 可调用 |
| `InvalidSignature()` | 签名无效 |
| `InvalidNonce()` | Nonce 无效 |
| `InvalidBatchSize()` | 批次大小无效 |
| `ArrayLengthMismatch()` | 数组长度不匹配 |
| `StateRootTooSoon()` | 状态根提交过频繁 |
| `InvalidTimestamp()` | 时间戳无效 |
| `ZeroAddress()` | 地址为零 |

---

## ProxyWalletFactory 钱包工厂

### 合约概述

负责为用户创建和管理代理钱包。

**特点**:
- ✅ 标准化部署
- ✅ 支持 CREATE2 确定性地址
- ✅ 批量创建
- ✅ 自动授权

### 状态变量

| 变量名 | 类型 | 可见性 | 说明 |
|--------|------|--------|------|
| `vault` | `Vault` | `public immutable` | Vault 合约 |
| `usdc` | `address` | `public immutable` | USDC 地址 |
| `tradingEngine` | `address` | `public immutable` | 交易引擎地址 |
| `userProxies` | `mapping(address => address)` | `public` | 用户到代理映射 |
| `proxyToUser` | `mapping(address => address)` | `public` | 代理到用户映射 |
| `allProxies` | `address[]` | `public` | 所有代理列表 |
| `hasProxy` | `mapping(address => bool)` | `public` | 用户是否有代理 |

### 事件

#### ProxyCreated

```solidity
event ProxyCreated(
    address indexed user,
    address indexed proxy,
    uint256 index
);
```

**触发时机**: 代理钱包创建成功时

**参数说明**:
- `user`: 用户地址
- `proxy`: 代理钱包地址
- `index`: 在 allProxies 中的索引

---

### 函数

#### createProxyWallet

```solidity
function createProxyWallet(
    address user
) external returns (address proxy)
```

**功能**: 为用户创建代理钱包

**参数**:
- `user`: 用户地址

**返回**:
- `proxy`: 创建的代理钱包地址

**前置条件**:
- 用户尚未有代理钱包

**执行流程**:
1. 部署 UserProxyWallet 合约
2. 更新映射关系
3. 在 Vault 中授权
4. 触发 ProxyCreated 事件

**使用示例**:
```javascript
const proxyAddress = await factory.createProxyWallet(userAddress);
console.log(`代理钱包地址: ${proxyAddress}`);
```

**Gas 消耗**: 约 880,000 gas

---

#### createProxyWalletDeterministic

```solidity
function createProxyWalletDeterministic(
    address user,
    bytes32 salt
) external returns (address proxy)
```

**功能**: 使用 CREATE2 创建确定性地址的代理钱包

**参数**:
- `user`: 用户地址
- `salt`: 盐值（用于生成确定性地址）

**优势**:
- 地址可预测
- 便于前端集成

---

#### batchCreateProxyWallets

```solidity
function batchCreateProxyWallets(
    address[] calldata users
) external returns (address[] memory proxies)
```

**功能**: 批量创建多个代理钱包

**参数**:
- `users`: 用户地址数组

**返回**:
- `proxies`: 代理钱包地址数组

**使用场景**:
- 系统初始化
- 批量用户导入

---

### View 函数

#### getProxyWallet

```solidity
function getProxyWallet(
    address user
) external view returns (address proxy)
```

**返回**: 用户的代理钱包地址

---

#### getProxyUser

```solidity
function getProxyUser(
    address proxy
) external view returns (address user)
```

**返回**: 代理钱包的所有者

---

#### getProxyCount

```solidity
function getProxyCount() external view returns (uint256)
```

**返回**: 已创建的代理钱包总数

---

#### getAllProxies

```solidity
function getAllProxies() external view returns (address[] memory)
```

**返回**: 所有代理钱包地址

---

#### getProxiesInRange

```solidity
function getProxiesInRange(
    uint256 start,
    uint256 end
) external view returns (address[] memory)
```

**功能**: 分页查询代理钱包

**参数**:
- `start`: 起始索引
- `end`: 结束索引（不包含）

---

#### computeProxyAddress

```solidity
function computeProxyAddress(
    address user,
    bytes32 salt
) external view returns (address predicted)
```

**功能**: 计算 CREATE2 的预测地址

---

### 错误码

| 错误名 | 说明 |
|--------|------|
| `ProxyAlreadyExists()` | 用户已有代理钱包 |
| `ProxyCreationFailed()` | 代理钱包创建失败 |
| `InvalidAddress()` | 地址无效 |

---

## 集成指南

### 前端集成

#### 1. 检查用户是否有代理钱包

```javascript
const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, provider);
const proxyAddress = await factory.getProxyWallet(userAddress);

if (proxyAddress === ethers.constants.AddressZero) {
  // 需要创建代理钱包
  console.log("用户尚未创建代理钱包");
} else {
  console.log("代理钱包地址:", proxyAddress);
}
```

#### 2. 创建代理钱包

```javascript
const tx = await factory.connect(signer).createProxyWallet(userAddress);
const receipt = await tx.wait();

const event = receipt.events.find(e => e.event === 'ProxyCreated');
const proxyAddress = event.args.proxy;

console.log("代理钱包创建成功:", proxyAddress);
```

#### 3. 充值流程

```javascript
// Step 1: 授权 USDC
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20ABI, signer);
const amount = ethers.utils.parseUnits("1000", 6); // 1000 USDC

await usdc.approve(proxyAddress, amount);

// Step 2: 充值
const proxy = new ethers.Contract(proxyAddress, ProxyABI, signer);
await proxy.deposit(amount);

console.log("充值成功");
```

#### 4. 监听事件

```javascript
// 监听充值事件
proxy.on('Deposited', (user, amount, newBalance) => {
  console.log(`充值成功: ${ethers.utils.formatUnits(amount, 6)} USDC`);
  updateBalanceUI(newBalance);
});

// 监听提现事件
proxy.on('Withdrawn', (user, amount, newBalance) => {
  console.log(`提现成功: ${ethers.utils.formatUnits(amount, 6)} USDC`);
  updateBalanceUI(newBalance);
});

// 监听结算事件
proxy.on('Settled', (nonce, balanceDelta, timestamp) => {
  if (balanceDelta > 0) {
    console.log(`盈利: ${ethers.utils.formatUnits(balanceDelta, 6)} USDC`);
  } else {
    console.log(`亏损: ${ethers.utils.formatUnits(-balanceDelta, 6)} USDC`);
  }
});
```

### 后端集成

#### 1. 监听充值事件

```javascript
const vault = new ethers.Contract(VAULT_ADDRESS, VaultABI, provider);

vault.on('DepositFromProxy', async (user, proxy, amount, event) => {
  console.log(`检测到充值: ${user} 充值 ${amount}`);
  
  // 更新数据库
  await db('user_accounts')
    .where({ user_address: user })
    .increment('balance', amount.toString())
    .increment('total_deposited', amount.toString());
  
  // 记录交易
  await db('transactions').insert({
    user_address: user,
    tx_type: 'DEPOSIT',
    amount: amount.toString(),
    tx_hash: event.transactionHash,
    block_number: event.blockNumber,
    status: 'CONFIRMED'
  });
  
  // 推送给用户
  websocket.to(user).emit('balanceUpdate', {
    type: 'deposit',
    amount: amount.toString()
  });
});
```

#### 2. 批量结算

```javascript
async function batchSettlement(users, deltas, nonces) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // 生成签名
  const messageHash = ethers.utils.solidityKeccak256(
    ['address[]', 'int256[]', 'uint256[]', 'uint256'],
    [users, deltas, nonces, timestamp]
  );
  
  const signature = await sequencerWallet.signMessage(
    ethers.utils.arrayify(messageHash)
  );
  
  // 提交到链上
  const tx = await tradingEngine.batchSettle({
    users,
    balanceDeltas: deltas,
    newNonces: nonces,
    timestamp,
    signature
  });
  
  await tx.wait();
  console.log(`批量结算完成: ${users.length} 个用户`);
}
```

#### 3. 提交状态根

```javascript
async function submitStateRoot() {
  // 1. 获取所有用户状态
  const users = await db('user_accounts').select('*');
  
  // 2. 构建 Merkle Tree
  const leaves = users.map(u => 
    ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256'],
      [u.user_address, u.balance, u.nonce]
    )
  );
  
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getRoot();
  
  // 3. 签名
  const timestamp = Math.floor(Date.now() / 1000);
  const messageHash = ethers.utils.solidityKeccak256(
    ['bytes32', 'uint256'],
    [root, timestamp]
  );
  
  const signature = await sequencerWallet.signMessage(
    ethers.utils.arrayify(messageHash)
  );
  
  // 4. 提交
  const tx = await tradingEngine.submitStateRoot(root, timestamp, signature);
  await tx.wait();
  
  console.log(`状态根已提交: ${root.toString('hex')}`);
}

// 每小时执行一次
setInterval(submitStateRoot, 60 * 60 * 1000);
```

---

## 安全建议

### 1. 权限管理

- **Sequencer 私钥**: 使用 HSM 或多签管理
- **Owner 权限**: 多签钱包（Gnosis Safe）
- **定期轮换**: 密钥定期更新

### 2. 监控告警

```javascript
// 监控异常提现
vault.on('TransferToProxy', (proxy, amount) => {
  if (amount > ALERT_THRESHOLD) {
    sendAlert(`大额提现: ${amount}`);
  }
});

// 监控状态根提交
tradingEngine.on('StateRootSubmitted', (newRoot, oldRoot) => {
  const timeSinceLastUpdate = Date.now() - lastUpdateTime;
  if (timeSinceLastUpdate > 2 * 60 * 60 * 1000) {
    sendAlert('状态根超过 2 小时未更新');
  }
});
```

### 3. 审计检查

- 定期对账：链上链下余额对比
- 流动性监控：确保 Vault 有足够流动性
- 事件日志：保存所有链上事件用于审计

---

## 附录

### Gas 成本参考

| 操作 | Gas 消耗 | 成本估算* |
|------|----------|-----------|
| 创建代理钱包 | ~880,000 | $7.92 |
| 充值 | ~120,000 | $1.08 |
| 提现 | ~71,000 | $0.64 |
| 批量结算 (100 用户) | ~5,000,000 | $45.00 |
| 提交状态根 | ~100,000 | $0.90 |
| LP 提供流动性 | ~160,000 | $1.44 |
| LP 赎回流动性 | ~120,000 | $1.08 |

*假设: Gas Price = 30 gwei, ETH = $3000

### 合约地址（示例）

| 网络 | 合约 | 地址 |
|------|------|------|
| Polygon Mumbai | Vault | `0x...` |
| Polygon Mumbai | TradingEngine | `0x...` |
| Polygon Mumbai | Factory | `0x...` |

### 相关资源

- GitHub: [https://github.com/your-org/kmarket](https://github.com/your-org/kmarket)
- 文档: [https://docs.kmarket.io](https://docs.kmarket.io)
- 审计报告: [https://audits.kmarket.io](https://audits.kmarket.io)

---

**版权所有 © 2024 KMarket. MIT License.**
