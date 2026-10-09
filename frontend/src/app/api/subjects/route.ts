import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, code, color, allowedSpecialties, defaultSpecialty, classHours, classTeachers, maxPerDay } = body;

    const subjectId = id || `sub-${crypto.randomUUID().slice(0, 8)}`;
    const specialtiesArray = Array.isArray(allowedSpecialties)
      ? allowedSpecialties
      : defaultSpecialty
      ? [defaultSpecialty]
      : [];
    const specialtiesJson = JSON.stringify(specialtiesArray);

    const weeklyHoursJson =
      typeof classHours === "object" && classHours !== null
        ? JSON.stringify(classHours)
        : typeof classHours === "string"
        ? classHours
        : null;

    const classTeachersJson =
      typeof classTeachers === "object" && classTeachers !== null
        ? JSON.stringify(classTeachers)
        : typeof classTeachers === "string"
        ? classTeachers
        : null;

    const classAssignmentsJson =
      typeof body.classAssignments === "object" && body.classAssignments !== null
        ? JSON.stringify(body.classAssignments)
        : typeof body.classAssignments === "string"
        ? body.classAssignments
        : null;

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
          allowedSpecialties: specialtiesJson,
          defaultSpecialty: specialtiesArray[0] || defaultSpecialty || null,
          classHours: weeklyHoursJson,
          classTeachers: classTeachersJson,
          classAssignments: classAssignmentsJson,
          maxPerDay: maxPerDay || null,
        })
        .where(eq(schema.subjects.id, subjectId));
    } else {
      await db.insert(schema.subjects).values({
        id: subjectId,
        title,
        code,
        color: color || "#71717a",
        allowedSpecialties: specialtiesJson,
        defaultSpecialty: specialtiesArray[0] || defaultSpecialty || null,
        classHours: weeklyHoursJson,
        classTeachers: classTeachersJson,
        classAssignments: classAssignmentsJson,
        maxPerDay: maxPerDay || null,
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
