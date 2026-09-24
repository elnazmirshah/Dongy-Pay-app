import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MockPaymentSheet, type PaymentMethod } from "@/components/MockPaymentSheet";
import { useI18n, localizedItemName } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";
import {
  clearCheckout,
  loadCheckout,
  saveReceipt,
  type CheckoutSelection,
} from "@/lib/checkoutState";
import { payItems } from "@/lib/bill.functions";
import { useBill } from "@/hooks/useBill";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$tableId/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { tableId } = Route.useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [sel, setSel] = useState<CheckoutSelection | null>(null);
  const { snapshot } = useBill(tableId);
  const pay = useServerFn(payItems);

  useEffect(() => {
    const s = loadCheckout();
    if (!s || s.tableNumber !== tableId) {
      navigate({ to: "/t/$tableId", params: { tableId } });
      return;
    }
    setSel(s);
  }, [tableId, navigate]);

  if (!sel) return null;
  const total = Math.round((sel.subtotal + sel.tip) * 100) / 100;

  const itemNames =
    snapshot?.items
      .filter((i) => sel.itemIds.includes(i.id))
      .map((i) => `${localizedItemName(i, lang)}${i.qty > 1 ? ` ×${i.qty}` : ""}`) ?? [];

  const handlePay = async (method: PaymentMethod, payerLabel: string) => {
    if (method === "cash") {
      // Cash → notify staff, do not process payment.
      toast.success(t.staffNotified);
      clearCheckout();
      navigate({ to: "/t/$tableId", params: { tableId } });
      return;
    }
    try {
      // Simulate processing latency
      await new Promise((r) => setTimeout(r, 900));
      const result = await pay({
        data: {
          billId: sel.billId,
          itemIds: sel.itemIds,
          tip: sel.tip,
          method,
          payerLabel: payerLabel || undefined,
        },
      });
      saveReceipt({
        tableNumber: tableId,
        paymentId: result.paymentId,
        subtotal: result.subtotal,
        tip: result.tip,
        total: result.total,
        method: result.method,
        payerLabel: result.payerLabel ?? "Guest",
        itemNames,
        createdAt: result.createdAt,
      });
      clearCheckout();
      navigate({ to: "/t/$tableId/receipt", params: { tableId } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <AppHeader subtitle={`${t.table} ${tableId}`} />
      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        <Link
          to="/t/$tableId/tip"
          params={{ tableId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t.back}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card p-5"
        >
          <h1 className="text-xl font-semibold text-foreground">{t.payWith}</h1>
          <div className="mt-3 space-y-1 text-sm">
            <Row label={t.subtotal} value={formatCurrency(sel.subtotal, lang)} />
            <Row label={t.tip} value={formatCurrency(sel.tip, lang)} />
            <div className="my-2 h-px bg-border" />
            <Row label={t.total} value={formatCurrency(total, lang)} bold />
          </div>
        </motion.div>

        <MockPaymentSheet total={total} onPay={handlePay} />
      </main>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "text-base font-semibold text-foreground" : "text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
