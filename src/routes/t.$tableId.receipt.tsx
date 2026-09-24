import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Home } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { StarRating } from "@/components/StarRating";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";
import { loadReceipt, type ReceiptData } from "@/lib/checkoutState";

export const Route = createFileRoute("/t/$tableId/receipt")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { tableId } = Route.useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const r = loadReceipt();
    if (!r || r.tableNumber !== tableId) {
      navigate({ to: "/t/$tableId", params: { tableId } });
      return;
    }
    setReceipt(r);
  }, [tableId, navigate]);

  if (!receipt) return null;

  const methodLabel =
    receipt.method === "apple_pay"
      ? t.applePay
      : receipt.method === "google_pay"
        ? t.googlePay
        : receipt.method === "debit_card"
          ? t.debitCard
          : t.creditCard;

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader subtitle={`${t.table} ${tableId}`} />
      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 220, delay: 0.1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <CheckCircle2 className="h-10 w-10" strokeWidth={2.4} />
          </motion.div>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            {t.paymentSuccess}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.thanks}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl border border-border bg-card p-5"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.receiptTitle}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            #{receipt.paymentId.slice(0, 8)} ·{" "}
            {new Date(receipt.createdAt).toLocaleString(lang)}
          </div>

          {receipt.itemNames.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm text-foreground">
              {receipt.itemNames.map((n, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <Row label={t.subtotal} value={formatCurrency(receipt.subtotal, lang)} />
            <Row label={t.tip} value={formatCurrency(receipt.tip, lang)} />
            <Row label={`${t.payWith}: ${methodLabel}`} value={receipt.payerLabel} muted />
            <div className="my-2 h-px bg-border" />
            <Row label={t.total} value={formatCurrency(receipt.total, lang)} bold />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-border bg-card p-5 text-center"
        >
          <h2 className="text-base font-semibold text-foreground">
            {t.rateExperience}
          </h2>
          <div className="mt-3">
            <StarRating value={rating} onChange={setRating} />
          </div>
          {rating === 5 && (
            <motion.a
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Go Dutch Bistro")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
            >
              {t.postOnGoogle} <ExternalLink className="h-4 w-4" />
            </motion.a>
          )}
          {rating > 0 && rating < 5 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Thanks — we'll share your feedback with the team.
            </p>
          )}
        </motion.div>

        <Link
          to="/"
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" /> {t.done}
        </Link>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold
          ? "text-base font-semibold text-foreground"
          : muted
            ? "text-xs text-muted-foreground"
            : "text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
