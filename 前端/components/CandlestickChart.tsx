import React from 'react';
import { CandleData } from '../types';

interface CandlestickChartProps {
  data: CandleData[];
  showMA?: boolean;  // 是否显示均线
  gridRows?: number; // 网格行数，用于与投注网格对齐
  gridCols?: number; // 网格列数
}

export function CandlestickChart({
  data,
  showMA = true,
  gridRows = 5,  // 默认5行，与投注网格对齐
  gridCols = 6   // 默认6列，宽度减半以匹配右侧投注网格
}: CandlestickChartProps) {
  if (!data.length) return null;

  // 计算价格范围
  const minPrice = Math.min(...data.map(d => d.low)) * 0.998;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.002;
  const priceRange = maxPrice - minPrice || 1;

  // 使用百分比坐标，让SVG自适应容器
  const viewWidth = 100;
  const viewHeight = 100;
  const padding = 2; // 小padding防止K线被裁剪

  const getY = (price: number) => {
    return viewHeight - padding - ((price - minPrice) / priceRange) * (viewHeight - padding * 2);
  };

  const stepX = (viewWidth - padding) / data.length;
  const candleWidth = Math.max(1, stepX * 0.6);

  // Y轴标签 - 5个价格点对应5行
  const yLabels = Array.from({ length: gridRows + 1 }, (_, i) => {
    const price = maxPrice - (i * priceRange / gridRows);
    return price < 1 ? price.toFixed(4) : price.toLocaleString();
  });

  // 均线路径
  const maPath = data.map((d, i) => {
    const x = i * stepX + stepX / 2;
    const y = getY(d.close);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  return (
    <div className="relative w-full h-full">
      {/* 网格背景 - 动态计算以对齐投注网格 */}
      <div
        className="absolute inset-0 z-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: `calc(100% / ${gridCols}) calc(100% / ${gridRows})`
        }}
      />

      {/* SVG K线图 */}
      <svg
        className="absolute inset-0 w-full h-full z-10"
        preserveAspectRatio="none"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      >
        <defs>
          <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 蜡烛图 */}
        {data.map((candle, i) => {
          const centerX = i * stepX + stepX / 2;
          const x = centerX - candleWidth / 2;
          const isUp = candle.close >= candle.open;
          const color = isUp ? '#10B981' : '#EF4444';

          const yHigh = getY(candle.high);
          const yLow = getY(candle.low);
          const yOpen = getY(candle.open);
          const yClose = getY(candle.close);
          const barTop = Math.min(yOpen, yClose);
          const barHeight = Math.max(0.5, Math.abs(yOpen - yClose));

          return (
            <g key={i}>
              <line
                x1={centerX} x2={centerX}
                y1={yHigh} y2={yLow}
                stroke={color} strokeWidth="0.15"
              />
              <rect
                x={x} y={barTop}
                width={candleWidth} height={barHeight}
                fill={isUp ? 'none' : color}
                stroke={color} strokeWidth="0.2"
              />
            </g>
          );
        })}

        {/* 均线 */}
        {showMA && (
          <path
            d={maPath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="0.3"
            opacity="0.8"
            filter="url(#glow-blue)"
          />
        )}
      </svg>

      {/* NOW 指示器 */}
      <div className="absolute top-0 bottom-0 right-0 w-[1px] border-r border-dashed border-blue-400 z-30 shadow-[0_0_10px_#3B82F6]">
        <div className="absolute top-1/2 -translate-y-1/2 right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          NOW
        </div>
      </div>

      {/* Y轴标签 - 与网格行对齐 */}
      <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between py-1 text-[9px] font-mono text-gray-500 select-none pointer-events-none z-20">
        {yLabels.map((label, i) => (
          <span key={i} className="bg-[#10151e]/80 px-0.5">{label}</span>
        ))}
      </div>
    </div>
  );
}
