import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { TipSelector } from "@/components/TipSelector";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";
import { loadCheckout, saveCheckout, type CheckoutSelection } from "@/lib/checkoutState";

export const Route = createFileRoute("/t/$tableId/tip")({
  component: TipPage,
});

function TipPage() {
  const { tableId } = Route.useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [sel, setSel] = useState<CheckoutSelection | null>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const s = loadCheckout();
    if (!s || s.tableNumber !== tableId) {
      navigate({ to: "/t/$tableId", params: { tableId } });
      return;
    }
    setSel(s);
    setTip(s.tip ?? 0);
  }, [tableId, navigate]);

  if (!sel) return null;

  const total = Math.round((sel.subtotal + tip) * 100) / 100;

  const handleContinue = () => {
    saveCheckout({ ...sel, tip });
    navigate({ to: "/t/$tableId/checkout", params: { tableId } });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={`${t.table} ${tableId}`} />
      <main className="mx-auto max-w-md space-y-5 px-4 py-5 pb-32">
        <Link
          to="/t/$tableId"
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
          <h1 className="text-xl font-semibold text-foreground">{t.tipQuestion}</h1>
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t.addTip}</h2>
            <TipSelector subtotal={sel.subtotal} tip={tip} onChange={setTip} />
          </div>
        </motion.div>
      </main>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.total}
            </div>
            <div className="text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(total, lang)}
            </div>
            {tip > 0 && (
              <div className="text-[11px] tabular-nums text-muted-foreground">
                {t.tip}: {formatCurrency(tip, lang)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]"
          >
            {t.proceedToPayment} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

