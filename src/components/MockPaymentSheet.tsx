import { useState } from "react";
import { motion } from "framer-motion";
import { Apple, CreditCard, Loader2, Wallet, Banknote, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";

export type PaymentMethod =
  | "apple_pay"
  | "google_pay"
  | "debit_card"
  | "credit_card"
  | "cash";

type Props = {
  total: number;
  onPay: (method: PaymentMethod, payerLabel: string) => Promise<void>;
};

export function MockPaymentSheet({ total, onPay }: Props) {
  const { t, lang } = useI18n();
  const [method, setMethod] = useState<PaymentMethod>("apple_pay");
  const [name, setName] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      await onPay(method, name);
    } finally {
      setPaying(false);
    }
  };

  const showCardForm = method === "debit_card" || method === "credit_card";

  const Option = ({
    id,
    label,
    sub,
    icon,
    primary,
  }: {
    id: PaymentMethod;
    label: string;
    sub?: string;
    icon: React.ReactNode;
    primary?: boolean;
  }) => {
    const active = method === id;
    return (
      <button
        type="button"
        onClick={() => setMethod(id)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
          active
            ? primary
              ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "border-primary bg-primary-soft text-foreground"
            : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
        aria-pressed={active}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            active && primary
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-primary-soft text-primary"
          }`}
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          {sub && (
            <span
              className={`block text-[11px] ${
                active && primary ? "opacity-90" : "text-muted-foreground"
              }`}
            >
              {sub}
            </span>
          )}
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 rtl:rotate-180 ${
            active ? "opacity-100" : "opacity-40"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        {t.choosePaymentMethod}
      </h2>

      <Option
        id="apple_pay"
        label={t.applePayGooglePay}
        sub="Apple Pay · Google Pay"
        icon={
          <span className="flex items-center gap-1">
            <Apple className="h-4 w-4" />
            <span className="text-xs font-bold">G</span>
          </span>
        }
        primary
      />
      <Option
        id="debit_card"
        label={t.debitCard}
        sub="Maestro · V Pay"
        icon={<Wallet className="h-5 w-5" />}
      />
      <Option
        id="credit_card"
        label={t.creditCard}
        sub="Visa · Mastercard"
        icon={<CreditCard className="h-5 w-5" />}
      />
      <Option
        id="cash"
        label={t.payAtCounter}
        sub={t.payAtCounterDesc}
        icon={<Banknote className="h-5 w-5" />}
      />

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 60))}
        placeholder={t.yourName}
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />

      {showCardForm && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <input
            type="text"
            inputMode="numeric"
            value={cardNo}
            onChange={(e) => setCardNo(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))}
            placeholder={t.cardNumber}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={exp}
              onChange={(e) => setExp(e.target.value.slice(0, 7))}
              placeholder={t.expires}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={t.cvc}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Demo only. No real card is charged.
          </p>
        </motion.div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.99] disabled:opacity-70"
      >
        {paying ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> {t.processing}
          </>
        ) : (
          <>
            {method === "cash" ? t.payAtCounter : t.payNow} ·{" "}
            {formatCurrency(total, lang)}
          </>
        )}
      </button>
    </div>
  );
}
