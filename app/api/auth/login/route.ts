import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const result = await verifyCredentials(String(email || ""), String(password || ""));
  if (!result.success || !result.user) {
    return NextResponse.json({ error: result.message || "Hiba" }, { status: 401 });
  }
  await setSessionCookie(createSessionToken(result.user));
  return NextResponse.json({ ok: true });
}
