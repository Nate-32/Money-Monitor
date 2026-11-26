export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'Checking' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Savings';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export type NavTab = 'overview' | 'transactions' | 'budgets' | 'analytics';

export interface CategoryMeta {
  id: string;
  label: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  note?: string;
  recurring?: boolean;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface LinkedSheetInfo {
  spreadsheetId: string;
  title: string;
  lastSyncedAt?: string;
}
