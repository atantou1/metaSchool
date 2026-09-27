import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import path from "path";

export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "src/db/migrations");
  try {
    await migrate(db, { migrationsFolder });
    console.log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Failed to run migrations:", error);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  runMigrations();
}
