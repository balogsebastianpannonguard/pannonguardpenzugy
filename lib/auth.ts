import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { getMongoDb } from "./mongodb";

export const AUTH_COOKIE_NAME = "pannon_penzugy_session";
const SECRET =
  process.env.DISPATCHER_COOKIE_SECRET || "pannon_transfer_dispatcher_super_secret_2026_jwt_key";

export interface SessionUser {
  email: string;
  name: string;
  role: "admin" | "dispatcher";
  loginAt: number;
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; message?: string; user?: SessionUser }> {
  if (!email || !password) return { success: false, message: "Kérjük, adja meg a hozzáférési adatokat." };
  const normalized = email.trim().toLowerCase();

  // Ugyanaz a közös staff_users kollekció, mint a diszpécser appban
  try {
    const db = await getMongoDb();
    const user = await db.collection("staff_users").findOne({ normalizedEmail: normalized });
    if (!user) return { success: false, message: "Hibás e-mail cím vagy jelszó." };
    if (user.role !== "admin" && user.role !== "dispatcher") {
      return { success: false, message: "Nincs jogosultságod a Pénzügyi Rendszerhez." };
    }
    if (!user.isActivated || !user.hashedPassword) {
      return { success: false, message: "A fiók még nincs aktiválva." };
    }
    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) return { success: false, message: "Hibás e-mail cím vagy jelszó." };
    return {
      success: true,
      user: {
        email: user.email,
        name: user.name || user.email.split("@")[0],
        role: user.role,
        loginAt: Date.now(),
      },
    };
  } catch (err) {
    console.error("[verifyCredentials]", err);
    return { success: false, message: "Hálózati hiba, kérjük próbálja újra." };
  }
}

/** A személyes belépő linkkel (telefonról, főképernyőről) nyitott munkamenet ennyi napig él. */
export const DIRECT_LOGIN_SESSION_DAYS = 30;

export function createSessionToken(user: SessionUser, days?: number): string {
  return jwt.sign(user as object, SECRET, { expiresIn: days ? `${days}d` : "12h" });
}

export async function setSessionCookie(token: string, days?: number) {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days ? 60 * 60 * 24 * days : 60 * 60 * 12,
  });
}

/**
 * Személyes, jelszó nélküli belépő link (?token=...) feloldása. A token SHA-256 lenyomata a közös
 * staff_users kollekcióban van (directLoginTokenHash) – ugyanaz a mező, amit az Outlook-naptár is használ.
 * Csak aktivált admin/diszpécser fiók léphet be vele.
 */
export async function findUserByDirectLoginToken(
  rawToken: string
): Promise<{ user: SessionUser; staffId: unknown } | null> {
  const token = rawToken.trim();
  if (!/^[a-f0-9]{32,128}$/i.test(token)) return null;
  try {
    const db = await getMongoDb();
    const hash = createHash("sha256").update(token).digest("hex");
    const doc = await db.collection("staff_users").findOne({ directLoginTokenHash: hash });
    if (!doc || !doc.isActivated) return null;
    if (doc.role !== "admin" && doc.role !== "dispatcher") return null;
    return {
      staffId: doc._id,
      user: {
        email: doc.email,
        name: doc.name || String(doc.email).split("@")[0],
        role: doc.role,
        loginAt: Date.now(),
      },
    };
  } catch (err) {
    console.error("[findUserByDirectLoginToken]", err);
    return null;
  }
}

export async function recordStaffLogin(staffId: unknown): Promise<void> {
  try {
    const db = await getMongoDb();
    await db.collection("staff_users").updateOne({ _id: staffId as never }, { $set: { lastLoginAt: Date.now(), updatedAt: Date.now() } });
  } catch (err) {
    console.error("[recordStaffLogin]", err);
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as SessionUser;
  } catch {
    return null;
  }
}
