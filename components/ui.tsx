import clsx from "clsx";
import type { Tone } from "@/lib/modules";

const TONES: Record<Tone, string> = {
  slate: "border-slate-200 bg-white text-slate-600",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-[#FFD700]/60 bg-[#FFD700]/15 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

const DOT: Record<Tone, string> = {
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
  amber: "bg-[#e6b800]",
  rose: "bg-rose-500",
  blue: "bg-blue-600",
  violet: "bg-violet-500",
};

export function Badge({ tone = "slate", dot = false, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest", TONES[tone])}>
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,0.6)] transition hover:-translate-y-px hover:bg-blue-700 active:translate-y-0 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white bg-white/70 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-blue-700 disabled:opacity-60";

export function fmtMoney(n: number | null | undefined, currency = "Ft") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} ${currency}`;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-blue-600" />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-blue-600">{children}</span>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-sm animate-[fade-in_0.2s_ease] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-white bg-white/95 shadow-[0_40px_80px_-15px_rgba(37,99,235,0.25)] backdrop-blur-xl animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-7 py-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Bezárás">×</button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</label>;
}
