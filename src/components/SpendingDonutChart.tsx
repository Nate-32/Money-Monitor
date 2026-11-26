import React, { useState } from 'react';
import { CurrencyCode } from '../types/finance';
import { formatMoney } from '../utils/formatters';

export interface SpendingSlice {
  categoryId: string;
  label: string;
  amount: number;
  color: string;
  percentage: number;
}

interface SpendingDonutChartProps {
  slices: SpendingSlice[];
  totalExpense: number;
  currency: CurrencyCode;
  onSelectCategory?: (categoryId: string) => void;
}

export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({
  slices,
  totalExpense,
  currency,
  onSelectCategory,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const size = 200;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const activeSlice = slices.find((s) => s.categoryId === hoveredId) ?? null;

  let cumulativeOffset = 0;

  if (slices.length === 0 || totalExpense <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative flex items-center justify-center w-40 h-40 rounded-full border border-white/15">
          <span className="text-xs text-[#F4F4F8]/55">No expenses logged</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Transparent SVG Ring Chart */}
      <div className="relative shrink-0 w-[196px] h-[196px] flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 bg-transparent"
          role="img"
          aria-label="Spending breakdown by category"
        >
          {/* Subtle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice) => {
            const gap = slices.length > 1 ? 3 : 0;
            const dashLength = Math.max(0, (slice.percentage / 100) * circumference - gap);
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += (slice.percentage / 100) * circumference;

            const isHovered = hoveredId === slice.categoryId;
            const isDimmed = hoveredId !== null && !isHovered;

            return (
              <circle
                key={slice.categoryId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                className="cursor-pointer transition-opacity duration-150"
                style={{ opacity: isDimmed ? 0.35 : 0.92 }}
                onMouseEnter={() => setHoveredId(slice.categoryId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectCategory?.(slice.categoryId)}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
          <span className="text-[11px] font-medium tracking-wide text-[#F4F4F8]/65">
            {activeSlice ? activeSlice.label : 'Total Spent'}
          </span>
          <span className="mt-0.5 text-lg font-semibold text-[#F4F4F8] tabular-nums">
            {formatMoney(activeSlice ? activeSlice.amount : totalExpense, currency, {
              compact: totalExpense >= 100000,
              decimals: 0,
            })}
          </span>
          {activeSlice && (
            <span className="text-[11px] text-[#55D6E8] tabular-nums">
              {activeSlice.percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Clean Readable Legend */}
      <div className="w-full flex-1 space-y-2.5">
        {slices.slice(0, 6).map((slice) => {
          const isHovered = hoveredId === slice.categoryId;
          return (
            <button
              key={slice.categoryId}
              type="button"
              onMouseEnter={() => setHoveredId(slice.categoryId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectCategory?.(slice.categoryId)}
              className={`w-full flex items-center justify-between gap-3 py-1 px-2 -mx-2 rounded-lg text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55D6E8] ${
                isHovered ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className="text-sm text-[#F4F4F8]/90 truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 tabular-nums">
                <span className="text-xs text-[#F4F4F8]/55 w-10 text-right">
                  {slice.percentage.toFixed(0)}%
                </span>
                <span className="text-sm font-medium text-[#F4F4F8] min-w-[74px] text-right">
                  {formatMoney(slice.amount, currency, { decimals: 0 })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
