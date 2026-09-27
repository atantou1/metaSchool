import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";

const dbFile = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "metaschool.db")}`;

export const client = createClient({
  url: dbFile,
});

export const db = drizzle(client, { schema });
