import { db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { stripGreekAccents } from "../lib/teacher-utils";

async function main() {
  console.log("Updating teacher short names to 4-letter unaccented uppercase...");
  const teachersList = await db.select().from(schema.teachers);
  console.log(`Found ${teachersList.length} teachers.`);

  for (const t of teachersList) {
    if (t.id === "tch-unassigned") continue;
    const cleanLast = stripGreekAccents(t.lastName.trim());
    const newShortName = cleanLast.substring(0, 4);

    await db
      .update(schema.teachers)
      .set({ shortName: newShortName })
      .where(eq(schema.teachers.id, t.id));

    console.log(`Updated [${t.id}] ${t.lastName} ${t.firstName} -> shortName: ${newShortName}`);
  }

  console.log("Teacher short names successfully updated in database!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error updating teacher short names:", err);
  process.exit(1);
});
