"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, CreditCard, Eye, EyeOff, FileSignature, Fuel, Landmark, Loader2, Lock, Mail, ShieldCheck, Wallet } from "lucide-react";
import Backdrop from "@/components/Backdrop";

const MODULES = [
  { icon: FileSignature, label: "Szerződések" },
  { icon: Landmark, label: "Banki utalások" },
  { icon: CreditCard, label: "Kártyás fizetés" },
  { icon: Wallet, label: "Házipénztár" },
  { icon: Coins, label: "RON pénztár" },
  { icon: Fuel, label: "Üzemanyag" },
];

const field =
  "w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-12 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Hiba a belépéskor.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-12 text-slate-900">
      <Backdrop />
      <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <section className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-12 bg-blue-600" />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-blue-600">Központi rendszer</span>
          </div>
          <h1 className="text-5xl font-light leading-[1.1] tracking-tighter sm:text-6xl lg:text-7xl">
            Pannontransfer <br />
            <span className="relative mt-2 inline-block font-semibold text-blue-600">
              Magic.
              <span className="absolute bottom-1.5 left-0 -z-10 h-3 w-full bg-[#FFD700] mix-blend-multiply" />
            </span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-slate-500">
            Központi adminisztrációs és pénzügyi rendszer – szerződésektől a házipénztárig, minden egy elegáns felületen.
          </p>
          <div className="mt-10 hidden flex-wrap gap-2.5 lg:flex">
            {MODULES.map((m) => (
              <span key={m.label} className="inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur">
                <m.icon className="h-3.5 w-3.5 text-blue-600" />
                {m.label}
              </span>
            ))}
          </div>
        </section>

        <section className="animate-[rise_0.7s_cubic-bezier(0.16,1,0.3,1)]">
          <form onSubmit={submit} className="rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> Biztonságos belépés
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">Üdvözlünk újra</h2>
              <p className="mt-1.5 text-sm text-slate-500">Használd a PannonTransfer fiókodat.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">E-mail cím</label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                  <input className={`${field} pr-4`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nev@pannonguard.hu" autoFocus required />
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Jelszó</label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                  <input className={`${field} pr-12`} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Jelszó megjelenítése">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 animate-[scale-in_0.2s_ease]">{error}</p>}

              <button disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-mono text-xs font-bold uppercase tracking-widest text-white shadow-[0_16px_32px_-10px_rgba(37,99,235,0.6)] transition hover:-translate-y-px hover:bg-blue-700 active:translate-y-0 disabled:translate-y-0 disabled:opacity-70">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Belépés…</> : <>Belépés <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>}
              </button>
            </div>

            <p className="mt-8 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Titkosított kapcsolat · © {new Date().getFullYear()} PannonTransfer
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
