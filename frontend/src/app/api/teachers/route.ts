import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      firstName,
      lastName,
      specialty,
      isSupport,
      color,
      constraints,
    } = body;

    const teacherId = id || `tch-${crypto.randomUUID().slice(0, 8)}`;
    const constraintsStr = constraints ? JSON.stringify(constraints) : null;

    // Check if teacher exists
    const existing = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.id, teacherId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.teachers)
        .set({
          firstName,
          lastName,
          specialty,
          isSupport: Boolean(isSupport),
          color: color || "#71717a",
          constraints: constraintsStr,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.teachers.id, teacherId));
    } else {
      await db.insert(schema.teachers).values({
        id: teacherId,
        firstName,
        lastName,
        specialty,
        isSupport: Boolean(isSupport),
        color: color || "#71717a",
        constraints: constraintsStr,
      });
    }

    return NextResponse.json({ success: true, teacherId });
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

    await db.delete(schema.teachers).where(eq(schema.teachers.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
