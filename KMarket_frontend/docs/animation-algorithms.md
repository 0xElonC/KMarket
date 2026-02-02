# 动画算法存档

用于 K 线图价格跟踪和平滑动画的算法集合。

---

## 1. 帧率无关的指数衰减 (Exponential Decay)

**当前使用中 ✅**

```typescript
/**
 * 帧率无关的指数衰减
 * @param current - 当前值
 * @param target - 目标值
 * @param halfLife - 半衰期（毫秒），值变化一半所需时间
 * @param deltaMs - 帧间隔（毫秒）
 */
const expDecay = (current: number, target: number, halfLife: number, deltaMs: number): number => {
  const decay = Math.exp(-0.693 * deltaMs / halfLife); // 0.693 = ln(2)
  return target + (current - target) * decay;
};

// 使用示例
animPrice = expDecay(animPrice, targetPrice, 100, dt * 1000);
basePrice = expDecay(basePrice, animPrice, deviation > maxDeviation ? 200 : 2000, dt * 1000);
```

**特点**：
- 无论帧率高低（30fps 或 144fps），动画效果一致
- `halfLife` 参数直观：100ms 表示值在 100ms 后变化一半

---

## 2. 临界阻尼弹簧 (Critically Damped Spring)

**备选方案 - 更自然的物理感**

```typescript
interface SpringState {
  value: number;
  velocity: number;
}

/**
 * 临界阻尼弹簧
 * @param state - 当前状态 { value, velocity }
 * @param target - 目标值
 * @param omega - 角频率（越大越快）
 * @param deltaMs - 帧间隔（毫秒）
 */
const criticallyDampedSpring = (
  state: SpringState,
  target: number,
  omega: number,
  deltaMs: number
): SpringState => {
  const dt = deltaMs / 1000;
  const x = state.value - target;
  const v = state.velocity;
  
  const exp = Math.exp(-omega * dt);
  const newValue = target + (x + (v + omega * x) * dt) * exp;
  const newVelocity = (v - omega * (v + omega * x) * dt) * exp;
  
  return { value: newValue, velocity: newVelocity };
};

// 使用示例
let priceState = { value: currentPrice, velocity: 0 };
// 在 draw 循环中:
priceState = criticallyDampedSpring(priceState, targetPrice, 10, dt * 1000);
animPrice = priceState.value;
```

**特点**：
- 最快收敛到目标值且无振荡
- 物理感觉更自然
- 需要维护速度状态

---

## 3. 速度限制跟踪 (Velocity Clamping)

**备选方案 - 精确控制最大变化速度**

```typescript
/**
 * 速度限制跟踪
 * @param current - 当前值
 * @param target - 目标值
 * @param maxSpeed - 每秒最大变化量
 * @param deltaMs - 帧间隔（毫秒）
 */
const velocityClamped = (
  current: number,
  target: number,
  maxSpeed: number,
  deltaMs: number
): number => {
  const diff = target - current;
  const maxChange = maxSpeed * (deltaMs / 1000);
  
  if (Math.abs(diff) <= maxChange) {
    return target;
  }
  return current + Math.sign(diff) * maxChange;
};

// 使用示例：每秒最多变化 $50
animPrice = velocityClamped(animPrice, targetPrice, 50, dt * 1000);
```

**特点**：
- 线性追踪，速度恒定
- 适用于需要精确控制动画时长的场景

---

## 4. 线性插值 (Lerp) - 帧率相关

**不推荐 - 帧率相关**

```typescript
// 简单但帧率相关，不推荐用于生产
const lerp = (current: number, target: number, t: number): number => {
  return current + (target - current) * t;
};

// 使用示例 (t 需要根据帧率调整)
animPrice = lerp(animPrice, targetPrice, 0.1);
```

**问题**：
- 60fps 时 t=0.1 效果与 30fps 时完全不同
- 应使用上面的帧率无关版本

---

## 当前 KMarketGame 配置

```typescript
// 文件: KMarket_frontend/components/KMarketGame.tsx

// 价格动画 (快速跟踪)
halfLife: 100ms  // 100ms 后变化 50%

// 基准价格跟踪 (用于视图居中)
normalHalfLife: 2000ms    // 正常情况下慢速跟踪
fastHalfLife: 200ms       // 价格超出可视范围 70% 时快速跟踪
```
