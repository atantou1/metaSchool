import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const SOLVER_API_URL = process.env.SOLVER_API_URL || "http://127.0.0.1:8000";

// Ensure unassigned placeholder teacher exists
async function ensureUnassignedTeacher() {
  const existing = await db
    .select()
    .from(schema.teachers)
    .where(eq(schema.teachers.id, "tch-unassigned"))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(schema.teachers).values({
      id: "tch-unassigned",
      firstName: "",
      lastName: "Χωρίς Ανάθεση",
      specialty: "Κενή Θέση",
      isSupport: false,
      color: "#a1a1aa",
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teacherId, classId, day, period, subjectId, isEmptySlot } = body;

    if (!classId || day === undefined || period === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await ensureUnassignedTeacher();

    const actualTeacherId = isEmptySlot || !teacherId ? "tch-unassigned" : teacherId;

    const teacher = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.id, actualTeacherId))
      .limit(1);

    if (actualTeacherId !== "tch-unassigned") {
      let allowsSimultaneous = false;
      if (teacher[0]?.constraints) {
        try {
          const parsed = JSON.parse(teacher[0].constraints);
          allowsSimultaneous = Boolean(parsed.allowSimultaneousSessions);
        } catch (e) {}
      }

      if (!allowsSimultaneous) {
        const allOtherSlots = await db.select().from(schema.timetableSlots);
        const conflict = allOtherSlots.find(
          (s) =>
            s.teacherId === actualTeacherId &&
            s.day === day &&
            s.period === period &&
            s.classId !== classId
        );
        if (conflict) {
          return NextResponse.json(
            {
              success: false,
              error: `Ο/Η εκπαιδευτικός διδάσκει ήδη την ώρα αυτή σε άλλο τμήμα (${conflict.classId}). Ενεργοποιήστε την επιλογή «Διατμηματικό» εάν πρόκειται για ομαδική συνεδρία.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const isSupport = Boolean(teacher[0]?.isSupport);
    const subId = subjectId || (isSupport ? "sub-logo" : "sub-glossa");

    const slotId = `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const asgId = `asg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Create assignment
    await db.insert(schema.lessonAssignments).values({
      id: asgId,
      teacherId: actualTeacherId,
      subjectId: subId,
      subGroupId: `grp-${classId}-main`,
      hours: 1,
      isAllDay: period >= 6,
    });

    // Create slot
    await db.insert(schema.timetableSlots).values({
      id: slotId,
      day,
      period,
      assignmentId: asgId,
      classId,
      subGroupId: `grp-${classId}-main`,
      teacherId: actualTeacherId,
      subjectId: subId,
      isSupport,
      layer: isSupport ? 2 : 1,
      isLocked: false,
      students: Array.isArray(body.students) ? JSON.stringify(body.students) : null,
    });

    return NextResponse.json({ success: true, slotId });
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

    // 1. Swap two slots
    if (body.swap) {
      const { slotIdA, slotIdB, targetCell } = body;

      if (!slotIdA) {
        return NextResponse.json(
          { success: false, error: "Missing slotIdA for swap" },
          { status: 400 }
        );
      }

      const allSlots = await db.select().from(schema.timetableSlots);
      const slotA = allSlots.find((s) => s.id === slotIdA);

      if (!slotA) {
        return NextResponse.json(
          { success: false, error: "Slot A not found" },
          { status: 404 }
        );
      }

      // If swapping with an occupied slot B
      if (slotIdB) {
        const slotB = allSlots.find((s) => s.id === slotIdB);
        if (!slotB) {
          return NextResponse.json(
            { success: false, error: "Slot B not found" },
            { status: 404 }
          );
        }

        // Swap day, period, classId
        await db
          .update(schema.timetableSlots)
          .set({
            day: slotB.day,
            period: slotB.period,
            classId: slotB.classId,
          })
          .where(eq(schema.timetableSlots.id, slotA.id));

        await db
          .update(schema.timetableSlots)
          .set({
            day: slotA.day,
            period: slotA.period,
            classId: slotA.classId,
          })
          .where(eq(schema.timetableSlots.id, slotB.id));

        return NextResponse.json({ success: true, swapped: true });
      }

      // If moving slot A to an empty target cell { classId, day, period }
      if (targetCell) {
        await db
          .update(schema.timetableSlots)
          .set({
            day: targetCell.day,
            period: targetCell.period,
            classId: targetCell.classId || slotA.classId,
          })
          .where(eq(schema.timetableSlots.id, slotA.id));

        return NextResponse.json({ success: true, moved: true });
      }
    }

    const { slotId, targetDay, targetPeriod, newTeacherId, isLocked } = body;

    if (!slotId) {
      return NextResponse.json(
        { success: false, error: "Missing slotId" },
        { status: 400 }
      );
    }

    // 2. Lock / Pin slot
    if (isLocked !== undefined) {
      await db
        .update(schema.timetableSlots)
        .set({
          isLocked: Boolean(isLocked),
        })
        .where(eq(schema.timetableSlots.id, slotId));

      return NextResponse.json({ success: true, slotId, isLocked: Boolean(isLocked) });
    }

    // 3. Changing teacher
    if (newTeacherId) {
      const currentSlot = (await db.select().from(schema.timetableSlots).where(eq(schema.timetableSlots.id, slotId)).limit(1))[0];
      const teacher = await db
        .select()
        .from(schema.teachers)
        .where(eq(schema.teachers.id, newTeacherId))
        .limit(1);

      if (currentSlot && newTeacherId !== "tch-unassigned") {
        let allowsSimultaneous = false;
        if (teacher[0]?.constraints) {
          try {
            const parsed = JSON.parse(teacher[0].constraints);
            allowsSimultaneous = Boolean(parsed.allowSimultaneousSessions);
          } catch (e) {}
        }

        if (!allowsSimultaneous) {
          const allOtherSlots = await db.select().from(schema.timetableSlots);
          const conflict = allOtherSlots.find(
            (s) =>
              s.id !== slotId &&
              s.teacherId === newTeacherId &&
              s.day === currentSlot.day &&
              s.period === currentSlot.period &&
              s.classId !== currentSlot.classId
          );
          if (conflict) {
            return NextResponse.json(
              {
                success: false,
                error: `Ο/Η εκπαιδευτικός διδάσκει ήδη την ώρα αυτή σε άλλο τμήμα (${conflict.classId}). Ενεργοποιήστε την επιλογή «Διατμηματικό» εάν πρόκειται για ομαδική συνεδρία.`,
              },
              { status: 400 }
            );
          }
        }
      }

      await db
        .update(schema.timetableSlots)
        .set({
          teacherId: newTeacherId,
          isSupport: Boolean(teacher[0]?.isSupport),
        })
        .where(eq(schema.timetableSlots.id, slotId));

      return NextResponse.json({ success: true, slotId, teacherId: newTeacherId });
    }

    // 4. Moving day / period
    if (targetDay !== undefined && targetPeriod !== undefined) {
      const currentSlot = (await db.select().from(schema.timetableSlots).where(eq(schema.timetableSlots.id, slotId)).limit(1))[0];
      if (currentSlot && currentSlot.teacherId && currentSlot.teacherId !== "tch-unassigned") {
        const teacher = (await db.select().from(schema.teachers).where(eq(schema.teachers.id, currentSlot.teacherId)).limit(1))[0];
        let allowsSimultaneous = false;
        if (teacher?.constraints) {
          try {
            const parsed = JSON.parse(teacher.constraints);
            allowsSimultaneous = Boolean(parsed.allowSimultaneousSessions);
          } catch (e) {}
        }

        if (!allowsSimultaneous) {
          const allOtherSlots = await db.select().from(schema.timetableSlots);
          const conflict = allOtherSlots.find(
            (s) =>
              s.id !== slotId &&
              s.teacherId === currentSlot.teacherId &&
              s.day === targetDay &&
              s.period === targetPeriod &&
              s.classId !== currentSlot.classId
          );
          if (conflict) {
            return NextResponse.json(
              {
                success: false,
                validationError: `Ο/Η εκπαιδευτικός διδάσκει ήδη την ώρα αυτή σε άλλο τμήμα (${conflict.classId}). Ενεργοποιήστε την επιλογή «Διατμηματικό» εάν πρόκειται για ομαδική συνεδρία.`,
              },
              { status: 400 }
            );
          }
        }
      }

      await db
        .update(schema.timetableSlots)
        .set({
          day: targetDay,
          period: targetPeriod,
        })
        .where(eq(schema.timetableSlots.id, slotId));

      return NextResponse.json({ success: true, slotId, targetDay, targetPeriod });
    }

    // 5. Updating students list
    if (body.students !== undefined) {
      await db
        .update(schema.timetableSlots)
        .set({
          students: Array.isArray(body.students) ? JSON.stringify(body.students) : null,
        })
        .where(eq(schema.timetableSlots.id, slotId));

      return NextResponse.json({ success: true, slotId, students: body.students });
    }

    return NextResponse.json(
      { success: false, error: "No valid action specified" },
      { status: 400 }
    );
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
    const slotId = searchParams.get("id");

    if (slotId) {
      await db
        .delete(schema.timetableSlots)
        .where(eq(schema.timetableSlots.id, slotId));
      return NextResponse.json({ success: true, message: "Η ώρα διαγράφηκε." });
    }

    await db.delete(schema.timetableSlots);
    return NextResponse.json({ success: true, message: "Το πρόγραμμα εκκαθαρίστηκε." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
