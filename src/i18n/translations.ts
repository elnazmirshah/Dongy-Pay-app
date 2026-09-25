export type Lang = "en" | "nl";

export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "EN", dir: "ltr" },
  { code: "nl", label: "NL", dir: "ltr" },
];

type Dict = {
  brand: string;
  tagline: string;
  tryDemo: string;
  table: string;
  yourBill: string;
  qty: string;
  payFull: string;
  splitItem: string;
  splitEqual: string;
  selectItems: string;
  yourSubtotal: string;
  remaining: string;
  paid: string;
  lockedByOther: string;
  payNow: string;
  selectAtLeastOne: string;
  numberOfPeople: string;
  perPerson: string;
  yourShares: string;
  reviewTip: string;
  addTip: string;
  tipQuestion: string;
  tipTitle: string;
  tipSubtitle: string;
  next: string;
  fiveStarReview: string;
  noTip: string;
  customTip: string;
  customAmount: string;
  tip: string;
  subtotal: string;
  total: string;
  continue: string;
  proceedToPayment: string;
  back: string;
  checkout: string;
  payWith: string;
  choosePaymentMethod: string;
  applePay: string;
  googlePay: string;
  applePayGooglePay: string;
  card: string;
  debitCard: string;
  creditCard: string;
  payAtCounter: string;
  payAtCounterDesc: string;
  staffNotified: string;
  cardNumber: string;
  expires: string;
  cvc: string;
  yourName: string;
  processing: string;
  paymentSuccess: string;
  receiptTitle: string;
  thanks: string;
  rateExperience: string;
  postOnGoogle: string;
  done: string;
  language: string;
  poweredBy: string;
  loading: string;
  noOpenBill: string;
  itemsSelected: string;
};

export const TRANSLATIONS: Record<Lang, Dict> = {
  en: {
    brand: "Dongy",
    tagline: "Scan. Split. Pay. Leave.",
    tryDemo: "Try Table 5 demo",
    table: "Table",
    yourBill: "Your bill",
    qty: "Qty",
    payFull: "Pay full",
    splitItem: "Split by item",
    splitEqual: "Split equally",
    selectItems: "Tap items you want to pay for",
    yourSubtotal: "Your subtotal",
    remaining: "Remaining",
    paid: "Paid",
    lockedByOther: "Reserved",
    payNow: "Pay now",
    selectAtLeastOne: "Select at least one item",
    numberOfPeople: "Number of people",
    perPerson: "Per person",
    yourShares: "Your shares",
    reviewTip: "Review & tip",
    addTip: "Add a tip",
    tipQuestion: "Would you like to leave a tip?",
    tipTitle: "Enjoyed the service?",
    tipSubtitle: "Add a tip for the team.",
    next: "Next",
    fiveStarReview: "Give us a 5-star review on Google Maps",
    noTip: "No tip",
    customTip: "Custom",
    customAmount: "Custom amount",
    tip: "Tip",
    subtotal: "Subtotal",
    total: "Total",
    continue: "Continue",
    proceedToPayment: "Proceed to payment",
    back: "Back",
    checkout: "Checkout",
    payWith: "Pay with",
    choosePaymentMethod: "Choose a payment method",
    applePay: "Apple Pay",
    googlePay: "Google Pay",
    applePayGooglePay: "Apple Pay / Google Pay",
    card: "Credit card",
    debitCard: "Debit card",
    creditCard: "Credit card",
    payAtCounter: "Pay with cash at counter",
    payAtCounterDesc: "Notify staff and settle at the counter",
    staffNotified: "Staff has been notified. Please pay at the counter.",
    cardNumber: "Card number",
    expires: "MM / YY",
    cvc: "CVC",
    yourName: "Your name (optional)",
    processing: "Processing payment...",
    paymentSuccess: "Payment successful",
    receiptTitle: "Digital receipt",
    thanks: "Thanks for dining with us!",
    rateExperience: "How was your experience?",
    postOnGoogle: "Post on Google Maps",
    done: "Done",
    language: "Language",
    poweredBy: "Powered by Dongy | Split. Pay. Enjoy together.",
    loading: "Loading bill...",
    noOpenBill: "No open bill for this table.",
    itemsSelected: "items selected",
  },
  nl: {
    brand: "Dongy",
    tagline: "Scan. Splits. Betaal. Vertrek.",
    tryDemo: "Probeer Tafel 5",
    table: "Tafel",
    yourBill: "Jouw rekening",
    qty: "Aantal",
    payFull: "Volledig betalen",
    splitItem: "Per item splitsen",
    splitEqual: "Gelijk verdelen",
    selectItems: "Tik op de items die je wilt betalen",
    yourSubtotal: "Jouw subtotaal",
    remaining: "Resterend",
    paid: "Betaald",
    lockedByOther: "Gereserveerd",
    payNow: "Nu betalen",
    selectAtLeastOne: "Selecteer minstens één item",
    numberOfPeople: "Aantal personen",
    perPerson: "Per persoon",
    yourShares: "Jouw aandeel",
    reviewTip: "Controleer & fooi",
    addTip: "Fooi toevoegen",
    tipQuestion: "Wil je een fooi geven?",
    tipTitle: "Tevreden met de service?",
    tipSubtitle: "Geef het team een fooi.",
    next: "Volgende",
    fiveStarReview: "Geef ons een 5-sterren review op Google Maps",
    noTip: "Geen fooi",
    customTip: "Aangepast",
    customAmount: "Eigen bedrag",
    tip: "Fooi",
    subtotal: "Subtotaal",
    total: "Totaal",
    continue: "Doorgaan",
    proceedToPayment: "Naar betaling",
    back: "Terug",
    checkout: "Afrekenen",
    payWith: "Betalen met",
    choosePaymentMethod: "Kies een betaalmethode",
    applePay: "Apple Pay",
    googlePay: "Google Pay",
    applePayGooglePay: "Apple Pay / Google Pay",
    card: "Creditcard",
    debitCard: "Pinpas",
    creditCard: "Creditcard",
    payAtCounter: "Contant betalen aan de balie",
    payAtCounterDesc: "Personeel wordt op de hoogte gebracht",
    staffNotified: "Personeel is op de hoogte. Betaal aan de balie.",
    cardNumber: "Kaartnummer",
    expires: "MM / JJ",
    cvc: "CVC",
    yourName: "Jouw naam (optioneel)",
    processing: "Betaling verwerken...",
    paymentSuccess: "Betaling geslaagd",
    receiptTitle: "Digitale bon",
    thanks: "Bedankt voor je bezoek!",
    rateExperience: "Hoe was je ervaring?",
    postOnGoogle: "Plaats op Google Maps",
    done: "Klaar",
    language: "Taal",
    poweredBy: "Mogelijk gemaakt door Dongy | Splits. Betaal. Geniet samen.",
    loading: "Rekening laden...",
    noOpenBill: "Geen openstaande rekening voor deze tafel.",
    itemsSelected: "items geselecteerd",
  },
};
