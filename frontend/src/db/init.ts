import { client, db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  DEMO_CLASSES,
  DEMO_TEACHERS,
  PROTOTYPE_RAW_MATRIX,
} from "./seed-demo-matrix";

export async function initializeDatabase() {
  console.log("Checking database schema...");

  // Read and execute initial migration SQL
  const migrationPath = path.join(
    process.cwd(),
    "src/db/migrations/0000_skinny_tony_stark.sql"
  );
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err: unknown) {
        // Table may already exist
      }
    }
  }

  // Check if school settings exist
  const existingSettings = await db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, "school_config"))
    .limit(1);

  if (existingSettings.length === 0) {
    console.log("Seeding default school configuration...");
    const defaultConfig = {
      schoolName: "1ο Πειραματικό Δημοτικό Σχολείο",
      schoolYear: "2026-2027",
      days: ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"],
      periods: [
        { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
        { index: 1, label: "2η Ώρα", startTime: "09:05", endTime: "09:50" },
        { index: 2, label: "3η Ώρα", startTime: "10:05", endTime: "10:50" },
        { index: 3, label: "4η Ώρα", startTime: "10:55", endTime: "11:40" },
        { index: 4, label: "5η Ώρα", startTime: "11:55", endTime: "12:35" },
        { index: 5, label: "6η Ώρα", startTime: "12:40", endTime: "13:15" },
      ],
      allDayPeriods: [
        { index: 6, label: "1η Ολοημέρου", startTime: "13:20", endTime: "14:00" },
        { index: 7, label: "2η Ολοημέρου", startTime: "14:15", endTime: "15:00" },
        { index: 8, label: "3η Ολοημέρου", startTime: "15:15", endTime: "16:00" },
        { index: 9, label: "4η Ολοημέρου", startTime: "16:15", endTime: "17:00" },
      ],
    };

    await db.insert(schema.appSettings).values({
      key: "school_config",
      value: JSON.stringify(defaultConfig),
    });
  }

  // Check if subjects exist
  const existingSubjects = await db.select().from(schema.subjects).limit(1);
  if (existingSubjects.length === 0) {
    console.log("Seeding default subjects...");
    const defaultSubjects = [
      { id: "sub-glossa", title: "Γλώσσα", code: "ΓΛΩΣ", color: "#3b82f6" },
      { id: "sub-math", title: "Μαθηματικά", code: "ΜΑΘ", color: "#10b981" },
      { id: "sub-istoria", title: "Ιστορία", code: "ΙΣΤ", color: "#f59e0b" },
      { id: "sub-fysiki", title: "Φυσικά", code: "ΦΥΣ", color: "#8b5cf6" },
      { id: "sub-meleti", title: "Μελέτη Περιβάλλοντος", code: "ΜΕΛ", color: "#06b6d4" },
      { id: "sub-aggli", title: "Αγγλικά", code: "ΑΓΓ", color: "#ec4899" },
      { id: "sub-tpe", title: "Τ.Π.Ε. (Πληροφορική)", code: "ΤΠΕ", color: "#6366f1" },
      { id: "sub-gymn", title: "Φυσική Αγωγή", code: "ΦΑ", color: "#14b8a6" },
      { id: "sub-eikast", title: "Εικαστικά", code: "ΕΙΚ", color: "#f97316" },
      { id: "sub-mousiki", title: "Μουσική", code: "ΜΟΥΣ", color: "#e11d48" },
      { id: "sub-theatro", title: "Θεατρική Αγωγή", code: "ΘΕΑ", color: "#a855f7" },
      { id: "sub-geografia", title: "Γεωγραφία", code: "ΓΕΩ", color: "#84cc16" },
      { id: "sub-kpa", title: "Κ.Π.Α.", code: "ΚΠΑ", color: "#64748b" },
      { id: "sub-omilos", title: "Εργαστήρια Δεξιοτήτων", code: "ΕΔ", color: "#d946ef" },
      { id: "sub-logo", title: "Λογοθεραπεία", code: "ΛΟΓΟ", color: "#0284c7" },
      { id: "sub-psycho", title: "Ψυχολογική Υποστήριξη", code: "ΨΥΧ", color: "#059669" },
      { id: "sub-ergo", title: "Εργοθεραπεία", code: "ΕΡΓΟ", color: "#d97706" },
    ];

    for (const sub of defaultSubjects) {
      await db.insert(schema.subjects).values(sub);
    }
  }

  // Check if classes exist
  const existingClasses = await db.select().from(schema.classes).limit(1);
  if (existingClasses.length === 0) {
    console.log("Seeding default classes and sub-groups...");
    for (const cls of DEMO_CLASSES) {
      await db.insert(schema.classes).values(cls);
      await db.insert(schema.subGroups).values({
        id: `grp-${cls.id}-main`,
        classId: cls.id,
        name: "Ολομέλεια",
        isDefault: true,
      });
    }

    // Add sample split groups for class A1
    await db.insert(schema.subGroups).values([
      { id: "grp-cls-a1-subA", classId: "cls-a1", name: "Ομάδα Α", isDefault: false },
      { id: "grp-cls-a1-subB", classId: "cls-a1", name: "Ομάδα Β", isDefault: false },
    ]);
  }

  // Check if teachers exist
  const existingTeachers = await db.select().from(schema.teachers).limit(1);
  if (existingTeachers.length === 0) {
    console.log("Seeding default teachers...");
    for (const tch of DEMO_TEACHERS) {
      // Some teachers have specific days (e.g. music on Tue/Thu, arts on Mon/Wed/Fri)
      let availableDays = [0, 1, 2, 3, 4];
      if (tch.id === "tch-zer") availableDays = [1, 3]; // Music on Tue, Thu
      if (tch.id === "tch-vas") availableDays = [0, 2, 4]; // Theater on Mon, Wed, Fri
      if (tch.id === "tch-ale") availableDays = [1, 2, 3]; // Arts on Tue, Wed, Thu

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
  }

  // Check if lesson assignments & timetable slots exist
  const existingSlots = await db.select().from(schema.timetableSlots).limit(1);
  if (existingSlots.length === 0) {
    console.log("Seeding prototype timetable slots & assignments...");
    let slotCounter = 1;
    let asgCounter = 1;

    for (const item of PROTOTYPE_RAW_MATRIX) {
      for (const teacherId of item.teachers) {
        const asgId = `asg-demo-${asgCounter++}`;
        const slotId = `slot-demo-${slotCounter++}`;
        const isSupport = teacherId === "tch-swt";
        const subjectId = isSupport ? "sub-logo" : "sub-glossa";

        // Create assignment record
        await db.insert(schema.lessonAssignments).values({
          id: asgId,
          teacherId,
          subjectId,
          subGroupId: `grp-${item.classId}-main`,
          hours: 1,
          isAllDay: item.period >= 6,
        });

        // Create slot record
        await db.insert(schema.timetableSlots).values({
          id: slotId,
          day: item.day,
          period: item.period,
          assignmentId: asgId,
          classId: item.classId,
          subGroupId: `grp-${item.classId}-main`,
          teacherId,
          subjectId,
          isSupport,
          layer: isSupport ? 2 : 1,
        });
      }
    }
  }

  console.log("Database initialized successfully!");
}
