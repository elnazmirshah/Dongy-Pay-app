## TabPay — Smart Split-Bill Web App

A mobile-first restaurant payment app. Diners scan a table QR, see the live bill, split it (by item / equally / pay all), tip, "pay" via a mock Apple Pay/Google Pay/Card UI, and get a digital receipt + feedback prompt. Real-time sync via Lovable Cloud.

### Tech stack
- TanStack Start + React 19, Tailwind v4, shadcn/ui, lucide-react, framer-motion
- Lovable Cloud (Postgres + Realtime) for tables, bills, items, payment locks
- i18n: lightweight context-based provider (EN default, FA with RTL, NL)
- Mock payments only — no Stripe wiring this iteration

### Design system (src/styles.css)
- Primary: Deep Emerald (`oklch(0.42 0.12 160)`), primary-foreground near-white
- Generous whitespace, 16px base, rounded-2xl cards, soft shadows
- Subtle framer-motion page/step transitions, item-tap scale + check pop

### Routes (`src/routes/`)
- `index.tsx` — marketing-lite landing with "Try Table 5" CTA → `/t/5`
- `t.$tableId.tsx` — Table landing: live bill, header (table #, language switch), split-mode tabs, persistent footer "Pay" bar with running total
- `t.$tableId.tip.tsx` — Tip presets (5/10/15/Custom) + summary
- `t.$tableId.checkout.tsx` — Mock Apple Pay / Google Pay / Card UI
- `t.$tableId.receipt.tsx` — Digital receipt + 1–5 star feedback; 5★ shows "Post on Google Maps"

### Split engine (the hard part — built first)
Single source of truth: `useBill(tableId)` hook subscribing to Realtime.
- **Pay Full** — selects all unpaid items
- **Split by Item** — tap-to-toggle cards; paid/locked items disabled with badge; live "Your subtotal" + "Remaining balance"
- **Split Equally** — stepper for # of people; shows per-person amount of remaining balance; user claims N shares
- Optimistic UI; on confirm-payment, rows marked `paid` and broadcast

### Data model (Lovable Cloud)
- `tables` (id, number, restaurant_name)
- `bills` (id, table_id, status, opened_at)
- `bill_items` (id, bill_id, name, name_fa, name_nl, qty, unit_price, paid_by, paid_at, locked_by, locked_at)
- `payments` (id, bill_id, amount, tip, method, payer_label, created_at)
- RLS: public read for active bill by table_id; insert payments via server fn; item updates via server fn with optimistic lock check
- Realtime enabled on `bill_items` and `payments`
- Seed: Table 5 with Margherita Pizza, Red Wine (x2), Caprese, Espresso (x2), Tiramisu

### Server functions (`src/lib/bill.functions.ts`)
- `getActiveBill({ tableId })` — public, admin-scoped read
- `claimItems({ billId, itemIds, payerLabel })` — sets `locked_by` if null
- `releaseItems` — for back navigation
- `payItems({ billId, itemIds, tip, method, payerLabel })` — marks paid, inserts payment

### i18n
- `src/i18n/{en,fa,nl}.ts` dictionaries; `LanguageProvider` in `__root.tsx`; `<html lang dir>` switches for FA RTL; persisted in localStorage

### Components (`src/components/`)
- `BillItemCard`, `SplitModeTabs`, `PayBar`, `TipSelector`, `MockPaymentSheet`, `ReceiptCard`, `StarRating`, `LanguageSwitcher`, `TableHeader`

### Build order
1. Enable Lovable Cloud, create schema + seed Table 5
2. Design tokens + i18n scaffold + root layout
3. Table landing + Split-by-Item with live remaining balance (priority)
4. Realtime sync + locking
5. Pay Full / Split Equally modes
6. Tip → Checkout (mock) → Receipt + feedback
7. Polish: motion, empty/loading states, mobile QA

### Out of scope (this iteration)
Real Stripe charges, ordering, staff/POS dashboard, auth, Google Maps API posting (button links to a Maps review URL only).