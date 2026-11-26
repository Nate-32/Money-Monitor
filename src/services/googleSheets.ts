import { CATEGORY_COLOR_PALETTE, CURRENCY_CONFIG } from '../data/seedData';
import {
  CategoryBudget,
  CategoryMeta,
  CurrencyCode,
  PaymentMethod,
  Transaction,
} from '../types/finance';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const SHEET_TABS = {
  TRANSACTIONS: 'Transactions',
  CATEGORIES: 'Categories',
  SETTINGS: 'Settings',
} as const;

export class SheetsAuthExpiredError extends Error {
  constructor(message = 'Your Google session expired. Please sign in again.') {
    super(message);
    this.name = 'SheetsAuthExpiredError';
  }
}

export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

async function sheetsFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new SheetsAuthExpiredError(
      res.status === 401
        ? 'Google authorization expired. Please sign in with Google again.'
        : 'Permission denied for this Google Sheet. Make sure your signed-in account can access it.'
    );
  }

  if (!res.ok) {
    let detail = `Google Sheets request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) detail = errBody.error.message;
    } catch {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function createMoneyMonitorSheet(
  accessToken: string,
  title = 'Money Monitor — Personal Finance'
): Promise<{ spreadsheetId: string; title: string }> {
  const data = await sheetsFetch(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: SHEET_TABS.TRANSACTIONS } },
        { properties: { title: SHEET_TABS.CATEGORIES } },
        { properties: { title: SHEET_TABS.SETTINGS } },
      ],
    }),
  });

  const spreadsheetId = data.spreadsheetId as string;
  const createdTitle = (data.properties?.title as string) || title;

  await writeHeaderRows(accessToken, spreadsheetId);
  return { spreadsheetId, title: createdTitle };
}

export async function inspectAndPrepareSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ spreadsheetId: string; title: string; existingTabs: string[] }> {
  const meta = await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
    accessToken
  );

  const title = (meta.properties?.title as string) || 'Linked Google Sheet';
  const existingTabs: string[] = Array.isArray(meta.sheets)
    ? meta.sheets
        .map((s: { properties?: { title?: string } }) => s.properties?.title)
        .filter((t: unknown): t is string => typeof t === 'string')
    : [];

  const requiredTabs = [SHEET_TABS.TRANSACTIONS, SHEET_TABS.CATEGORIES, SHEET_TABS.SETTINGS];
  const missingTabs = requiredTabs.filter((tab) => !existingTabs.includes(tab));

  if (missingTabs.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTabs.map((tabTitle) => ({
          addSheet: { properties: { title: tabTitle } },
        })),
      }),
    });
  }

  return {
    spreadsheetId,
    title,
    existingTabs: Array.from(new Set([...existingTabs, ...missingTabs])),
  };
}

async function writeHeaderRows(accessToken: string, spreadsheetId: string) {
  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          {
            range: `${SHEET_TABS.TRANSACTIONS}!A1:I1`,
            values: [['ID', 'Date', 'Title', 'Type', 'Category', 'Account', 'Amount', 'Recurring', 'Note']],
          },
          {
            range: `${SHEET_TABS.CATEGORIES}!A1:E1`,
            values: [['ID', 'Name', 'Type', 'Color', 'MonthlyBudget']],
          },
          {
            range: `${SHEET_TABS.SETTINGS}!A1:B1`,
            values: [['Key', 'Value']],
          },
        ],
      }),
    }
  );
}

export interface SheetSyncPayload {
  transactions: Transaction[];
  categories: CategoryMeta[];
  categoryBudgets: CategoryBudget[];
  monthlyBudgetCap: number;
  currency: CurrencyCode;
}

export async function pushToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  payload: SheetSyncPayload
): Promise<{ title: string }> {
  const info = await inspectAndPrepareSheet(accessToken, spreadsheetId);

  const budgetByCat = new Map(payload.categoryBudgets.map((b) => [b.category, b.limit]));

  const txRows = [
    ['ID', 'Date', 'Title', 'Type', 'Category', 'Account', 'Amount', 'Recurring', 'Note'],
    ...payload.transactions.map((t) => [
      t.id,
      t.date,
      t.title,
      t.type,
      t.category,
      t.method,
      t.amount,
      t.recurring ? 'TRUE' : 'FALSE',
      t.note ?? '',
    ]),
  ];

  const catRows = [
    ['ID', 'Name', 'Type', 'Color', 'MonthlyBudget'],
    ...payload.categories.map((c) => [
      c.id,
      c.label,
      c.type,
      c.color,
      budgetByCat.get(c.id) ?? 0,
    ]),
  ];

  const settingsRows = [
    ['Key', 'Value'],
    ['monthlyBudgetCap', String(payload.monthlyBudgetCap)],
    ['currency', payload.currency],
  ];

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          `${SHEET_TABS.TRANSACTIONS}!A:Z`,
          `${SHEET_TABS.CATEGORIES}!A:Z`,
          `${SHEET_TABS.SETTINGS}!A:Z`,
        ],
      }),
    }
  );

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${SHEET_TABS.TRANSACTIONS}!A1`, values: txRows },
          { range: `${SHEET_TABS.CATEGORIES}!A1`, values: catRows },
          { range: `${SHEET_TABS.SETTINGS}!A1`, values: settingsRows },
        ],
      }),
    }
  );

  return { title: info.title };
}

const VALID_METHODS: PaymentMethod[] = [
  'Checking',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Savings',
];

export async function pullFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetSyncPayload & { title: string }> {
  const info = await inspectAndPrepareSheet(accessToken, spreadsheetId);

  const ranges = [
    `${SHEET_TABS.TRANSACTIONS}!A1:I5000`,
    `${SHEET_TABS.CATEGORIES}!A1:E500`,
    `${SHEET_TABS.SETTINGS}!A1:B50`,
  ]
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const res = await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${ranges}`,
    accessToken
  );

  const valueRanges = (res.valueRanges ?? []) as { values?: string[][] }[];
  const txValues = valueRanges[0]?.values ?? [];
  const catValues = valueRanges[1]?.values ?? [];
  const settingsValues = valueRanges[2]?.values ?? [];

  const categories: CategoryMeta[] = [];
  const categoryBudgets: CategoryBudget[] = [];

  for (let i = 1; i < catValues.length; i++) {
    const row = catValues[i];
    if (!row || !row[1]?.trim()) continue;
    const id = (row[0] || row[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const label = row[1].trim();
    const type = row[2]?.toLowerCase() === 'income' ? 'income' : 'expense';
    const color =
      row[3]?.trim() || CATEGORY_COLOR_PALETTE[categories.length % CATEGORY_COLOR_PALETTE.length];
    const limit = Math.max(0, Number(row[4]) || 0);
    categories.push({ id, label, type, color });
    if (type === 'expense') {
      categoryBudgets.push({ category: id, limit });
    }
  }

  const transactions: Transaction[] = [];
  for (let i = 1; i < txValues.length; i++) {
    const row = txValues[i];
    if (!row || (!row[2]?.trim() && !row[6])) continue;
    const amount = Math.abs(Number(row[6]) || 0);
    if (amount <= 0) continue;
    const methodRaw = (row[5] || 'Checking').trim();
    const method = VALID_METHODS.includes(methodRaw as PaymentMethod)
      ? (methodRaw as PaymentMethod)
      : 'Checking';
    transactions.push({
      id: (row[0] || `sheet-tx-${i}`).trim(),
      date: (row[1] || new Date().toISOString().slice(0, 10)).trim(),
      title: (row[2] || 'Imported Entry').trim(),
      type: row[3]?.toLowerCase() === 'income' ? 'income' : 'expense',
      category: (row[4] || '').trim(),
      method,
      amount,
      recurring: String(row[7] ?? '').toUpperCase() === 'TRUE',
      note: row[8]?.trim() || undefined,
    });
  }

  let monthlyBudgetCap = 0;
  let currency: CurrencyCode = 'USD';

  for (let i = 1; i < settingsValues.length; i++) {
    const [k, v] = settingsValues[i] ?? [];
    if (k === 'monthlyBudgetCap') {
      monthlyBudgetCap = Math.max(0, Number(v) || 0);
    } else if (k === 'currency' && v && v in CURRENCY_CONFIG) {
      currency = v as CurrencyCode;
    }
  }

  return {
    title: info.title,
    transactions,
    categories,
    categoryBudgets,
    monthlyBudgetCap,
    currency,
  };
}
