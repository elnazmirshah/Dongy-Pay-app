export function formatCurrency(amount: number, lang: string = "en"): string {
  const locale = lang === "nl" ? "nl-NL" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}
