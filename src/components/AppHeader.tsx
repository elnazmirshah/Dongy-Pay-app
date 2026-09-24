import { Link } from "@tanstack/react-router";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageProvider";
import dongyLogo from "@/assets/dongy-logo.svg";

type Props = {
  subtitle?: string;
  back?: { to: string; label?: string };
};

export function AppHeader({ subtitle }: Props) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={dongyLogo} alt={t.brand} className="h-7 w-auto" />
          {subtitle && (
            <div className="leading-tight">
              <div className="text-[11px] text-muted-foreground">{subtitle}</div>
            </div>
          )}
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
