import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Search } from 'lucide-react';
import { CategoryMeta, CurrencyCode, Transaction } from '../types/finance';
import {
  exportTransactionsCsv,
  formatMoney,
  formatMonthLabel,
  formatTransactionDate,
  getCategoryMeta,
} from '../utils/formatters';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: CategoryMeta[];
  selectedMonth: string;
  currency: CurrencyCode;
  initialCategoryFilter?: string;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenSheetsSync: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  selectedMonth,
  currency,
  initialCategoryFilter = 'all',
  onAddTransaction,
  onEditTransaction,
  onOpenSheetsSync,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (scope === 'month' && !tx.date.startsWith(selectedMonth)) return false;
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const metaLabel = getCategoryMeta(tx.category, categories).label.toLowerCase();
          return (
            tx.title.toLowerCase().includes(q) ||
            metaLabel.includes(q) ||
            tx.method.toLowerCase().includes(q) ||
            (tx.note ?? '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') return b.amount - a.amount;
        return b.date.localeCompare(a.date);
      });
  }, [transactions, categories, scope, selectedMonth, typeFilter, categoryFilter, search, sortBy]);

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-legible">
      {/* Header & Toolbar Pane */}
      <section className="glass-pane p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F4F4F8]">Transactions</h1>
            <p className="text-xs text-[#F4F4F8]/65 mt-1 tabular-nums">
              {filtered.length} entries · Net{' '}
              <span className={filteredTotals.net >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                {formatMoney(filteredTotals.net, currency, { signed: true })}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSheetsSync}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => exportTransactionsCsv(filtered, categories)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onAddTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-xl bg-[#FF5C9A] hover:bg-[#ff73a8] text-[#101322] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 pt-5 border-t border-white/12 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-[#F4F4F8]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, category, note..."
              aria-label="Search transactions"
              className="glass-input w-full min-h-[42px] pl-9 pr-3.5 py-2 rounded-xl text-base sm:text-sm"
            />
          </div>

          {/* Segmented Type Filter */}
          <div className="md:col-span-3 flex items-center p-1 rounded-xl bg-white/5 border border-white/12 min-h-[42px]">
            {(['all', 'expense', 'income'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTypeFilter(item)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  typeFilter === item
                    ? 'bg-white/16 text-[#F4F4F8]'
                    : 'text-[#F4F4F8]/60 hover:text-[#F4F4F8]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="glass-input w-full min-h-[42px] px-3 py-2 rounded-xl text-base sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scope & Sort */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <select
              aria-label="Time scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'month' | 'all')}
              className="glass-input w-full min-h-[42px] px-2.5 py-2 rounded-xl text-xs"
            >
              <option value="month">{formatMonthLabel(selectedMonth).split(' ')[0]}</option>
              <option value="all">All Time</option>
            </select>
            <select
              aria-label="Sort transactions"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="glass-input w-full min-h-[42px] px-2.5 py-2 rounded-xl text-xs"
            >
              <option value="date">Newest</option>
              <option value="amount">Largest</option>
            </select>
          </div>
        </div>
      </section>

      {/* Ledger List */}
      <section className="glass-pane p-5 sm:p-6">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[#F4F4F8]/75">
              {transactions.length === 0
                ? 'No transactions recorded yet.'
                : 'No transactions match the current filters.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {(search || typeFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-[42px] px-4 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={onAddTransaction}
                className="min-h-[42px] px-4 py-2 text-xs font-medium rounded-xl bg-[#55D6E8] text-[#101322] hover:bg-[#73dfee] transition-colors cursor-pointer"
              >
                Add Transaction
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Tap List */}
            <div className="sm:hidden divide-y divide-white/10">
              {filtered.map((tx) => {
                const meta = getCategoryMeta(tx.category, categories);
                const isIncome = tx.type === 'income';
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="w-full py-3.5 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                    <span
                      className={`text-sm font-semibold font-mono-num shrink-0 ${
                        isIncome ? 'text-[#34D399]' : 'text-[#FB7185]'
                      }`}
                    >
                      {formatMoney(isIncome ? tx.amount : -tx.amount, currency, { signed: true })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desktop / Tablet Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/12 text-[11px] font-medium uppercase tracking-wider text-[#F4F4F8]/55">
                    <th className="py-2.5 pr-4">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Account</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 pl-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filtered.map((tx) => {
                    const meta = getCategoryMeta(tx.category, categories);
                    const isIncome = tx.type === 'income';
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className="hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: meta.color }}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-[#F4F4F8] truncate">
                                {tx.title}
                                {tx.recurring && (
                                  <span className="ml-2 text-[11px] font-normal text-[#55D6E8]">
                                    · Recurring
                                  </span>
                                )}
                              </p>
                              {tx.note && (
                                <p className="text-xs text-[#F4F4F8]/50 truncate mt-0.5">{tx.note}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-[#F4F4F8]/75 whitespace-nowrap">
                          {meta.label}
                        </td>
                        <td className="py-3.5 px-3 text-[#F4F4F8]/65 hidden md:table-cell whitespace-nowrap">
                          {tx.method}
                        </td>
                        <td className="py-3.5 px-3 text-[#F4F4F8]/70 tabular-nums whitespace-nowrap">
                          {formatTransactionDate(tx.date)}
                        </td>
                        <td
                          className={`py-3.5 pl-3 text-right font-semibold font-mono-num whitespace-nowrap ${
                            isIncome ? 'text-[#34D399]' : 'text-[#FB7185]'
                          }`}
                        >
                          {formatMoney(isIncome ? tx.amount : -tx.amount, currency, { signed: true })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
