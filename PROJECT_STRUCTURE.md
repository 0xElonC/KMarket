# KMarket 项目结构

## 完整目录结构

```
KMarket/
├── README.md                          # 项目说明文档
├── .gitignore
├── .env.example                       # 环境变量示例
│
├── contracts/                         # 智能合约
│   ├── hardhat.config.ts             # Hardhat 配置
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── contracts/                     # Solidity 合约源码
│   │   ├── core/                     # 核心合约
│   │   │   ├── PredictionMarket.sol  # 预测市场主合约
│   │   │   ├── AccountBook.sol       # 账本管理合约
│   │   │   ├── LiquidityPool.sol     # 流动性池合约
│   │   │   ├── TickManager.sol       # Tick 价格区间管理
│   │   │   └── RewardDistributor.sol # 奖励分配合约
│   │   │
│   │   ├── oracle/                   # 预言机相关
│   │   │   ├── PriceOracle.sol       # 价格预言机
│   │   │   ├── ChainlinkAdapter.sol  # Chainlink 适配器
│   │   │   └── OracleAggregator.sol  # 多预言机聚合
│   │   │
│   │   ├── tokens/                   # 代币合约
│   │   │   ├── KMARKToken.sol        # 治理代币
│   │   │   └── LPToken.sol           # LP 代币
│   │   │
│   │   ├── governance/               # 治理相关
│   │   │   ├── Governance.sol        # 治理合约
│   │   │   ├── Timelock.sol          # 时间锁
│   │   │   └── Treasury.sol          # 国库
│   │   │
│   │   ├── libraries/                # 库合约
│   │   │   ├── TickMath.sol          # Tick 数学计算
│   │   │   ├── OddsCalculator.sol    # 赔率计算
│   │   │   └── SafeMath.sol          # 安全数学运算
│   │   │
│   │   ├── interfaces/               # 接口定义
│   │   │   ├── IPredictionMarket.sol
│   │   │   ├── IAccountBook.sol
│   │   │   ├── ILiquidityPool.sol
│   │   │   └── IPriceOracle.sol
│   │   │
│   │   └── utils/                    # 工具合约
│   │       ├── Pausable.sol
│   │       ├── ReentrancyGuard.sol
│   │       └── Ownable.sol
│   │
│   ├── scripts/                      # 部署脚本
│   │   ├── deploy.ts                 # 主部署脚本
│   │   ├── upgrade.ts                # 升级脚本
│   │   ├── verify.ts                 # 验证脚本
│   │   └── seed.ts                   # 测试数据生成
│   │
│   └── test/                         # 测试文件
│       ├── unit/                     # 单元测试
│       │   ├── PredictionMarket.test.ts
│       │   ├── AccountBook.test.ts
│       │   ├── LiquidityPool.test.ts
│       │   └── TickManager.test.ts
│       │
│       ├── integration/              # 集成测试
│       │   ├── FullFlow.test.ts
│       │   └── Oracle.test.ts
│       │
│       └── fixtures/                 # 测试fixture
│           └── marketFixture.ts
│
├── frontend/                         # 前端应用
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx            # 根布局
│   │   │   ├── page.tsx              # 首页
│   │   │   ├── globals.css           # 全局样式
│   │   │   │
│   │   │   ├── market/              # 市场页面
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # 市场详情页
│   │   │   │
│   │   │   ├── account/             # 账户页面
│   │   │   │   ├── page.tsx         # 账户概览
│   │   │   │   ├── deposit/
│   │   │   │   │   └── page.tsx     # 充值页
│   │   │   │   └── withdraw/
│   │   │   │       └── page.tsx     # 提现页
│   │   │   │
│   │   │   ├── liquidity/           # 流动性页面
│   │   │   │   ├── page.tsx         # 流动性概览
│   │   │   │   ├── add/
│   │   │   │   │   └── page.tsx     # 添加流动性
│   │   │   │   └── remove/
│   │   │   │       └── page.tsx     # 移除流动性
│   │   │   │
│   │   │   └── leaderboard/         # 排行榜
│   │   │       └── page.tsx
│   │   │
│   │   ├── components/              # React 组件
│   │   │   ├── ui/                  # UI 基础组件 (shadcn/ui)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── layout/              # 布局组件
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Navigation.tsx
│   │   │   │
│   │   │   ├── market/              # 市场相关组件
│   │   │   │   ├── MarketCard.tsx
│   │   │   │   ├── MarketList.tsx
│   │   │   │   ├── MarketChart.tsx  # K线图
│   │   │   │   ├── BettingPanel.tsx # 下注面板
│   │   │   │   ├── TickSelector.tsx # Tick 选择器
│   │   │   │   └── OddsDisplay.tsx  # 赔率显示
│   │   │   │
│   │   │   ├── account/             # 账户相关组件
│   │   │   │   ├── BalanceCard.tsx
│   │   │   │   ├── TransactionHistory.tsx
│   │   │   │   ├── BetHistory.tsx
│   │   │   │   └── PnLChart.tsx
│   │   │   │
│   │   │   ├── liquidity/           # 流动性相关组件
│   │   │   │   ├── LiquidityStats.tsx
│   │   │   │   ├── AddLiquidityForm.tsx
│   │   │   │   ├── RemoveLiquidityForm.tsx
│   │   │   │   └── RewardsPanel.tsx
│   │   │   │
│   │   │   └── wallet/              # 钱包相关组件
│   │   │       ├── ConnectButton.tsx
│   │   │       ├── WalletModal.tsx
│   │   │       └── NetworkSwitch.tsx
│   │   │
│   │   ├── hooks/                   # React Hooks
│   │   │   ├── useMarket.ts         # 市场数据
│   │   │   ├── useAccount.ts        # 账户数据
│   │   │   ├── useBet.ts           # 下注逻辑
│   │   │   ├── useLiquidity.ts     # 流动性逻辑
│   │   │   ├── usePrice.ts         # 价格数据
│   │   │   └── useContract.ts      # 合约交互
│   │   │
│   │   ├── lib/                     # 工具库
│   │   │   ├── contracts/          # 合约交互
│   │   │   │   ├── predictionMarket.ts
│   │   │   │   ├── accountBook.ts
│   │   │   │   ├── liquidityPool.ts
│   │   │   │   └── abis/           # 合约 ABI
│   │   │   │       ├── PredictionMarket.json
│   │   │   │       ├── AccountBook.json
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── utils/              # 工具函数
│   │   │   │   ├── format.ts       # 格式化函数
│   │   │   │   ├── calculations.ts # 计算函数
│   │   │   │   ├── validation.ts   # 验证函数
│   │   │   │   └── constants.ts    # 常量定义
│   │   │   │
│   │   │   ├── api/                # API 调用
│   │   │   │   ├── market.ts
│   │   │   │   ├── price.ts
│   │   │   │   └── graph.ts
│   │   │   │
│   │   │   └── web3/               # Web3 配置
│   │   │       ├── config.ts
│   │   │       ├── chains.ts
│   │   │       └── wallets.ts
│   │   │
│   │   ├── store/                   # 状态管理 (Zustand)
│   │   │   ├── marketStore.ts
│   │   │   ├── accountStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── index.ts
│   │   │
│   │   └── types/                   # TypeScript 类型定义
│   │       ├── market.ts
│   │       ├── bet.ts
│   │       ├── account.ts
│   │       ├── liquidity.ts
│   │       └── contracts.ts
│   │
│   └── public/                      # 静态资源
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── backend/                         # 后端服务 (可选)
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── index.ts                # 入口文件
│   │   │
│   │   ├── services/               # 服务层
│   │   │   ├── priceService.ts     # 价格服务
│   │   │   ├── indexerService.ts   # 索引服务
│   │   │   ├── wsService.ts        # WebSocket 服务
│   │   │   └── cacheService.ts     # 缓存服务
│   │   │
│   │   ├── api/                    # API 路由
│   │   │   ├── markets.ts
│   │   │   ├── prices.ts
│   │   │   ├── bets.ts
│   │   │   └── stats.ts
│   │   │
│   │   ├── db/                     # 数据库
│   │   │   ├── schema.sql          # 数据库 schema
│   │   │   ├── migrations/         # 迁移文件
│   │   │   └── models/             # 数据模型
│   │   │       ├── Market.ts
│   │   │       ├── Bet.ts
│   │   │       └── Account.ts
│   │   │
│   │   ├── jobs/                   # 定时任务
│   │   │   ├── settlementKeeper.ts # 结算keeper
│   │   │   ├── priceUpdater.ts     # 价格更新
│   │   │   └── indexer.ts          # 链上事件索引
│   │   │
│   │   └── utils/                  # 工具函数
│   │       ├── logger.ts
│   │       ├── config.ts
│   │       └── errors.ts
│   │
│   └── Dockerfile
│
├── subgraph/                        # The Graph 子图
│   ├── package.json
│   ├── subgraph.yaml               # 子图配置
│   ├── schema.graphql              # GraphQL Schema
│   │
│   └── src/
│       ├── mapping.ts              # 事件映射
│       └── utils.ts
│
├── docs/                           # 文档
│   ├── README.md
│   ├── ARCHITECTURE.md             # 架构文档
│   ├── API.md                      # API 文档
│   ├── CONTRACTS.md                # 合约文档
│   ├── USER_GUIDE.md               # 用户指南
│   └── DEVELOPER_GUIDE.md          # 开发者指南
│
├── scripts/                        # 项目脚本
│   ├── setup.sh                    # 项目设置
│   ├── deploy-all.sh               # 全量部署
│   └── test-all.sh                 # 全量测试
│
└── config/                         # 配置文件
    ├── contracts.json              # 合约地址配置
    ├── networks.json               # 网络配置
    └── markets.json                # 市场配置
```

## 各模块说明

### 1. contracts/ - 智能合约模块

**技术栈**: Solidity 0.8.x + Hardhat + TypeScript

**核心功能**:
- 预测市场逻辑
- 账本管理
- 流动性池
- 预言机集成
- 治理系统

**开发流程**:
```bash
cd contracts
npm install
npm run compile        # 编译合约
npm run test          # 运行测试
npm run deploy:testnet # 部署到测试网
npm run verify        # 验证合约
```

### 2. frontend/ - 前端应用模块

**技术栈**: Next.js 14 + React + TypeScript + Tailwind CSS + ethers.js

**核心功能**:
- K线图表展示
- 下注交互界面
- 账户管理
- 流动性管理
- 实时数据更新

**开发流程**:
```bash
cd frontend
npm install
npm run dev           # 开发模式
npm run build         # 生产构建
npm run start         # 生产运行
```

### 3. backend/ - 后端服务模块（可选）

**技术栈**: Node.js + Express + TypeScript + PostgreSQL + Redis

**核心功能**:
- 价格数据聚合
- WebSocket 实时推送
- 链上事件索引
- 数据缓存
- API 服务

**开发流程**:
```bash
cd backend
npm install
npm run dev           # 开发模式
npm run build         # 构建
npm run start         # 启动服务
```

### 4. subgraph/ - The Graph 索引模块

**技术栈**: The Graph + AssemblyScript

**核心功能**:
- 链上事件索引
- 历史数据查询
- GraphQL API

**开发流程**:
```bash
cd subgraph
npm install
npm run codegen       # 生成代码
npm run build         # 构建
npm run deploy        # 部署子图
```

## 环境配置

### .env 示例

```env
# 合约环境变量
PRIVATE_KEY=your_private_key
POLYGONSCAN_API_KEY=your_api_key
ALCHEMY_API_KEY=your_alchemy_key

# 前端环境变量
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# 后端环境变量
DATABASE_URL=postgresql://user:pass@localhost:5432/kmarket
REDIS_URL=redis://localhost:6379
CHAINLINK_WS_URL=wss://...

# The Graph
GRAPH_API_KEY=your_graph_api_key
```

## 开发工作流

### 1. 本地开发

```bash
# 1. 启动本地节点
cd contracts
npx hardhat node

# 2. 部署合约到本地
npx hardhat run scripts/deploy.ts --network localhost

# 3. 启动前端
cd ../frontend
npm run dev

# 4. 启动后端（可选）
cd ../backend
npm run dev
```

### 2. 测试网部署

```bash
# 1. 部署合约到 Polygon Mumbai
cd contracts
npm run deploy:mumbai

# 2. 部署子图
cd ../subgraph
npm run deploy:mumbai

# 3. 部署前端到 Vercel
cd ../frontend
vercel deploy

# 4. 部署后端到云服务器
cd ../backend
docker build -t kmarket-backend .
docker push registry/kmarket-backend
```

### 3. 主网部署

```bash
# 1. 审计通过后部署合约
cd contracts
npm run deploy:polygon

# 2. 验证合约
npm run verify:polygon

# 3. 部署子图到主网
cd ../subgraph
npm run deploy:mainnet

# 4. 前端生产部署
cd ../frontend
vercel deploy --prod
```

## 测试策略

### 单元测试
```bash
# 合约单元测试
cd contracts
npm run test

# 前端单元测试
cd frontend
npm run test
```

### 集成测试
```bash
# 全流程测试
cd contracts
npm run test:integration
```

### E2E 测试
```bash
cd frontend
npm run test:e2e
```

## 监控和维护

### 合约监控
- Tenderly - 实时交易监控
- Defender - 自动化运维
- Dune Analytics - 数据分析

### 前端监控
- Vercel Analytics
- Sentry - 错误追踪
- Google Analytics

### 后端监控
- Prometheus + Grafana
- CloudWatch
- 日志聚合

## 安全检查清单

- [ ] 合约安全审计（CertiK, OpenZeppelin）
- [ ] 前端安全扫描
- [ ] 依赖漏洞扫描 (npm audit)
- [ ] 访问控制测试
- [ ] 重入攻击防护
- [ ] 整数溢出检查
- [ ] Gas 优化验证
- [ ] 预言机安全测试
- [ ] 紧急暂停机制测试
- [ ] 升级机制测试

## 性能优化

### 合约优化
- 使用事件而非存储
- 批量操作减少交易次数
- 使用库减少合约大小
- 优化存储布局

### 前端优化
- 代码分割
- 图片优化
- SSR/SSG
- CDN 加速
- 缓存策略

### 后端优化
- 数据库索引
- Redis 缓存
- API 限流
- 连接池优化
