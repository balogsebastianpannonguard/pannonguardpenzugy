export type FieldType = "text" | "number" | "money" | "date" | "select" | "textarea" | "file" | "ref";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string; tone?: Tone }[];
  ref?: "vehicles" | "drivers";
  defaultValue?: string | number;
  hideInList?: boolean;
  currency?: string;
}

export type Tone = "slate" | "emerald" | "amber" | "rose" | "blue" | "violet";

export interface Tab {
  key: string; // egyben a Mongo kollekció neve (előtag: fin_)
  label: string;
  singular: string;
  fields: Field[];
  statusField?: string;
  expiryField?: string; // lejárat-figyelmeztetés
  sumField?: string; // összesítő mező
  sumLabel?: string;
  sortField?: string;
  sumWhen?: { field: string; values: string[] }; // összesítés csak ezekre a státuszokra
  consumption?: boolean; // l/100km számítás rendszám szerint
}

export interface ModuleDef {
  slug: string;
  title: string;
  description: string;
  icon: string;
  kind: "records" | "cash";
  currency?: "HUF" | "RON";
  tabs: Tab[];
}

const opt = (items: [string, string, Tone?][]) => items.map(([value, label, tone]) => ({ value, label, tone }));

export const MODULES: ModuleDef[] = [
  {
    slug: "szerzodesek",
    title: "Szerződés- és ajánlatkezelő",
    description: "Partneri, vállalati és B2B szerződések, ajánlatok, ügyféltarifák és érvényességi idők.",
    icon: "FileSignature",
    kind: "records",
    tabs: [
      {
        key: "fin_contracts",
        label: "Szerződések",
        singular: "szerződés",
        statusField: "status",
        expiryField: "validTo",
        sortField: "validTo",
        fields: [
          { key: "number", label: "Szerződésszám", type: "text", required: true },
          { key: "partner", label: "Partner / ügyfél", type: "text", required: true },
          { key: "type", label: "Típus", type: "select", defaultValue: "partner", options: opt([["partner", "Partneri"], ["corporate", "Vállalati"], ["b2b", "B2B"], ["other", "Egyéb"]]) },
          { key: "status", label: "Státusz", type: "select", defaultValue: "active", options: opt([["draft", "Tervezet", "slate"], ["active", "Aktív", "emerald"], ["expired", "Lejárt", "rose"], ["terminated", "Felmondva", "amber"]]) },
          { key: "validFrom", label: "Érvényesség kezdete", type: "date" },
          { key: "validTo", label: "Érvényesség vége", type: "date" },
          { key: "tariff", label: "Egyedi ügyféltarifa", type: "textarea", hideInList: true },
          { key: "terms", label: "Szerződéses feltételek", type: "textarea", hideInList: true },
          { key: "document", label: "Dokumentum (PDF/kép)", type: "file", hideInList: true },
        ],
      },
      {
        key: "fin_offers",
        label: "Ajánlatok",
        singular: "ajánlat",
        statusField: "status",
        expiryField: "validTo",
        sumField: "amount",
        sumLabel: "Ajánlatok összértéke",
        sortField: "validTo",
        fields: [
          { key: "number", label: "Ajánlatszám", type: "text", required: true },
          { key: "client", label: "Ügyfél", type: "text", required: true },
          { key: "amount", label: "Összeg", type: "money", currency: "Ft" },
          { key: "status", label: "Státusz", type: "select", defaultValue: "sent", options: opt([["draft", "Tervezet", "slate"], ["sent", "Kiküldve", "blue"], ["accepted", "Elfogadva", "emerald"], ["rejected", "Elutasítva", "rose"], ["expired", "Lejárt", "amber"]]) },
          { key: "issuedAt", label: "Kiadás dátuma", type: "date" },
          { key: "validTo", label: "Érvényes eddig", type: "date" },
          { key: "description", label: "Leírás / tarifa", type: "textarea", hideInList: true },
          { key: "document", label: "Dokumentum", type: "file", hideInList: true },
        ],
      },
    ],
  },
  {
    slug: "banki-utalasok",
    title: "Banki utalások és elszámolások",
    description: "Átutalásos partnerek, számlák, bejövő utalások követése és egyeztetése.",
    icon: "Landmark",
    kind: "records",
    tabs: [
      {
        key: "fin_bank_transfers",
        label: "Bejövő utalások",
        singular: "utalás",
        statusField: "status",
        sumField: "amount",
        sumLabel: "Utalások összege",
        sortField: "date",
        fields: [
          { key: "date", label: "Könyvelés dátuma", type: "date", required: true },
          { key: "payer", label: "Utaló fél", type: "text", required: true },
          { key: "amount", label: "Összeg", type: "money", required: true, currency: "Ft" },
          { key: "reference", label: "Közlemény / hivatkozás", type: "text" },
          { key: "invoiceNumber", label: "Egyeztetett számla", type: "text" },
          { key: "status", label: "Egyeztetés", type: "select", defaultValue: "unmatched", options: opt([["unmatched", "Egyeztetlen", "amber"], ["matched", "Egyeztetve", "emerald"], ["disputed", "Vitatott", "rose"]]) },
          { key: "note", label: "Megjegyzés", type: "textarea", hideInList: true },
        ],
      },
      {
        key: "fin_invoices",
        label: "Számlák",
        singular: "számla",
        statusField: "status",
        expiryField: "dueDate",
        sumField: "amount",
        sumLabel: "Számlák összege",
        sortField: "dueDate",
        fields: [
          { key: "number", label: "Számlaszám", type: "text", required: true },
          { key: "partner", label: "Partner", type: "text", required: true },
          { key: "amount", label: "Összeg", type: "money", required: true, currency: "Ft" },
          { key: "issueDate", label: "Kiállítás", type: "date" },
          { key: "dueDate", label: "Fizetési határidő", type: "date" },
          { key: "status", label: "Státusz", type: "select", defaultValue: "open", options: opt([["open", "Nyitott", "amber"], ["paid", "Kifizetve", "emerald"], ["overdue", "Késedelmes", "rose"], ["cancelled", "Sztornó", "slate"]]) },
          { key: "document", label: "Számla (PDF/kép)", type: "file", hideInList: true },
        ],
      },
      {
        key: "fin_bank_partners",
        label: "Fizetési partnerek",
        singular: "partner",
        fields: [
          { key: "name", label: "Partner neve", type: "text", required: true },
          { key: "taxNumber", label: "Adószám", type: "text" },
          { key: "bankAccount", label: "Bankszámlaszám", type: "text" },
          { key: "paymentDeadlineDays", label: "Fizetési határidő (nap)", type: "number", defaultValue: 8 },
          { key: "contact", label: "Kapcsolattartó", type: "text" },
          { key: "note", label: "Megjegyzés", type: "textarea", hideInList: true },
        ],
      },
    ],
  },
  {
    slug: "bankkartya",
    title: "Online bankkártyás fizetések",
    description: "Weboldali és digitális csatornás kártyás tranzakciók követése és státuszkezelése.",
    icon: "CreditCard",
    kind: "records",
    tabs: [
      {
        key: "fin_card_transactions",
        label: "Tranzakciók",
        singular: "tranzakció",
        statusField: "status",
        sumField: "amount",
        sumLabel: "Terhelt tranzakciók összege",
        sumWhen: { field: "status", values: ["captured"] },
        sortField: "createdDate",
        fields: [
          { key: "createdDate", label: "Dátum", type: "date", required: true },
          { key: "transactionId", label: "Tranzakció azonosító", type: "text", required: true },
          { key: "bookingCode", label: "Foglalási kód", type: "text" },
          { key: "customer", label: "Ügyfél", type: "text" },
          { key: "amount", label: "Összeg", type: "money", required: true, currency: "Ft" },
          { key: "channel", label: "Csatorna", type: "select", defaultValue: "web", options: opt([["web", "Weboldal"], ["app", "Mobil app"], ["link", "Fizetési link"], ["other", "Egyéb"]]) },
          { key: "status", label: "Státusz", type: "select", defaultValue: "pending", options: opt([["pending", "Függőben", "amber"], ["authorized", "Engedélyezve", "blue"], ["captured", "Terhelve", "emerald"], ["failed", "Sikertelen", "rose"], ["refunded", "Visszatérítve", "violet"]]) },
          { key: "note", label: "Megjegyzés", type: "textarea", hideInList: true },
        ],
      },
    ],
  },
  {
    slug: "hazipenztar",
    title: "Házipénztár és napi zárás",
    description: "Készpénzmozgások (HUF), egyenleg és napi/időszakos pénztárzárás.",
    icon: "Wallet",
    kind: "cash",
    currency: "HUF",
    tabs: [],
  },
  {
    slug: "hazipenztar-ron",
    title: "RON házipénztár",
    description: "Román lejben (RON) vezetett, elkülönített készpénzforgalom: bevétel, kiadás, váltás.",
    icon: "Coins",
    kind: "cash",
    currency: "RON",
    tabs: [],
  },
  {
    slug: "uzemanyag",
    title: "Üzemanyag- és tankolás-nyilvántartó",
    description: "Tankolások, bizonylatok feltöltése, rendszám és sofőr szerinti fogyasztás, üzemanyagkártya keretek.",
    icon: "Fuel",
    kind: "records",
    tabs: [
      {
        key: "fin_fuel_records",
        label: "Tankolások",
        singular: "tankolás",
        sumField: "amount",
        sumLabel: "Üzemanyag költség",
        consumption: true,
        sortField: "date",
        fields: [
          { key: "date", label: "Dátum", type: "date", required: true },
          { key: "plates", label: "Jármű (rendszám)", type: "ref", ref: "vehicles", required: true },
          { key: "driver", label: "Sofőr", type: "ref", ref: "drivers" },
          { key: "liters", label: "Liter", type: "number", required: true },
          { key: "amount", label: "Összeg", type: "money", required: true, currency: "Ft" },
          { key: "odometer", label: "Km óra állás", type: "number" },
          { key: "fuelType", label: "Üzemanyag", type: "select", defaultValue: "diesel", options: opt([["diesel", "Dízel"], ["petrol", "Benzin"], ["lpg", "LPG"], ["other", "Egyéb"]]) },
          { key: "card", label: "Üzemanyagkártya", type: "text" },
          { key: "receipt", label: "Blokk / számla", type: "file", hideInList: true },
          { key: "note", label: "Megjegyzés", type: "textarea", hideInList: true },
        ],
      },
      {
        key: "fin_fuel_cards",
        label: "Üzemanyagkártyák",
        singular: "kártya",
        statusField: "status",
        sumField: "limit",
        sumLabel: "Összes keret",
        fields: [
          { key: "cardNumber", label: "Kártyaszám", type: "text", required: true },
          { key: "provider", label: "Szolgáltató", type: "text" },
          { key: "plates", label: "Jármű (rendszám)", type: "ref", ref: "vehicles" },
          { key: "limit", label: "Havi keret", type: "money", currency: "Ft" },
          { key: "status", label: "Státusz", type: "select", defaultValue: "active", options: opt([["active", "Aktív", "emerald"], ["blocked", "Tiltva", "rose"], ["expired", "Lejárt", "amber"]]) },
          { key: "validTo", label: "Érvényes eddig", type: "date" },
        ],
        expiryField: "validTo",
      },
    ],
  },
];

export function getModule(slug: string) {
  return MODULES.find((m) => m.slug === slug);
}

export const ALL_TABS: Tab[] = MODULES.flatMap((m) => m.tabs);
export function getTab(key: string) {
  return ALL_TABS.find((t) => t.key === key);
}

export const CASH_COLLECTIONS = { movements: "fin_cash_movements", closings: "fin_cash_closings" } as const;
