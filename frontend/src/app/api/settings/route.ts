import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keys = searchParams.get("keys"); // Optional comma-separated keys

  try {
    let settings;
    if (keys) {
      const keyArray = keys.split(",");
      settings = await db
        .select()
        .from(appSettings)
        .where(inArray(appSettings.key, keyArray));
    } else {
      settings = await db.select().from(appSettings);
    }

    // Convert array to a key-value object
    const settingsObject = settings.reduce((acc, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json(); // Expected format: { "key1": value1, "key2": value2 }
    
    // Process all updates in a transaction or individually
    for (const [key, value] of Object.entries(data)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await db
        .insert(appSettings)
        .values({
          key,
          value: stringValue,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: stringValue },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
