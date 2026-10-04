import { notFound } from "next/navigation";
import { Coins, CreditCard, FileSignature, Fuel, Landmark, Wallet } from "lucide-react";
import { getModule } from "@/lib/modules";
import ModuleClient from "@/components/ModuleClient";
import CashClient from "@/components/CashClient";
import { Eyebrow } from "@/components/ui";

export const dynamic = "force-dynamic";

const ICONS = { Coins, CreditCard, FileSignature, Fuel, Landmark, Wallet } as const;
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const mod = getModule((await params).module);
  if (!mod) notFound();
  const Icon = ICONS[mod.icon as keyof typeof ICONS];
  return (
    <div className="mx-auto max-w-6xl animate-[rise_0.4s_cubic-bezier(0.16,1,0.3,1)]">
      <header className="mb-10 flex items-start gap-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-blue-600 text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,0.6)]">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <Eyebrow>Modul</Eyebrow>
          <h1 className="mt-3 text-4xl font-light tracking-tighter text-slate-900 sm:text-5xl">{mod.title}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-500">{mod.description}</p>
        </div>
      </header>
      {mod.kind === "cash" ? <CashClient currency={mod.currency!} /> : <ModuleClient tabs={mod.tabs} />}
    </div>
  );
}
