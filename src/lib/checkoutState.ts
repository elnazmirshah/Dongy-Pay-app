// Lightweight session-scoped state shared across the checkout flow.
// Lives in sessionStorage so refresh / route navigation don't lose the user's selection.

export type CheckoutSelection = {
  tableNumber: string;
  billId: string;
  itemIds: string[];
  subtotal: number;
  tip: number;
  method?: "apple_pay" | "google_pay" | "debit_card" | "credit_card" | "cash";
  payerLabel?: string;
};

const KEY = "tabpay.checkout";

export function saveCheckout(sel: CheckoutSelection) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(sel));
}

export function loadCheckout(): CheckoutSelection | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutSelection;
  } catch {
    return null;
  }
}

export function clearCheckout() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

export type ReceiptData = {
  tableNumber: string;
  paymentId: string;
  subtotal: number;
  tip: number;
  total: number;
  method: string;
  payerLabel: string;
  itemNames: string[];
  createdAt: string;
};

const RKEY = "tabpay.receipt";
export function saveReceipt(r: ReceiptData) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RKEY, JSON.stringify(r));
}
export function loadReceipt(): ReceiptData | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(RKEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReceiptData;
  } catch {
    return null;
  }
}
