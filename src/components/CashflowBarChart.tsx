import React, { useState } from 'react';
import { CurrencyCode } from '../types/finance';
import { formatMoney } from '../utils/formatters';

export interface MonthlyCashflowPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
}

interface CashflowBarChartProps {
  data: MonthlyCashflowPoint[];
  currency: CurrencyCode;
}

export const CashflowBarChart: React.FC<CashflowBarChartProps> = ({ data, currency }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.income, d.expense])
  );
  const yMax = Math.ceil(maxVal / 1000) * 1000 || maxVal;

  const chartHeight = 220;
  const chartWidth = 600;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const groupWidth = data.length > 0 ? plotW / data.length : plotW;
  const barWidth = Math.min(22, Math.max(10, groupWidth * 0.28));
  const barGap = 6;

  const ticks = [0, 0.5, 1].map((ratio) => Math.round(yMax * ratio));

  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="w-full">
      {/* Legend & Hover Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-5 text-xs text-[#F4F4F8]/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#55D6E8]" aria-hidden="true" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C9A]" aria-hidden="true" />
            <span>Expenses</span>
          </div>
        </div>

        <div className="text-xs text-[#F4F4F8]/75 tabular-nums min-h-[18px]">
          {activePoint ? (
            <span>
              {activePoint.label}:{' '}
              <span className="text-[#34D399] font-medium">
                {formatMoney(activePoint.income, currency, { decimals: 0 })}
              </span>
              {' · '}
              <span className="text-[#FB7185] font-medium">
                {formatMoney(activePoint.expense, currency, { decimals: 0 })}
              </span>
            </span>
          ) : (
            <span className="text-[#F4F4F8]/50">Hover a month to inspect figures</span>
          )}
        </div>
      </div>

      {/* Transparent SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[420px] bg-transparent"
          role="img"
          aria-label="Monthly income and expenses comparison"
        >
          {/* Horizontal hairline gridlines */}
          {ticks.map((tickVal) => {
            const y = padTop + plotH - (tickVal / yMax) * plotH;
            return (
              <g key={tickVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.10)"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(244, 244, 248, 0.55)"
                  fontSize="11"
                  className="tabular-nums"
                >
                  {formatMoney(tickVal, currency, { compact: true, decimals: 0 })}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {data.map((point, idx) => {
            const centerX = padLeft + idx * groupWidth + groupWidth / 2;
            const incomeH = (point.income / yMax) * plotH;
            const expenseH = (point.expense / yMax) * plotH;
            const incomeY = padTop + plotH - incomeH;
            const expenseY = padTop + plotH - expenseH;
            const isHovered = activeIndex === idx;

            return (
              <g
                key={point.monthKey}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Invisible wider hit zone */}
                <rect
                  x={padLeft + idx * groupWidth}
                  y={padTop}
                  width={groupWidth}
                  height={plotH + padBottom}
                  fill={isHovered ? 'rgba(255,255,255,0.04)' : 'transparent'}
                  rx={6}
                />

                {/* Income Bar */}
                <rect
                  x={centerX - barWidth - barGap / 2}
                  y={incomeY}
                  width={barWidth}
                  height={Math.max(2, incomeH)}
                  rx={4}
                  fill="#55D6E8"
                  fillOpacity={activeIndex === null || isHovered ? 0.88 : 0.45}
                />

                {/* Expense Bar */}
                <rect
                  x={centerX + barGap / 2}
                  y={expenseY}
                  width={barWidth}
                  height={Math.max(2, expenseH)}
                  rx={4}
                  fill="#FF5C9A"
                  fillOpacity={activeIndex === null || isHovered ? 0.88 : 0.45}
                />

                {/* X-axis label */}
                <text
                  x={centerX}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#F4F4F8' : 'rgba(244, 244, 248, 0.65)'}
                  fontSize="11"
                  fontWeight={isHovered ? 600 : 400}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
