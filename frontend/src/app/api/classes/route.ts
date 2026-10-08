import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      grade,
      color,
      shortName,
      studentsCount,
      headTeacherId,
      room,
      isAllDay,
      supportSpecialties,
      weeklyHoursTarget,
      supportHoursMin,
      supportHoursMax,
      orderIndex,
      students,
    } = body;

    const classId = id || `cls-${crypto.randomUUID().slice(0, 8)}`;

    const classData = {
      name: name.trim(),
      grade: grade.trim(),
      color: color || "#3b82f6",
      shortName: shortName ? shortName.trim() : null,
      studentsCount: studentsCount !== undefined && studentsCount !== "" ? Number(studentsCount) : 20,
      headTeacherId: headTeacherId || null,
      room: room ? room.trim() : null,
      isAllDay: Boolean(isAllDay),
      supportSpecialties: Array.isArray(supportSpecialties)
        ? JSON.stringify(supportSpecialties)
        : null,
      weeklyHoursTarget: weeklyHoursTarget !== undefined && weeklyHoursTarget !== "" ? Number(weeklyHoursTarget) : 30,
      supportHoursMin: Number(supportHoursMin) || 0,
      supportHoursMax: Number(supportHoursMax) || 0,
      orderIndex: Number(orderIndex) || 0,
      students: Array.isArray(students) ? JSON.stringify(students) : null,
    };

    const existing = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, classId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.classes)
        .set(classData)
        .where(eq(schema.classes.id, classId));
    } else {
      await db.insert(schema.classes).values({
        id: classId,
        ...classData,
      });

      // Automatically create the default "Ολομέλεια" SubGroup for the class!
      await db.insert(schema.subGroups).values({
        id: `grp-${classId}-main`,
        classId,
        name: "Ολομέλεια",
        isDefault: true,
      });
    }

    return NextResponse.json({ success: true, classId });
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

    await db.delete(schema.classes).where(eq(schema.classes.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
