import React from 'react';

interface StatRowProps {
  label: string;
  value: string;
  progress: number;
  color: string;
}

export const StatRow = ({ label, value, progress, color }: StatRowProps) => (
    <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">{label}</span>
            <span className={`text-lg font-bold ${color.replace('bg-', 'text-')}`}>{value}</span>
        </div>
        <div className="w-full bg-[#161f2d] h-2 rounded-full neu-in overflow-hidden">
            <div className={`${color} h-full rounded-full shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
        </div>
    </div>
);
