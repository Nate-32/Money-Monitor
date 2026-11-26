import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { CURRENCY_CONFIG } from '../data/seedData';
import {
  CategoryMeta,
  CurrencyCode,
  PaymentMethod,
  Transaction,
  TransactionType,
} from '../types/finance';
import { getCurrentMonthKey, getTodayDateString } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
  editingTransaction: Transaction | null;
  categories: CategoryMeta[];
  onQuickCreateCategory: (label: string, type: TransactionType) => CategoryMeta;
  onGoToBudgets: () => void;
  currency: CurrencyCode;
  defaultMonth: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Checking', 'Credit Card', 'Debit Card', 'Cash', 'Savings'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTransaction,
  categories,
  onQuickCreateCategory,
  onGoToBudgets,
  currency,
  defaultMonth,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [method, setMethod] = useState<PaymentMethod>('Credit Card');
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setConfirmingDelete(false);
    setQuickCatName('');

    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmount(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setMethod(editingTransaction.method);
      setNote(editingTransaction.note ?? '');
      setRecurring(Boolean(editingTransaction.recurring));
    } else {
      const initialType: TransactionType = 'expense';
      const firstMatch = categories.find((c) => c.type === initialType);
      setType(initialType);
      setTitle('');
      setAmount('');
      setCategory(firstMatch?.id ?? '');
      setDate(defaultMonth === getCurrentMonthKey() ? getTodayDateString() : `${defaultMonth}-01`);
      setMethod('Credit Card');
      setNote('');
      setRecurring(false);
    }
  }, [isOpen, editingTransaction, defaultMonth, categories]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const matching = categories.filter((c) => c.type === nextType);
    if (!matching.some((c) => c.id === category)) {
      setCategory(matching[0]?.id ?? '');
    }
  };

  const handleQuickAddCategory = () => {
    const trimmed = quickCatName.trim();
    if (!trimmed) return;
    const created = onQuickCreateCategory(trimmed, type);
    setCategory(created.id);
    setQuickCatName('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      setError('Enter a merchant or transaction title.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!category) {
      setError(`Create or select an ${type} category first.`);
      return;
    }
    if (!date) {
      setError('Select a transaction date.');
      return;
    }

    onSave(
      {
        title: title.trim(),
        amount: Math.round(numericAmount * 100) / 100,
        type,
        category,
        date,
        method,
        note: note.trim() || undefined,
        recurring,
      },
      editingTransaction?.id
    );
    onClose();
  };

  const symbol = CURRENCY_CONFIG[currency].symbol;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#090b16]/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-modal w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 text-[#F4F4F8] max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="tx-modal-title" className="text-lg font-semibold tracking-tight">
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#F4F4F8]/65 hover:text-[#F4F4F8] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Segmented Type Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/12">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`min-h-[40px] py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                type === 'expense'
                  ? 'bg-[#FF5C9A]/25 text-[#F4F4F8] border border-[#FF5C9A]/45'
                  : 'text-[#F4F4F8]/65 hover:text-[#F4F4F8]'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`min-h-[40px] py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                type === 'income'
                  ? 'bg-[#34D399]/20 text-[#F4F4F8] border border-[#34D399]/45'
                  : 'text-[#F4F4F8]/65 hover:text-[#F4F4F8]'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
                Amount ({symbol})
              </label>
              <input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm font-mono-num"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="tx-title" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
              Description / Merchant
            </label>
            <input
              id="tx-title"
              type="text"
              placeholder={type === 'expense' ? 'e.g., Groceries' : 'e.g., Monthly Payroll'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm"
            />
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
                Category
              </label>
              {filteredCategories.length > 0 ? (
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      placeholder={`New ${type} category`}
                      aria-label={`New ${type} category name`}
                      className="glass-input flex-1 min-w-0 min-h-[44px] px-3 py-2 rounded-xl text-base sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCategory}
                      aria-label="Create category"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#55D6E8] text-[#101322] hover:bg-[#73dfee] shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToBudgets();
                    }}
                    className="text-xs text-[#55D6E8] hover:underline cursor-pointer"
                  >
                    Or manage all categories in Budgets
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="tx-method" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
                Account
              </label>
              <select
                id="tx-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="tx-note" className="block text-xs font-medium text-[#F4F4F8]/75 mb-1.5">
              Note (optional)
            </label>
            <input
              id="tx-note"
              type="text"
              placeholder="Add reference or memo"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="glass-input w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm"
            />
          </div>

          {/* Recurring Checkbox */}
          <label className="flex items-center gap-2.5 min-h-[40px] text-sm text-[#F4F4F8]/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-white/25 bg-white/10 accent-[#55D6E8]"
            />
            <span>Recurring monthly transaction</span>
          </label>

          {error && (
            <p className="text-xs text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/25 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/12">
            {editingTransaction && onDelete ? (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(editingTransaction.id);
                      onClose();
                    }}
                    className="min-h-[42px] px-3.5 py-2 text-xs font-medium rounded-lg bg-[#FB7185]/25 text-[#FB7185] border border-[#FB7185]/40 hover:bg-[#FB7185]/35 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="min-h-[42px] px-2.5 py-2 text-xs text-[#F4F4F8]/70 hover:text-[#F4F4F8] whitespace-nowrap cursor-pointer"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-3 py-2 text-xs font-medium text-[#FB7185] hover:bg-[#FB7185]/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-[#F4F4F8]/75 hover:text-[#F4F4F8] hover:bg-white/10 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 text-sm font-medium text-[#101322] bg-[#55D6E8] hover:bg-[#73dfee] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                {editingTransaction ? 'Save Changes' : 'Save Transaction'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
