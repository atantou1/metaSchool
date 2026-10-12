import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { initializeDatabase } from "@/db/init";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await initializeDatabase();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    let query = db
      .select({
        id: schema.leaves.id,
        teacherId: schema.leaves.teacherId,
        type: schema.leaves.type,
        startDate: schema.leaves.startDate,
        endDate: schema.leaves.endDate,
        daysCount: schema.leaves.daysCount,
        protocolNumber: schema.leaves.protocolNumber,
        protocolDate: schema.leaves.protocolDate,
        reason: schema.leaves.reason,
        status: schema.leaves.status,
        documentsData: schema.leaves.documentsData,
        createdAt: schema.leaves.createdAt,
        updatedAt: schema.leaves.updatedAt,
        teacher: {
          id: schema.teachers.id,
          firstName: schema.teachers.firstName,
          lastName: schema.teachers.lastName,
          specialty: schema.teachers.specialty,
          shortName: schema.teachers.shortName,
          afm: schema.teachers.afm,
          adt: schema.teachers.adt,
          am: schema.teachers.am,
          phone: schema.teachers.phone,
          email: schema.teachers.email,
          address: schema.teachers.address,
          fatherName: schema.teachers.fatherName,
          motherName: schema.teachers.motherName,
          birthYear: schema.teachers.birthYear,
          employmentType: schema.teachers.employmentType,
          signature: schema.teachers.signature,
          color: schema.teachers.color,
        },
      })
      .from(schema.leaves)
      .leftJoin(schema.teachers, eq(schema.leaves.teacherId, schema.teachers.id))
      .orderBy(desc(schema.leaves.startDate));

    const records = await query;

    const filtered = teacherId
      ? records.filter((r) => r.teacherId === teacherId)
      : records;

    const formatted = filtered.map((r) => ({
      ...r,
      documentsData: r.documentsData ? JSON.parse(r.documentsData) : null,
    }));

    return NextResponse.json({ success: true, leaves: formatted });
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
    const {
      id,
      teacherId,
      type,
      startDate,
      endDate,
      daysCount,
      protocolNumber,
      protocolDate,
      reason,
      status,
      documentsData,
      // Optional: inline updates to teacher profile
      teacherUpdate,
    } = body;

    if (!teacherId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Συμπληρώστε όλα τα απαιτούμενα πεδία (Εκπαιδευτικός, Τύπος, Ημερομηνίες)" },
        { status: 400 }
      );
    }

    // If teacherUpdate is provided, update teacher details directly
    if (teacherUpdate && typeof teacherUpdate === "object") {
      const updateObj: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (teacherUpdate.afm !== undefined) updateObj.afm = teacherUpdate.afm;
      if (teacherUpdate.adt !== undefined) updateObj.adt = teacherUpdate.adt;
      if (teacherUpdate.am !== undefined) updateObj.am = teacherUpdate.am;
      if (teacherUpdate.phone !== undefined) updateObj.phone = teacherUpdate.phone;
      if (teacherUpdate.email !== undefined) updateObj.email = teacherUpdate.email;
      if (teacherUpdate.address !== undefined) updateObj.address = teacherUpdate.address;
      if (teacherUpdate.fatherName !== undefined) updateObj.fatherName = teacherUpdate.fatherName;
      if (teacherUpdate.motherName !== undefined) updateObj.motherName = teacherUpdate.motherName;
      if (teacherUpdate.birthYear !== undefined) updateObj.birthYear = teacherUpdate.birthYear;
      if (teacherUpdate.employmentType !== undefined) updateObj.employmentType = teacherUpdate.employmentType;
      if (teacherUpdate.signature !== undefined) updateObj.signature = teacherUpdate.signature;

      await db
        .update(schema.teachers)
        .set(updateObj)
        .where(eq(schema.teachers.id, teacherId));
    }

    const leaveId = id || `leave-${crypto.randomUUID().slice(0, 8)}`;
    const docsJson = documentsData ? JSON.stringify(documentsData) : null;
    const calcDays = Number(daysCount) > 0 ? Number(daysCount) : 1;

    const existing = await db
      .select()
      .from(schema.leaves)
      .where(eq(schema.leaves.id, leaveId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.leaves)
        .set({
          teacherId,
          type,
          startDate,
          endDate,
          daysCount: calcDays,
          protocolNumber: protocolNumber || null,
          protocolDate: protocolDate || null,
          reason: reason || null,
          status: status || "approved",
          documentsData: docsJson,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.leaves.id, leaveId));
    } else {
      await db.insert(schema.leaves).values({
        id: leaveId,
        teacherId,
        type,
        startDate,
        endDate,
        daysCount: calcDays,
        protocolNumber: protocolNumber || null,
        protocolDate: protocolDate || null,
        reason: reason || null,
        status: status || "approved",
        documentsData: docsJson,
      });
    }

    return NextResponse.json({ success: true, leaveId });
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
        { success: false, error: "Δεν δόθηκε αναγνωριστικό άδειας" },
        { status: 400 }
      );
    }

    await db.delete(schema.leaves).where(eq(schema.leaves.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
