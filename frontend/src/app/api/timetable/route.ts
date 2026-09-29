import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { initializeDatabase } from "@/db/init";

export async function GET() {
  try {
    // Ensure DB is initialized with seed data if needed
    await initializeDatabase();

    const [
      allTeachers,
      allSubjects,
      allClasses,
      allSubGroups,
      allAssignments,
      allSlots,
      allSettings,
    ] = await Promise.all([
      db.select().from(schema.teachers),
      db.select().from(schema.subjects),
      db.select().from(schema.classes),
      db.select().from(schema.subGroups),
      db.select().from(schema.lessonAssignments),
      db.select().from(schema.timetableSlots),
      db.select().from(schema.appSettings),
    ]);

    // Parse school config
    const configSetting = allSettings.find((s) => s.key === "school_config");
    let schoolConfig = null;
    if (configSetting) {
      try {
        schoolConfig = JSON.parse(configSetting.value);
      } catch (e) {
        console.error("Failed to parse school_config", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        teachers: allTeachers.map((t) => ({
          ...t,
          isSupport: Boolean(t.isSupport),
          isTeaching: Boolean(t.isTeaching),
          isOnCall: Boolean(t.isOnCall),
          isMorning: Boolean(t.isMorning),
          isAllDay: Boolean(t.isAllDay),
          isActive: Boolean(t.isActive),
          constraints: t.constraints ? JSON.parse(t.constraints) : null,
        })),
        subjects: allSubjects,
        classes: allClasses.map((c) => ({
          ...c,
          isAllDay: Boolean(c.isAllDay),
          supportSpecialties: c.supportSpecialties ? JSON.parse(c.supportSpecialties) : [],
        })),
        subGroups: allSubGroups.map((sg) => ({
          ...sg,
          isDefault: Boolean(sg.isDefault),
        })),
        assignments: allAssignments.map((a) => ({
          ...a,
          isAllDay: Boolean(a.isAllDay),
        })),
        slots: allSlots.map((s) => ({
          ...s,
          isSupport: Boolean(s.isSupport),
          isLocked: Boolean(s.isLocked),
        })),
        schoolConfig,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch timetable data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load timetable data" },
      { status: 500 }
    );
  }
}
