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
      shortName,
      specialty,
      isSupport,
      isTeaching,
      isOnCall,
      isMorning,
      isAllDay,
      isActive,
      maxWeeklyHours,
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
          shortName: shortName || null,
          specialty,
          isSupport: Boolean(isSupport),
          isTeaching: isTeaching ?? true,
          isOnCall: isOnCall ?? false,
          isMorning: isMorning ?? true,
          isAllDay: isAllDay ?? false,
          isActive: isActive ?? true,
          maxWeeklyHours: maxWeeklyHours ?? 24,
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
        shortName: shortName || null,
        specialty,
        isSupport: Boolean(isSupport),
        isTeaching: isTeaching ?? true,
        isOnCall: isOnCall ?? false,
        isMorning: isMorning ?? true,
        isAllDay: isAllDay ?? false,
        isActive: isActive ?? true,
        maxWeeklyHours: maxWeeklyHours ?? 24,
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { teacherIds, updates, modifiedFields } = body;

    if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Δεν δόθηκαν εκπαιδευτικοί για ενημέρωση" },
        { status: 400 }
      );
    }

    const modifiedSet = new Set(Array.isArray(modifiedFields) ? modifiedFields : Object.keys(updates || {}));

    for (const teacherId of teacherIds) {
      const existing = await db
        .select()
        .from(schema.teachers)
        .where(eq(schema.teachers.id, teacherId))
        .limit(1);

      if (existing.length === 0) continue;
      const tch = existing[0];

      let existingConstraints: Record<string, any> = {};
      if (tch.constraints) {
        try {
          existingConstraints = JSON.parse(tch.constraints);
        } catch {
          existingConstraints = {};
        }
      }

      // Merge only modified constraint fields
      const constraintKeys = [
        "availableDays",
        "maxHoursPerDay",
        "minHoursPerDay",
        "maxConsecutiveHours",
        "maxConsecutiveGaps",
        "maxTotalGapsPerDay",
        "maxTotalGapsPerWeek",
      ];

      let constraintsChanged = false;
      const newConstraints = { ...existingConstraints };

      constraintKeys.forEach((key) => {
        if (modifiedSet.has(key) && updates?.constraints && updates.constraints[key] !== undefined) {
          newConstraints[key] = updates.constraints[key];
          constraintsChanged = true;
        }
      });

      // Prepare teacher update object
      const updateData: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };

      if (constraintsChanged) {
        updateData.constraints = JSON.stringify(newConstraints);
      }

      if (modifiedSet.has("isSupport") && updates.isSupport !== undefined) {
        updateData.isSupport = Boolean(updates.isSupport);
      }
      if (modifiedSet.has("isTeaching") && updates.isTeaching !== undefined) {
        updateData.isTeaching = Boolean(updates.isTeaching);
      }
      if (modifiedSet.has("isOnCall") && updates.isOnCall !== undefined) {
        updateData.isOnCall = Boolean(updates.isOnCall);
      }
      if (modifiedSet.has("isMorning") && updates.isMorning !== undefined) {
        updateData.isMorning = Boolean(updates.isMorning);
      }
      if (modifiedSet.has("isAllDay") && updates.isAllDay !== undefined) {
        updateData.isAllDay = Boolean(updates.isAllDay);
      }
      if (modifiedSet.has("isActive") && updates.isActive !== undefined) {
        updateData.isActive = Boolean(updates.isActive);
      }
      if (modifiedSet.has("maxWeeklyHours") && updates.maxWeeklyHours !== undefined) {
        updateData.maxWeeklyHours = updates.maxWeeklyHours === "" ? null : Number(updates.maxWeeklyHours);
      }

      await db
        .update(schema.teachers)
        .set(updateData)
        .where(eq(schema.teachers.id, teacherId));
    }

    return NextResponse.json({ success: true, count: teacherIds.length });
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
