import { db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting sync of slots & assignments subjects based on teacher specialty...");

  const teachers = await db.select().from(schema.teachers);
  const subjects = await db.select().from(schema.subjects);
  const slots = await db.select().from(schema.timetableSlots);

  const tchMap = new Map(teachers.map((t) => [t.id, t]));

  let updatedSlots = 0;
  let updatedAssignments = 0;

  for (const slot of slots) {
    const teacher = tchMap.get(slot.teacherId);
    if (!teacher) continue;

    const spec = (teacher.specialty || "").trim().toUpperCase();
    if (spec === "ΠΕ70" || spec === "ΠΕ71") {
      // General teachers / EAE - leave as is or sub-glossa
      continue;
    }

    // Match subject by teacher specialty
    const match = subjects.find((s) => {
      if (s.id === "sub-glossa") return false;
      if (s.defaultSpecialty && s.defaultSpecialty.trim().toUpperCase() === spec) return true;
      try {
        const allowed = s.allowedSpecialties ? JSON.parse(s.allowedSpecialties) : [];
        if (Array.isArray(allowed) && allowed.some((x: string) => x.trim().toUpperCase() === spec)) {
          return true;
        }
      } catch {}
      return false;
    });

    if (match && slot.subjectId !== match.id) {
      await db
        .update(schema.timetableSlots)
        .set({ subjectId: match.id })
        .where(eq(schema.timetableSlots.id, slot.id));
      updatedSlots++;

      if (slot.assignmentId) {
        await db
          .update(schema.lessonAssignments)
          .set({ subjectId: match.id })
          .where(eq(schema.lessonAssignments.id, slot.assignmentId));
        updatedAssignments++;
      }
    }
  }

  console.log(`Successfully updated ${updatedSlots} slots and ${updatedAssignments} assignments!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error syncing slots subjects:", err);
  process.exit(1);
});
