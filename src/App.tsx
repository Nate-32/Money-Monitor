import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowLeftRight,
  FileSpreadsheet,
  LayoutGrid,
  PieChart,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsView } from './components/AnalyticsView';
import { BudgetsView } from './components/BudgetsView';
import { OverviewView } from './components/OverviewView';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import {
  CATEGORY_COLOR_PALETTE,
  CURRENCY_CONFIG,
  INITIAL_CATEGORIES,
  INITIAL_CATEGORY_BUDGETS,
  INITIAL_MONTHLY_BUDGET_CAP,
  INITIAL_TRANSACTIONS,
} from './data/seedData';
import {
  clearCachedToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from './services/googleAuth';
import { SheetSyncPayload } from './services/googleSheets';
import {
  CategoryBudget,
  CategoryMeta,
  CurrencyCode,
  LinkedSheetInfo,
  NavTab,
  Transaction,
  TransactionType,
} from './types/finance';
import {
  formatCompactMonthLabel,
  formatMonthLabel,
  getAvailableMonths,
  getCurrentMonthKey,
} from './utils/formatters';

const STORAGE_KEY = 'money_monitor_state_v2';
const BG_IMAGE_URL = `${import.meta.env.BASE_URL}assets/aistudio/vice-city-bg.webp`;

interface PersistedState {
  transactions: Transaction[];
  categories: CategoryMeta[];
  monthlyBudgetCap: number;
  categoryBudgets: CategoryBudget[];
  currency: CurrencyCode;
  linkedSheet: LinkedSheetInfo | null;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        transactions: Array.isArray(parsed.transactions)
          ? parsed.transactions
          : INITIAL_TRANSACTIONS,
        categories: Array.isArray(parsed.categories)
          ? parsed.categories
          : INITIAL_CATEGORIES,
        monthlyBudgetCap:
          typeof parsed.monthlyBudgetCap === 'number'
            ? parsed.monthlyBudgetCap
            : INITIAL_MONTHLY_BUDGET_CAP,
        categoryBudgets: Array.isArray(parsed.categoryBudgets)
          ? parsed.categoryBudgets
          : INITIAL_CATEGORY_BUDGETS,
        currency:
          parsed.currency && parsed.currency in CURRENCY_CONFIG
            ? parsed.currency
            : 'USD',
        linkedSheet: parsed.linkedSheet ?? null,
      };
    }
  } catch {
    // Fall back to clean empty state
  }
  return {
    transactions: INITIAL_TRANSACTIONS,
    categories: INITIAL_CATEGORIES,
    monthlyBudgetCap: INITIAL_MONTHLY_BUDGET_CAP,
    categoryBudgets: INITIAL_CATEGORY_BUDGETS,
    currency: 'USD',
    linkedSheet: null,
  };
}

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export default function App() {
  const [initial] = useState<PersistedState>(() => loadInitialState());
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions);
  const [categories, setCategories] = useState<CategoryMeta[]>(initial.categories);
  const [monthlyBudgetCap, setMonthlyBudgetCap] = useState<number>(initial.monthlyBudgetCap);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(initial.categoryBudgets);
  const [currency, setCurrency] = useState<CurrencyCode>(initial.currency);
  const [linkedSheet, setLinkedSheet] = useState<LinkedSheetInfo | null>(initial.linkedSheet);

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [bgLoadError, setBgLoadError] = useState(false);
  const [bgReady, setBgReady] = useState(false);

  // Firebase Auth & In-Memory Google Sheets Access Token
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      (user) => {
        setGoogleUser(user);
        setAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        transactions,
        categories,
        monthlyBudgetCap,
        categoryBudgets,
        currency,
        linkedSheet,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [transactions, categories, monthlyBudgetCap, categoryBudgets, currency, linkedSheet]);

  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);

  const availableBalance = useMemo(() => {
    let total = 0;
    for (const tx of transactions) {
      total += tx.type === 'income' ? tx.amount : -tx.amount;
    }
    return total;
  }, [transactions]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const { monthIncome, monthExpenses } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of monthTransactions) {
      if (tx.type === 'income') inc += tx.amount;
      else exp += tx.amount;
    }
    return { monthIncome: inc, monthExpenses: exp };
  }, [monthTransactions]);

  const handleOpenAddTx = () => {
    setEditingTx(null);
    setTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalOpen(true);
  };

  const handleSaveTx = (data: Omit<Transaction, 'id'>, existingId?: string) => {
    if (existingId) {
      setTransactions((prev) =>
        prev.map((item) => (item.id === existingId ? { ...data, id: existingId } : item))
      );
    } else {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      const txMonth = data.date.slice(0, 7);
      if (txMonth && txMonth !== selectedMonth) {
        setSelectedMonth(txMonth);
      }
    }
  };

  const handleDeleteTx = (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCategory = (
    label: string,
    type: TransactionType,
    color: string,
    budgetLimit: number
  ): CategoryMeta => {
    const baseSlug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category';
    const uniqueId = categories.some((c) => c.id === baseSlug)
      ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      : baseSlug;

    const nextCategory: CategoryMeta = {
      id: uniqueId,
      label: label.trim(),
      type,
      color,
    };

    setCategories((prev) => [...prev, nextCategory]);
    if (type === 'expense') {
      setCategoryBudgets((prev) => [...prev, { category: uniqueId, limit: budgetLimit }]);
    }
    return nextCategory;
  };

  const handleQuickCreateCategory = (label: string, type: TransactionType): CategoryMeta => {
    const color = CATEGORY_COLOR_PALETTE[categories.length % CATEGORY_COLOR_PALETTE.length];
    return handleAddCategory(label, type, color, 0);
  };

  const handleUpdateCategoryBudget = (categoryId: string, limit: number) => {
    setCategoryBudgets((prev) => {
      const exists = prev.some((b) => b.category === categoryId);
      if (exists) {
        return prev.map((b) => (b.category === categoryId ? { ...b, limit } : b));
      }
      return [...prev, { category: categoryId, limit }];
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setCategoryBudgets((prev) => prev.filter((b) => b.category !== categoryId));
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
  };

  const handleTokenExpired = () => {
    clearCachedToken();
    setAccessToken(null);
  };

  const handleApplyPulledData = (data: SheetSyncPayload) => {
    setTransactions(data.transactions);
    setCategories(data.categories);
    setCategoryBudgets(data.categoryBudgets);
    setMonthlyBudgetCap(data.monthlyBudgetCap);
    setCurrency(data.currency);
  };

  const handleNavigateTransactions = (categoryFilter?: string) => {
    setTxCategoryFilter(categoryFilter ?? 'all');
    setActiveTab('transactions');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-[#F4F4F8]">
      {/* Full-Screen Cinematic Vice City Background with Fallback Gradient & Atomic Reveal */}
      <div
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, #101322 0%, #27153a 42%, #591c48 72%, #c9584a 100%)',
        }}
        aria-hidden="true"
      >
        {!bgLoadError && (
          <img
            src={BG_IMAGE_URL}
            alt=""
            decoding="sync"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            onLoad={() => setBgReady(true)}
            onError={() => setBgLoadError(true)}
            className={`w-full h-full object-cover object-[center_88%] sm:object-center select-none transition-opacity duration-200 ${
              bgReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(16, 19, 34, 0.06) 0%, rgba(16, 19, 34, 0.12) 45%, rgba(16, 19, 34, 0.34) 100%)',
          }}
        />
      </div>

      {/* Desktop + Mobile Shell */}
      <div className="relative z-10 mx-auto max-w-[1260px] min-h-screen flex flex-col gap-3.5 sm:gap-5 px-3 sm:px-6 py-3 sm:py-4 pb-28 lg:pb-10">
        {/* Desktop Compact Translucent Top Navigation */}
        <header className="hidden lg:flex items-center justify-between gap-6 glass-pane px-6 py-3 sticky top-4 z-20">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55D6E8] rounded-lg cursor-pointer shrink-0"
          >
            <span className="font-display text-[22px] font-bold tracking-[0.06em] uppercase leading-none text-[#F4F4F8] whitespace-nowrap block">
              MONEY MONITOR
            </span>
          </button>

          <nav className="flex items-center gap-6" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'transactions') setTxCategoryFilter('all');
                    setActiveTab(item.id);
                  }}
                  className={`inline-flex items-center gap-2 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55D6E8] ${
                    active
                      ? 'border-[#55D6E8] text-[#F4F4F8]'
                      : 'border-transparent text-[#F4F4F8]/70 hover:text-[#F4F4F8]'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      active ? 'text-[#55D6E8]' : 'text-[#F4F4F8]/55'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              aria-label="Select period"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs tabular-nums"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              aria-label="Select currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="glass-input px-2.5 py-1.5 rounded-lg text-xs"
            >
              {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_CONFIG[code].symbol} {code}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSheetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/18 bg-white/5 hover:bg-white/10 text-[#F4F4F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#34D399]" />
              <span>{linkedSheet ? 'Sheets Linked' : 'Google Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddTx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#FF5C9A] hover:bg-[#ff73a8] text-[#101322] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Transaction</span>
            </button>
          </div>
        </header>

        {/* Mobile Compact Top Header (non-sticky to preserve mobile viewport space) */}
        <header className="lg:hidden glass-pane px-3 py-2 flex items-center justify-between gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="text-left min-w-0 truncate cursor-pointer"
          >
            <span className="font-display text-base sm:text-lg font-bold tracking-[0.04em] uppercase text-[#F4F4F8] whitespace-nowrap">
              MONEY MONITOR
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              aria-label="Select period"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="glass-input px-2 py-1.5 rounded-lg text-xs tabular-nums max-w-[96px]"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatCompactMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              aria-label="Select currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="glass-input px-1.5 py-1.5 rounded-lg text-xs"
            >
              {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_CONFIG[code].symbol}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSheetsModalOpen(true)}
              aria-label="Google Sheets sync"
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/18 transition-colors cursor-pointer ${
                linkedSheet ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-white/5 text-[#34D399]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <OverviewView
              selectedMonth={selectedMonth}
              currency={currency}
              availableBalance={availableBalance}
              monthIncome={monthIncome}
              monthExpenses={monthExpenses}
              monthlyBudgetCap={monthlyBudgetCap}
              categories={categories}
              categoryBudgets={categoryBudgets}
              monthTransactions={monthTransactions}
              onAddTransaction={handleOpenAddTx}
              onEditTransaction={handleOpenEditTx}
              onNavigateTransactions={handleNavigateTransactions}
              onNavigateBudgets={() => setActiveTab('budgets')}
              onOpenSheetsSync={() => setSheetsModalOpen(true)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              key={txCategoryFilter}
              transactions={transactions}
              categories={categories}
              selectedMonth={selectedMonth}
              currency={currency}
              initialCategoryFilter={txCategoryFilter}
              onAddTransaction={handleOpenAddTx}
              onEditTransaction={handleOpenEditTx}
              onOpenSheetsSync={() => setSheetsModalOpen(true)}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              selectedMonth={selectedMonth}
              currency={currency}
              monthlyBudgetCap={monthlyBudgetCap}
              categories={categories}
              categoryBudgets={categoryBudgets}
              monthTransactions={monthTransactions}
              onUpdateMonthlyCap={setMonthlyBudgetCap}
              onAddCategory={handleAddCategory}
              onUpdateCategoryBudget={handleUpdateCategoryBudget}
              onDeleteCategory={handleDeleteCategory}
              onOpenSheetsSync={() => setSheetsModalOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              transactions={transactions}
              categories={categories}
              selectedMonth={selectedMonth}
              currency={currency}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Add Transaction Action (48x48px touch target) */}
      <button
        type="button"
        onClick={handleOpenAddTx}
        aria-label="Add Transaction"
        className="lg:hidden fixed right-4 bottom-[74px] z-30 w-12 h-12 rounded-full bg-[#FF5C9A] hover:bg-[#ff73a8] text-[#101322] shadow-[0_8px_24px_rgba(16,19,34,0.55)] flex items-center justify-center transition-transform active:scale-95"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Mobile Bottom Navigation (4 even thumb-zone tabs, <= 56px height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-2.5 left-3 right-3 z-30 glass-pane h-14 px-1 grid grid-cols-4 items-center"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'transactions') setTxCategoryFilter('all');
                setActiveTab(item.id);
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors whitespace-nowrap ${
                active ? 'text-[#55D6E8]' : 'text-[#F4F4F8]/70 hover:text-[#F4F4F8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSave={handleSaveTx}
        onDelete={handleDeleteTx}
        editingTransaction={editingTx}
        categories={categories}
        onQuickCreateCategory={handleQuickCreateCategory}
        onGoToBudgets={() => setActiveTab('budgets')}
        currency={currency}
        defaultMonth={selectedMonth}
      />

      {/* Google Sheets Sync Modal */}
      <SheetsSyncModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        user={googleUser}
        accessToken={accessToken}
        isSigningIn={isSigningIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onTokenExpired={handleTokenExpired}
        linkedSheet={linkedSheet}
        onSetLinkedSheet={setLinkedSheet}
        transactions={transactions}
        categories={categories}
        categoryBudgets={categoryBudgets}
        monthlyBudgetCap={monthlyBudgetCap}
        currency={currency}
        onApplyPulledData={handleApplyPulledData}
      />
    </div>
  );
}
