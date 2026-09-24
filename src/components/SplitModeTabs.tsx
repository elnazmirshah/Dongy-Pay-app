import { motion } from "framer-motion";
import { useI18n } from "@/i18n/LanguageProvider";

export type SplitMode = "full" | "item" | "equal";

type Props = {
  value: SplitMode;
  onChange: (mode: SplitMode) => void;
};

export function SplitModeTabs({ value, onChange }: Props) {
  const { t } = useI18n();
  const tabs: { id: SplitMode; label: string }[] = [
    { id: "full", label: t.payFull },
    { id: "item", label: t.splitItem },
    { id: "equal", label: t.splitEqual },
  ];

  return (
    <div className="relative grid grid-cols-3 rounded-full bg-muted p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="relative z-10 px-2 py-2 text-xs font-semibold"
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="split-tab"
                className="absolute inset-0 rounded-full bg-card shadow-sm"
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
              />
            )}
            <span
              className={`relative ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
