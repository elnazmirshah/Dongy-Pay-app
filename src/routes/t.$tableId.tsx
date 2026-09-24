import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Minus, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BillItemCard } from "@/components/BillItemCard";
import { SplitModeTabs, type SplitMode } from "@/components/SplitModeTabs";
import { useBill } from "@/hooks/useBill";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";
import { resetDemoBill } from "@/lib/bill.functions";
import { saveCheckout } from "@/lib/checkoutState";

export const Route = createFileRoute("/t/$tableId")({
  component: TableRoute,
});

function TableRoute() {
  const { tableId } = Route.useParams();
  const location = useLocation();
  const basePath = `/t/${tableId}`;

  if (location.pathname !== basePath && location.pathname !== `${basePath}/`) {
    return <Outlet />;
  }

  return <TablePage />;
}

function TablePage() {
  const { tableId } = Route.useParams();
  const { snapshot, loading, error, reload } = useBill(tableId);
  const reset = useServerFn(resetDemoBill);
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [mode, setMode] = useState<SplitMode>("item");
  const [selectedQty, setSelectedQty] = useState<Map<string, number>>(new Map());
  const [people, setPeople] = useState(2);
  const [shares, setShares] = useState(1);

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
      const all = new Map<string, number>();
      snapshot.items.forEach((item) => {
        if (!item.paid_by) all.set(item.id, item.qty);
      });
      setSelectedQty(all);
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
    if (!snapshot) return { bill: 0, paid: 0, remaining: 0, selected: 0 };
    let bill = 0;
    let paid = 0;
    let selected = 0;
    snapshot.items.forEach((item) => {
      const line = item.unit_price * item.qty;
      bill += line;
      if (item.paid_by) paid += line;
      else selected += item.unit_price * (selectedQty.get(item.id) ?? 0);
    });
    return { bill, paid, remaining: bill - paid, selected };
  }, [snapshot, selectedQty]);

  const perPerson = people > 0 ? Math.round((totals.remaining / people) * 100) / 100 : 0;
  const equalSubtotal = Math.round(perPerson * shares * 100) / 100;
  const subtotal = mode === "equal" ? equalSubtotal : totals.selected;

  const itemIds = useMemo(() => {
    if (!snapshot) return [];
    if (mode === "equal") return snapshot.items.filter((item) => !item.paid_by).map((item) => item.id);
    return Array.from(selectedQty.entries())
      .filter(([, qty]) => qty > 0)
      .map(([id]) => id);
  }, [snapshot, mode, selectedQty]);

  const canContinue = !!snapshot && subtotal > 0 && itemIds.length > 0;

  const continueToTip = () => {
    if (!snapshot || !canContinue) return;
    saveCheckout({
      tableNumber: tableId,
      billId: snapshot.bill.id,
      itemIds,
      subtotal,
      tip: 0,
    });
    navigate({ to: "/t/$tableId/tip", params: { tableId } });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <AppHeader subtitle={snapshot?.table.restaurant_name} />
      <main className="mx-auto max-w-md px-4 pt-4">
        <section className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="text-[11px] uppercase tracking-wider opacity-80">{t.table}</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums">{snapshot?.table.table_number ?? tableId}</div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-80">{t.total}</div>
              <div className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.bill, lang)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider opacity-80">{t.remaining}</div>
              <div className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.remaining, lang)}</div>
            </div>
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t.loading}
          </div>
        )}

        {!loading && (error || !snapshot) && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {error ?? t.noOpenBill}
          </div>
        )}

        {snapshot && (
          <>
            <div className="sticky top-[57px] z-20 -mx-4 mt-4 bg-background/90 px-4 py-3 backdrop-blur">
              <SplitModeTabs value={mode} onChange={setMode} />
            </div>

            {mode === "equal" ? (
              <section className="mt-2 space-y-4 rounded-2xl border border-border bg-card p-5">
                <Counter label={t.numberOfPeople} value={people} min={1} max={20} onChange={(value) => {
                  setPeople(value);
                  setShares((current) => Math.min(current, value));
                }} />
                <Counter label={t.yourShares} value={shares} min={1} max={people} onChange={setShares} />
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t.perPerson}</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(perPerson, lang)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{t.yourSubtotal}</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{formatCurrency(equalSubtotal, lang)}</span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mt-2 space-y-3">
                {mode === "item" && <p className="px-1 text-xs text-muted-foreground">{t.selectItems}</p>}
                {snapshot.items.map((item) => (
                  <BillItemCard
                    key={item.id}
                    item={item}
                    selectedQty={selectedQty.get(item.id) ?? 0}
                    onChangeQty={(qty) => {
                      setSelectedQty((current) => {
                        const next = new Map(current);
                        if (qty <= 0) next.delete(item.id);
                        else next.set(item.id, qty);
                        return next;
                      });
                    }}
                    disabled={mode === "full"}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {snapshot && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.yourSubtotal}</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(subtotal, lang)}</div>
            </div>
            <button
              type="button"
              onClick={continueToTip}
              disabled={!canContinue}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background p-1">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Decrease">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Increase">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
