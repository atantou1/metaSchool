import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
// Use native crypto.randomUUID()

const SOLVER_API_URL = process.env.SOLVER_API_URL || "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // 1. Fetch current database state
    const [
      allTeachers,
      allSubjects,
      allClasses,
      allSubGroups,
      allAssignments,
      allSettings,
      allSlots,
      allRules,
    ] = await Promise.all([
      db.select().from(schema.teachers),
      db.select().from(schema.subjects),
      db.select().from(schema.classes),
      db.select().from(schema.subGroups),
      db.select().from(schema.lessonAssignments),
      db.select().from(schema.appSettings),
      db.select().from(schema.timetableSlots),
      db.select().from(schema.rules),
    ]);

    const lockedFixedSlots = allSlots
      .filter((s) => s.isLocked && !s.isSupport)
      .map((s) => ({
        assignmentId: s.assignmentId,
        day: s.day,
        period: s.period,
        teacherId: s.teacherId,
        subjectId: s.subjectId,
        classId: s.classId,
        subGroupId: s.subGroupId,
      }));
    const fixedSlots = [...(body.fixedSlots || []), ...lockedFixedSlots];

    const configSetting = allSettings.find((s) => s.key === "school_config");
    let schoolConfig = {
      schoolName: "metaSchool",
      schoolYear: "2026-2027",
      days: ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"],
      periods: [
        { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
        { index: 1, label: "2η Ώρα", startTime: "09:05", endTime: "09:50" },
        { index: 2, label: "3η Ώρα", startTime: "10:05", endTime: "10:50" },
        { index: 3, label: "4η Ώρα", startTime: "10:55", endTime: "11:40" },
        { index: 4, label: "5η Ώρα", startTime: "11:55", endTime: "12:35" },
        { index: 5, label: "6η Ώρα", startTime: "12:40", endTime: "13:15" },
      ],
      allDayPeriods: [],
    };
    if (configSetting) {
      try {
        schoolConfig = JSON.parse(configSetting.value);
      } catch (e) {}
    }

    const forceExtremeHoursSetting = allSettings.find((s) => s.key === "timetable.force_extreme_hours");
    let requireFirstAndLastHour = false;
    if (forceExtremeHoursSetting) {
      try {
        requireFirstAndLastHour = JSON.parse(forceExtremeHoursSetting.value) === true || forceExtremeHoursSetting.value === "true";
      } catch {
        requireFirstAndLastHour = forceExtremeHoursSetting.value === "true";
      }
    }

    // 2. Prepare payload for Python OR-Tools sidecar
    const payload = {
      teachers: allTeachers.map((t) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        specialty: t.specialty,
        isSupport: Boolean(t.isSupport),
        isMorning: t.isMorning !== undefined && t.isMorning !== null ? Boolean(t.isMorning) : true,
        isAllDay: Boolean(t.isAllDay),
        isTeaching: Boolean(t.isTeaching),
        isActive: Boolean(t.isActive),
        maxWeeklyHours: t.maxWeeklyHours ?? 24,
        color: t.color,
        constraints: t.constraints ? JSON.parse(t.constraints) : null,
      })),
      subjects: allSubjects.map((s) => ({
        id: s.id,
        title: s.title,
        code: s.code,
        color: s.color,
        allowedSpecialties: s.allowedSpecialties ? JSON.parse(s.allowedSpecialties) : (s.defaultSpecialty ? [s.defaultSpecialty] : []),
        classHours: s.classHours ? JSON.parse(s.classHours) : {},
        classTeachers: s.classTeachers ? JSON.parse(s.classTeachers) : {},
        classAssignments: s.classAssignments ? JSON.parse(s.classAssignments) : {},
        maxPerDay: s.maxPerDay,
      })),
      classes: allClasses.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        headTeacherId: c.headTeacherId ?? null,
        isAllDay: Boolean(c.isAllDay),
        weeklyHoursTarget: c.weeklyHoursTarget ?? 30,
        supportHoursMin: c.supportHoursMin,
        supportHoursMax: c.supportHoursMax,
        orderIndex: c.orderIndex,
      })),
      subGroups: allSubGroups.map((sg) => ({
        id: sg.id,
        classId: sg.classId,
        name: sg.name,
        isDefault: Boolean(sg.isDefault),
      })),
      assignments: allAssignments.map((a) => ({
        id: a.id,
        teacherId: a.teacherId,
        subjectId: a.subjectId,
        subGroupId: a.subGroupId,
        hours: a.hours,
        isAllDay: Boolean(a.isAllDay),
        concurrentGroupId: a.concurrentGroupId,
      })),
      schoolConfig,
      fixedSlots,
      customRules: allRules
        .filter((r) => r.isActive)
        .map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? null,
          rulePayload: {
            type: r.type,
            enforcement: r.enforcement,
            weight: r.weight ?? 100,
            params: r.params ? JSON.parse(r.params) : {},
          },
          isActive: Boolean(r.isActive),
        })),
      requireFirstAndLastHour,
    };

    // 3. Call FastAPI solver
    let solverRes: Response;
    try {
      solverRes = await fetch(`${SOLVER_API_URL}/api/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (netErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Ο Python Solver (FastAPI sidecar) δεν αποκρίνεται στο http://127.0.0.1:8000. Βεβαιωθείτε ότι εκτελείται.",
          details: netErr.message,
        },
        { status: 503 }
      );
    }

    if (!solverRes.ok) {
      const errText = await solverRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `Σφάλμα από τον αλγόριθμο επίλυσης: ${errText}`,
        },
        { status: 500 }
      );
    }

    const result = await solverRes.json();

    if (result.status === "INFEASIBLE") {
      return NextResponse.json({
        success: false,
        status: "INFEASIBLE",
        conflicts: result.conflicts || ["Αδύνατη η επίλυση με τους τρέχοντες περιορισμούς."],
        diagnosticItems: result.diagnosticItems || [],
        diagnostics: result.diagnostics,
      });
    }

    // 4. Save slots to SQLite
    // Ensure all subGroups referenced in slots exist in DB
    const existingSubGroupIds = new Set(allSubGroups.map((sg) => sg.id));
    if (result.slots && result.slots.length > 0) {
      for (const slot of result.slots) {
        if (!existingSubGroupIds.has(slot.subGroupId)) {
          const isA = slot.subGroupId.endsWith("subA");
          const isB = slot.subGroupId.endsWith("subB");
          const isC = slot.subGroupId.endsWith("subC");
          const name = isA ? "Ομάδα Α" : isB ? "Ομάδα Β" : isC ? "Ομάδα Γ" : "Ολομέλεια";
          try {
            await db.insert(schema.subGroups).values({
              id: slot.subGroupId,
              classId: slot.classId,
              name,
              isDefault: !isA && !isB && !isC,
            });
            existingSubGroupIds.add(slot.subGroupId);
          } catch (e) {}
        }
      }
    }

    // Clear old timetable slots
    await db.delete(schema.timetableSlots);

    // Insert new slots
    if (result.slots && result.slots.length > 0) {
      for (const slot of result.slots) {
        const isLocked = lockedFixedSlots.some(
          (locked) =>
            locked.day === slot.day &&
            locked.period === slot.period &&
            locked.teacherId === slot.teacherId &&
            locked.classId === slot.classId &&
            locked.subjectId === slot.subjectId &&
            locked.subGroupId === slot.subGroupId
        );

        await db.insert(schema.timetableSlots).values({
          id: slot.id || `slot-${crypto.randomUUID().slice(0, 8)}`,
          day: slot.day,
          period: slot.period,
          assignmentId: slot.assignmentId ?? null,
          classId: slot.classId,
          subGroupId: slot.subGroupId,
          teacherId: slot.teacherId,
          subjectId: slot.subjectId,
          isSupport: slot.isSupport ?? false,
          layer: slot.layer || 1,
          isLocked,
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      solveTimeSeconds: result.solveTimeSeconds,
      slotsCount: result.slots.length,
      slots: result.slots,
      diagnostics: result.diagnostics,
    });
  } catch (error: any) {
    console.error("Solver error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to solve timetable" },
      { status: 500 }
    );
  }
}
