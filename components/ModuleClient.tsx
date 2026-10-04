"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Paperclip, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Field, Tab } from "@/lib/modules";
import { Badge, btnGhost, btnPrimary, fmtMoney, inputClass, Label, Modal } from "./ui";

type Rec = Record<string, unknown> & { _id: string };
type FileVal = { name: string; data: string };
type Opt = { value: string; label: string };

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - new Date(today()).getTime()) / 86400000);

function useRefOptions(tab: Tab) {
  const [opts, setOpts] = useState<Record<string, Opt[]>>({});
  useEffect(() => {
    const kinds = Array.from(new Set(tab.fields.filter((f) => f.type === "ref").map((f) => f.ref!)));
    kinds.forEach((k) =>
      fetch(`/api/lookup/${k}`)
        .then((r) => r.json())
        .then((j) => setOpts((o) => ({ ...o, [k]: j.options || [] })))
        .catch(() => undefined)
    );
  }, [tab]);
  return opts;
}

export default function ModuleClient({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === active)!;
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Rec | "new" | null>(null);
  const refOptions = useRefOptions(tab);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/records/${tab.key}`)
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        if (!cancelled) { setRecords(j.records); setError(""); }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Hiba"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tab.key, reloadKey]);

  const statusDef = tab.fields.find((f) => f.key === tab.statusField);
  const columns = tab.fields.filter((f) => !f.hideInList);

  const consumption = useMemo(() => {
    const map = new Map<string, number>();
    if (!tab.consumption) return map;
    const byPlate = new Map<string, Rec[]>();
    records.forEach((r) => {
      if (!r.plates || !r.odometer) return;
      byPlate.set(String(r.plates), [...(byPlate.get(String(r.plates)) || []), r]);
    });
    byPlate.forEach((list) => {
      const sorted = [...list].sort((a, b) => Number(a.odometer) - Number(b.odometer));
      for (let i = 1; i < sorted.length; i++) {
        const km = Number(sorted[i].odometer) - Number(sorted[i - 1].odometer);
        if (km > 0) map.set(sorted[i]._id, (Number(sorted[i].liters) / km) * 100);
      }
    });
    return map;
  }, [records, tab.consumption]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = records.filter((r) => {
      if (statusFilter && r[tab.statusField || ""] !== statusFilter) return false;
      if (!q) return true;
      return tab.fields.some((f) => f.type !== "file" && String(r[f.key] ?? "").toLowerCase().includes(q));
    });
    const sortKey = tab.sortField;
    if (sortKey) list.sort((a, b) => String(b[sortKey] ?? "").localeCompare(String(a[sortKey] ?? "")));
    return list;
  }, [records, search, statusFilter, tab]);

  const sum = useMemo(() => {
    if (!tab.sumField) return null;
    return rows
      .filter((r) => !tab.sumWhen || tab.sumWhen.values.includes(String(r[tab.sumWhen.field])))
      .reduce((s, r) => s + (Number(r[tab.sumField!]) || 0), 0);
  }, [rows, tab]);

  async function remove(r: Rec) {
    if (!confirm(`Biztosan törlöd ezt a rekordot (${tab.singular})?`)) return;
    const res = await fetch(`/api/records/${tab.key}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r._id }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function quickStatus(r: Rec, value: string) {
    await fetch(`/api/records/${tab.key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r._id, [tab.statusField!]: value }),
    });
    load();
  }

  function cell(r: Rec, f: Field) {
    const v = r[f.key];
    if (f.key === tab.statusField && f.options) {
      return (
        <select
          value={String(v ?? "")}
          onChange={(e) => quickStatus(r, e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700"
        >
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (f.type === "select") {
      const o = f.options?.find((x) => x.value === v);
      return o ? <Badge tone={o.tone}>{o.label}</Badge> : "—";
    }
    if (f.type === "money") return fmtMoney(v as number, f.currency);
    if (f.type === "date") {
      const s = String(v || "");
      if (!s) return "—";
      const warn = f.key === tab.expiryField && statusDef && ["active", "sent", "open", "overdue"].includes(String(r[tab.statusField!]));
      const d = warn ? daysUntil(s) : null;
      return (
        <span className="whitespace-nowrap">
          {s}
          {d !== null && d < 0 && <span className="ml-2"><Badge tone="rose">Lejárt</Badge></span>}
          {d !== null && d >= 0 && d <= 30 && <span className="ml-2"><Badge tone="amber">{d} nap</Badge></span>}
        </span>
      );
    }
    return String(v ?? "") || "—";
  }

  return (
    <div>
      {tabs.length > 1 && (
        <div className="mb-5 inline-flex gap-1 rounded-2xl border border-white bg-white/70 p-1 shadow-sm backdrop-blur">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActive(t.key); setLoading(true); setSearch(""); setStatusFilter(""); }}
              className={`rounded-xl px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition ${t.key === active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-10`} placeholder={`Keresés a(z) ${tab.label.toLowerCase()} között…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {statusDef?.options && (
          <select className={`${inputClass} !w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Minden státusz</option>
            {statusDef.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <button className={btnPrimary} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Új {tab.singular}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-white backdrop-blur">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tételek</span>
          <span className="tabular-nums text-slate-900">{rows.length}</span>
        </span>
        {sum !== null && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/25">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">{tab.sumLabel}</span>
            <span className="tabular-nums">{fmtMoney(sum)}</span>
          </span>
        )}
      </div>

      {error && <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-[2rem] border border-white bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-white/50 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <tr>
              {columns.map((f) => <th key={f.key} className="px-4 py-3.5 font-black">{f.label}</th>)}
              {tab.consumption && <th className="px-4 py-3.5 font-black">l/100 km</th>}
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td className="px-4 py-14 text-center text-sm font-semibold text-slate-400" colSpan={columns.length + 2}>Betöltés…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td className="px-4 py-14 text-center" colSpan={columns.length + 2}>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></div>
                <p className="text-sm font-bold text-slate-600">Nincs találat</p>
                <p className="mt-1 text-xs text-slate-400">Adj hozzá egy új {tab.singular} tételt, vagy módosíts a szűrőn.</p>
              </td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r._id} className="transition hover:bg-blue-50/50">
                {columns.map((f, i) => <td key={f.key} className={`px-4 py-3.5 align-middle ${i === 0 ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>{cell(r, f)}</td>)}
                {tab.consumption && <td className="px-4 py-3.5 font-bold tabular-nums text-slate-700">{consumption.has(r._id) ? `${consumption.get(r._id)!.toFixed(1)}` : "—"}</td>}
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  {tab.fields.filter((f) => f.type === "file").map((f) => {
                    const file = r[f.key] as FileVal | "";
                    return file ? (
                      <a key={f.key} href={file.data} download={file.name} title={file.name} className="mr-1 inline-flex rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50">
                        <Paperclip className="h-4 w-4" />
                      </a>
                    ) : null;
                  })}
                  <button onClick={() => setEditing(r)} className="mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Szerkesztés"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Törlés"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RecordForm
          tab={tab}
          record={editing === "new" ? null : editing}
          refOptions={refOptions}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function RecordForm({ tab, record, refOptions, onClose, onSaved }: {
  tab: Tab;
  record: Rec | null;
  refOptions: Record<string, Opt[]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    tab.fields.forEach((f) => {
      init[f.key] = record ? record[f.key] ?? "" : f.defaultValue ?? (f.type === "date" ? today() : "");
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  function pickFile(f: Field, file?: File) {
    if (!file) return;
    if (file.size > 1_800_000) return setError(`${f.label}: a fájl túl nagy (max. 1,8 MB).`);
    const reader = new FileReader();
    reader.onload = () => set(f.key, { name: file.name, data: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <Modal title={`${record ? "Szerkesztés" : "Új"} ${tab.singular}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {tab.fields.map((f) => {
          const v = values[f.key];
          return (
            <div key={f.key}>
              <Label>{f.label}{f.required && " *"}</Label>
              {f.type === "textarea" ? (
                <textarea className={inputClass} rows={3} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <select className={inputClass} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "ref" ? (
                <>
                  <input className={inputClass} list={`ref-${f.key}`} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                  <datalist id={`ref-${f.key}`}>
                    {(refOptions[f.ref!] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </datalist>
                </>
              ) : f.type === "file" ? (
                <div>
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => pickFile(f, e.target.files?.[0])} className="text-xs" />
                  {!!v && typeof v === "object" && (
                    <p className="mt-1 text-xs text-slate-500">
                      {(v as FileVal).name}{" "}
                      <button type="button" className="font-bold text-rose-600" onClick={() => set(f.key, "")}>eltávolítás</button>
                    </p>
                  )}
                </div>
              ) : (
                <input
                  className={inputClass}
                  type={f.type === "money" || f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  step={f.type === "money" ? "any" : f.type === "number" ? "any" : undefined}
                  value={String(v ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={f.required}
                />
              )}
            </div>
          );
        })}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Mégse</button>
          <button className={btnPrimary} disabled={saving}>{saving ? "Mentés…" : "Mentés"}</button>
        </div>
      </form>
    </Modal>
  );
}
