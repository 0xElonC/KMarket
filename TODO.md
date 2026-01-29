## TODO - K 线图高度依赖修复（后续统一处理）

### 问题
- 当前 K 线图依赖父级 flex 高度链，若布局调整导致高度断裂，会出现图表高度为 0、K 线消失的问题。

### 目标
- 让图表拥有稳定高度来源，不再依赖整页高度链传导。

### 备选方案（建议方案 1）
1) **图表专用高度容器（推荐）**
   - 在 Terminal 内部为图表区域增加“固定高度来源”的容器：
     - 例如：`min-h-[calc(100vh-Header-外边距)]` 或单独的 `h-[...]`。
   - 只约束容器高度，不改变视觉样式。
2) **图表最小高度兜底**
   - 给图表外层加 `min-h-[480px]`（或指定值） + `flex-1`。
   - 简单稳，但小屏会挤压其它区域。

### 待确认
- Header 实际高度与页面 padding 的最终基准值。
- 是否允许为 Terminal 内部新增高度约束容器。

---

## TODO - 多UI风格支持（主题系统）

### 背景
- 当前前端完成度约70%，预计明天可达95% MVP状态
- 计划在现有设计基础上增加两种不同的UI风格
- 新风格的CSS代码已经存在，主要工作是样式类的替换

### 目标
- 支持三种UI风格的切换（当前默认风格 + 两种新风格）
- 保持布局和内容完全不变，仅替换视觉样式
- 建立可维护的主题系统，便于后续扩展

### 涉及范围
**需要处理的组件：**
- 核心图表：PredictionChart、BettingCells、K线Canvas
- UI控件：Header、Tab切换、侧边栏、胶囊卡片
- 交互元素：按钮、输入框、下拉菜单
- 状态显示：WIN/LOSS/LIVE卡片、价格标签

**需要替换的样式类型：**
- 颜色类：`bg-[#121721]`, `text-cyan-400`, `border-blue-500/20`
- 阴影效果：`shadow-[0_10px_30px_rgba(0,0,0,0.5)]`
- 自定义neumorphism类：`neu-out`, `neu-in`, `neu-btn-3d`
- 状态样式：hover、active、disabled

### 备选方案

#### 方案1：CSS变量主题系统（推荐）
**实现方式：**
```css
/* theme-default.css */
.theme-default {
  --bg-primary: #121721;
  --bg-secondary: #1a1f2e;
  --text-accent: #22d3ee;
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --border-color: rgba(255,255,255,0.1);
  --neu-shadow-out: ...;
  --neu-shadow-in: ...;
}

/* theme-style1.css */
.theme-style1 {
  --bg-primary: #1a1f2e;
  --text-accent: #a78bfa;
  /* ... */
}

/* theme-style2.css */
.theme-style2 {
  --bg-primary: #ffffff;
  --text-accent: #3b82f6;
  /* ... */
}
```

**优点：**
- 只需重构一次，将硬编码颜色替换为CSS变量
- 切换主题只需改变根元素的class
- 维护成本低，扩展新风格容易
- 性能好，无需重新渲染组件

**缺点：**
- 需要前期重构现有代码
- Tailwind的utility类需要特殊处理

**工作流程：**
1. 定义CSS变量体系（颜色、阴影、边框等）
2. 重构现有组件，将硬编码值替换为变量
3. 为三种风格定义变量值
4. 实现主题切换逻辑（Context + localStorage）
5. 测试三种风格的视觉效果

#### 方案2：主题配置对象
**实现方式：**
```tsx
// themes.ts
export const themes = {
  default: {
    card: 'neu-out bg-[#121721] border-white/10',
    cardHover: 'hover:bg-white/5',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-400',
      accent: 'text-cyan-400'
    },
    button: {
      primary: 'neu-btn-3d bg-gradient-to-br from-cyan-500 to-blue-600',
      secondary: 'bg-white/5 hover:bg-white/10'
    }
  },
  style1: { /* ... */ },
  style2: { /* ... */ }
}

// 使用
const { theme } = useTheme()
<div className={themes[theme].card}>
```

**优点：**
- TypeScript类型安全
- 样式集中管理
- 便于复用样式组合

**缺点：**
- 需要大量重构现有组件
- 代码中充斥着`themes[theme].xxx`
- 动态类名可能影响Tailwind的tree-shaking

#### 方案3：硬编码条件替换（不推荐）
**实现方式：**
```tsx
<div className={
  theme === 'default' ? 'neu-out bg-[#121721] text-cyan-400' :
  theme === 'style1' ? 'glass-out bg-[#1a1f2e] text-purple-400' :
  'flat-card bg-white text-blue-600'
}>
```

**优点：**
- 实现最快，无需架构调整
- 直观，容易理解

**缺点：**
- 代码重复，维护困难
- 每个组件都需要添加条件判断
- 容易遗漏，不易扩展

### 实施步骤（基于方案1）

**阶段1：准备工作**
- [ ] 审计当前代码，列出所有使用的样式类
- [ ] 从新风格代码中提取对应的CSS类
- [ ] 设计CSS变量命名体系
- [ ] 建立样式映射表

**阶段2：架构搭建**
- [ ] 创建主题CSS文件（theme-default.css, theme-style1.css, theme-style2.css）
- [ ] 定义CSS变量（颜色、阴影、边框等）
- [ ] 实现ThemeContext和useTheme hook
- [ ] 添加主题切换UI（可选）
- [ ] 实现主题持久化（localStorage）

**阶段3：样式重构**
- [ ] 重构自定义CSS类（neu-out, neu-in等），使用CSS变量
- [ ] 更新Tailwind配置，支持CSS变量
- [ ] 逐个组件替换硬编码颜色为变量
- [ ] 处理动态样式和状态类

**阶段4：测试验证**
- [ ] 视觉回归测试（对比三种风格的截图）
- [ ] 交互测试（hover、active、focus等状态）
- [ ] 响应式测试（不同屏幕尺寸）
- [ ] 主题切换流畅性测试
- [ ] 浏览器兼容性测试

### 待确认
- 两种新风格的具体使用场景（用户选择 vs 产品版本）
- 是否需要实时动态切换功能
- 是否需要主题切换动画过渡效果
- 新风格与默认风格的差异程度（仅颜色 vs 包括阴影/圆角等）
- 是否需要支持自定义主题（用户自定义颜色）

### 潜在风险
- **Tailwind的限制**：部分utility类（如`bg-[#121721]`）无法直接使用CSS变量，需要通过Tailwind配置或自定义类解决
- **neumorphism效果**：阴影效果高度依赖背景色，需要为每种风格精心调整
- **颜色语义混用**：如果代码中混用了具体颜色和语义颜色，需要统一处理
- **第三方组件**：如果使用了第三方UI库，可能无法完全控制样式

### 优化建议
- 使用Tailwind的`theme()`函数引用CSS变量
- 建立设计token体系，统一管理颜色、间距、阴影等
- 考虑使用CSS-in-JS方案（如styled-components）以获得更好的动态样式支持
- 添加主题预览功能，方便开发和测试

---

## TODO - 光晕（Halo）项位置信息清单

### 备注
- 该清单仅记录“产生光晕/立体感”的位置与实现方式，未修改任何样式。
- 关键词：`box-shadow` / `text-shadow` / `drop-shadow` / `blur` / `backdrop-filter`.

### 全局类（Neumorphism / 通用光晕）
- `index.html:39` `.neu-out` → `box-shadow: 6px 6px 12px #151d29, -6px -6px 12px #27354d`
- `index.html:44` `.neu-in` → `box-shadow: inset 4px 4px 8px #131a25, inset -4px -4px 8px #1c2637`
- `index.html:49` `.neu-btn` → `box-shadow: 5px 5px 10px #151d29, -5px -5px 10px #27354d`
- `index.html:55` `.neu-btn:hover` → `box-shadow: 7px 7px 14px #121a25, -7px -7px 14px #2a3851`
- `index.html:60` `.neu-btn:active/.active` → `box-shadow: inset 4px 4px 8px #151d29, inset -4px -4px 8px #27354d`
- `index.html:74` `.led-green` → `box-shadow: 0 0 5px #10b981, 0 0 10px #10b981`
- `index.html:77` `.led-red` → `box-shadow: 0 0 5px #ef4444, 0 0 10px #ef4444`

### Header 专用光晕缩小层
- `index.css:182` `.header-halo .neu-out` → `box-shadow: 3px 3px 6px ...`
- `index.css:186` `.header-halo .neu-in` → `box-shadow: inset 2px 2px 4px ...`
- `index.css:190` `.header-halo .neu-btn` → `box-shadow: 2.5px 2.5px 5px ...`
- `index.css:194` `.header-halo .neu-btn:hover` → `box-shadow: 3.5px 3.5px 7px ...`
- `index.css:199` `.header-halo .neu-btn:active` → `box-shadow: inset 2px 2px 4px ...`
- `index.css:203` `.header-balance-glow` → `text-shadow: 0 0 2px rgba(59,130,246,0.16)`

### 交易终端（Terminal）
- `pages/Terminal.tsx:486` 状态点（WIN）→ `shadow-[0_0_5px_rgba(34,197,94,0.6)]`
- `pages/Terminal.tsx:488` 状态点（LIVE）→ `shadow-[0_0_5px_rgba(59,130,246,0.5)]`
- `pages/Terminal.tsx:549` 下注胶囊 → `shadow-[0_10px_30px_rgba(0,0,0,0.5)]` + `backdrop-blur-md`
- `pages/Terminal.tsx:571` 金额按钮 → `shadow-[0_0_10px_rgba(34,211,238,0.1)]`
- `pages/Terminal.tsx:584` 闪电按钮 → `shadow-lg` / `hover:shadow-cyan-500/40`
- `pages/Terminal.tsx:596` 时间粒度按钮 → `shadow-sm`

### 预测图表（PredictionChart）
- `components/PredictionChart.tsx:429` NOW 线 → `shadow-[0_0_10px_#3B82F6]`
- `components/PredictionChart.tsx:439` +3m 线 → `shadow-[0_0_10px_#F59E0B]`
- `components/PredictionChart.tsx:506-507` 标签文字 → `drop-shadow-md`
- `components/PredictionChart.tsx:575` `+USDC` 徽章 → `shadow-lg`

### 下注网格（BettingGrid）
- `components/BettingGrid.tsx:34-35` 文字状态 → `drop-shadow-md`
- `components/BettingGrid.tsx:74` 徽章 → `shadow-lg`

### 主页（Home）
- `pages/Home.tsx:17-18` 背景光晕 → `blur-3xl`
- `pages/Home.tsx:21` 状态点 → `shadow-[0_0_8px_rgba(34,197,94,0.6)]`
- `pages/Home.tsx:60` 容器 → `shadow-[0_0_10px_rgba(59,130,246,0.2)]`
- `pages/Home.tsx:61` 线条 → `shadow-[0_0_5px_#3B82F6]`
- `pages/Home.tsx:75` 容器 → `shadow-[0_0_15px_rgba(245,158,11,0.3)]`

### Dashboard
- `pages/Dashboard.tsx:73` 主金额 → `drop-shadow-lg`
- `pages/Dashboard.tsx:164` 下拉面板 → `shadow-2xl`
- `pages/Dashboard.tsx:175` 选中点 → `shadow-[0_0_5px_#3B82F6]`
- `components/StatRow.tsx:17` 进度条 → `shadow-[0_0_10px_currentColor]`

### 其他组件
- `components/ConfirmModal.tsx:18` 弹窗 → `shadow-2xl`
- `components/HudStrip.tsx:22` HUD 文本 → `drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]`
- `components/AssetListItem.tsx:23` 涨跌幅 → `drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]`
- `components/AssetCard.tsx:46` 价格 → `drop-shadow-sm`
- `components/AssetCard.tsx:51` 涨跌 → `drop-shadow-[0_0_8px_currentColor]`
- `components/CandlestickChart.tsx:118` 竖线 → `shadow-[0_0_10px_#3B82F6]`

### 交互/文本光晕（CSS）
- `index.css:11` `.bet-cell-base` → `backdrop-filter: blur(2px)`
- `index.css:17` `.bet-cell-base:hover` → `box-shadow: inset 0 0 15px ...`
- `index.css:23` `.bet-cell-selected` → `box-shadow: inset 0 0 0 1px ..., 0 0 20px ...`
- `index.css:30` `.bet-cell-win` → `box-shadow: inset 0 0 0 1px ...`
- `index.css:61` `.bet-cell-base:hover .text-glow-hover` → `text-shadow: 0 0 8px ...`
- `index.css:71-73` `@keyframes pulse-gold` → `box-shadow` 动画
- `index.css:88-89` `.hud-strip` → `backdrop-filter: blur(12px)`
- `index.css:92` `.hud-strip` → `box-shadow: 0 8px 32px ..., inset ...`
- `index.css:119` `.hud-divider` → `box-shadow: 0 0 4px ...`
- `index.css:139` `.hud-input:focus` → `box-shadow: 0 1px 4px ...`
- `index.css:165-166` `.hud-btn:hover` → `box-shadow: 0 0 15px ...` + `text-shadow`
