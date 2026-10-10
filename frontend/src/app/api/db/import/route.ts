import { NextResponse } from "next/server";
import { rawDbPath, client } from "@/db";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // In a real production scenario with many users, we should not do this.
    // However, since this is a local offline desktop app, replacing the SQLite file directly is fine.
    
    // Close the existing client to release locks on Windows
    client.close();

    // Overwrite the file
    fs.writeFileSync(rawDbPath, buffer);

    // Give it a moment to write, then kill the process so Tauri or the user can restart it
    setTimeout(() => {
      process.exit(0);
    }, 1000);

    return NextResponse.json({ success: true, message: "Database imported successfully. Application will now restart." });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import database", details: error.message }, { status: 500 });
  }
}
