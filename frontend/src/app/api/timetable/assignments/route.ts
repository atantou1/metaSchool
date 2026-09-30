import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teacherId, subjectId, subGroupId, hours } = body;

    if (!subjectId || !subGroupId || hours === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newAssignment = {
      id: `asg-${crypto.randomUUID().slice(0, 8)}`,
      teacherId: teacherId || "TCH-ANY", // Temporary placeholder for ANY
      subjectId,
      subGroupId,
      hours: Number(hours),
      isAllDay: false,
    };

    await db.insert(schema.lessonAssignments).values(newAssignment);

    return NextResponse.json({ success: true, data: newAssignment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, teacherId, subjectId, hours } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing assignment ID" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (teacherId !== undefined) updates.teacherId = teacherId || "TCH-ANY";
    if (subjectId !== undefined) updates.subjectId = subjectId;
    if (hours !== undefined) updates.hours = Number(hours);

    await db
      .update(schema.lessonAssignments)
      .set(updates)
      .where(eq(schema.lessonAssignments.id, id));

    return NextResponse.json({ success: true });
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
      return NextResponse.json(
        { success: false, error: "Missing assignment ID" },
        { status: 400 }
      );
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
