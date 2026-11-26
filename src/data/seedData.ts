import { CategoryBudget, CategoryMeta, CurrencyCode, Transaction } from '../types/finance';

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; locale: string; label: string }
> = {
  USD: { symbol: '$', locale: 'en-US', label: 'USD ($)' },
  INR: { symbol: '₹', locale: 'en-IN', label: 'INR (₹)' },
  EUR: { symbol: '€', locale: 'de-DE', label: 'EUR (€)' },
  GBP: { symbol: '£', locale: 'en-GB', label: 'GBP (£)' },
};

export const CATEGORY_COLOR_PALETTE = [
  '#55D6E8', // Electric Cyan
  '#FF5C9A', // Neon Pink
  '#FF9866', // Sunset Orange
  '#A78BFA', // Soft Violet
  '#34D399', // Emerald
  '#38BDF8', // Sky Blue
  '#F472B6', // Rose Pink
  '#FBBF24', // Warm Amber
];

// Clean start: no dummy categories, budgets, or sample transactions
export const INITIAL_CATEGORIES: CategoryMeta[] = [];

export const INITIAL_CATEGORY_BUDGETS: CategoryBudget[] = [];

export const INITIAL_MONTHLY_BUDGET_CAP = 0;

export const INITIAL_TRANSACTIONS: Transaction[] = [];
