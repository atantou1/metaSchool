import { db } from "./index";
import * as schema from "./schema";
import { DEMO_TEACHERS } from "./seed-demo-matrix";

async function syncTeachers() {
  console.log("Synchronizing teachers in database...");
  try {
    // Delete existing teachers
    await db.delete(schema.teachers);

    console.log(`Inserting ${DEMO_TEACHERS.length} teachers...`);
    for (const tch of DEMO_TEACHERS) {
      let availableDays = [0, 1, 2, 3, 4];
      if (tch.id === "tch-krg" || tch.id === "tch-lan") availableDays = [1, 3]; // Music on Tue, Thu
      if (tch.id === "tch-mpt") availableDays = [0, 2, 4]; // Theater on Mon, Wed, Fri
      if (tch.id === "tch-tsa") availableDays = [1, 2, 3]; // Arts on Tue, Wed, Thu

      await db.insert(schema.teachers).values({
        ...tch,
        constraints: JSON.stringify({
          availableDays,
          maxHoursPerDay: 5,
          minHoursPerDay: 2,
          maxConsecutiveHours: 4,
          maxConsecutiveGaps: 1,
          maxTotalGapsPerWeek: 2,
        }),
      });
    }

    console.log("Teachers successfully synchronized!");
    process.exit(0);
  } catch (error) {
    console.error("Error syncing teachers:", error);
    process.exit(1);
  }
}

syncTeachers();
