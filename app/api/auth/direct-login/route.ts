import { NextResponse } from "next/server";
import {
  DIRECT_LOGIN_SESSION_DAYS,
  createSessionToken,
  findUserByDirectLoginToken,
  recordStaffLogin,
  setSessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Jelszó nélküli belépés személyes linkkel (?token=... a /login oldalon). A rendes belépést nem érinti. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = typeof body.token === "string" ? body.token : "";
  if (!token.trim()) return NextResponse.json({ error: "Hiányzó token." }, { status: 400 });

  const found = await findUserByDirectLoginToken(token);
  if (!found) return NextResponse.json({ error: "Érvénytelen link." }, { status: 404 });

  await setSessionCookie(createSessionToken(found.user, DIRECT_LOGIN_SESSION_DAYS), DIRECT_LOGIN_SESSION_DAYS);
  await recordStaffLogin(found.staffId);
  return NextResponse.json({ ok: true });
}
