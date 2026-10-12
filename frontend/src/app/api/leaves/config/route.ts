import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabase } from "@/db/init";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeDatabase();
    const schoolProfileRow = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, "school_profile"))
      .limit(1);

    const leaveTypesRow = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, "leave_types_config"))
      .limit(1);

    const schoolProfile = schoolProfileRow.length > 0 && schoolProfileRow[0].value
      ? JSON.parse(schoolProfileRow[0].value)
      : null;

    const leaveTypes = leaveTypesRow.length > 0 && leaveTypesRow[0].value
      ? JSON.parse(leaveTypesRow[0].value)
      : [];

    return NextResponse.json({
      success: true,
      schoolProfile,
      leaveTypes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolProfile, leaveTypes } = body;

    if (schoolProfile) {
      const existing = await db
        .select()
        .from(schema.appSettings)
        .where(eq(schema.appSettings.key, "school_profile"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.appSettings)
          .set({ value: JSON.stringify(schoolProfile) })
          .where(eq(schema.appSettings.key, "school_profile"));
      } else {
        await db.insert(schema.appSettings).values({
          key: "school_profile",
          value: JSON.stringify(schoolProfile),
        });
      }
    }

    if (leaveTypes) {
      const existing = await db
        .select()
        .from(schema.appSettings)
        .where(eq(schema.appSettings.key, "leave_types_config"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.appSettings)
          .set({ value: JSON.stringify(leaveTypes) })
          .where(eq(schema.appSettings.key, "leave_types_config"));
      } else {
        await db.insert(schema.appSettings).values({
          key: "leave_types_config",
          value: JSON.stringify(leaveTypes),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
