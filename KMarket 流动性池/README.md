# KMarket 流动性池

一组基于 USDC 的资金池与结算合约，用于：
- 用户侧资产托管与紧急退出（`UserVault`）
- LP 侧资金池与份额管理（`LPPoolVault` + `LPShareToken`）
- 周期性盈亏与费用结算（`SettlementBridge`）

> 说明：当前仓库只包含合约与部署脚本；本 README 默认你在外部已配置 Hardhat 与依赖。

## 合约概览

- **`MockUSDC`**（`contracts/mocks/MockUSDC.sol`）
  - 用于测试的 6 位小数 USDC。

- **`LPShareToken`**（`contracts/tokens/LPShareToken.sol`）
  - LP 份额 Token（18 位小数，符号 `KMLP`）。
  - 只有 `MINTER_ROLE` 可 mint/burn（由 `LPPoolVault` 持有）。

- **`LPPoolVault`**（`contracts/core/LPPoolVault.sol`）
  - LP 资金池，接受 USDC 存取并按权益指数铸造/销毁 LP 份额。
  - 关键状态：`equityReserves`、`riskReserve`、`equityIndexRay`。
  - `riskReserve` 从可用流动性中扣除。
  - 仅接受 **6 位小数且 symbol 为 `USDC`** 的资产。

- **`UserVault`**（`contracts/core/UserVault.sol`）
  - 用户托管合约，支持普通入金与两类“紧急退出”路径：
    - **Coupon 提现**：EIP-712 签名、带 nonce/过期时间。
    - **ForceExit**：紧急模式下可发起，经历挑战期后执行。
  - 仅接受 **6 位小数且 symbol 为 `USDC`** 的资产。

- **`SettlementBridge`**（`contracts/core/SettlementBridge.sol`）
  - 周期结算桥接，按 `epoch` 结算用户净盈亏与费用。
  - 防重复结算（`epochApplied`）。

## 资金流/结算逻辑（简述）

- **LP 入金/出金**：
  - `LPPoolVault.depositLP()` 将 USDC 转入并按 `equityIndexRay` 铸造份额。
  - `LPPoolVault.redeemLP()` 按当前指数赎回，受 `riskReserve` 限制。

- **结算周期**（`SettlementBridge.applyEpochDelta()`）：
  - `userNetPnL > 0`：LP 向 UserVault 支付用户盈利。
  - `userNetPnL < 0`：UserVault 向 LP 支付用户亏损。
  - `feesToLP`：UserVault → LP。
  - `feesToTreasury`：UserVault → Treasury。

- **紧急退出**（`UserVault`）：
  - `withdrawWithCoupon()`：由 `couponSigner` 签名授权，防重放（nonce）。
  - `requestForceExit()`：紧急模式下发起，需等待 `challengePeriod`。
  - `executeForceExit()`：挑战期后由账户或 `to` 地址执行。

## 角色与权限

- **`DEFAULT_ADMIN_ROLE`**：管理核心配置、角色分配。
- **`GUARDIAN_ROLE`**：暂停合约、切换紧急模式等。
- **`SETTLER_ROLE`**：结算操作、桥接转账。
- **`RISK_MANAGER_ROLE`**（仅 `LPPoolVault`）：设置风险准备金、Skim 多余资金。
- **`MINTER_ROLE`**（`LPShareToken`）：由 `LPPoolVault` 持有。

## 部署（scripts/deploy.js）

部署脚本会按顺序部署：`LPShareToken` → `LPPoolVault` → `UserVault` → `SettlementBridge`，并自动配置角色。

**必填环境变量**：
- `ASSET`：USDC 地址
- `ADMIN`：管理员地址
- `TREASURY`：金库地址
- `COUPON_SIGNER`：签名者地址

**可选环境变量**：
- `GUARDIAN`、`SETTLER`、`RISK_MANAGER`（默认使用 `ADMIN`）
- `REVOKE_DEPLOYER`：是否撤销部署者权限（true/1/yes）
- `CHALLENGE_PERIOD_SECONDS`：挑战期秒数
- `EMERGENCY_MODE`：部署后是否启用紧急模式（true/1/yes）
- `PAUSE_DEPOSITS`：是否暂停用户入金
- `PAUSE_ALL`：是否暂停合约

**示例**（假设已配置 Hardhat）：
```bash
ASSET=0x... \
ADMIN=0x... \
TREASURY=0x... \
COUPON_SIGNER=0x... \
npx hardhat run scripts/deploy.js --network <network>
```

## 测试

当前仅包含 `UserVault` 的 ForceExit 与 Coupon 相关测试：
```bash
npx hardhat test
```

## 注意事项

- **USDC 校验**：`UserVault` 与 `LPPoolVault` 仅接受 symbol 为 `USDC` 且 decimals 为 6 的 ERC20。若要支持其它资产，请调整 `_isUSDC()` 逻辑。
- **紧急模式**：ForceExit 仅在 `emergencyMode=true` 时可用。
- **可用流动性**：`riskReserve` 会减少 LP 可赎回余额。

---

如需我补充部署流程、前后端交互示例或更详细的架构图，告诉我你的目标环境（链、部署工具、配置文件位置）。
