import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Sparkles, Split, ScanLine } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import dongyLogo from "@/assets/dongy-logo.svg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Dongy — Split. Pay. Enjoy together." },
      { name: "description", content: "Scan the QR at your table, split the bill smartly with friends, and pay with Apple Pay, Google Pay or card." },
    ],
  }),
});

function Index() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary-soft/40">
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-5">
        <img src={dongyLogo} alt={t.brand} className="h-8 w-auto" />
        <LanguageSwitcher />
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-8 px-5 py-10">
        <section className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">{t.tagline}</h1>
          <p className="text-base text-muted-foreground">Scan the QR on your table, see your live bill, split it any way you like, and tap to pay. No app, no signup.</p>
          <Link to="/t/$tableId" params={{ tableId: "5" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]">
            <QrCode className="h-4 w-4" /> {t.tryDemo}
          </Link>
        </section>
        <section className="grid grid-cols-1 gap-3">
          <Feature icon={<ScanLine className="h-5 w-5" />} title="Scan your table QR" body="Your live bill appears in seconds — no waiting for the server." />
          <Feature icon={<Split className="h-5 w-5" />} title="Split your way" body="Pay everything, split by item, or split equally between friends." />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Tap to pay" body="Apple Pay, Google Pay or card. Digital receipt instantly." />
        </section>
        <p className="pt-4 text-center text-xs text-muted-foreground">{t.poweredBy}</p>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</span>
      <div><div className="text-sm font-semibold text-foreground">{title}</div><div className="mt-0.5 text-xs text-muted-foreground">{body}</div></div>
    </div>
  );
}
