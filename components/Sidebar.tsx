"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Coins, CreditCard, FileSignature, Fuel, Landmark, LayoutDashboard, LogOut, Menu, Wallet, X } from "lucide-react";
import { MODULES } from "@/lib/modules";

const ICONS = { Coins, CreditCard, FileSignature, Fuel, Landmark, Wallet } as const;

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = userName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "PT";

  const link = (href: string, label: string, Icon: typeof Wallet, index?: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={clsx(
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition",
          active ? "border border-white bg-white text-blue-700 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.35)]" : "border border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-900"
        )}
      >
        <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition", active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-white/70 text-slate-400 group-hover:text-blue-600")}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {index && <span className={clsx("font-mono text-[10px]", active ? "text-[#c9a400]" : "text-slate-300")}>{index}</span>}
      </Link>
    );
  };

  const nav = (
    <>
      <div className="px-3 pb-6 pt-2">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-blue-600" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-blue-600">PannonTransfer</span>
        </div>
        <div className="mt-2 text-2xl font-light tracking-tighter text-slate-900">
          Magic<span className="font-semibold text-blue-600">.</span> <span className="relative font-semibold">Pénzügy<span className="absolute bottom-0.5 left-0 -z-10 h-2 w-full bg-[#FFD700]/80 mix-blend-multiply" /></span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-1">
        {link("/", "Áttekintés", LayoutDashboard)}
        <div className="px-3 pb-1 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Modulok</div>
        {MODULES.map((m, i) => link(`/${m.slug}`, m.title, ICONS[m.icon as keyof typeof ICONS], String(i + 1).padStart(2, "0")))}
      </nav>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white bg-white/70 p-2.5 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 font-mono text-xs font-bold text-white">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-800">{userName}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400">{userRole === "admin" ? "Adminisztrátor" : "Diszpécser"}</div>
        </div>
        <button onClick={logout} title="Kijelentkezés" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white bg-white/70 px-4 py-3 backdrop-blur-xl md:hidden">
        <span className="text-lg font-light tracking-tighter">Magic<span className="font-semibold text-blue-600">. Pénzügy</span></span>
        <button onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-white" aria-label="Menü"><Menu className="h-5 w-5" /></button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-[fade-in_0.2s_ease]" />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-white bg-[#f4f8ff]/95 p-3 shadow-2xl backdrop-blur-xl animate-[scale-in_0.2s_ease]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
            {nav}
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col border-r border-white bg-white/40 p-4 backdrop-blur-xl md:flex">{nav}</aside>
    </>
  );
}
