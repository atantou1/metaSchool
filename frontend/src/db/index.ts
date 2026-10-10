import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";

const dbFile = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "metaschool.db")}`;

// Export the raw file path for backup/restore operations
export const rawDbPath = dbFile.startsWith("file:///") 
  ? dbFile.replace("file:///", "") 
  : dbFile.replace("file:", "");

export const client = createClient({
  url: dbFile,
});

export const db = drizzle(client, { schema });
