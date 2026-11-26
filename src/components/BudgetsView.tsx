import React, { useState } from 'react';
import { Check, FileSpreadsheet, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CATEGORY_COLOR_PALETTE, CURRENCY_CONFIG } from '../data/seedData';
import {
  CategoryBudget,
  CategoryMeta,
  CurrencyCode,
  Transaction,
  TransactionType,
} from '../types/finance';
import {
  formatMoney,
  formatMonthLabel,
  getDaysRemainingInMonth,
} from '../utils/formatters';

interface BudgetsViewProps {
  selectedMonth: string;
  currency: CurrencyCode;
  monthlyBudgetCap: number;
  categories: CategoryMeta[];
  categoryBudgets: CategoryBudget[];
  monthTransactions: Transaction[];
  onUpdateMonthlyCap: (nextCap: number) => void;
  onAddCategory: (
    label: string,
    type: TransactionType,
    color: string,
    budgetLimit: number
  ) => void;
  onUpdateCategoryBudget: (categoryId: string, limit: number) => void;
  onDeleteCategory: (categoryId: string) => void;
  onOpenSheetsSync: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedMonth,
  currency,
  monthlyBudgetCap,
  categories,
  categoryBudgets,
  monthTransactions,
  onUpdateMonthlyCap,
  onAddCategory,
  onUpdateCategoryBudget,
  onDeleteCategory,
  onOpenSheetsSync,
}) => {
  const { daysRemaining } = getDaysRemainingInMonth(selectedMonth);
  const symbol = CURRENCY_CONFIG[currency].symbol;

  // Main budget inline editor state
  const [editingMainCap, setEditingMainCap] = useState(false);
  const [mainCapInput, setMainCapInput] = useState(
    monthlyBudgetCap > 0 ? String(monthlyBudgetCap) : ''
  );

  // New category form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newColor, setNewColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [newLimit, setNewLimit] = useState('');
  const [formError, setFormError] = useState('');

  // Inline individual category budget edit state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatLimit, setEditingCatLimit] = useState('');
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  const spentByCategory = new Map<string, number>();
  const incomeByCategory = new Map<string, number>();
  let totalSpent = 0;

  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      totalSpent += tx.amount;
      spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
    } else {
      incomeByCategory.set(tx.category, (incomeByCategory.get(tx.category) ?? 0) + tx.amount);
    }
  }

  const budgetMap = new Map(categoryBudgets.map((b) => [b.category, b.limit]));
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const totalAllocated = expenseCategories.reduce(
    (acc, c) => acc + (budgetMap.get(c.id) ?? 0),
    0
  );
  const overallRemaining = monthlyBudgetCap - totalSpent;
  const overallPct = monthlyBudgetCap > 0 ? (totalSpent / monthlyBudgetCap) * 100 : 0;

  const handleSaveMainCap = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(0, Number(mainCapInput) || 0);
    onUpdateMonthlyCap(val);
    setEditingMainCap(false);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Enter a category name.');
      return;
    }
    if (
      categories.some(
        (c) => c.label.toLowerCase() === trimmed.toLowerCase() && c.type === newType
      )
    ) {
      setFormError(`A ${newType} category named "${trimmed}" already exists.`);
      return;
    }
    const limitVal = newType === 'expense' ? Math.max(0, Number(newLimit) || 0) : 0;
    onAddCategory(trimmed, newType, newColor, limitVal);
    setNewName('');
    setNewLimit('');
    setFormError('');
    const nextIdx = (categories.length + 1) % CATEGORY_COLOR_PALETTE.length;
    setNewColor(CATEGORY_COLOR_PALETTE[nextIdx]);
  };

  return (
    <div className="space-y-5 text-legible">
      {/* Main Monthly Budget Section */}
      <section className="glass-pane p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#F4F4F8]/65">
              Main Monthly Budget · {formatMonthLabel(selectedMonth)}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F4F8] tabular-nums">
              {monthlyBudgetCap > 0
                ? `${formatMoney(Math.max(0, overallRemaining), currency)} remaining`
                : 'No monthly budget set'}
            </h1>
            <p className="mt-1 text-xs text-[#F4F4F8]/70 tabular-nums">
              {monthlyBudgetCap > 0
                ? `${formatMoney(totalSpent, currency)} spent of ${formatMoney(
                    monthlyBudgetCap,
                    currency
                  )} main cap · ${formatMoney(totalAllocated, currency)} allocated to categories`
                : 'Set a main monthly spending limit below, then add your custom categories.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSheetsSync}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Google Sheets</span>
            </button>

            {!editingMainCap && (
              <button
                type="button"
                onClick={() => {
                  setMainCapInput(monthlyBudgetCap > 0 ? String(monthlyBudgetCap) : '');
                  setEditingMainCap(true);
                }}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-xl bg-[#55D6E8] hover:bg-[#73dfee] text-[#101322] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{monthlyBudgetCap > 0 ? 'Edit Main Budget' : 'Set Main Budget'}</span>
              </button>
            )}
          </div>
        </div>

        {editingMainCap && (
          <form
            onSubmit={handleSaveMainCap}
            className="mt-4 pt-4 border-t border-white/12 flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1 max-w-xs">
              <label
                htmlFor="main-budget-input"
                className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5"
              >
                Monthly Budget Limit ({symbol})
              </label>
              <input
                id="main-budget-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="10"
                placeholder="e.g. 3000"
                value={mainCapInput}
                onChange={(e) => setMainCapInput(e.target.value)}
                className="glass-input w-full min-h-[44px] px-3.5 py-2 rounded-xl text-base sm:text-sm font-mono-num"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl bg-[#55D6E8] hover:bg-[#73dfee] text-[#101322] transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Budget</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingMainCap(false)}
                className="min-h-[44px] px-3.5 py-2 text-xs text-[#F4F4F8]/70 hover:text-[#F4F4F8] rounded-xl hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {monthlyBudgetCap > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[#F4F4F8]/70 mb-2 tabular-nums">
              <span>Overall utilization</span>
              <span className={overallPct > 100 ? 'text-[#FB7185]' : 'text-[#55D6E8]'}>
                {overallPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, overallPct)}%`,
                  backgroundColor:
                    overallPct > 100 ? '#FB7185' : overallPct >= 85 ? '#FF9866' : '#55D6E8',
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Add Category & Individual Budget Configuration */}
      <section className="glass-pane p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#F4F4F8]">Add Category</h2>
          <p className="text-xs text-[#F4F4F8]/60 mt-0.5">
            Create your own expense or income categories and assign individual monthly limits.
          </p>
        </div>

        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Category Name */}
            <div className="sm:col-span-5">
              <label
                htmlFor="new-cat-name"
                className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5"
              >
                Category Name
              </label>
              <input
                id="new-cat-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newType === 'expense' ? 'e.g., Housing, Food, Travel' : 'e.g., Salary, Freelance'}
                className="glass-input w-full min-h-[44px] px-3.5 py-2 rounded-xl text-base sm:text-sm"
              />
            </div>

            {/* Type Toggle */}
            <div className="sm:col-span-3">
              <span className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">Type</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/12 min-h-[44px]">
                <button
                  type="button"
                  onClick={() => setNewType('expense')}
                  className={`text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    newType === 'expense'
                      ? 'bg-[#FF5C9A]/25 text-[#F4F4F8] border border-[#FF5C9A]/45'
                      : 'text-[#F4F4F8]/65 hover:text-[#F4F4F8]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('income')}
                  className={`text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    newType === 'income'
                      ? 'bg-[#34D399]/20 text-[#F4F4F8] border border-[#34D399]/45'
                      : 'text-[#F4F4F8]/65 hover:text-[#F4F4F8]'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Individual Budget Limit */}
            <div className="sm:col-span-4">
              <label
                htmlFor="new-cat-limit"
                className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5"
              >
                {newType === 'expense' ? `Monthly Budget (${symbol})` : 'Budget Limit'}
              </label>
              <input
                id="new-cat-limit"
                type="number"
                inputMode="decimal"
                min="0"
                step="10"
                disabled={newType === 'income'}
                value={newType === 'expense' ? newLimit : ''}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder={newType === 'expense' ? '0 (optional)' : 'Not needed for income'}
                className="glass-input w-full min-h-[44px] px-3.5 py-2 rounded-xl text-base sm:text-sm font-mono-num disabled:opacity-45"
              />
            </div>
          </div>

          {/* Color Palette & Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#F4F4F8]/65 mr-1">Color:</span>
              {CATEGORY_COLOR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewColor(hex)}
                  aria-label={`Select color ${hex}`}
                  className={`w-7 h-7 rounded-lg transition-transform cursor-pointer ${
                    newColor === hex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-medium rounded-xl bg-[#FF5C9A] hover:bg-[#ff73a8] text-[#101322] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          {formError && (
            <p className="text-xs text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/25 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
        </form>
      </section>

      {/* Expense Categories & Individual Budgets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F4F8]/75">
            Expense Categories ({expenseCategories.length})
          </h2>
          {expenseCategories.length > 0 && (
            <span className="text-xs text-[#F4F4F8]/60 tabular-nums">
              Total allocated: {formatMoney(totalAllocated, currency, { decimals: 0 })}
            </span>
          )}
        </div>

        {expenseCategories.length === 0 ? (
          <div className="glass-pane p-8 text-center">
            <p className="text-sm text-[#F4F4F8]/75">
              No expense categories added yet. Create your first category above to begin tracking budgets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expenseCategories.map((cat) => {
              const limit = budgetMap.get(cat.id) ?? 0;
              const spent = spentByCategory.get(cat.id) ?? 0;
              const remaining = limit - spent;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              const isEditing = editingCatId === cat.id;
              const isConfirmDelete = confirmDeleteCatId === cat.id;

              const status =
                limit <= 0
                  ? { label: 'No limit set', cls: 'text-[#F4F4F8]/55' }
                  : pct > 100
                  ? { label: 'Over limit', cls: 'text-[#FB7185]' }
                  : pct >= 85
                  ? { label: 'Near limit', cls: 'text-[#FF9866]' }
                  : { label: 'On track', cls: 'text-[#34D399]' };

              return (
                <article key={cat.id} className="glass-pane p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden="true"
                        />
                        <h3 className="text-base font-semibold text-[#F4F4F8] truncate">
                          {cat.label}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs font-medium mr-1 tabular-nums ${status.cls}`}>
                          {status.label}
                          {limit > 0 ? ` · ${pct.toFixed(0)}%` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatLimit(limit > 0 ? String(limit) : '');
                            setConfirmDeleteCatId(null);
                          }}
                          aria-label={`Edit ${cat.label} budget`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#F4F4F8]/65 hover:text-[#55D6E8] hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteCatId(isConfirmDelete ? null : cat.id);
                            setEditingCatId(null);
                          }}
                          aria-label={`Delete ${cat.label}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#F4F4F8]/55 hover:text-[#FB7185] hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          onUpdateCategoryBudget(cat.id, Math.max(0, Number(editingCatLimit) || 0));
                          setEditingCatId(null);
                        }}
                        className="mt-3 flex items-center gap-2"
                      >
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="10"
                          value={editingCatLimit}
                          onChange={(e) => setEditingCatLimit(e.target.value)}
                          placeholder="Monthly limit"
                          aria-label={`${cat.label} monthly limit`}
                          className="glass-input flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-base sm:text-sm font-mono-num"
                          autoFocus
                        />
                        <button
                          type="submit"
                          aria-label="Save category budget"
                          className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg bg-[#55D6E8] text-[#101322] hover:bg-[#73dfee] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          aria-label="Cancel edit"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#F4F4F8]/65 hover:bg-white/10 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    )}

                    {isConfirmDelete && (
                      <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FB7185]/12 border border-[#FB7185]/35">
                        <span className="text-xs text-[#F4F4F8]/85">Delete "{cat.label}"?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCategory(cat.id);
                              setConfirmDeleteCatId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#FB7185] text-[#101322] cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCatId(null)}
                            className="px-2 py-1 text-xs text-[#F4F4F8]/75 cursor-pointer"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${limit > 0 ? Math.min(100, pct) : 0}%`,
                          backgroundColor: pct > 100 ? '#FB7185' : cat.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#F4F4F8]/70">
                      Spent <strong className="text-[#F4F4F8]">{formatMoney(spent, currency, { decimals: 0 })}</strong>
                      {limit > 0 ? ` / ${formatMoney(limit, currency, { decimals: 0 })}` : ''}
                    </span>
                    {limit > 0 && (
                      <span className={remaining < 0 ? 'text-[#FB7185]' : 'text-[#F4F4F8]/75'}>
                        {remaining >= 0
                          ? `${formatMoney(remaining / daysRemaining, currency, { decimals: 0 })}/day left`
                          : `${formatMoney(Math.abs(remaining), currency, { decimals: 0 })} over`}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Income Categories */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F4F8]/75 px-1">
          Income Categories ({incomeCategories.length})
        </h2>

        {incomeCategories.length === 0 ? (
          <div className="glass-pane p-6 text-center">
            <p className="text-sm text-[#F4F4F8]/70">
              No income categories yet. Switch the type above to Income to add sources like Salary or Freelance.
            </p>
          </div>
        ) : (
          <div className="glass-pane divide-y divide-white/10 px-5">
            {incomeCategories.map((cat) => {
              const earned = incomeByCategory.get(cat.id) ?? 0;
              const isConfirmDelete = confirmDeleteCatId === cat.id;
              return (
                <div key={cat.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-[#F4F4F8] truncate">{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[#34D399] font-mono-num">
                      {formatMoney(earned, currency, { signed: earned > 0 })}
                    </span>
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCategory(cat.id);
                            setConfirmDeleteCatId(null);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#FB7185] text-[#101322] cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCatId(null)}
                          className="px-2 py-1 text-xs text-[#F4F4F8]/75 cursor-pointer"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCatId(cat.id)}
                        aria-label={`Delete ${cat.label}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#F4F4F8]/55 hover:text-[#FB7185] hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
