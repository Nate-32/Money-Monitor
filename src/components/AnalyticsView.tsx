import React, { useMemo } from 'react';
import { CategoryMeta, CurrencyCode, Transaction } from '../types/finance';
import {
  formatMoney,
  formatMonthLabel,
  formatShortMonth,
  getCategoryMeta,
  getDaysRemainingInMonth,
} from '../utils/formatters';
import { CashflowBarChart, MonthlyCashflowPoint } from './CashflowBarChart';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: CategoryMeta[];
  selectedMonth: string;
  currency: CurrencyCode;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  selectedMonth,
  currency,
}) => {
  const monthlySeries: MonthlyCashflowPoint[] = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const m = tx.date.slice(0, 7);
      const entry = map.get(m) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(m, entry);
    }

    if (map.size === 0) {
      return [
        {
          monthKey: selectedMonth,
          label: formatShortMonth(selectedMonth),
          income: 0,
          expense: 0,
        },
      ];
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, totals]) => ({
        monthKey,
        label: formatShortMonth(monthKey),
        income: totals.income,
        expense: totals.expense,
      }));
  }, [transactions, selectedMonth]);

  const monthStats = useMemo(() => {
    const inMonth = transactions.filter((t) => t.date.startsWith(selectedMonth));
    let income = 0;
    let expense = 0;
    let recurringExpense = 0;
    const catTotals = new Map<string, number>();

    for (const tx of inMonth) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
        if (tx.recurring) recurringExpense += tx.amount;
        catTotals.set(tx.category, (catTotals.get(tx.category) ?? 0) + tx.amount);
      }
    }

    const { daysElapsed } = getDaysRemainingInMonth(selectedMonth);
    const dailyBurn = daysElapsed > 0 ? expense / daysElapsed : 0;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    const topCategories = Array.from(catTotals.entries())
      .map(([catId, amount]) => ({
        meta: getCategoryMeta(catId, categories),
        amount,
        share: expense > 0 ? (amount / expense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { income, expense, recurringExpense, dailyBurn, savingsRate, topCategories };
  }, [transactions, categories, selectedMonth]);

  return (
    <div className="space-y-4 sm:space-y-5 text-legible">
      {/* Top Summary Strip */}
      <section className="glass-pane p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#F4F4F8]/65">
          Financial Analytics · {formatMonthLabel(selectedMonth)}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <div>
            <p className="text-xs text-[#F4F4F8]/60">Monthly Savings Rate</p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                monthStats.savingsRate >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
              }`}
            >
              {monthStats.savingsRate.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55">Target benchmark: 20%+</p>
          </div>

          <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6">
            <p className="text-xs text-[#F4F4F8]/60">Average Daily Spend</p>
            <p className="mt-1 text-2xl font-semibold text-[#F4F4F8] tabular-nums">
              {formatMoney(monthStats.dailyBurn, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55">Outflow velocity this month</p>
          </div>

          <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6">
            <p className="text-xs text-[#F4F4F8]/60">Fixed Recurring Bills</p>
            <p className="mt-1 text-2xl font-semibold text-[#55D6E8] tabular-nums">
              {formatMoney(monthStats.recurringExpense, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55 tabular-nums">
              {monthStats.expense > 0
                ? `${((monthStats.recurringExpense / monthStats.expense) * 100).toFixed(0)}% of monthly spend`
                : 'No expenses logged'}
            </p>
          </div>
        </div>
      </section>

      {/* 6-Month Cashflow Chart */}
      <section className="glass-pane p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#F4F4F8]">Cashflow Trend</h2>
          <p className="text-xs text-[#F4F4F8]/55 mt-0.5">
            Monthly income versus total expenses across recent periods
          </p>
        </div>

        <CashflowBarChart data={monthlySeries} currency={currency} />
      </section>

      {/* Category Spend Distribution Table */}
      <section className="glass-pane p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[#F4F4F8] mb-4">
          Category Breakdown · {formatMonthLabel(selectedMonth)}
        </h2>

        {monthStats.topCategories.length === 0 ? (
          <p className="text-sm text-[#F4F4F8]/65 py-6">
            No expenses recorded for this month yet.
          </p>
        ) : (
          <div className="divide-y divide-white/10 border-t border-white/10">
            {monthStats.topCategories.map((row) => (
              <div
                key={row.meta.id}
                className="py-3 flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: row.meta.color }}
                    aria-hidden="true"
                  />
                  <span className="text-[#F4F4F8]/90 truncate">{row.meta.label}</span>
                </div>

                <div className="hidden sm:block w-44">
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, row.share)}%`,
                        backgroundColor: row.meta.color,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0 tabular-nums">
                  <span className="text-xs text-[#F4F4F8]/60 w-10 sm:w-12 text-right">
                    {row.share.toFixed(1)}%
                  </span>
                  <span className="font-semibold text-[#F4F4F8] w-20 sm:w-24 text-right font-mono-num">
                    {formatMoney(row.amount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
