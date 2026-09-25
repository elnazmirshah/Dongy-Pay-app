import { motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import type { BillItem } from "@/lib/bill.functions";
import { useI18n, localizedItemName } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";

type Props = {
  item: BillItem;
  selectedQty: number;
  onChangeQty: (qty: number) => void;
  disabled?: boolean;
};

export function BillItemCard({ item, selectedQty, onChangeQty, disabled }: Props) {
  const { t, lang } = useI18n();
  const paidQty = Math.min(item.paid_qty ?? 0, item.qty);
  const remainingQty = Math.max(0, item.qty - paidQty);
  const isPaid = remainingQty === 0;
  const isPartiallyPaid = paidQty > 0 && !isPaid;
  const lineTotal = item.unit_price * item.qty;
  const interactive = !isPaid && !disabled;
  const isMulti = item.qty > 1;
  const selected = selectedQty > 0;

  const handleCardClick = () => {
    if (!interactive || isMulti) return;
    onChangeQty(selected ? 0 : 1);
  };

  return (
    <motion.div
      whileTap={interactive && !isMulti ? { scale: 0.98 } : undefined}
      onClick={handleCardClick}
      role={interactive && !isMulti ? "button" : undefined}
      aria-pressed={!isMulti ? selected : undefined}
      className={`relative w-full rounded-2xl border p-4 text-left transition-all ${
        isPaid
          ? "border-border bg-muted/40 opacity-60"
          : selected
            ? "border-primary bg-primary-soft shadow-sm"
            : "border-border bg-card hover:border-primary/40"
      } ${interactive && !isMulti ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {localizedItemName(item, lang)}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(item.unit_price, lang)} x {item.qty}
          </div>
          {isPaid && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
              <Check className="h-3 w-3" /> {t.paid} · {item.paid_by ?? "Guest"}
            </div>
          )}
          {isPartiallyPaid && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
              <Check className="h-3 w-3" /> {paidQty} of {item.qty} {t.paid.toLowerCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(lineTotal, lang)}
          </span>
          {!isPaid && (
            isMulti ? (
              <div
                className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={!interactive || selectedQty <= 0}
                  onClick={() => onChangeQty(Math.max(0, selectedQty - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums text-foreground">
                  {selectedQty}
                </span>
                <button
                  type="button"
                  disabled={!interactive || selectedQty >= remainingQty}
                  onClick={() => onChangeQty(Math.min(remainingQty, selectedQty + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
