import { NextResponse } from "next/server";
import { getCurrentSession } from "./auth";

export async function requireUser() {
  return getCurrentSession();
}

export const unauthorized = () => NextResponse.json({ error: "Nincs jogosultságod." }, { status: 401 });
export const fail = (e: unknown, status = 500) =>
  NextResponse.json({ error: e instanceof Error ? e.message : String(e) || "Hiba" }, { status });
