import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Home,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { BillItemCard } from "@/components/BillItemCard";
import { SplitModeTabs, type SplitMode } from "@/components/SplitModeTabs";
import { TipSelector } from "@/components/TipSelector";
import { useBill } from "@/hooks/useBill";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";
import { payItems, resetDemoBill } from "@/lib/bill.functions";

export const Route = createFileRoute("/t/$tableId")({ component: TablePage });

type Step = "selection" | "tip" | "payment" | "success";
type PaymentMethod = "apple_pay" | "google_pay" | "debit_card" | "credit_card" | "cash";
type PaymentResult = {
  paidSubtotal: number;
  paidTip: number;
  paidTotal: number;
  method: PaymentMethod;
  completedBill: boolean;
};

function TablePage() {
  const { tableId } = Route.useParams();
  const reset = useServerFn(resetDemoBill);
  const pay = useServerFn(payItems);
  const { snapshot, loading, error, reload } = useBill(tableId);
  const { t, lang } = useI18n();

  const [mode, setMode] = useState<SplitMode>("item");
  const [selectedQty, setSelectedQty] = useState<Map<string, number>>(new Map());
  const [people, setPeople] = useState(2);
  const [shares, setShares] = useState(1);
  const [step, setStep] = useState<Step>("selection");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [tip, setTip] = useState(0);
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"apple_pay" | "ideal" | "card" | "cash">("apple_pay");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    let cancelled = false;
    reset({ data: { tableNumber: tableId } })
      .then(() => {
        if (!cancelled) void reload();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  useEffect(() => {
    if (!snapshot) return;
    if (mode === "full") {
      const next = new Map<string, number>();
      snapshot.items.forEach((item) => {
        if (!item.paid_by) next.set(item.id, item.qty);
      });
      setSelectedQty(next);
    } else if (mode === "item") {
      setSelectedQty(new Map());
    }
  }, [mode, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    setSelectedQty((previous) => {
      const next = new Map(previous);
      let changed = false;
      previous.forEach((qty, id) => {
        const item = snapshot.items.find((candidate) => candidate.id === id);
        if (!item || item.paid_by) {
          next.delete(id);
          changed = true;
        } else if (qty > item.qty) {
          next.set(id, item.qty);
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [snapshot]);

  const totals = useMemo(() => {
    if (!snapshot) return { billTotal: 0, paidTotal: 0, remaining: 0, yourSubtotal: 0 };
    let billTotal = 0;
    let paidTotal = 0;
    let yourSubtotal = 0;
    snapshot.items.forEach((item) => {
      const line = item.unit_price * item.qty;
      billTotal += line;
      if (item.paid_by) paidTotal += line;
      else yourSubtotal += item.unit_price * (selectedQty.get(item.id) ?? 0);
    });
    return { billTotal, paidTotal, remaining: billTotal - paidTotal, yourSubtotal };
  }, [snapshot, selectedQty]);

  const equalPerPerson = people > 0 ? Math.round((totals.remaining / people) * 100) / 100 : 0;
  const equalSubtotal = Math.round(equalPerPerson * shares * 100) / 100;
  const yourSubtotal = mode === "equal" ? equalSubtotal : totals.yourSubtotal;
  const total = Math.round((yourSubtotal + tip) * 100) / 100;
  const continueDisabled = mode === "equal" ? equalSubtotal <= 0 || totals.remaining <= 0 : totals.yourSubtotal <= 0;

  const itemIdsForPayment = useMemo(() => {
    if (!snapshot) return [];
    if (mode === "equal") return snapshot.items.filter((item) => !item.paid_by).map((item) => item.id);
    return Array.from(selectedQty.entries()).filter(([, qty]) => qty > 0).map(([id]) => id);
  }, [snapshot, mode, selectedQty]);

  const goNext = (next: Step) => {
    setDirection(1);
    setStep(next);
  };
  const goBack = (previous: Step) => {
    setDirection(-1);
    setStep(previous);
  };

  const handlePay = async (method: PaymentMethod) => {
    if (!snapshot || paying) return;
    if (method === "cash") {
      toast.success(t.staffNotified, { duration: 4500 });
      return;
    }

    const unpaidIds = snapshot.items.filter((item) => !item.paid_by).map((item) => item.id);
    const completesBill = unpaidIds.length > 0 && unpaidIds.every((id) => itemIdsForPayment.includes(id));

    setPaying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = await pay({
        data: {
          billId: snapshot.bill.id,
          itemIds: itemIdsForPayment,
          tip,
          method,
        },
      });
      setPaymentResult({
        paidSubtotal: Number(result.subtotal),
        paidTip: Number(result.tip),
        paidTotal: Number(result.total),
        method,
        completedBill: completesBill,
      });
      await reload();
      goNext("success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleDone = async () => {
    if (paymentResult?.completedBill) {
      try {
        await reset({ data: { tableNumber: tableId } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reset demo bill");
        return;
      }
    }

    await reload();
    setSelectedQty(new Map());
    setMode("item");
    setPeople(2);
    setShares(1);
    setTip(0);
    setSelectedMethod("apple_pay");
    setPaymentResult(null);
    setRating(0);
    setDirection(-1);
    setStep("selection");
  };

  const slideVariants = {
    enter: (dir: 1 | -1) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 1 | -1) => ({ x: dir * -40, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <AppHeader subtitle={snapshot?.table.restaurant_name} />

      <main className="mx-auto max-w-md overflow-x-hidden px-4 pt-4 pb-32">
        {step !== "success" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <div className="text-[11px] uppercase tracking-wider opacity-80">{t.table}</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{snapshot?.table.table_number ?? tableId}</div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider opacity-80">{t.total}</div>
                <div className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.billTotal, lang)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider opacity-80">{t.remaining}</div>
                <div className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.remaining, lang)}</div>
              </div>
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t.loading}
          </div>
        )}

        {!loading && (error || !snapshot) && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {error ?? t.noOpenBill}
          </div>
        )}

        {snapshot && (
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === "selection" && (
              <motion.div
                key="selection"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                className="pt-1"
              >
                <div className="sticky top-[57px] z-20 -mx-4 mt-5 bg-background/90 px-4 py-3 backdrop-blur">
                  <SplitModeTabs value={mode} onChange={setMode} />
                </div>

                {mode === "equal" ? (
                  <section className="space-y-4 pt-2">
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t.numberOfPeople}</span>
                        <Stepper value={people} min={1} max={20} onChange={(value) => {
                          setPeople(value);
                          setShares((current) => Math.min(current, value));
                        }} />
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                        <span className="text-sm font-medium text-foreground">{t.yourShares}</span>
                        <Stepper value={shares} min={1} max={people} onChange={setShares} />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-primary-soft p-3">
                          <div className="text-[11px] text-muted-foreground">{t.perPerson}</div>
                          <div className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(equalPerPerson, lang)}</div>
                        </div>
                        <div className="rounded-xl bg-primary p-3 text-primary-foreground">
                          <div className="text-[11px] opacity-80">{t.yourSubtotal}</div>
                          <div className="text-lg font-semibold tabular-nums">{formatCurrency(equalSubtotal, lang)}</div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="space-y-2 pt-2">
                    {snapshot.items.map((item) => (
                      <BillItemCard
                        key={item.id}
                        item={item}
                        selectedQty={selectedQty.get(item.id) ?? 0}
                        disabled={mode === "full"}
                        onChangeQty={(qty) =>
                          setSelectedQty((previous) => {
                            const next = new Map(previous);
                            if (qty <= 0) next.delete(item.id);
                            else next.set(item.id, Math.min(qty, item.qty));
                            return next;
                          })
                        }
                      />
                    ))}
                  </section>
                )}
              </motion.div>
            )}

            {step === "tip" && (
              <motion.div key="tip" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: "tween", duration: 0.25, ease: "easeOut" }} className="space-y-5 pt-5">
                <button type="button" onClick={() => goBack("selection")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.back}
                </button>
                <div className="rounded-3xl border border-border bg-card p-5">
                  <h1 className="text-xl font-semibold leading-snug text-foreground">{t.tipTitle}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t.tipSubtitle}</p>
                  <div className="mt-5"><TipSelector subtotal={yourSubtotal} tip={tip} onChange={setTip} /></div>
                </div>
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div key="payment" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: "tween", duration: 0.25, ease: "easeOut" }} className="space-y-4 pt-5 pb-4">
                <button type="button" onClick={() => goBack("tip")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.back}
                </button>
                <h2 className="text-xl font-semibold text-foreground">Choose a payment method</h2>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total to pay</span>
                  <span className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(total, lang)}</span>
                </div>
                <div className="space-y-3">
                  <PaymentChoice selected={selectedMethod === "apple_pay"} onSelect={() => setSelectedMethod("apple_pay")} title="Apple Pay / Google Pay" subtitle="Fast and secure checkout" icon={<AppleGoogleLogo />} />
                  <PaymentChoice selected={selectedMethod === "ideal"} onSelect={() => setSelectedMethod("ideal")} title="iDEAL" subtitle="Pay via your bank app" icon={<IdealLogo />} />
                  <PaymentChoice selected={selectedMethod === "card"} onSelect={() => setSelectedMethod("card")} title="Debit or Credit Card" subtitle="Mastercard, Visa" icon={<CardBrandsLogo />} />
                  <PaymentChoice selected={selectedMethod === "cash"} onSelect={() => setSelectedMethod("cash")} title="Pay with cash at counter" subtitle="Notify staff and settle at the counter" icon={<Banknote className="h-6 w-6 text-foreground" />} />
                </div>
                {paying && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t.processing}</div>}
              </motion.div>
            )}

            {step === "success" && paymentResult && (
              <motion.div key="success" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: "tween", duration: 0.25, ease: "easeOut" }} className="space-y-6 pt-10">
                <div className="flex flex-col items-center text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, stiffness: 220 }} className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30">
                    <CheckCircle2 className="h-16 w-16" strokeWidth={2.4} />
                  </motion.div>
                  <h1 className="mt-5 text-2xl font-semibold text-foreground">{t.paymentSuccess}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t.thanks}</p>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 text-sm">
                  <Row label={t.subtotal} value={formatCurrency(paymentResult.paidSubtotal, lang)} />
                  <Row label={t.tip} value={formatCurrency(paymentResult.paidTip, lang)} />
                  <div className="my-2 h-px bg-border" />
                  <Row label={t.total} value={formatCurrency(paymentResult.paidTotal, lang)} bold />
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 text-center">
                  <h2 className="text-base font-semibold text-foreground">{t.rateExperience}</h2>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? "text-primary" : "text-muted-foreground/30"}`} aria-label={`${n} stars`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                    {t.fiveStarReview} <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <button type="button" onClick={() => void handleDone()} className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted">
                  <Home className="h-4 w-4" /> {t.done}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {step !== "success" && step !== "payment" && snapshot && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 22, stiffness: 240 }} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
          <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{step === "selection" ? t.yourSubtotal : t.total}</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(step === "selection" ? yourSubtotal : total, lang)}</div>
              <div className="text-[11px] text-muted-foreground">
                {step === "selection" ? `${t.remaining}: ${formatCurrency(totals.remaining, lang)}` : `${t.tip}: ${formatCurrency(tip, lang)}`}
              </div>
            </div>
            <button type="button" onClick={() => step === "selection" ? goNext("tip") : goNext("payment")} disabled={step === "selection" && continueDisabled} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none">
              {step === "selection" ? t.continue : t.next} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </motion.div>
      )}

      {step === "payment" && snapshot && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 22, stiffness: 240 }} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
          <div className="mx-auto max-w-md">
            <button type="button" disabled={paying} onClick={() => {
              const mapped: PaymentMethod = selectedMethod === "apple_pay" ? "apple_pay" : selectedMethod === "ideal" ? "debit_card" : selectedMethod === "card" ? "credit_card" : "cash";
              void handlePay(mapped);
            }} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.99] disabled:opacity-70">
              {paying ? <><Loader2 className="h-5 w-5 animate-spin" /> {t.processing}</> : selectedMethod === "cash" ? <>Notify staff · {formatCurrency(total, lang)}</> : <>Pay {formatCurrency(total, lang)}</>}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stepper({ value, onChange, min, max }: { value: number; onChange: (value: number) => void; min: number; max: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background p-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40"><Minus className="h-4 w-4" /></button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function PaymentChoice({ selected, onSelect, title, subtitle, icon }: { selected: boolean; onSelect: () => void; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`flex w-full flex-row items-center gap-4 rounded-xl p-4 text-left transition-all active:scale-[0.99] ${selected ? "border-2 border-primary bg-emerald-50/50 text-foreground shadow-sm" : "border border-gray-200 bg-white text-foreground hover:border-primary/40"}`}>
      <span className="flex h-10 w-16 shrink-0 items-center justify-center bg-transparent">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col"><span className="block truncate text-sm font-semibold text-foreground">{title}</span><span className="block truncate text-[12px] text-muted-foreground">{subtitle}</span></span>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-gray-300 bg-transparent"}`}>{selected && <span className="h-2 w-2 rounded-full bg-white" />}</span>
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex items-center justify-between ${bold ? "text-base font-semibold text-foreground" : "text-muted-foreground"}`}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

function AppleGoogleLogo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground" fill="currentColor" aria-hidden><path d="M16.365 12.78c-.02-2.06 1.683-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.74-3.13.74-.65 0-1.65-.72-2.71-.7-1.39.02-2.68.81-3.4 2.06-1.45 2.51-.37 6.23 1.04 8.27.69 1 1.51 2.13 2.58 2.09 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.6.67 2.7.65 1.12-.02 1.83-1.02 2.51-2.03.79-1.16 1.12-2.29 1.14-2.35-.02-.01-2.19-.84-2.2-3.34zM14.3 7.06c.57-.69.95-1.65.84-2.6-.82.03-1.81.55-2.4 1.23-.53.61-1 1.59-.87 2.52.91.07 1.84-.46 2.43-1.15z" /></svg>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#4285F4" d="M21.6 12.23c0-.65-.06-1.27-.17-1.87H12v3.55h5.39c-.23 1.25-.94 2.3-2 3.01v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.19z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22z" /><path fill="#FBBC05" d="M6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.91V7.5H3.07A10 10 0 0 0 2 12c0 1.6.38 3.12 1.07 4.5l3.34-2.59z" /><path fill="#EA4335" d="M12 5.93c1.47 0 2.78.51 3.82 1.5l2.86-2.86C16.95 2.94 14.7 2 12 2 8.07 2 4.68 4.25 3.07 7.5l3.34 2.59C7.2 7.7 9.4 5.93 12 5.93z" /></svg>
    </span>
  );
}

function IdealLogo() {
  return <svg viewBox="0 0 120 60" className="h-7" aria-hidden><text x="8" y="38" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="26" fill="#CC0066">i</text><circle cx="18" cy="18" r="4" fill="#CC0066" /><text x="26" y="42" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#0A0A64">DEAL</text></svg>;
}

function CardBrandsLogo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 36 22" className="h-5" aria-hidden><circle cx="13" cy="11" r="9" fill="#EB001B" /><circle cx="23" cy="11" r="9" fill="#F79E1B" /><path d="M18 4.5a9 9 0 0 0 0 13 9 9 0 0 0 0-13z" fill="#FF5F00" /></svg>
      <svg viewBox="0 0 48 16" className="h-3.5" aria-hidden><text x="0" y="14" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="16" fill="#1A1F71">VISA</text></svg>
    </span>
  );
}
