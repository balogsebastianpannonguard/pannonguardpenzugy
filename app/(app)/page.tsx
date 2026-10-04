import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, CreditCard, FileSignature, Fuel, Landmark, Receipt, Wallet } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";
import { CASH_COLLECTIONS } from "@/lib/modules";
import { Eyebrow, fmtMoney } from "@/components/ui";

export const dynamic = "force-dynamic";

async function load() {
  const db = await getMongoDb();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const cashBalance = async (currency: string) => {
    const mv = await db.collection(CASH_COLLECTIONS.movements).find({ currency }).toArray();
    const sign: Record<string, number> = { income: 1, exchange_in: 1, expense: -1, exchange_out: -1 };
    return mv.reduce((s, m) => s + (m.type === "adjustment" ? m.amount : (sign[m.type] ?? 0) * m.amount), 0);
  };
  const [expiringContracts, expiringOffers, unmatched, openInvoices, pendingCards, huf, ron, fuelMonth, capturedMonth, openCash] = await Promise.all([
    db.collection("fin_contracts").countDocuments({ status: "active", validTo: { $gte: today, $lte: in30 } }),
    db.collection("fin_offers").countDocuments({ status: "sent", validTo: { $gte: today, $lte: in30 } }),
    db.collection("fin_bank_transfers").countDocuments({ status: "unmatched" }),
    db.collection("fin_invoices").countDocuments({ status: { $in: ["open", "overdue"] } }),
    db.collection("fin_card_transactions").countDocuments({ status: { $in: ["pending", "authorized"] } }),
    cashBalance("HUF"),
    cashBalance("RON"),
    db.collection("fin_fuel_records").aggregate([{ $match: { date: { $gte: today.slice(0, 7) + "-01" } } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]).toArray(),
    db.collection("fin_card_transactions").aggregate([{ $match: { status: "captured", createdDate: { $gte: today.slice(0, 7) + "-01" } } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]).toArray(),
    db.collection(CASH_COLLECTIONS.movements).countDocuments({ closingId: { $exists: false } }),
  ]);
  return {
    expiringContracts, expiringOffers, unmatched, openInvoices, pendingCards,
    huf, ron, fuel: fuelMonth[0]?.sum ?? 0, captured: capturedMonth[0]?.sum ?? 0, openCash,
  };
}

const TODAY_LABEL = new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

export default async function Dashboard() {
  const [d, user] = await Promise.all([load(), getCurrentSession()]);

  const balances = [
    { href: "/hazipenztar", label: "Házipénztár (HUF)", value: fmtMoney(d.huf), icon: Wallet, accent: "" },
    { href: "/hazipenztar-ron", label: "RON pénztár", value: fmtMoney(d.ron, "RON"), icon: Banknote, accent: "" },
    { href: "/bankkartya", label: "Kártyás bevétel (e havi)", value: fmtMoney(d.captured), icon: CreditCard, accent: "" },
    { href: "/uzemanyag", label: "Üzemanyag (e havi)", value: fmtMoney(d.fuel), icon: Fuel, accent: "" },
  ];

  const tasks = [
    { href: "/szerzodesek", label: "Lejáró szerződés", value: d.expiringContracts, hint: "30 napon belül", icon: FileSignature, warn: d.expiringContracts > 0 },
    { href: "/szerzodesek", label: "Lejáró ajánlat", value: d.expiringOffers, hint: "hamarosan", icon: Receipt, warn: d.expiringOffers > 0 },
    { href: "/banki-utalasok", label: "Egyeztetetlen utalás", value: d.unmatched, hint: "párosításra vár", icon: Landmark, warn: d.unmatched > 0 },
    { href: "/banki-utalasok", label: "Nyitott számla", value: d.openInvoices, hint: "fizetésre vár", icon: Receipt, warn: false },
    { href: "/bankkartya", label: "Függő tranzakció", value: d.pendingCards, hint: "feldolgozás alatt", icon: CreditCard, warn: d.pendingCards > 0 },
  ];

  const firstName = (user?.name || "").split(/\s+/)[0] || "";

  return (
    <div className="mx-auto max-w-6xl animate-[rise_0.5s_cubic-bezier(0.16,1,0.3,1)]">
      <header className="mb-14 flex flex-col items-start justify-between gap-8 xl:flex-row xl:items-end">
        <div>
          <Eyebrow>{TODAY_LABEL}</Eyebrow>
          <h1 className="mt-6 text-5xl font-light leading-[1.1] tracking-tighter text-slate-900 sm:text-6xl">
            Üdv, <span className="relative inline-block font-semibold text-blue-600">{firstName || "kolléga"}.
              <span className="absolute bottom-1 left-0 -z-10 h-3 w-full bg-[#FFD700] mix-blend-multiply" />
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-slate-500">Egyenlegek, teendők és határidők – a PannonTransfer Magic pénzügyi áttekintése egy helyen.</p>
        </div>
        {d.openCash > 0 && (
          <Link href="/hazipenztar" className="group flex items-center gap-3 rounded-[1.5rem] border border-[#FFD700]/60 bg-[#FFD700]/15 px-5 py-4 text-sm font-semibold text-amber-900 shadow-sm backdrop-blur transition hover:bg-[#FFD700]/25">
            <AlertTriangle className="h-5 w-5" />
            {d.openCash} lezáratlan készpénzmozgás
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </header>

      <SectionTitle n="01">Egyenlegek és bevételek</SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((c) => (
          <Link key={c.label} href={c.href} className="group relative overflow-hidden rounded-[2rem] border border-white bg-white/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.18)]">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30"><c.icon className="h-5 w-5" /></span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600" />
            </div>
            <div className="mt-8 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{c.value}</div>
          </Link>
        ))}
      </div>

      <SectionTitle n="02">Teendők és határidők</SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((t) => (
          <Link key={t.label} href={t.href} className="group flex items-center gap-4 rounded-[2rem] border border-white bg-white/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.18)]">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${t.warn ? "bg-[#FFD700]/25 text-amber-700" : "bg-slate-100 text-slate-400"}`}><t.icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{t.label}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{t.hint}</div>
            </div>
            <div className={`text-4xl font-light tabular-nums tracking-tighter ${t.warn ? "text-blue-600" : "text-slate-300"}`}>{t.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 mt-14 flex items-center gap-4">
      <span className="font-mono text-xs font-bold text-[#c9a400]">{n}</span>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}
