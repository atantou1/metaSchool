import { NextResponse } from "next/server";
import { rawDbPath } from "@/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!fs.existsSync(rawDbPath)) {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(rawDbPath);
    const fileName = `metaschool-backup-${new Date().toISOString().split('T')[0]}.db`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export database", details: error.message }, { status: 500 });
  }
}
