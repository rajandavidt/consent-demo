// packages/shared/src/seed.ts — the demo's accounts, transactions, policies and claims.
//
// Seeded once per browser and never re-seeded, so anything the customer does survives a reload. A
// demo that resets its data on every visit cannot show a transaction the presenter made a minute
// ago, which is usually the thing they want to show.
//
// The figures are deliberately ordinary: salary in, rent out, a UPI transfer to a name, an SIP. A
// demo full of ₹1,00,000 round numbers reads as filler; this reads as somebody's account.
import { KEYS, nowIso, read, write } from './storage/index.js';

export interface Account {
  id: string;
  userId: string;
  type: 'savings' | 'current' | 'fd';
  name: string;
  /** Full number, rendered only through maskAccount. */
  number: string;
  ifsc: string;
  branch: string;
  balance: number;
  openedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  at: string;
  description: string;
  channel: 'UPI' | 'NEFT' | 'IMPS' | 'Card' | 'Interest' | 'Salary' | 'Mandate';
  direction: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  reference: string;
}

export interface Claim {
  id: string;
  userId: string;
  policyId: string;
  type: string;
  amount: number;
  raisedAt: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'settled';
  note: string;
}

const CUSTOMER = 'u-customer-001';

const ACCOUNTS: Account[] = [
  {
    id: 'ACC-SAV-01',
    userId: CUSTOMER,
    type: 'savings',
    name: 'Savings account',
    number: '5012340000007890',
    ifsc: 'FINS0000451',
    branch: 'Anna Nagar, Chennai',
    balance: 248300.55,
    openedAt: '2019-06-14T00:00:00.000Z',
  },
  {
    id: 'ACC-CUR-01',
    userId: CUSTOMER,
    type: 'current',
    name: 'Current account',
    number: '5012340000001234',
    ifsc: 'FINS0000451',
    branch: 'Anna Nagar, Chennai',
    balance: 86110.0,
    openedAt: '2021-02-01T00:00:00.000Z',
  },
  {
    id: 'ACC-FD-01',
    userId: CUSTOMER,
    type: 'fd',
    name: 'Fixed deposit · 7.1% · 3 years',
    number: '5012340000004455',
    ifsc: 'FINS0000451',
    branch: 'Anna Nagar, Chennai',
    balance: 500000.0,
    openedAt: '2024-11-20T00:00:00.000Z',
  },
];

/** Newest first, with a running balance that actually reconciles to the account total. */
const TRANSACTIONS: Omit<Transaction, 'balanceAfter'>[] = [
  { id: 'TXN-0001', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-19T09:12:00.000Z', description: 'Salary — Meridian Analytics Pvt Ltd', channel: 'Salary', direction: 'credit', amount: 118400, reference: 'SAL/AUG/2026' },
  { id: 'TXN-0002', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-18T18:44:00.000Z', description: 'Rent — S. Venkatesan', channel: 'NEFT', direction: 'debit', amount: 32000, reference: 'NEFT/RENT/AUG' },
  { id: 'TXN-0003', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-18T13:05:00.000Z', description: 'Kumaran Stores', channel: 'UPI', direction: 'debit', amount: 1842.5, reference: 'UPI/4471028833' },
  { id: 'TXN-0004', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-17T08:30:00.000Z', description: 'SIP — Bluechip Growth Fund', channel: 'Mandate', direction: 'debit', amount: 15000, reference: 'ACH/SIP/8842' },
  { id: 'TXN-0005', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-15T21:18:00.000Z', description: 'Electricity — TNEB', channel: 'UPI', direction: 'debit', amount: 2394, reference: 'UPI/TNEB/0091' },
  { id: 'TXN-0006', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-14T11:02:00.000Z', description: 'Transfer to Lakshmi R.', channel: 'IMPS', direction: 'debit', amount: 8500, reference: 'IMPS/LR/22841' },
  { id: 'TXN-0007', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-12T16:40:00.000Z', description: 'Refund — Zephyr Electronics', channel: 'Card', direction: 'credit', amount: 4299, reference: 'REF/ZE/77120' },
  { id: 'TXN-0008', userId: CUSTOMER, accountId: 'ACC-SAV-01', at: '2026-08-10T07:00:00.000Z', description: 'Savings interest', channel: 'Interest', direction: 'credit', amount: 1128.4, reference: 'INT/Q2/2026' },
  { id: 'TXN-0009', userId: CUSTOMER, accountId: 'ACC-CUR-01', at: '2026-08-16T15:22:00.000Z', description: 'Consultancy — Northwind Retail', channel: 'NEFT', direction: 'credit', amount: 64500, reference: 'NEFT/NW/1182' },
  { id: 'TXN-0010', userId: CUSTOMER, accountId: 'ACC-CUR-01', at: '2026-08-13T10:11:00.000Z', description: 'GST payment', channel: 'NEFT', direction: 'debit', amount: 11610, reference: 'GST/Q1/FY27' },
];

/**
 * Seeds accounts and transactions if absent.
 *
 * `balanceAfter` is computed backwards from the current balance, so the statement adds up: reading
 * down the list, each row's closing balance is the previous row's opening. A demo statement whose
 * arithmetic does not work is the first thing a banker notices.
 */
export function seedBankingData(): void {
  if (read<Account[]>(KEYS.accounts, []).length === 0) {
    write(KEYS.accounts, ACCOUNTS);
  }

  if (read<Transaction[]>(KEYS.transactions, []).length === 0) {
    const byAccount = new Map<string, number>(ACCOUNTS.map((a) => [a.id, a.balance]));
    const withBalances: Transaction[] = TRANSACTIONS.map((txn) => {
      const running = byAccount.get(txn.accountId) ?? 0;
      const row: Transaction = { ...txn, balanceAfter: round2(running) };
      // Walk backwards: undo this transaction to get the balance before it.
      byAccount.set(
        txn.accountId,
        round2(txn.direction === 'credit' ? running - txn.amount : running + txn.amount),
      );
      return row;
    });
    write(KEYS.transactions, withBalances);
  }
}

/** Appends a transaction and moves the account balance. Used by the payment flow. */
export function recordTransaction(input: {
  userId: string;
  accountId: string;
  description: string;
  channel: Transaction['channel'];
  amount: number;
  reference: string;
}): Transaction {
  const accounts = read<Account[]>(KEYS.accounts, []);
  const account = accounts.find((a) => a.id === input.accountId);
  const balanceAfter = round2((account?.balance ?? 0) - input.amount);

  const txn: Transaction = {
    id: `TXN-${Date.now().toString(36).toUpperCase()}`,
    userId: input.userId,
    accountId: input.accountId,
    at: nowIso(),
    description: input.description,
    channel: input.channel,
    direction: 'debit',
    amount: input.amount,
    balanceAfter,
    reference: input.reference,
  };

  write(KEYS.transactions, [txn, ...read<Transaction[]>(KEYS.transactions, [])]);
  write(
    KEYS.accounts,
    accounts.map((a) => (a.id === input.accountId ? { ...a, balance: balanceAfter } : a)),
  );
  return txn;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Indian digit grouping — 2,48,300.55, not 248,300.55. */
export function formatInr(amount: number, withPaise = true): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: withPaise ? 2 : 0,
    maximumFractionDigits: withPaise ? 2 : 0,
  })}`;
}
