import { db } from "./frontend/src/db";
import * as schema from "./frontend/src/db/schema";
import { sql } from "drizzle-orm";

async function check() {
  const allTeachers = await db.select().from(schema.teachers);
  const allClasses = await db.select().from(schema.classes);
  const allSubjects = await db.select().from(schema.subjects);
  
  let totalTeacherHours = 0;
  for (const t of allTeachers) {
    if (t.isActive && t.isTeaching && !t.isSupport && t.id !== 'tch-unassigned') {
      totalTeacherHours += (t.maxWeeklyHours || 0);
    }
  }

  let totalClassHours = 0;
  // Actually, required hours is sum(class_subject_hours).
  // I can just query lessonAssignments
  const assignments = await db.select().from(schema.lessonAssignments);
  let totalAssigned = 0;
  for (const a of assignments) {
      if (a.teacherId !== 'tch-unassigned') {
          totalAssigned += a.hours;
      }
  }
  
  console.log("Total Teacher Available Hours (Weekly Contract):", totalTeacherHours);
  console.log("Total Assigned Hours (from assignments):", totalAssigned);

  let activeMainClasses = 0;
  for (const c of allClasses) {
      activeMainClasses++;
  }
  
  console.log("Active Classes:", activeMainClasses);
  console.log("Required Slots for main classes (assuming 6 periods * 5 days = 30):", activeMainClasses * 30);
  
  console.log("Teachers list:");
  allTeachers.forEach(t => {
      console.log(`- ${t.firstName} ${t.lastName} (Active: ${t.isActive}, Teaching: ${t.isTeaching}, Hours: ${t.maxWeeklyHours}, Support: ${t.isSupport})`);
  });
  
  process.exit(0);
}

check();
