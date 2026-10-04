"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Badge, btnGhost, btnPrimary, fmtMoney, inputClass, Label, Modal } from "./ui";
import type { Tone } from "@/lib/modules";

interface Movement {
  _id: string; type: string; date: string; amount: number; partner?: string; description?: string;
  closingId: string | null; counterAmount?: number; counterCurrency?: string;
}
interface Closing {
  _id: string; date: string; opening: number; turnover: number; expected: number; counted: number;
  difference: number; movementCount: number; note?: string; closedBy: string;
}

const TYPE_LABEL: Record<string, { label: string; tone: Tone; sign: number }> = {
  income: { label: "Bevétel", tone: "emerald", sign: 1 },
  expense: { label: "Kiadás", tone: "rose", sign: -1 },
  exchange_in: { label: "Váltás (be)", tone: "blue", sign: 1 },
  exchange_out: { label: "Váltás (ki)", tone: "violet", sign: -1 },
  adjustment: { label: "Különbözet", tone: "amber", sign: 1 },
};
const today = () => new Date().toISOString().slice(0, 10);

export default function CashClient({ currency }: { currency: "HUF" | "RON" }) {
  const unit = currency === "HUF" ? "Ft" : "RON";
  const other = currency === "HUF" ? "RON" : "HUF";
  const [data, setData] = useState<{ movements: Movement[]; closings: Closing[]; balance: number; openCount: number; openSum: number } | null>(null);
  const [tab, setTab] = useState<"movements" | "closings">("movements");
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"movement" | "close" | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cash/${currency}`)
      .then(async (res) => {
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) return setError(j.error);
        setError("");
        setData(j);
      })
      .catch(() => !cancelled && setError("Hálózati hiba."));
    return () => { cancelled = true; };
  }, [currency, reloadKey]);

  async function remove(m: Movement) {
    if (!confirm("Biztosan törlöd ezt a mozgást?")) return;
    const res = await fetch(`/api/cash/${currency}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m._id }) });
    if (res.ok) load(); else setError((await res.json()).error);
  }

  const stat = (label: string, value: string) => (
    <div className="rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1.5 text-xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );

  return (
    <div>
      {error && <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">{error}</p>}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 p-6 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.5)]">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-[#FFD700]/30 blur-2xl" />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-100">Pénztár egyenleg</div>
            <div className="mt-1.5 text-2xl font-black tracking-tight text-white">{data ? fmtMoney(data.balance, unit) : "…"}</div>
          </div>
        </div>
        {stat("Lezáratlan mozgások", data ? String(data.openCount) : "…")}
        {stat("Lezáratlan forgalom", data ? fmtMoney(data.openSum, unit) : "…")}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-2xl border border-white bg-white/70 p-1 shadow-sm backdrop-blur">
          {(["movements", "closings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition ${tab === t ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
              {t === "movements" ? "Pénztári mozgások" : "Napi zárások"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button className={btnGhost} onClick={() => setModal("close")}><Lock className="h-4 w-4" /> Pénztárzárás</button>
          <button className={btnPrimary} onClick={() => setModal("movement")}><Plus className="h-4 w-4" /> Új mozgás</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-white bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        {tab === "movements" ? (
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-white/50 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr><th className="px-4 py-3.5">Dátum</th><th className="px-4 py-3.5">Típus</th><th className="px-4 py-3.5">Partner</th><th className="px-4 py-3.5">Leírás</th><th className="px-4 py-3.5 text-right">Összeg</th><th className="px-4 py-3.5" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.movements.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm font-semibold text-slate-400">Még nincs pénztári mozgás.</td></tr>}
              {data?.movements.map((m) => {
                const t = TYPE_LABEL[m.type];
                const amount = m.type === "adjustment" ? m.amount : t.sign * m.amount;
                return (
                  <tr key={m._id} className="transition hover:bg-blue-50/50">
                    <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900">{m.date}</td>
                    <td className="px-4 py-3.5"><Badge tone={t.tone} dot>{t.label}</Badge></td>
                    <td className="px-4 py-3.5 font-medium text-slate-600">{m.partner || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {m.description || "—"}
                      {m.counterAmount ? <span className="ml-2 text-xs text-slate-400">({fmtMoney(m.counterAmount, m.counterCurrency)})</span> : null}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3.5 text-right font-black tabular-nums ${amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{amount > 0 ? "+" : ""}{fmtMoney(amount, unit)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {m.closingId ? <Lock className="inline h-4 w-4 text-slate-300" /> : (
                        <button onClick={() => remove(m)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Törlés"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-white/50 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr><th className="px-4 py-3.5">Dátum</th><th className="px-4 py-3.5 text-right">Nyitó</th><th className="px-4 py-3.5 text-right">Forgalom</th><th className="px-4 py-3.5 text-right">Elvárt</th><th className="px-4 py-3.5 text-right">Megszámolt</th><th className="px-4 py-3.5 text-right">Különbség</th><th className="px-4 py-3.5">Zárta</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.closings.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center text-sm font-semibold text-slate-400">Még nincs pénztárzárás.</td></tr>}
              {data?.closings.map((c) => (
                <tr key={c._id} className="transition hover:bg-blue-50/50">
                  <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900">{c.date}<div className="text-[11px] font-semibold text-slate-400">{c.movementCount} mozgás</div></td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">{fmtMoney(c.opening, unit)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">{fmtMoney(c.turnover, unit)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">{fmtMoney(c.expected, unit)}</td>
                  <td className="px-4 py-3.5 text-right font-black tabular-nums text-slate-900">{fmtMoney(c.counted, unit)}</td>
                  <td className={`px-4 py-3.5 text-right font-black tabular-nums ${c.difference === 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtMoney(c.difference, unit)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{c.closedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === "movement" && <MovementForm currency={currency} unit={unit} other={other} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === "close" && data && <CloseForm currency={currency} unit={unit} expected={data.balance} openCount={data.openCount} onClose={() => setModal(null)} onSaved={() => { setModal(null); setTab("closings"); load(); }} />}
    </div>
  );
}

async function post(currency: string, body: unknown) {
  const res = await fetch(`/api/cash/${currency}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Hiba");
  return j;
}

function MovementForm({ currency, unit, other, onClose, onSaved }: { currency: string; unit: string; other: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ type: "income", date: today(), amount: "", partner: "", description: "", counterAmount: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await post(currency, v); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Hiba"); setSaving(false); }
  }

  return (
    <Modal title="Új pénztári mozgás" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Típus</Label>
          <select className={inputClass} value={v.type} onChange={(e) => set("type", e.target.value)}>
            <option value="income">Bevétel</option><option value="expense">Kiadás</option>
            <option value="exchange_in">Valutaváltás – beérkező ({unit})</option><option value="exchange_out">Valutaváltás – kiadott ({unit})</option>
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Dátum</Label><input type="date" className={inputClass} value={v.date} onChange={(e) => set("date", e.target.value)} required /></div>
          <div><Label>Összeg ({unit})</Label><input type="number" step="any" min="0" className={inputClass} value={v.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
        </div>
        {v.type.startsWith("exchange") && (
          <div><Label>Ellenérték ({other})</Label><input type="number" step="any" min="0" className={inputClass} value={v.counterAmount} onChange={(e) => set("counterAmount", e.target.value)} /></div>
        )}
        <div><Label>Partner / sofőr</Label><input className={inputClass} value={v.partner} onChange={(e) => set("partner", e.target.value)} /></div>
        <div><Label>Leírás</Label><input className={inputClass} value={v.description} onChange={(e) => set("description", e.target.value)} /></div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Mégse</button><button className={btnPrimary} disabled={saving}>Mentés</button></div>
      </form>
    </Modal>
  );
}

function CloseForm({ currency, unit, expected, openCount, onClose, onSaved }: { currency: string; unit: string; expected: number; openCount: number; onClose: () => void; onSaved: () => void }) {
  const [counted, setCounted] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const diff = counted === "" ? null : Number(counted) - expected;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("A zárás után a mozgások már nem törölhetők. Folytatod?")) return;
    setSaving(true);
    try { await post(currency, { action: "close", counted, date, note }); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Hiba"); setSaving(false); }
  }

  return (
    <Modal title="Pénztárzárás" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">{openCount} lezáratlan mozgás. Elvárt pénztári egyenleg: <b className="text-slate-900">{fmtMoney(expected, unit)}</b></p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Zárás dátuma</Label><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div><Label>Megszámolt készpénz ({unit})</Label><input type="number" step="any" min="0" className={inputClass} value={counted} onChange={(e) => setCounted(e.target.value)} required autoFocus /></div>
        </div>
        {diff !== null && (
          <p className={`rounded-lg px-3 py-2 text-xs font-bold ${diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {diff === 0 ? "Az egyenleg egyezik." : `Különbözet: ${fmtMoney(diff, unit)} (korrekciós tételként rögzítjük)`}
          </p>
        )}
        <div><Label>Megjegyzés</Label><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Mégse</button><button className={btnPrimary} disabled={saving}>Zárás</button></div>
      </form>
    </Modal>
  );
}
