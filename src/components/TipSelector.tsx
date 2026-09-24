import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/format";

type Props = {
  subtotal: number;
  tip: number;
  onChange: (tip: number) => void;
};

type PresetKey = "none" | "p5" | "p10" | "p15" | "roundup" | "custom";

function computeRoundUp(subtotal: number): number {
  if (subtotal <= 0) return 0;
  // Round up to next multiple of 5; if already at one, go +5.
  const next = Math.floor(subtotal / 5) * 5 + 5;
  return Math.round((next - subtotal) * 100) / 100;
}

export function TipSelector({ subtotal, tip, onChange }: Props) {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<PresetKey>("none");
  const [custom, setCustom] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const roundUpTip = computeRoundUp(subtotal);

  const presets: { key: PresetKey; label: string; tip: number }[] = [
    { key: "none", label: t.noTip, tip: 0 },
    { key: "p5", label: "5%", tip: Math.round(subtotal * 0.05 * 100) / 100 },
    { key: "p10", label: "10%", tip: Math.round(subtotal * 0.1 * 100) / 100 },
    { key: "p15", label: "15%", tip: Math.round(subtotal * 0.15 * 100) / 100 },
    { key: "roundup", label: "Round up", tip: roundUpTip },
  ];

  const handleSelect = (key: PresetKey, value: number) => {
    setActive(key);
    if (key !== "custom") {
      setCustom("");
      onChange(value);
    }
  };

  const handleCustomClick = () => {
    setActive("custom");
    const num = parseFloat(custom);
    onChange(isNaN(num) || num < 0 ? 0 : num);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCustomChange = (val: string) => {
    setCustom(val);
    const num = parseFloat(val);
    onChange(isNaN(num) || num < 0 ? 0 : Math.min(num, 9999));
  };

  // Keep selected tip synced if subtotal changes
  useEffect(() => {
    if (active === "custom") return;
    const p = presets.find((x) => x.key === active);
    if (p && Math.round(p.tip * 100) / 100 !== Math.round(tip * 100) / 100) {
      onChange(p.tip);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  return (
    <div className="grid grid-cols-3 gap-2">
      {presets.map((p) => {
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => handleSelect(p.key, p.tip)}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center transition-all ${
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            <div className="text-sm font-semibold leading-tight">{p.label}</div>
            {p.tip > 0 && (
              <div
                className={`mt-1 text-[11px] tabular-nums ${
                  isActive ? "opacity-90" : "text-muted-foreground"
                }`}
              >
                {formatCurrency(p.tip, lang)}
              </div>
            )}
          </button>
        );
      })}

      {active === "custom" ? (
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-primary bg-primary-soft px-2 py-2`}
        >
          <div className="text-[11px] font-medium leading-tight text-muted-foreground">
            {t.customAmount}
          </div>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={custom}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-border bg-background px-1 py-1 text-center text-sm font-semibold tabular-nums focus:border-primary focus:outline-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCustomClick}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card px-2 py-3 text-center text-foreground transition-all hover:border-primary/40"
        >
          <div className="text-sm font-semibold leading-tight">Custom</div>
        </button>
      )}
    </div>
  );
}
