"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, Printer, Search, Table2, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Tab } from "@/lib/modules";
import { btnGhost, btnPrimary, fmtMoney, inputClass, Label, Modal } from "./ui";

type Rec = Record<string, unknown> & { _id: string };
type Opt = { value: string; label: string };

const VAT = 1.27;
const MONTHS = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
const PAY_LABEL: Record<string, string> = { cash: "Készpénz", card: "Bankkártya", transfer: "Utalás", none: "—" };

const has = (v: unknown) => v !== "" && v !== null && v !== undefined;
const num = (v: unknown) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
const monthOf = (d: string) => d.slice(0, 7);
const curMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const fmtDate = (d: unknown) => String(d || "").replaceAll("-", ".");
const fmtInt = (n: number) => n.toLocaleString("hu-HU", { maximumFractionDigits: 0 }).replace(/\s/g, "\u00a0");
const ft = (n: number) => (n ? fmtMoney(Math.round(n)) : "- Ft");

function minutesBetween(a: unknown, b: unknown) {
  const re = /^(\d{1,2}):(\d{2})$/;
  const x = re.exec(String(a || "").trim());
  const y = re.exec(String(b || "").trim());
  if (!x || !y) return null;
  let diff = Number(y[1]) * 60 + Number(y[2]) - (Number(x[1]) * 60 + Number(x[2]));
  if (diff < 0) diff += 1440;
  return diff;
}
const fmtDuration = (min: number | null) => (min === null ? "—" : `${Math.floor(min / 60)} óra ${String(min % 60).padStart(2, "0")} perc`);

function calc(r: Rec) {
  const gross = num(r.grossFee);
  const net = Math.round(gross / VAT);
  const m = String(r.payMethod || "");
  const start = num(r.startKm);
  const end = num(r.endKm);
  return {
    gross,
    net,
    km: has(r.startKm) && has(r.endKm) && end >= start ? end - start : 0,
    cash: m === "cash" ? { net, gross } : { net: 0, gross: 0 },
    card: m === "card" ? { net, gross } : { net: 0, gross: 0 },
    transfer: m === "transfer" ? { net, gross } : { net: 0, gross: 0 },
    duration: minutesBetween(r.departure, r.arrival),
  };
}

type Col = {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  group?: "fee" | "foreign" | "gross";
  cell: (r: Rec, c: ReturnType<typeof calc>) => React.ReactNode;
  text?: (r: Rec, c: ReturnType<typeof calc>) => string;
  total?: (rows: { r: Rec; c: ReturnType<typeof calc> }[]) => React.ReactNode;
};

const sumBy = (rows: { r: Rec; c: ReturnType<typeof calc> }[], f: (x: { r: Rec; c: ReturnType<typeof calc> }) => number) => rows.reduce((s, x) => s + f(x), 0);
const str = (k: string) => (r: Rec) => String(r[k] ?? "");
const numCell = (k: string) => (r: Rec) => (!has(r[k]) ? "" : fmtInt(num(r[k])));

const COLS: Col[] = [
  { key: "date", label: "Dátum", width: 112, align: "center", cell: (r) => fmtDate(r.date), text: (r) => fmtDate(r.date) },
  { key: "from", label: "Indulási hely", width: 190, align: "center", cell: str("from"), text: str("from") },
  { key: "to", label: "Célállomás", width: 250, align: "center", cell: str("to"), text: str("to") },
  { key: "dom", label: "Belföldi", width: 80, align: "center", cell: (r) => (r.scope === "domestic" ? "x" : ""), text: (r) => (r.scope === "domestic" ? "x" : "") },
  { key: "for", label: "Külföldi", width: 80, align: "center", cell: (r) => (r.scope === "foreign" ? "x" : ""), text: (r) => (r.scope === "foreign" ? "x" : "") },
  { key: "departure", label: "Indulás", width: 80, align: "center", cell: str("departure"), text: str("departure") },
  { key: "arrival", label: "Érkezés", width: 80, align: "center", cell: str("arrival"), text: str("arrival") },
  { key: "startKm", label: "Kezdő km", width: 100, align: "right", cell: numCell("startKm"), text: numCell("startKm") },
  { key: "endKm", label: "Záró km", width: 100, align: "right", cell: numCell("endKm"), text: numCell("endKm") },
  { key: "km", label: "Megtett km", width: 100, align: "right", cell: (_r, c) => fmtInt(c.km), text: (_r, c) => String(c.km), total: (rows) => fmtInt(sumBy(rows, (x) => x.c.km)) },
  { key: "paxKm", label: "Utas km", width: 90, align: "right", cell: numCell("paxKm"), text: (r) => String(num(r.paxKm)), total: (rows) => fmtInt(sumBy(rows, (x) => num(x.r.paxKm))) },
  { key: "foreignFee", label: "Külföldi viteldíj", width: 120, align: "right", group: "foreign", cell: (r) => (num(r.foreignFee) ? fmtMoney(num(r.foreignFee)) : ""), text: (r) => String(num(r.foreignFee)), total: (rows) => ft(sumBy(rows, (x) => num(x.r.foreignFee))) },
  { key: "cashNet", label: "Készpénz (nettó)", width: 130, align: "right", cell: (_r, c) => ft(c.cash.net), text: (_r, c) => String(c.cash.net), total: (rows) => ft(sumBy(rows, (x) => x.c.cash.net)) },
  { key: "cashGross", label: "Készpénz (bruttó)", width: 130, align: "right", cell: (_r, c) => ft(c.cash.gross), text: (_r, c) => String(c.cash.gross), total: (rows) => ft(sumBy(rows, (x) => x.c.cash.gross)) },
  { key: "cardNet", label: "Bankkártya (nettó)", width: 135, align: "right", cell: (_r, c) => ft(c.card.net), text: (_r, c) => String(c.card.net), total: (rows) => ft(sumBy(rows, (x) => x.c.card.net)) },
  { key: "cardGross", label: "Bankkártya (bruttó)", width: 135, align: "right", cell: (_r, c) => ft(c.card.gross), text: (_r, c) => String(c.card.gross), total: (rows) => ft(sumBy(rows, (x) => x.c.card.gross)) },
  { key: "trNet", label: "Utalás (nettó)", width: 130, align: "right", cell: (_r, c) => ft(c.transfer.net), text: (_r, c) => String(c.transfer.net), total: (rows) => ft(sumBy(rows, (x) => x.c.transfer.net)) },
  { key: "trGross", label: "Utalás (bruttó)", width: 130, align: "right", cell: (_r, c) => ft(c.transfer.gross), text: (_r, c) => String(c.transfer.gross), total: (rows) => ft(sumBy(rows, (x) => x.c.transfer.gross)) },
  { key: "feeNet", label: "Viteldíj (nettó)", width: 130, align: "right", group: "fee", cell: (_r, c) => ft(c.net), text: (_r, c) => String(c.net), total: (rows) => ft(sumBy(rows, (x) => x.c.net)) },
  { key: "feeGross", label: "Viteldíj (bruttó)", width: 130, align: "right", group: "gross", cell: (_r, c) => ft(c.gross), text: (_r, c) => String(c.gross), total: (rows) => ft(sumBy(rows, (x) => x.c.gross)) },
  { key: "rate", label: "Viteldíj/km", width: 100, align: "right", cell: (r) => ft(num(r.ratePerKm)), text: (r) => String(num(r.ratePerKm)) },
  { key: "passengers", label: "Utasok száma", width: 90, align: "center", cell: (r) => (!has(r.passengers) ? "" : String(num(r.passengers))), text: (r) => String(num(r.passengers)), total: (rows) => String(sumBy(rows, (x) => num(x.r.passengers))) },
  { key: "duration", label: "Készenlét/vezetés ideje", width: 170, align: "center", cell: (_r, c) => fmtDuration(c.duration), text: (_r, c) => fmtDuration(c.duration), total: (rows) => fmtDuration(sumBy(rows, (x) => x.c.duration ?? 0)) },
  { key: "transferTime", label: "Transzfer időigénye", width: 130, align: "center", cell: str("transferTime"), text: str("transferTime") },
  { key: "driver", label: "Sofőr neve", width: 160, align: "center", cell: str("driver"), text: str("driver") },
  { key: "plates", label: "Autó rendszáma", width: 130, align: "center", cell: str("plates"), text: str("plates") },
  { key: "company", label: "Cég", width: 210, align: "center", cell: str("company"), text: str("company") },
];

function csvEscape(v: string) {
  return /[";\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

export default function MonthlyClient({ tab }: { tab: Tab }) {
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(curMonth());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "preview">("preview");
  const [autoMonth, setAutoMonth] = useState(true);
  const [editing, setEditing] = useState<Rec | "new" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refOptions, setRefOptions] = useState<Record<string, Opt[]>>({});
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/records/${tab.key}`)
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        if (!cancelled) {
          setRecords(j.records); setError("");
          const months = (j.records as Rec[]).map((r) => monthOf(String(r.date || ""))).filter(Boolean).sort();
          if (autoMonth && months.length && !months.includes(curMonth())) setMonth(months[months.length - 1]);
          setAutoMonth(false);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Hiba"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.key, reloadKey]);

  useEffect(() => {
    (["vehicles", "drivers"] as const).forEach((k) =>
      fetch(`/api/lookup/${k}`).then((r) => r.json()).then((j) => setRefOptions((o) => ({ ...o, [k]: j.options || [] }))).catch(() => undefined)
    );
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => monthOf(String(r.date || "")) === month)
      .filter((r) => !q || tab.fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(q)))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.departure || "").localeCompare(String(b.departure || "")))
      .map((r) => ({ r, c: calc(r) }));
  }, [records, month, search, tab.fields]);

  const companies = useMemo(() => Array.from(new Set(records.map((r) => String(r.company || "")).filter(Boolean))).sort(), [records]);

  const totals = useMemo(() => ({
    km: sumBy(rows, (x) => x.c.km),
    gross: sumBy(rows, (x) => x.c.gross),
    cash: sumBy(rows, (x) => x.c.cash.gross),
    card: sumBy(rows, (x) => x.c.card.gross),
    transfer: sumBy(rows, (x) => x.c.transfer.gross),
    pax: sumBy(rows, (x) => num(x.r.passengers)),
  }), [rows]);

  const [y, mo] = month.split("-").map(Number);

  async function remove(r: Rec) {
    if (!confirm("Biztosan törlöd ezt a fuvart?")) return;
    const res = await fetch(`/api/records/${tab.key}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r._id }) });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  function exportCsv() {
    const lines = [COLS.map((c) => csvEscape(c.label)).join(";")];
    rows.forEach(({ r, c }) => lines.push(COLS.map((col) => csvEscape(col.text ? col.text(r, c) : "")).join(";")));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `havi-kimutatas-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stat = (label: string, value: string, primary = false) => (
    <div className={clsx("rounded-2xl px-5 py-3.5 shadow-sm", primary ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "border border-white bg-white/70 backdrop-blur")}>
      <div className={clsx("font-mono text-[10px] font-bold uppercase tracking-widest", primary ? "text-blue-100" : "text-slate-400")}>{label}</div>
      <div className={clsx("mt-1 text-lg font-semibold tabular-nums tracking-tight", primary ? "text-white" : "text-slate-900")}>{value}</div>
    </div>
  );

  return (
    <div className="monthly-root">
      <style>{`@media print{body *{visibility:hidden}.print-area,.print-area *{visibility:visible}.print-area{position:absolute;left:0;top:0;width:100%;overflow:visible!important;border:0!important;box-shadow:none!important}@page{size:A3 landscape;margin:8mm}}`}</style>

      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-white bg-white/70 p-1 shadow-sm backdrop-blur">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Előző hónap"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-[170px] px-2 text-center">
            <div className="text-sm font-semibold tracking-tight text-slate-900">{y}. {MONTHS[mo - 1]}</div>
          </div>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Következő hónap"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={`${inputClass} !w-auto`} />
        <button onClick={() => setMonth(curMonth())} className={btnGhost}>Ez a hónap</button>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-10`} placeholder="Keresés (hely, sofőr, rendszám, cég…)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="inline-flex gap-1 rounded-2xl border border-white bg-white/70 p-1 shadow-sm backdrop-blur">
          {([["table", "Táblázat", Table2], ["preview", "Előnézet", Eye]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setView(k)} className={clsx("inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition", view === k ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <button className={btnGhost} onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</button>
        <button className={btnGhost} onClick={() => window.print()} disabled={!rows.length}><Printer className="h-4 w-4" /> Nyomtatás</button>
        <button className={btnPrimary} onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Új fuvar</button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 print:hidden">
        {stat("Fuvarok", String(rows.length))}
        {stat("Megtett km", `${fmtInt(totals.km)} km`)}
        {stat("Utasok", String(totals.pax))}
        {stat("Készpénz", fmtMoney(totals.cash))}
        {stat("Bankkártya", fmtMoney(totals.card))}
        {stat("Utalás", fmtMoney(totals.transfer))}
        {stat("Bruttó összesen", fmtMoney(totals.gross), true)}
      </div>

      {error && <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 print:hidden">{error}</p>}

      {view === "table" ? (
        <div className="overflow-x-auto rounded-[2rem] border border-white bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl print:hidden">
          <table className="w-full min-w-[1500px] text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-white/60 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr>
                {[
                  "Dátum", "Útvonal", "Típus", "Idő", "Megtett km", "Fizetés", "Bruttó viteldíj", "Utasok", "Készenlét/vezetés", "Sofőr", "Rendszám", "Cég",
                ].map((h, i) => <th key={h} className={clsx("whitespace-nowrap px-4 py-3.5 font-black", [4, 6].includes(i) && "text-right")}>{h}</th>)}
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={13} className="px-4 py-14 text-center text-sm font-semibold text-slate-400">Betöltés…</td></tr>}
              {!loading && !rows.length && (
                <tr><td colSpan={13} className="px-4 py-14 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></div>
                  <p className="text-sm font-bold text-slate-600">Ebben a hónapban nincs fuvar</p>
                  <p className="mt-1 text-xs text-slate-400">Adj hozzá új fuvart, vagy válassz másik hónapot.</p>
                </td></tr>
              )}
              {!loading && rows.map(({ r, c }) => (
                <tr key={r._id} className="transition hover:bg-blue-50/50">
                  <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    <div className="flex items-center gap-2"><span>{String(r.from)}</span><span className="text-blue-500">→</span><span>{String(r.to)}</span></div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={clsx("rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest", r.scope === "foreign" ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700")}>{r.scope === "foreign" ? "Külföldi" : "Belföldi"}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-slate-600">{String(r.departure || "—")} – {String(r.arrival || "—")}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-slate-600">{c.km ? `${fmtInt(c.km)} km` : "—"}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-600">{PAY_LABEL[String(r.payMethod)] || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">{c.gross ? fmtMoney(c.gross) : "—"}</td>
                  <td className="px-4 py-3.5 font-medium tabular-nums text-slate-600">{!has(r.passengers) ? "—" : String(num(r.passengers))}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-600">{fmtDuration(c.duration)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-700">{String(r.driver || "—")}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{String(r.plates || "—")}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-600">{String(r.company || "—")}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button onClick={() => setEditing(r)} className="mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Szerkesztés"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Törlés"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot className="border-t-2 border-blue-100 bg-blue-50/60 text-[13px] font-bold text-slate-900">
                <tr>
                  <td className="px-4 py-3.5" colSpan={4}>Összesen ({rows.length} fuvar)</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{fmtInt(totals.km)} km</td>
                  <td />
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-blue-700">{fmtMoney(totals.gross)}</td>
                  <td className="px-4 py-3.5 tabular-nums">{totals.pax}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">{fmtDuration(sumBy(rows, (x) => x.c.duration ?? 0))}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <Preview rows={rows} title={`${y}. ${MONTHS[mo - 1]} – havi kimutatás`} loading={loading} />
      )}

      {editing && (
        <TripForm
          tab={tab}
          record={editing === "new" ? null : editing}
          defaultDate={month === curMonth() ? new Date().toISOString().slice(0, 10) : `${month}-01`}
          refOptions={refOptions}
          companies={companies}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

const GROUPS: { label: string; keys: string[]; tone: string }[] = [
  { label: "Útvonal és idő", keys: ["date", "from", "to", "dom", "for", "departure", "arrival"], tone: "text-blue-700" },
  { label: "Kilométerek", keys: ["startKm", "endKm", "km", "paxKm"], tone: "text-slate-600" },
  { label: "Fizetés módja szerint", keys: ["foreignFee", "cashNet", "cashGross", "cardNet", "cardGross", "trNet", "trGross"], tone: "text-emerald-700" },
  { label: "Viteldíj", keys: ["feeNet", "feeGross", "rate"], tone: "text-blue-700" },
  { label: "Részletek", keys: ["passengers", "duration", "transferTime", "driver", "plates", "company"], tone: "text-slate-600" },
];
const colByKey = Object.fromEntries(COLS.map((c) => [c.key, c]));

function Preview({ rows, title, loading }: { rows: { r: Rec; c: ReturnType<typeof calc> }[]; title: string; loading: boolean }) {
  const width = COLS.reduce((s, c) => s + c.width, 0);
  const total = rows.reduce((s, x) => s + x.c.gross, 0);
  const km = rows.reduce((s, x) => s + x.c.km, 0);
  const groupStart = new Set(GROUPS.map((g) => g.keys[0]));
  const money = new Set(["foreignFee", "cashNet", "cashGross", "cardNet", "cardGross", "trNet", "trGross", "feeNet", "feeGross", "rate"]);

  const body = (col: Col, r: Rec, c: ReturnType<typeof calc>) => {
    const val = col.cell(r, c);
    if (money.has(col.key) && val === "- Ft") return <span className="text-slate-300">–</span>;
    if (col.key === "dom" || col.key === "for") return val ? <span className={clsx("inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", col.key === "dom" ? "bg-blue-100 text-blue-700" : "bg-[#FFD700]/30 text-amber-800")}>✓</span> : null;
    if (col.key === "feeGross") return <span className="font-semibold text-blue-700">{val}</span>;
    if (col.key === "cashGross" || col.key === "cardGross" || col.key === "trGross") return <span className="font-semibold text-slate-900">{val}</span>;
    if (col.key === "plates") return <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-slate-700">{val}</span>;
    if (col.key === "company") return <span className="rounded-full border border-blue-100 bg-blue-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">{val}</span>;
    if (col.key === "date") return <span className="font-semibold text-slate-900">{val}</span>;
    if (col.key === "from" || col.key === "to") return <span className={col.key === "from" ? "font-semibold text-slate-900" : "text-slate-600"}>{val}</span>;
    return val;
  };

  return (
    <div className="print-area overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_60px_-20px_rgba(37,99,235,0.18)]">
      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-[#f4f8ff] via-white to-white px-8 py-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-blue-600" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-blue-600">PannonTransfer · Pénzügy</span>
            </div>
            <h2 className="mt-3 text-3xl font-light tracking-tighter text-slate-900">
              <span className="relative font-semibold">{title}<span className="absolute bottom-0.5 left-0 -z-10 h-2.5 w-full bg-[#FFD700]/70 mix-blend-multiply" /></span>
            </h2>
          </div>
          <div className="flex gap-8">
            {[["Fuvar", String(rows.length)], ["Megtett km", `${fmtInt(km)} km`], ["Bruttó összesen", fmtMoney(total)]].map(([l, v], i) => (
              <div key={l} className="text-right">
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400">{l}</div>
                <div className={clsx("mt-1 text-2xl font-semibold tabular-nums tracking-tight", i === 2 ? "text-blue-600" : "text-slate-900")}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-[12.5px] text-slate-700" style={{ width, minWidth: width, tableLayout: "fixed" }}>
          <colgroup>{COLS.map((c) => <col key={c.key} style={{ width: c.width }} />)}</colgroup>
          <thead>
            <tr className="bg-white">
              {GROUPS.map((g) => (
                <th key={g.label} colSpan={g.keys.length} className={clsx("border-l border-slate-100 px-4 pb-2 pt-4 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] first:border-l-0", g.tone)}>{g.label}</th>
              ))}
            </tr>
            <tr className="bg-slate-50/80">
              {COLS.map((c) => (
                <th key={c.key} className={clsx("border-y border-slate-200 px-3 py-3 font-mono text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-500", groupStart.has(c.key) && "border-l border-l-slate-100")} style={{ textAlign: c.align }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={COLS.length} className="py-14 text-center text-sm font-semibold text-slate-400">Betöltés…</td></tr>}
            {!loading && !rows.length && <tr><td colSpan={COLS.length} className="py-14 text-center text-sm font-semibold text-slate-400">Ebben a hónapban nincs fuvar.</td></tr>}
            {!loading && rows.map(({ r, c }, i) => (
              <tr key={r._id} className={clsx("transition hover:bg-blue-50/60", i % 2 === 1 && "bg-slate-50/50")}>
                {COLS.map((col) => (
                  <td key={col.key} className={clsx("whitespace-nowrap border-b border-slate-100 px-3 py-3 tabular-nums", groupStart.has(col.key) && "border-l border-l-slate-100", col.key === "feeGross" && "bg-blue-50/50")} style={{ textAlign: col.align }}>
                    {body(col, r, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="bg-blue-600 font-semibold text-white">
                {COLS.map((col, i) => (
                  <td key={col.key} className="whitespace-nowrap px-3 py-3.5 tabular-nums" style={{ textAlign: col.align }}>
                    {i === 0 ? <span className="font-mono text-[10px] uppercase tracking-widest">Összesen</span> : colByKey[col.key].total ? colByKey[col.key].total!(rows) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="flex justify-between border-t border-slate-100 px-8 py-3 font-mono text-[9px] uppercase tracking-widest text-slate-400">
        <span>Nettó = bruttó / 1,27 (27% ÁFA)</span>
        <span>PannonTransfer Magic · Pénzügy</span>
      </div>
    </div>
  );
}

function TripForm({ tab, record, defaultDate, refOptions, companies, onClose, onSaved }: {
  tab: Tab;
  record: Rec | null;
  defaultDate: string;
  refOptions: Record<string, Opt[]>;
  companies: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    tab.fields.forEach((f) => { init[f.key] = record ? record[f.key] ?? "" : f.key === "date" ? defaultDate : f.defaultValue ?? ""; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));
  const v = (k: string) => String(values[k] ?? "");

  const km = has(values.startKm) && has(values.endKm) ? num(values.endKm) - num(values.startKm) : null;
  const gross = num(values.grossFee);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (km !== null && km < 0) return setError("A záró km nem lehet kisebb a kezdő km-nél.");
    setSaving(true);
    setError("");
    const res = await fetch(`/api/records/${tab.key}`, {
      method: record ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record ? { id: record._id, ...values } : values),
    });
    if (res.ok) return onSaved();
    setError((await res.json().catch(() => ({}))).error || "Hiba a mentéskor.");
    setSaving(false);
  }

  const input = (k: string, label: string, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label>{label}</Label>
      <input className={inputClass} type={type} step={type === "number" ? "any" : undefined} value={v(k)} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  );
  const section = (t: string) => <div className="col-span-full mt-2 border-b border-slate-100 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-blue-600">{t}</div>;

  return (
    <Modal title={`${record ? "Fuvar szerkesztése" : "Új fuvar"}`} subtitle="Havi kimutatás tétel" onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        {section("Útvonal")}
        {input("date", "Dátum *", "date", { required: true })}
        <div>
          <Label>Belföldi / külföldi</Label>
          <select className={inputClass} value={v("scope")} onChange={(e) => set("scope", e.target.value)}>
            <option value="domestic">Belföldi</option>
            <option value="foreign">Külföldi</option>
          </select>
        </div>
        <div className="col-span-full">{input("from", "Indulási hely *", "text", { required: true })}</div>
        <div className="col-span-full">{input("to", "Célállomás *", "text", { required: true })}</div>
        {input("departure", "Indulás (ÓÓ:PP)", "text", { placeholder: "5:00", pattern: "\\d{1,2}:\\d{2}" })}
        {input("arrival", "Érkezés (ÓÓ:PP)", "text", { placeholder: "8:30", pattern: "\\d{1,2}:\\d{2}" })}

        {section("Kilométerek")}
        {input("startKm", "Kezdő km", "number")}
        {input("endKm", "Záró km", "number")}
        {input("paxKm", "Utas km", "number")}
        <div>
          <Label>Megtett km (automatikus)</Label>
          <div className={`${inputClass} !bg-slate-50 tabular-nums`}>{km !== null && km >= 0 ? fmtInt(km) : "—"}</div>
        </div>

        {section("Díjak")}
        <div>
          <Label>Fizetési mód</Label>
          <select className={inputClass} value={v("payMethod")} onChange={(e) => set("payMethod", e.target.value)}>
            <option value="cash">Készpénz</option>
            <option value="card">Bankkártya</option>
            <option value="transfer">Utalás</option>
            <option value="none">Nincs díj</option>
          </select>
        </div>
        {input("grossFee", "Viteldíj bruttó (Ft)", "number")}
        <div>
          <Label>Viteldíj nettó (27% ÁFA)</Label>
          <div className={`${inputClass} !bg-slate-50 tabular-nums`}>{gross ? fmtMoney(Math.round(gross / VAT)) : "—"}</div>
        </div>
        {input("ratePerKm", "Viteldíj/km (Ft)", "number")}
        {input("foreignFee", "Külföldi viteldíj (Ft)", "number")}

        {section("Egyéb adatok")}
        {input("passengers", "Utasok száma", "number")}
        {input("transferTime", "Transzfer időigénye")}
        <div>
          <Label>Sofőr neve</Label>
          <input className={inputClass} list="m-drivers" value={v("driver")} onChange={(e) => set("driver", e.target.value)} />
          <datalist id="m-drivers">{(refOptions.drivers || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</datalist>
        </div>
        <div>
          <Label>Autó rendszáma</Label>
          <input className={inputClass} list="m-plates" value={v("plates")} onChange={(e) => set("plates", e.target.value)} />
          <datalist id="m-plates">{(refOptions.vehicles || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</datalist>
        </div>
        <div className="col-span-full">
          <Label>Cég</Label>
          <input className={inputClass} list="m-companies" value={v("company")} onChange={(e) => set("company", e.target.value)} />
          <datalist id="m-companies">{companies.map((c) => <option key={c} value={c} />)}</datalist>
        </div>

        {error && <p className="col-span-full rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <div className="col-span-full flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Mégse</button>
          <button className={btnPrimary} disabled={saving}>{saving ? "Mentés…" : "Mentés"}</button>
        </div>
      </form>
    </Modal>
  );
}
