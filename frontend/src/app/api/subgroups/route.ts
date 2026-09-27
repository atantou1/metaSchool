import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, classId, name, isDefault } = body;

    const subGroupId = id || `grp-${crypto.randomUUID().slice(0, 8)}`;

    const existing = await db
      .select()
      .from(schema.subGroups)
      .where(eq(schema.subGroups.id, subGroupId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.subGroups)
        .set({
          name,
          isDefault: Boolean(isDefault),
        })
        .where(eq(schema.subGroups.id, subGroupId));
    } else {
      await db.insert(schema.subGroups).values({
        id: subGroupId,
        classId,
        name,
        isDefault: Boolean(isDefault),
      });
    }

    return NextResponse.json({ success: true, subGroupId });
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

    // Don't delete if it's default
    const existing = await db
      .select()
      .from(schema.subGroups)
      .where(eq(schema.subGroups.id, id))
      .limit(1);

    if (existing.length > 0 && existing[0].isDefault) {
      return NextResponse.json(
        { success: false, error: "Δεν μπορείτε να διαγράψετε την προεπιλεγμένη ομάδα (Ολομέλεια)." },
        { status: 400 }
      );
    }

    await db.delete(schema.subGroups).where(eq(schema.subGroups.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
