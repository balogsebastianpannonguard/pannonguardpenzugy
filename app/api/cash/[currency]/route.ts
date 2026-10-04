import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { fail, requireUser, unauthorized } from "@/lib/api";
import { getMongoDb } from "@/lib/mongodb";
import { CASH_COLLECTIONS } from "@/lib/modules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ currency: string }> };
const TYPES = ["income", "expense", "exchange_in", "exchange_out", "adjustment"] as const;
const SIGN: Record<string, number> = { income: 1, exchange_in: 1, expense: -1, exchange_out: -1 };

async function setup(ctx: Ctx) {
  const { currency } = await ctx.params;
  if (currency !== "HUF" && currency !== "RON") throw new Error("Ismeretlen pénznem.");
  const db = await getMongoDb();
  return {
    currency,
    movements: db.collection(CASH_COLLECTIONS.movements),
    closings: db.collection(CASH_COLLECTIONS.closings),
  };
}

const signed = (m: { type: string; amount: number }) =>
  m.type === "adjustment" ? m.amount : (SIGN[m.type] ?? 0) * m.amount;

export async function GET(_req: Request, ctx: Ctx) {
  try {
    if (!(await requireUser())) return unauthorized();
    const { currency, movements, closings } = await setup(ctx);
    const [mv, cl] = await Promise.all([
      movements.find({ currency }).sort({ date: -1, createdAt: -1 }).limit(2000).toArray(),
      closings.find({ currency }).sort({ createdAt: -1 }).limit(200).toArray(),
    ]);
    const all = mv.map((m) => ({ ...m, _id: String(m._id), closingId: m.closingId ? String(m.closingId) : null }));
    const balance = all.reduce((s, m) => s + signed(m as never), 0);
    const open = all.filter((m) => !m.closingId);
    const openSum = open.reduce((s, m) => s + signed(m as never), 0);
    return NextResponse.json({
      movements: all,
      closings: cl.map((c) => ({ ...c, _id: String(c._id) })),
      balance,
      openCount: open.length,
      openSum,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { currency, movements, closings } = await setup(ctx);
    const body = await req.json();
    const now = Date.now();

    if (body.action === "close") {
      const counted = Number(body.counted);
      if (!Number.isFinite(counted) || counted < 0) throw new Error("Adja meg a megszámolt készpénzt.");
      const open = await movements.find({ currency, closingId: { $exists: false } }).toArray();
      const last = await closings.find({ currency }).sort({ createdAt: -1 }).limit(1).toArray();
      const opening = last[0]?.counted ?? 0;
      const turnover = open.reduce((s, m) => s + signed(m as never), 0);
      const expected = opening + turnover;
      const difference = Math.round((counted - expected) * 100) / 100;
      const closingId = new ObjectId();
      const date = String(body.date || new Date().toISOString().slice(0, 10));
      await closings.insertOne({
        _id: closingId,
        currency,
        date,
        opening,
        turnover,
        expected,
        counted,
        difference,
        movementCount: open.length,
        note: String(body.note || "").slice(0, 1000),
        closedBy: user.email,
        createdAt: now,
      });
      if (difference !== 0) {
        await movements.insertOne({
          currency, type: "adjustment", date, amount: difference, partner: "",
          description: `Zárási különbözet (${date})`, createdBy: user.email, createdAt: now, closingId,
        });
      }
      await movements.updateMany({ currency, closingId: { $exists: false } }, { $set: { closingId } });
      return NextResponse.json({ ok: true, difference });
    }

    const type = String(body.type);
    if (!(TYPES as readonly string[]).includes(type) || type === "adjustment") throw new Error("Érvénytelen mozgástípus.");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Az összegnek pozitívnak kell lennie.");
    const doc: Record<string, unknown> = {
      currency,
      type,
      date: String(body.date || new Date().toISOString().slice(0, 10)),
      amount,
      partner: String(body.partner || "").trim().slice(0, 200),
      description: String(body.description || "").trim().slice(0, 500),
      createdBy: user.email,
      createdAt: now,
    };
    if (type.startsWith("exchange")) {
      doc.counterCurrency = currency === "HUF" ? "RON" : "HUF";
      doc.counterAmount = Number(body.counterAmount) || 0;
    }
    await movements.insertOne(doc);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, 400);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    if (!(await requireUser())) return unauthorized();
    const { currency, movements } = await setup(ctx);
    const { id } = await req.json();
    if (!id || !ObjectId.isValid(id)) throw new Error("Hiányzó azonosító.");
    const r = await movements.deleteOne({ _id: new ObjectId(id), currency, closingId: { $exists: false } });
    if (!r.deletedCount) throw new Error("Lezárt időszak mozgása nem törölhető.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, 400);
  }
}
