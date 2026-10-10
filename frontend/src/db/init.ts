import { client, db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  DEMO_CLASSES,
  DEMO_TEACHERS,
  generateFullSchoolAssignments,
} from "./seed-demo-matrix";

export async function initializeDatabase() {
  console.log("Checking database schema...");

  // Read and execute initial migration SQL
  const migrationsDir = path.join(process.cwd(), "src/db/migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      const migrationPath = path.join(migrationsDir, file);
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
        { index: 1, label: "2η Ώρα", startTime: "09:00", endTime: "09:40" },
        { index: 2, label: "3η Ώρα", startTime: "10:00", endTime: "10:45" },
        { index: 3, label: "4η Ώρα", startTime: "10:45", endTime: "11:30" },
        { index: 4, label: "5η Ώρα", startTime: "11:45", endTime: "12:25" },
        { index: 5, label: "6η Ώρα", startTime: "12:35", endTime: "13:15" },
      ],
      allDayPeriodsCount: 4,
      allDayPeriods: [
        { index: 6, label: "1η Ολοημέρου", startTime: "13:20", endTime: "14:00" },
        { index: 7, label: "2η Ολοημέρου", startTime: "14:15", endTime: "15:00" },
        { index: 8, label: "3η Ολοημέρου", startTime: "15:15", endTime: "16:00" },
        { index: 9, label: "4η Ολοημέρου", startTime: "16:10", endTime: "16:55" },
      ],
    };

    await db.insert(schema.appSettings).values({
      key: "school_config",
      value: JSON.stringify(defaultConfig),
    });
  }

  // Default subjects
  const defaultSubjects = [
    {
      id: "sub-glossa",
      title: "Γλώσσα",
      code: "ΓΛΩΣ",
      color: "#3b82f6",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [9, 9], Β: [9, 9], Γ: [8, 8], Δ: [8, 8], Ε: [7, 7], ΣΤ: [7, 7], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-math",
      title: "Μαθηματικά",
      code: "ΜΑΘ",
      color: "#10b981",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [5, 5], Β: [5, 5], Γ: [4, 4], Δ: [4, 4], Ε: [4, 4], ΣΤ: [4, 4], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-istoria",
      title: "Ιστορία",
      code: "ΙΣΤ",
      color: "#f59e0b",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [2, 2], Δ: [2, 2], Ε: [2, 2], ΣΤ: [2, 2], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-fysiki",
      title: "Φυσικά",
      code: "ΦΥΣ",
      color: "#8b5cf6",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [3, 3], ΣΤ: [3, 3], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-meleti",
      title: "Μελέτη Περιβάλλοντος",
      code: "ΜΕΛ",
      color: "#06b6d4",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [3, 3], Β: [3, 3], Γ: [2, 2], Δ: [2, 2], Ε: [0, 0], ΣΤ: [0, 0], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-geografia",
      title: "Γεωγραφία",
      code: "ΓΕΩ",
      color: "#84cc16",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-kpa",
      title: "Κ.Π.Α.",
      code: "ΚΠΑ",
      color: "#64748b",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-thrisk",
      title: "Θρησκευτικά",
      code: "ΘΡΗΣ",
      color: "#ca8a04",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [1, 1], Δ: [1, 1], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-omilos",
      title: "Εργαστήρια Δεξιοτήτων",
      code: "ΕΔ",
      color: "#d946ef",
      allowedSpecialties: JSON.stringify(["ΠΕ70", "ΠΕ71", "ΠΕ06", "ΠΕ86"]),
      defaultSpecialty: "ΠΕ70",
      classHours: JSON.stringify({ Α: [3, 3], Β: [3, 3], Γ: [2, 2], Δ: [2, 2], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-aggli",
      title: "Αγγλικά",
      code: "ΑΓΓ",
      color: "#ec4899",
      allowedSpecialties: JSON.stringify(["ΠΕ06"]),
      defaultSpecialty: "ΠΕ06",
      classHours: JSON.stringify({ Α: [2, 2], Β: [2, 2], Γ: [3, 3], Δ: [3, 3], Ε: [3, 3], ΣΤ: [3, 3], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-tpe",
      title: "Τ.Π.Ε. (Πληροφορική)",
      code: "ΤΠΕ",
      color: "#6366f1",
      allowedSpecialties: JSON.stringify(["ΠΕ86"]),
      defaultSpecialty: "ΠΕ86",
      classHours: JSON.stringify({ Α: [1, 1], Β: [1, 3], Γ: [1, 1], Δ: [1, 1], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-gymn",
      title: "Φυσική Αγωγή",
      code: "ΦΑ",
      color: "#14b8a6",
      allowedSpecialties: JSON.stringify(["ΠΕ11"]),
      defaultSpecialty: "ΠΕ11",
      classHours: JSON.stringify({ Α: [3, 3], Β: [3, 3], Γ: [3, 3], Δ: [3, 3], Ε: [2, 2], ΣΤ: [2, 2], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-eikast",
      title: "Εικαστικά",
      code: "ΕΙΚ",
      color: "#f97316",
      allowedSpecialties: JSON.stringify(["ΠΕ08"]),
      defaultSpecialty: "ΠΕ08",
      classHours: JSON.stringify({ Α: [1, 1], Β: [1, 1], Γ: [1, 1], Δ: [1, 1], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-mousiki",
      title: "Μουσική",
      code: "ΜΟΥΣ",
      color: "#e11d48",
      allowedSpecialties: JSON.stringify(["ΠΕ79.01"]),
      defaultSpecialty: "ΠΕ79.01",
      classHours: JSON.stringify({ Α: [1, 1], Β: [1, 1], Γ: [1, 1], Δ: [1, 1], Ε: [1, 1], ΣΤ: [1, 1], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-theatro",
      title: "Θεατρική Αγωγή",
      code: "ΘΕΑ",
      color: "#a855f7",
      allowedSpecialties: JSON.stringify(["ΠΕ91.01", "ΠΕ91.02"]),
      defaultSpecialty: "ΠΕ91.01",
      classHours: JSON.stringify({ Α: [1, 1], Β: [1, 1], Γ: [1, 1], Δ: [1, 1], Ε: [0, 0], ΣΤ: [0, 0], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-logo",
      title: "Λογοθεραπεία",
      code: "ΛΟΓΟ",
      color: "#0284c7",
      allowedSpecialties: JSON.stringify(["ΠΕ21"]),
      defaultSpecialty: "ΠΕ21",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [0, 0], ΣΤ: [0, 0], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-psycho",
      title: "Ψυχολογική Υποστήριξη",
      code: "ΨΥΧ",
      color: "#059669",
      allowedSpecialties: JSON.stringify(["ΠΕ23"]),
      defaultSpecialty: "ΠΕ23",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [0, 0], ΣΤ: [0, 0], Ολοήμερο: [0, 0] }),
    },
    {
      id: "sub-ergo",
      title: "Εργοθεραπεία",
      code: "ΕΡΓΟ",
      color: "#d97706",
      allowedSpecialties: JSON.stringify(["ΠΕ29"]),
      defaultSpecialty: "ΠΕ29",
      classHours: JSON.stringify({ Α: [0, 0], Β: [0, 0], Γ: [0, 0], Δ: [0, 0], Ε: [0, 0], ΣΤ: [0, 0], Ολοήμερο: [0, 0] }),
    },
  ];

  // Check if subjects exist
  const existingSubjects = await db.select().from(schema.subjects);
  if (existingSubjects.length === 0) {
    console.log("Seeding default subjects...");
    for (const sub of defaultSubjects) {
      await db.insert(schema.subjects).values(sub);
    }
  } else {
    // Populate any subjects that have missing allowed_specialties or class_hours
    for (const defSub of defaultSubjects) {
      const match = existingSubjects.find((s) => s.id === defSub.id || s.code === defSub.code);
      if (match && (!match.allowedSpecialties || !match.classHours)) {
        await db
          .update(schema.subjects)
          .set({
            allowedSpecialties: defSub.allowedSpecialties,
            defaultSpecialty: defSub.defaultSpecialty,
            classHours: defSub.classHours,
          })
          .where(eq(schema.subjects.id, match.id));
      }
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
  }

  // Check if lesson assignments exist
  const existingAssignments = await db.select().from(schema.lessonAssignments).limit(1);
  if (existingAssignments.length === 0) {
    console.log("Seeding full school curriculum assignments...");
    const fullAssignments = generateFullSchoolAssignments();

    for (const asg of fullAssignments) {
      await db.insert(schema.lessonAssignments).values({
        id: asg.id,
        teacherId: asg.teacherId,
        subjectId: asg.subjectId,
        subGroupId: asg.subGroupId,
        hours: asg.hours,
        isAllDay: asg.isAllDay,
      });
    }
  }

  console.log("Database initialized successfully!");
}
