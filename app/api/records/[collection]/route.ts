import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { fail, requireUser, unauthorized } from "@/lib/api";
import { getMongoDb } from "@/lib/mongodb";
import { getTab, type Field, type Tab } from "@/lib/modules";

export const dynamic = "force-dynamic";
const MAX_FILE_CHARS = 2_500_000; // ~1.8 MB base64

type Ctx = { params: Promise<{ collection: string }> };

function sanitize(tab: Tab, body: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  for (const f of tab.fields) {
    if (!(f.key in body)) {
      if (!partial && f.required) throw new Error(`${f.label} megadása kötelező.`);
      continue;
    }
    const raw = body[f.key];
    out[f.key] = coerce(f, raw);
    if (f.required && (out[f.key] === "" || out[f.key] === null)) throw new Error(`${f.label} megadása kötelező.`);
  }
  return out;
}

function coerce(f: Field, raw: unknown) {
  if (raw === null || raw === undefined || raw === "") return f.type === "number" || f.type === "money" ? null : "";
  if (f.type === "number" || f.type === "money") {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`${f.label}: érvénytelen szám.`);
    return n;
  }
  if (f.type === "select" && f.options && !f.options.some((o) => o.value === raw)) {
    throw new Error(`${f.label}: érvénytelen érték.`);
  }
  if (f.type === "file") {
    const v = raw as { name?: string; data?: string } | string;
    if (typeof v === "string") return "";
    if (!v?.data || !v.data.startsWith("data:")) return "";
    if (v.data.length > MAX_FILE_CHARS) throw new Error(`${f.label}: a fájl túl nagy (max. 1,8 MB).`);
    return { name: String(v.name || "dokumentum").slice(0, 160), data: v.data };
  }
  return String(raw).trim().slice(0, 4000);
}

async function col(tab: Tab) {
  return (await getMongoDb()).collection(tab.key);
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    if (!(await requireUser())) return unauthorized();
    const tab = getTab((await ctx.params).collection);
    if (!tab) return fail("Ismeretlen kollekció.", 404);
    const docs = await (await col(tab)).find().sort({ createdAt: -1 }).limit(2000).toArray();
    return NextResponse.json({ records: docs.map((d) => ({ ...d, _id: String(d._id) })) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const tab = getTab((await ctx.params).collection);
    if (!tab) return fail("Ismeretlen kollekció.", 404);
    const data = sanitize(tab, await req.json(), false);
    const now = Date.now();
    const r = await (await col(tab)).insertOne({ ...data, createdBy: user.email, createdAt: now, updatedAt: now });
    return NextResponse.json({ ok: true, id: String(r.insertedId) });
  } catch (e) {
    return fail(e, 400);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const tab = getTab((await ctx.params).collection);
    if (!tab) return fail("Ismeretlen kollekció.", 404);
    const { id, ...rest } = await req.json();
    if (!id || !ObjectId.isValid(id)) return fail("Hiányzó azonosító.", 400);
    const data = sanitize(tab, rest, true);
    const r = await (await col(tab)).updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedBy: user.email, updatedAt: Date.now() } }
    );
    return NextResponse.json({ ok: r.matchedCount > 0 });
  } catch (e) {
    return fail(e, 400);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    if (!(await requireUser())) return unauthorized();
    const tab = getTab((await ctx.params).collection);
    if (!tab) return fail("Ismeretlen kollekció.", 404);
    const { id } = await req.json();
    if (!id || !ObjectId.isValid(id)) return fail("Hiányzó azonosító.", 400);
    const r = await (await col(tab)).deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: r.deletedCount > 0 });
  } catch (e) {
    return fail(e, 400);
  }
}
