import { db } from "./db";
import * as schema from "./db/schema";
import fs from "fs";

async function exportPayload() {
  const [
    allTeachers,
    allSubjects,
    allClasses,
    allSubGroups,
    allAssignments,
    allSettings,
    allRules,
    allSchedules
  ] = await Promise.all([
    db.select().from(schema.teachers),
    db.select().from(schema.subjects),
    db.select().from(schema.classes),
    db.select().from(schema.subGroups),
    db.select().from(schema.lessonAssignments),
    db.select().from(schema.appSettings),
    db.select().from(schema.rules),
    db.select().from(schema.schedules),
  ]);

  const yttySchedule = allSchedules.find(s => s.name === "υτυτ");
  if (!yttySchedule) {
    console.error("υτυτ schedule not found");
    process.exit(1);
  }

  const slots = JSON.parse(yttySchedule.slotsData);
  const fixedSlots = slots.map((s: any) => ({
    assignmentId: s.assignmentId,
    day: s.day,
    period: s.period,
    teacherId: s.teacherId,
    subjectId: s.subjectId,
    classId: s.classId,
    subGroupId: s.subGroupId,
  }));

  const configSetting = allSettings.find((s) => s.key === "school_config");
  let schoolConfig = {
    schoolName: "metaSchool",
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
    allDayPeriods: [],
  };
  if (configSetting) {
    try {
      schoolConfig = JSON.parse(configSetting.value);
    } catch (e) {}
  }

  const payload = {
    teachers: allTeachers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      specialty: t.specialty,
      isSupport: Boolean(t.isSupport),
      isMorning: t.isMorning !== undefined && t.isMorning !== null ? Boolean(t.isMorning) : true,
      isAllDay: Boolean(t.isAllDay),
      isTeaching: Boolean(t.isTeaching),
      isActive: Boolean(t.isActive),
      maxWeeklyHours: t.maxWeeklyHours ?? 24,
      color: t.color,
      constraints: t.constraints ? JSON.parse(t.constraints) : null,
    })),
    subjects: allSubjects.map((s) => ({
      id: s.id,
      title: s.title,
      code: s.code,
      color: s.color,
      allowedSpecialties: s.allowedSpecialties ? JSON.parse(s.allowedSpecialties) : (s.defaultSpecialty ? [s.defaultSpecialty] : []),
      classHours: s.classHours ? JSON.parse(s.classHours) : {},
      classTeachers: s.classTeachers ? JSON.parse(s.classTeachers) : {},
      maxPerDay: s.maxPerDay,
    })),
    classes: allClasses.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      headTeacherId: c.headTeacherId ?? null,
      isAllDay: Boolean(c.isAllDay),
      weeklyHoursTarget: c.weeklyHoursTarget ?? 30,
      supportHoursMin: c.supportHoursMin,
      supportHoursMax: c.supportHoursMax,
      orderIndex: c.orderIndex,
    })),
    subGroups: allSubGroups.map((sg) => ({
      id: sg.id,
      classId: sg.classId,
      name: sg.name,
      isDefault: Boolean(sg.isDefault),
    })),
    assignments: allAssignments.map((a) => ({
      id: a.id,
      teacherId: a.teacherId,
      subjectId: a.subjectId,
      subGroupId: a.subGroupId,
      hours: a.hours,
      isAllDay: Boolean(a.isAllDay),
      concurrentGroupId: a.concurrentGroupId,
    })),
    schoolConfig,
    fixedSlots,
    customRules: allRules
      .filter((r) => r.isActive)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        rulePayload: {
          type: r.type,
          enforcement: r.enforcement,
          weight: r.weight ?? 100,
          params: r.params ? JSON.parse(r.params) : {},
        },
        isActive: Boolean(r.isActive),
      })),
  };

  fs.writeFileSync("payload.json", JSON.stringify(payload, null, 2));
  console.log("Payload saved to payload.json");
  process.exit(0);
}

exportPayload().catch(console.error);
