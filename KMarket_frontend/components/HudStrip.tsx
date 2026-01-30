import React, { useState } from 'react';

interface HudStripProps {
  odds: number;
  defaultAmount?: number;
  onBet?: (amount: number) => void;
}

export function HudStrip({
  odds,
  defaultAmount = 20,
  onBet
}: HudStripProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const estimatedReturn = amount * odds;

  return (
    <div className="hud-strip">
      {/* 赔率 */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-gray-400 font-mono tracking-wider">ODDS</span>
        <span className="text-xs text-cyan-400 font-mono font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
          {odds.toFixed(1)}x
        </span>
      </div>

      <div className="hud-divider" />

      {/* 金额输入 */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 font-mono">$</span>
        <input
          type="number"
          className="hud-input"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          placeholder="0.00"
        />
      </div>

      <div className="hud-divider" />

      {/* 预估收益 */}
      <div className="flex flex-col gap-0.5 min-w-[50px] text-right">
        <span className="text-[9px] text-gray-400 font-mono tracking-wider">EST.</span>
        <span className="text-xs text-green-400 font-mono font-bold">
          ${estimatedReturn.toFixed(0)}
        </span>
      </div>

      {/* 下注按钮 */}
      <button
        className="hud-btn ml-1"
        onClick={() => onBet?.(amount)}
      >
        BET
      </button>
    </div>
  );
}
