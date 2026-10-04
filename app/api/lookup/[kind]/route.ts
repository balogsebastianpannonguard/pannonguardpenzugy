import { NextResponse } from "next/server";
import { fail, requireUser, unauthorized } from "@/lib/api";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  try {
    if (!(await requireUser())) return unauthorized();
    const { kind } = await ctx.params;
    const db = await getMongoDb();
    if (kind === "vehicles") {
      const docs = await db.collection("vehicles").find().sort({ name: 1 }).toArray();
      return NextResponse.json({
        options: docs.map((v) => ({
          value: String(v.plates || v.name),
          label: [v.plates, v.name].filter(Boolean).join(" · "),
        })),
      });
    }
    if (kind === "drivers") {
      const docs = await db.collection("staff_users").find({ role: "driver" }).sort({ name: 1 }).toArray();
      return NextResponse.json({
        options: docs.filter((d) => d.name).map((d) => ({ value: String(d.name), label: String(d.name) })),
      });
    }
    return fail("Ismeretlen lista.", 404);
  } catch (e) {
    return fail(e);
  }
}
