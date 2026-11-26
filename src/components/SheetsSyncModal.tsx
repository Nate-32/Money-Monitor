import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Unlink,
  Upload,
  Download,
  X,
} from 'lucide-react';
import {
  CategoryBudget,
  CategoryMeta,
  CurrencyCode,
  LinkedSheetInfo,
  Transaction,
} from '../types/finance';
import {
  createMoneyMonitorSheet,
  inspectAndPrepareSheet,
  parseSpreadsheetId,
  pullFromGoogleSheet,
  pushToGoogleSheet,
  SheetsAuthExpiredError,
  SheetSyncPayload,
} from '../services/googleSheets';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  isSigningIn: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onTokenExpired: () => void;
  linkedSheet: LinkedSheetInfo | null;
  onSetLinkedSheet: (info: LinkedSheetInfo | null) => void;
  transactions: Transaction[];
  categories: CategoryMeta[];
  categoryBudgets: CategoryBudget[];
  monthlyBudgetCap: number;
  currency: CurrencyCode;
  onApplyPulledData: (data: SheetSyncPayload) => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  isSigningIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onTokenExpired,
  linkedSheet,
  onSetLinkedSheet,
  transactions,
  categories,
  categoryBudgets,
  monthlyBudgetCap,
  currency,
  onApplyPulledData,
}) => {
  const [sheetInput, setSheetInput] = useState('');
  const [busyAction, setBusyAction] = useState<'create' | 'link' | 'push' | 'pull' | null>(null);
  const [confirmAction, setConfirmAction] = useState<'push' | 'pull' | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAuthError = (err: unknown) => {
    if (err instanceof SheetsAuthExpiredError) {
      onTokenExpired();
    }
    setErrorMsg(err instanceof Error ? err.message : 'Something went wrong with Google Sheets.');
  };

  const handleCreateSheet = async () => {
    if (!accessToken) return;
    setErrorMsg('');
    setStatusMsg('');
    setBusyAction('create');
    try {
      const created = await createMoneyMonitorSheet(accessToken);
      onSetLinkedSheet({
        spreadsheetId: created.spreadsheetId,
        title: created.title,
      });
      setStatusMsg(`Created "${created.title}" and prepared Transactions, Categories, and Settings tabs.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusyAction(null);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const parsedId = parseSpreadsheetId(sheetInput);
    if (!parsedId) {
      setErrorMsg('Paste a valid Google Sheets URL or Spreadsheet ID.');
      return;
    }
    setErrorMsg('');
    setStatusMsg('');
    setBusyAction('link');
    try {
      const info = await inspectAndPrepareSheet(accessToken, parsedId);
      onSetLinkedSheet({
        spreadsheetId: info.spreadsheetId,
        title: info.title,
      });
      setSheetInput('');
      setStatusMsg(`Linked "${info.title}". Ready to push or pull data.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusyAction(null);
    }
  };

  const executePush = async () => {
    if (!accessToken || !linkedSheet) return;
    setConfirmAction(null);
    setErrorMsg('');
    setStatusMsg('');
    setBusyAction('push');
    try {
      const res = await pushToGoogleSheet(accessToken, linkedSheet.spreadsheetId, {
        transactions,
        categories,
        categoryBudgets,
        monthlyBudgetCap,
        currency,
      });
      onSetLinkedSheet({
        spreadsheetId: linkedSheet.spreadsheetId,
        title: res.title,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setStatusMsg(
        `Synced ${transactions.length} transactions and ${categories.length} categories to "${res.title}".`
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusyAction(null);
    }
  };

  const executePull = async () => {
    if (!accessToken || !linkedSheet) return;
    setConfirmAction(null);
    setErrorMsg('');
    setStatusMsg('');
    setBusyAction('pull');
    try {
      const pulled = await pullFromGoogleSheet(accessToken, linkedSheet.spreadsheetId);
      onApplyPulledData(pulled);
      onSetLinkedSheet({
        spreadsheetId: linkedSheet.spreadsheetId,
        title: pulled.title,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setStatusMsg(
        `Imported ${pulled.transactions.length} transactions and ${pulled.categories.length} categories from "${pulled.title}".`
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#090b16]/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheets-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-modal w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 text-[#F4F4F8] max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#34D399]" />
            <h2 id="sheets-modal-title" className="text-lg font-semibold tracking-tight">
              Google Sheets Sync
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets sync"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#F4F4F8]/65 hover:text-[#F4F4F8] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Google Sign-In Section */}
          {!accessToken ? (
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/14 space-y-3">
              <p className="text-sm text-[#F4F4F8]/85 leading-relaxed">
                Sign in with your Google account to create a new Money Monitor spreadsheet or sync with an existing Google Sheet.
              </p>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onGoogleSignIn}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-white text-[#1f1f1f] hover:bg-[#f2f2f2] font-medium text-sm transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-[18px] h-[18px] shrink-0"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Signed-In Bar */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/14">
                <div className="min-w-0">
                  <p className="text-xs text-[#34D399] font-medium">Google Connected</p>
                  <p className="text-sm text-[#F4F4F8] truncate">
                    {user?.email || user?.displayName || 'Google Account'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs text-[#F4F4F8]/75 hover:text-[#F4F4F8] hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Linked Sheet or Link Form */}
              {linkedSheet ? (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/14 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#55D6E8]">Linked Spreadsheet</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#F4F4F8] truncate">
                        {linkedSheet.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#F4F4F8]/55 truncate tabular-nums">
                        ID: {linkedSheet.spreadsheetId}
                        {linkedSheet.lastSyncedAt ? ` · Last synced ${linkedSheet.lastSyncedAt}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${linkedSheet.spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#F4F4F8]/70 hover:text-[#55D6E8] hover:bg-white/10 transition-colors"
                        title="Open in Google Sheets"
                        aria-label="Open in Google Sheets"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmAction(null);
                          onSetLinkedSheet(null);
                        }}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#F4F4F8]/65 hover:text-[#FB7185] hover:bg-white/10 transition-colors cursor-pointer"
                        title="Unlink spreadsheet"
                        aria-label="Unlink spreadsheet"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Push / Pull Actions */}
                  {confirmAction ? (
                    <div className="p-3.5 rounded-xl bg-[#101322]/75 border border-[#FF9866]/40 space-y-3">
                      <p className="text-xs sm:text-sm text-[#F4F4F8]/90 leading-relaxed">
                        {confirmAction === 'push'
                          ? `Replace the data inside "${linkedSheet.title}" with your current ${transactions.length} transactions, ${categories.length} categories, and budget settings?`
                          : `Replace your local Money Monitor data (${transactions.length} transactions, ${categories.length} categories) with the contents from "${linkedSheet.title}"?`}
                      </p>
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#F4F4F8]/75 hover:text-[#F4F4F8] rounded-lg hover:bg-white/10 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmAction === 'push' ? executePush : executePull}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg bg-[#55D6E8] text-[#101322] hover:bg-[#73dfee] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {confirmAction === 'push' ? 'Confirm Push' : 'Confirm Pull'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => setConfirmAction('push')}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl bg-[#55D6E8] hover:bg-[#73dfee] text-[#101322] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {busyAction === 'push' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>Push to Sheet</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => setConfirmAction('pull')}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-[#F4F4F8] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {busyAction === 'pull' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Pull from Sheet</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={handleCreateSheet}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl bg-[#34D399] hover:bg-[#4ade80] text-[#101322] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {busyAction === 'create' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Create New Money Monitor Sheet</span>
                  </button>

                  <form onSubmit={handleLinkExisting} className="space-y-2.5 pt-3 border-t border-white/12">
                    <label
                      htmlFor="existing-sheet-url"
                      className="block text-xs font-medium text-[#F4F4F8]/75"
                    >
                      Or link an existing Google Sheet (paste URL or ID)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="existing-sheet-url"
                        type="text"
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="glass-input flex-1 min-h-[44px] px-3.5 py-2 rounded-xl text-base sm:text-sm"
                      />
                      <button
                        type="submit"
                        disabled={busyAction !== null}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-white/20 bg-white/10 hover:bg-white/16 text-[#F4F4F8] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                      >
                        <Link2 className="w-4 h-4" />
                        <span>Link Sheet</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {statusMsg && (
            <p className="text-xs text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/30 rounded-xl px-3.5 py-2.5">
              {statusMsg}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-xl px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
