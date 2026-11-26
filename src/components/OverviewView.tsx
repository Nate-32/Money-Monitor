import React from 'react';
import { ArrowRight, FileSpreadsheet, Plus, SlidersHorizontal } from 'lucide-react';
import {
  CategoryBudget,
  CategoryMeta,
  CurrencyCode,
  Transaction,
} from '../types/finance';
import {
  formatMoney,
  formatMonthLabel,
  formatTransactionDate,
  getCategoryMeta,
  getDaysRemainingInMonth,
} from '../utils/formatters';
import { SpendingDonutChart, SpendingSlice } from './SpendingDonutChart';

interface OverviewViewProps {
  selectedMonth: string;
  currency: CurrencyCode;
  availableBalance: number;
  monthIncome: number;
  monthExpenses: number;
  monthlyBudgetCap: number;
  categories: CategoryMeta[];
  categoryBudgets: CategoryBudget[];
  monthTransactions: Transaction[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTransactions: (categoryFilter?: string) => void;
  onNavigateBudgets: () => void;
  onOpenSheetsSync: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  selectedMonth,
  currency,
  availableBalance,
  monthIncome,
  monthExpenses,
  monthlyBudgetCap,
  categories,
  categoryBudgets,
  monthTransactions,
  onAddTransaction,
  onEditTransaction,
  onNavigateTransactions,
  onNavigateBudgets,
  onOpenSheetsSync,
}) => {
  const { daysRemaining } = getDaysRemainingInMonth(selectedMonth);
  const netCashflow = monthIncome - monthExpenses;
  const hasMonthlyBudget = monthlyBudgetCap > 0;
  const budgetRemaining = monthlyBudgetCap - monthExpenses;
  const safeToSpendDaily =
    hasMonthlyBudget && budgetRemaining > 0 ? budgetRemaining / daysRemaining : 0;
  const budgetPct = hasMonthlyBudget ? (monthExpenses / monthlyBudgetCap) * 100 : 0;

  const budgetStatusLabel = !hasMonthlyBudget
    ? 'Not configured'
    : budgetPct > 100
    ? 'Over budget'
    : budgetPct >= 85
    ? 'Near limit'
    : 'On track';
  const budgetStatusColor = !hasMonthlyBudget
    ? 'text-[#F4F4F8]/60'
    : budgetPct > 100
    ? 'text-[#FB7185]'
    : budgetPct >= 85
    ? 'text-[#FF9866]'
    : 'text-[#34D399]';
  const budgetBarColor =
    budgetPct > 100 ? '#FB7185' : budgetPct >= 85 ? '#FF9866' : '#55D6E8';

  const expenseMap = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      expenseMap.set(tx.category, (expenseMap.get(tx.category) ?? 0) + tx.amount);
    }
  }

  const slices: SpendingSlice[] = Array.from(expenseMap.entries())
    .map(([categoryId, amount]) => {
      const meta = getCategoryMeta(categoryId, categories);
      return {
        categoryId,
        label: meta.label,
        amount,
        color: meta.color,
        percentage: monthExpenses > 0 ? (amount / monthExpenses) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const recentTransactions = [...monthTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const budgetMap = new Map(categoryBudgets.map((b) => [b.category, b.limit]));
  const topBudgetRows = categories
    .filter((c) => c.type === 'expense')
    .map((meta) => {
      const limit = budgetMap.get(meta.id) ?? 0;
      const spent = expenseMap.get(meta.id) ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return { category: meta.id, limit, spent, pct, meta };
    })
    .sort((a, b) => b.pct - a.pct || b.spent - a.spent)
    .slice(0, 4);

  const savingsRate = monthIncome > 0 ? (netCashflow / monthIncome) * 100 : 0;

  const [heroReady, setHeroReady] = React.useState(false);
  const bgHeroUrl = `${import.meta.env.BASE_URL}assets/aistudio/vice-city-bg.webp`;

  return (
    <div className="space-y-4 sm:space-y-5 text-legible">
      {/* Mobile Intro Window — shows full 16:9 Vice City hero artwork unclipped & unobstructed */}
      <div className="sm:hidden -mx-3 -mt-1 overflow-hidden" aria-label="Hero backdrop showcase">
        <img
          src={bgHeroUrl}
          alt="Money Monitor coastal sunset skyline"
          decoding="sync"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onLoad={() => setHeroReady(true)}
          className={`w-full aspect-[16/9] object-cover object-center select-none transition-opacity duration-200 ${
            heroReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 78%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 78%, rgba(0,0,0,0) 100%)',
          }}
        />
      </div>

      {/* Desktop/Tablet Open Intro Window — showcases full-viewport Vice City hero artwork unobstructed */}
      <div
        className="hidden sm:block sm:h-[42vh] lg:h-[52vh] min-h-[260px] max-h-[480px]"
        aria-label="Hero backdrop showcase"
      />

      {/* Focal Anchor: Available Balance + Key Financial Summary */}
      <section
        id="dashboard-balance"
        className="glass-pane p-5 sm:p-7"
        aria-label="Account balance summary"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#F4F4F8]/70">
              Available Balance · {formatMonthLabel(selectedMonth)}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1
                className={`text-3xl sm:text-5xl font-semibold tracking-tight tabular-nums ${
                  availableBalance >= 0 ? 'text-[#F4F4F8]' : 'text-[#FB7185]'
                }`}
              >
                {formatMoney(availableBalance, currency)}
              </h1>
              <span
                className={`text-xs sm:text-sm font-medium tabular-nums ${
                  netCashflow >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
                }`}
              >
                {formatMoney(netCashflow, currency, { signed: true })} this month
                {monthIncome > 0 ? ` (${savingsRate.toFixed(0)}% saved)` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSheetsSync}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Link Sheets</span>
            </button>
            <button
              type="button"
              onClick={onAddTransaction}
              className="hidden sm:inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium rounded-xl bg-[#FF5C9A] hover:bg-[#ff73a8] text-[#101322] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Hairline Divider & 3 Key Metrics */}
        <div className="mt-5 pt-5 border-t border-white/12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-[#F4F4F8]/60">Total Income</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-[#34D399] tabular-nums">
              {formatMoney(monthIncome, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55">
              {monthTransactions.filter((t) => t.type === 'income').length} inflow entries
            </p>
          </div>

          <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6">
            <p className="text-xs text-[#F4F4F8]/60">Total Expenses</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-[#FB7185] tabular-nums">
              {formatMoney(monthExpenses, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55">
              {monthTransactions.filter((t) => t.type === 'expense').length} outflow entries
            </p>
          </div>

          <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6">
            <p className="text-xs text-[#F4F4F8]/60">Safe-to-Spend</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-[#55D6E8] tabular-nums">
              {hasMonthlyBudget
                ? formatMoney(Math.max(0, budgetRemaining), currency)
                : formatMoney(0, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[#F4F4F8]/55 tabular-nums">
              {!hasMonthlyBudget
                ? 'Set a monthly budget in Budgets'
                : budgetRemaining > 0
                ? `${formatMoney(safeToSpendDaily, currency, { decimals: 0 })} / day · ${daysRemaining}d left`
                : 'Monthly budget limit reached'}
            </p>
          </div>
        </div>
      </section>

      {/* Middle 2-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Monthly Budget Progress */}
        <section className="glass-pane p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#F4F4F8]">Monthly Budget Progress</h2>
              <button
                type="button"
                onClick={onNavigateBudgets}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55D6E8] hover:text-[#86e3f0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                <span className="text-[#F4F4F8]/85">
                  <strong className="font-semibold text-[#F4F4F8]">
                    {formatMoney(monthExpenses, currency, { decimals: 0 })}
                  </strong>{' '}
                  {hasMonthlyBudget
                    ? `of ${formatMoney(monthlyBudgetCap, currency, { decimals: 0 })}`
                    : 'spent'}
                </span>
                <span className={`text-xs font-medium ${budgetStatusColor}`}>
                  {budgetStatusLabel}
                  {hasMonthlyBudget ? ` · ${Math.min(999, budgetPct).toFixed(0)}%` : ''}
                </span>
              </div>

              <div className="mt-2.5 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${hasMonthlyBudget ? Math.min(100, Math.max(0, budgetPct)) : 0}%`,
                    backgroundColor: budgetBarColor,
                  }}
                />
              </div>
            </div>

            {/* Category Progress List */}
            {topBudgetRows.length === 0 ? (
              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-xs text-[#F4F4F8]/65">
                  No categories configured yet. Add categories and limits in Budgets.
                </p>
                <button
                  type="button"
                  onClick={onNavigateBudgets}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/16 text-[#F4F4F8] transition-colors cursor-pointer"
                >
                  <span>Set Up Categories</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3.5 border-t border-white/10 pt-4">
                {topBudgetRows.map((row) => {
                  const over = row.limit > 0 && row.pct > 100;
                  return (
                    <div key={row.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-[#F4F4F8]/85 font-medium">{row.meta.label}</span>
                        <span className={over ? 'text-[#FB7185]' : 'text-[#F4F4F8]/70'}>
                          {formatMoney(row.spent, currency, { decimals: 0 })}
                          {row.limit > 0
                            ? ` / ${formatMoney(row.limit, currency, { decimals: 0 })}`
                            : ''}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.limit > 0 ? Math.min(100, row.pct) : 0}%`,
                            backgroundColor: over ? '#FB7185' : row.meta.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={onNavigateBudgets}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F4F4F8]/75 hover:text-[#F4F4F8] transition-colors cursor-pointer"
            >
              <span>Manage budgets & categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Spending Category Chart */}
        <section className="glass-pane p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#F4F4F8]">Spending by Category</h2>
              <p className="text-xs text-[#F4F4F8]/55 mt-0.5">
                Select a category to filter matching transactions
              </p>
            </div>
            <span className="text-xs text-[#F4F4F8]/60 tabular-nums whitespace-nowrap">
              {slices.length} active
            </span>
          </div>

          <SpendingDonutChart
            slices={slices}
            totalExpense={monthExpenses}
            currency={currency}
            onSelectCategory={(catId) => onNavigateTransactions(catId)}
          />
        </section>
      </div>

      {/* Recent Transactions */}
      <section className="glass-pane p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#F4F4F8]">Recent Transactions</h2>
            <p className="text-xs text-[#F4F4F8]/55 mt-0.5">
              Tap any entry to inspect or edit details
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTransactions()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55D6E8] hover:text-[#86e3f0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center border-t border-white/10">
            <p className="text-sm text-[#F4F4F8]/75">
              No transactions recorded for {formatMonthLabel(selectedMonth)}.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onAddTransaction}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-medium rounded-xl bg-[#55D6E8] text-[#101322] hover:bg-[#73dfee] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Transaction</span>
              </button>
              <button
                type="button"
                onClick={onOpenSheetsSync}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Import from Google Sheets</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10 border-t border-white/10">
            {recentTransactions.map((tx) => {
              const meta = getCategoryMeta(tx.category, categories);
              const isIncome = tx.type === 'income';
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onEditTransaction(tx)}
                  className="w-full py-3.5 px-2 -mx-2 flex items-center justify-between gap-4 text-left rounded-lg hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55D6E8]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F4F4F8] truncate">{tx.title}</p>
                      <p className="text-xs text-[#F4F4F8]/55 truncate mt-0.5">
                        {meta.label} · {formatTransactionDate(tx.date)} · {tx.method}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-semibold font-mono-num ${
                        isIncome ? 'text-[#34D399]' : 'text-[#FB7185]'
                      }`}
                    >
                      {formatMoney(isIncome ? tx.amount : -tx.amount, currency, { signed: true })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
