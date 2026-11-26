import { CURRENCY_CONFIG } from '../data/seedData';
import { CategoryMeta, CurrencyCode, Transaction } from '../types/finance';

export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  options?: { signed?: boolean; compact?: boolean; decimals?: number }
): string {
  const cfg = CURRENCY_CONFIG[currency];
  const abs = Math.abs(amount);
  const decimals = options?.decimals ?? (abs >= 1000 && options?.compact ? 1 : 2);

  if (options?.compact) {
    if (abs >= 1_000_000) {
      return `${amount < 0 ? '-' : options?.signed && amount > 0 ? '+' : ''}${cfg.symbol}${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1000) {
      return `${amount < 0 ? '-' : options?.signed && amount > 0 ? '+' : ''}${cfg.symbol}${(abs / 1000).toFixed(1)}k`;
    }
  }

  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);

  if (amount < 0) return `-${cfg.symbol}${formatted}`;
  if (options?.signed && amount > 0) return `+${cfg.symbol}${formatted}`;
  return `${cfg.symbol}${formatted}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatCompactMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatShortMonth(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function formatTransactionDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getCategoryMeta(
  categoryId: string,
  categories: CategoryMeta[]
): CategoryMeta {
  return (
    categories.find((c) => c.id === categoryId) ?? {
      id: categoryId,
      label: categoryId
        ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1)
        : 'Uncategorized',
      type: 'expense',
      color: '#55D6E8',
    }
  );
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  set.add(getCurrentMonthKey());
  for (const tx of transactions) {
    if (tx.date.length >= 7) {
      set.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function getDaysRemainingInMonth(monthKey: string): {
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
} {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const currentKey = getCurrentMonthKey();
  if (monthKey === currentKey) {
    const todayDay = new Date().getDate();
    return {
      totalDays,
      daysElapsed: todayDay,
      daysRemaining: Math.max(1, totalDays - todayDay + 1),
    };
  }
  return {
    totalDays,
    daysElapsed: totalDays,
    daysRemaining: 1,
  };
}

export function exportTransactionsCsv(
  transactions: Transaction[],
  categories: CategoryMeta[]
) {
  const headers = ['Date', 'Title', 'Type', 'Category', 'Method', 'Amount', 'Note'];
  const rows = transactions.map((t) => [
    t.date,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.type,
    getCategoryMeta(t.category, categories).label,
    t.method,
    t.type === 'expense' ? (-t.amount).toFixed(2) : t.amount.toFixed(2),
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `money-monitor-transactions.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
