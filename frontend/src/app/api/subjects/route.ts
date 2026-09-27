import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, code, color } = body;

    const subjectId = id || `sub-${crypto.randomUUID().slice(0, 8)}`;

    const existing = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.subjects)
        .set({
          title,
          code,
          color: color || "#71717a",
        })
        .where(eq(schema.subjects.id, subjectId));
    } else {
      await db.insert(schema.subjects).values({
        id: subjectId,
        title,
        code,
        color: color || "#71717a",
      });
    }

    return NextResponse.json({ success: true, subjectId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
