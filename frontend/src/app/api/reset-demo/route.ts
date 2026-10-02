import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { initializeDatabase } from "@/db/init";

export async function POST() {
  try {
    // Delete existing records
    await db.delete(schema.timetableSlots);
    await db.delete(schema.lessonAssignments);
    await db.delete(schema.subGroups);
    await db.delete(schema.classes);
    await db.delete(schema.teachers);
    await db.delete(schema.subjects);
    await db.delete(schema.appSettings);
    await db.delete(schema.rules);

    // Re-initialize with seed data
    await initializeDatabase();

    return NextResponse.json({ success: true, message: "Δεδομένα επαναφέρθηκαν επιτυχώς!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
