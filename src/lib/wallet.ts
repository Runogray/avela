/** Wallet API client — balances, ledger, fee quote, withdraw, NIN verify. */
import { apiFetch } from "./api";

export interface WalletBalance {
  available_kobo: number;
  pending_kobo: number;
  nin_verified: boolean;
  should_nudge_verification: boolean;
  has_pin: boolean;
  has_bank: boolean;
}

export interface BankAccount {
  bank_name: string;
  /** The bank's code (from listBanks); needed to pay into the account. */
  bank_code?: string;
  account_number: string;
  /** Filled by the bank's lookup on save, not typed. */
  account_name?: string;
  /** Guests can pay this host by card (Paystack is set up for the account). */
  card_ready?: boolean;
}

export interface Bank {
  name: string;
  code: string;
}

export type LedgerKind = "gift_in" | "settle" | "withdrawal" | "fee" | "reversal";
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  amount_kobo: number; // negative for withdrawal/fee
  memo: string;
  created_at: string;
}

export interface Quote {
  amount_kobo: number;
  fee_kobo: number;
  net_kobo: number;
}

export interface WithdrawalReq {
  id: string;
  amount_kobo: number;
  fee_kobo: number;
  net_kobo: number;
  status: string;
  created_at: string;
}

export function getWallet() {
  return apiFetch<WalletBalance>("/wallet/");
}
export function getTransactions() {
  return apiFetch<LedgerEntry[]>("/wallet/transactions/");
}
export function getWithdrawals() {
  return apiFetch<WithdrawalReq[]>("/wallet/withdrawals/");
}
export function quoteWithdrawal(amountKobo: number) {
  return apiFetch<Quote>(`/wallet/quote/?amount_kobo=${amountKobo}`);
}
export function withdraw(amountKobo: number, pin?: string) {
  return apiFetch<WithdrawalReq>("/wallet/withdraw/", {
    method: "POST",
    body: { amount_kobo: amountKobo, pin },
  });
}
export function setWithdrawalPin(pin: string) {
  return apiFetch<{ has_pin: boolean }>("/wallet/set-pin/", {
    method: "POST",
    body: { pin },
  });
}
/** The saved payout account (also where guests transfer cash gifts), or null. */
export function getBankAccount() {
  return apiFetch<BankAccount | null>("/wallet/bank-account/");
}
export function saveBankAccount(body: { bank_name: string; bank_code: string; account_number: string }) {
  return apiFetch<BankAccount>("/wallet/bank-account/", { method: "PUT", body });
}
/** Nigerian banks with their codes. */
export function listBanks() {
  return apiFetch<Bank[]>("/wallet/banks/");
}
/** The name on an account, from the bank (404 if it can't be found). */
export function resolveAccount(bankCode: string, accountNumber: string) {
  return apiFetch<{ account_name: string }>("/wallet/resolve-account/", {
    method: "POST",
    body: { bank_code: bankCode, account_number: accountNumber },
  });
}

export function topUp(amountKobo: number) {
  return apiFetch<{ reference: string; checkout_url: string; topup_id: string }>(
    "/wallet/top-up/",
    { method: "POST", body: { amount_kobo: amountKobo } },
  );
}

/** DEV: the stub gateway has no real checkout, so simulate its webhook to
 * confirm the top-up (credits the wallet). Real Paystack calls the webhook. */
export async function confirmStubTopUp(checkoutUrl: string) {
  const m = checkoutUrl.match(/stub_[a-z0-9]+/i);
  if (!m) return;
  try {
    await apiFetch("/webhooks/payment/", {
      method: "POST", body: { reference: m[0] }, auth: false,
    });
  } catch {
    /* best-effort in dev */
  }
}
export function verifyNin(nin: string) {
  return apiFetch<{ nin_verified: boolean }>("/verify-nin/", {
    method: "POST",
    body: { nin },
  });
}
