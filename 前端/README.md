# KMarket Pro（前端）

KMarket 是一个预测交易 UI 的前端 Demo，包含首页、市场、交易终端、资产看板等页面。

## 技术栈
- Vite + React + TypeScript
- Tailwind（通过 `index.html` CDN 引入）
- Recharts（用于 sparkline 等图形）

## 本地启动
**要求：** Node.js 18+

```bash
npm install
npm run dev
```

启动后访问终端提示的本地地址（通常为 `http://localhost:5173`）。

### 构建 / 预览
```bash
npm run build
npm run preview
```

## 数据来源说明
**ETH 使用真实的 API 接口：Binance WebSocket Kline（1m）**  
当终端选择 ETH 时，前端会订阅 Binance 的实时 1 分钟 K 线数据。

## 当前已接入的真实接口（前端）
### Binance WebSocket（ETH）
**连接地址：**
```
wss://stream.binance.com:9443/ws/ethusdt@kline_1m
```
**用途：**
- 交易终端 ETH K 线实时更新

## 需要对接的业务接口（设计稿 / 约定）
> 以下接口为**设计用接口**，供后端实现与联调，不代表当前前端已接入。

### 1) 市场与资产
**GET** `/api/markets`  
返回市场列表与基础指标（价格、涨跌、24h 成交量等）。

**GET** `/api/markets/{symbol}`  
返回指定资产的详情与当前价格。

### 2) K 线数据
**GET** `/api/klines`  
**Query:** `symbol`, `interval`, `limit`  
返回历史 K 线数据（用于初始化与回放）。

**WebSocket** `/ws/klines`  
**Payload:** `symbol`, `interval`  
推送实时 K 线（用于非 ETH 的统一实时数据接入）。

### 3) 下注与结果
**POST** `/api/bets`  
提交下注（区块坐标、赔率、金额、时间线信息等）。

**GET** `/api/bets/active`  
返回当前用户进行中的下注。

**GET** `/api/bets/history`  
返回历史记录（含 WIN/LOSS/LIVE）。

**GET** `/api/bets/{betId}/result`  
返回单次下注结算结果。

### 4) 赔率与区块
**GET** `/api/odds`  
**Query:** `symbol`, `timeframe`  
返回当前预测区块的赔率矩阵。

**GET** `/api/prediction-grid`  
返回当前可下注区块范围、时间线位置与可用区块信息。

## 项目结构
- `pages/` — 页面级视图（Home / Markets / Terminal / Dashboard）
- `components/` — 通用组件
- `components/terminal/` — 终端专用组件
- `components/prediction/` — 预测网格子组件
- `hooks/` — 数据与网格逻辑（包含 Binance 实时流）
- `data/` — Demo 数据
- `translations.ts` — 中英文文案
- `index.css` / `index.html` — 全局样式与 Tailwind 配置

## 维护性拆分记录（不改 UI）
- `pages/Terminal.tsx` 的状态与数据生成已迁出到 `hooks/useTerminalState.ts`。
- `components/PredictionChart.tsx` 的图表交互与绘制逻辑已迁出到：
  - `components/prediction/useChartPan.ts`
  - `components/prediction/useCandleCanvas.ts`

## 近期维护/性能说明（不改 UI）
- **页面切换**：`App.tsx` 使用 `startTransition` 更新 `activePage`，并用 `navPage` 让 Header 选中态即时反馈，避免切换瞬间抖动。
- **Terminal 预加载**：`pages/Terminal` 采用 `React.lazy`，Header hover 时触发 `onPrefetchPage` 预加载，减轻首次进入卡顿。
- **图表绘制节流**：K 线绘制在 `useCandleCanvas` 内部通过 `requestAnimationFrame` 统一渲染，减少同步阻塞。
- **交易记录**：`TransactionHistorySection` 将筛选项与数据列表 `useMemo`，避免重复构建导致的无谓渲染。
- **组件稳定性**：`ChartToolbar` / `HistoryPanel` 已 `React.memo`，后续新增 props 时注意传入稳定引用（如 `useMemo` / `useCallback`）。

## 备注
- `.env.local` 当前不影响前端功能，可忽略。
