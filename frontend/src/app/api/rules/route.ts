import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — list all rules
export async function GET() {
  try {
    const allRules = await db.select().from(schema.rules);
    return NextResponse.json({
      success: true,
      rules: allRules.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
        params: r.params ? JSON.parse(r.params) : {},
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST — create a new rule (or update if id exists)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      description,
      type,
      enforcement = "hard",
      weight = 100,
      params,
      isActive = true,
      source = "manual",
    } = body;

    if (!type || !name) {
      return NextResponse.json(
        { success: false, error: "Απαιτούνται τα πεδία 'type' και 'name'" },
        { status: 400 }
      );
    }

    const ruleId = id || `rule-${crypto.randomUUID().slice(0, 8)}`;
    const paramsJson =
      typeof params === "object" && params !== null
        ? JSON.stringify(params)
        : typeof params === "string"
        ? params
        : "{}";

    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(schema.rules)
      .where(eq(schema.rules.id, ruleId))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db
        .update(schema.rules)
        .set({
          name,
          description: description || null,
          type,
          enforcement,
          weight,
          params: paramsJson,
          isActive,
          source,
          updatedAt: now,
        })
        .where(eq(schema.rules.id, ruleId));
    } else {
      // Insert
      await db.insert(schema.rules).values({
        id: ruleId,
        name,
        description: description || null,
        type,
        enforcement,
        weight,
        params: paramsJson,
        isActive,
        source,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true, ruleId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH — update an existing rule (partial)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Απαιτείται 'id'" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(schema.rules)
      .where(eq(schema.rules.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ο κανόνας δεν βρέθηκε" },
        { status: 404 }
      );
    }

    const setData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) setData.name = updates.name;
    if (updates.description !== undefined) setData.description = updates.description;
    if (updates.type !== undefined) setData.type = updates.type;
    if (updates.enforcement !== undefined) setData.enforcement = updates.enforcement;
    if (updates.weight !== undefined) setData.weight = updates.weight;
    if (updates.isActive !== undefined) setData.isActive = updates.isActive;
    if (updates.source !== undefined) setData.source = updates.source;
    if (updates.params !== undefined) {
      setData.params =
        typeof updates.params === "object"
          ? JSON.stringify(updates.params)
          : updates.params;
    }

    await db.update(schema.rules).set(setData).where(eq(schema.rules.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE — delete a rule by id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Απαιτείται 'id'" },
        { status: 400 }
      );
    }

    await db.delete(schema.rules).where(eq(schema.rules.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
