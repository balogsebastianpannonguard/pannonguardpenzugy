"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Backdrop from "@/components/Backdrop";
import LoginForm from "./LoginForm";

/**
 * Érvényes ?token= linknél jelenik meg: magától belép és átirányít, kattintás nélkül.
 * Bármilyen hiba esetén a rendes belépő űrlapra vált.
 */
export default function DirectLoginRedirect({ token }: { token: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/direct-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });
        if (res.ok) {
          if (!cancelled) window.location.replace("/");
          return;
        }
      } catch {
        // az űrlapra esünk vissza
      }
      if (!cancelled) setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (failed) return <LoginForm />;

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center px-4 text-slate-900">
      <Backdrop />
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_32px_-10px_rgba(37,99,235,0.6)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Bejelentkezés…</p>
      </div>
    </main>
  );
}
