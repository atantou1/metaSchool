import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, teacherId, subjectId, subGroupId, hours, isAllDay, concurrentGroupId } = body;

    const assignmentId = id || `asg-${crypto.randomUUID().slice(0, 8)}`;

    const existing = await db
      .select()
      .from(schema.lessonAssignments)
      .where(eq(schema.lessonAssignments.id, assignmentId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.lessonAssignments)
        .set({
          teacherId,
          subjectId,
          subGroupId,
          hours: Number(hours) || 1,
          isAllDay: Boolean(isAllDay),
          concurrentGroupId: concurrentGroupId || null,
        })
        .where(eq(schema.lessonAssignments.id, assignmentId));
    } else {
      await db.insert(schema.lessonAssignments).values({
        id: assignmentId,
        teacherId,
        subjectId,
        subGroupId,
        hours: Number(hours) || 1,
        isAllDay: Boolean(isAllDay),
        concurrentGroupId: concurrentGroupId || null,
      });
    }

    return NextResponse.json({ success: true, assignmentId });
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

    await db.delete(schema.lessonAssignments).where(eq(schema.lessonAssignments.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
