import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  specialty: text("specialty").notNull(),
  isSupport: integer("is_support", { mode: "boolean" }).default(false).notNull(),
  shortName: text("short_name"),
  isTeaching: integer("is_teaching", { mode: "boolean" }).default(true).notNull(),
  isOnCall: integer("is_on_call", { mode: "boolean" }).default(false).notNull(),
  isMorning: integer("is_morning", { mode: "boolean" }).default(true).notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  maxWeeklyHours: integer("max_weekly_hours").default(24).notNull(),
  color: text("color").default("#71717a").notNull(),
  constraints: text("constraints"), // JSON: availability, maxHoursPerDay, minHoursPerDay, maxConsecutiveHours, maxConsecutiveGaps, maxTotalGaps
  afm: text("afm"),
  adt: text("adt"),
  am: text("am"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"), // Οδός και αριθμός
  city: text("city"), // Πόλη
  postalCode: text("postal_code"), // Τ.Κ.
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  birthYear: text("birth_year"),
  employmentType: text("employment_type").default("permanent"), // "permanent" | "deputy_regular" | "deputy_espa" | "hourly"
  signature: text("signature"), // Base64 data URL
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  color: text("color").default("#71717a").notNull(),
  allowedSpecialties: text("allowed_specialties"), // JSON string e.g. '["ΠΕ70","ΠΕ71"]'
  defaultSpecialty: text("default_specialty"), // Legacy single specialty e.g. "ΠΕ70"
  classHours: text("class_hours"), // JSON string mapping classId to [min, max] hours
  classTeachers: text("class_teachers"), // JSON string mapping classId to teacherId
  classAssignments: text("class_assignments"), // JSON string mapping classId to array of {teacherId: string, hours: [min, max]}
  maxPerDay: integer("max_per_day"), // Max times a class can have this subject per day
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  color: text("color").default("#3b82f6").notNull(),
  shortName: text("short_name"),
  studentsCount: integer("students_count").default(20).notNull(),
  headTeacherId: text("head_teacher_id"),
  room: text("room"),
  isAllDay: integer("is_all_day", { mode: "boolean" }).default(false).notNull(),
  supportSpecialties: text("support_specialties"), // JSON array of specialty codes (e.g. ["ΠΕ26", "ΠΕ29"])
  students: text("students"), // JSON array of student names
  weeklyHoursTarget: integer("weekly_hours_target").default(30).notNull(),
  supportHoursMin: integer("support_hours_min").default(0).notNull(),
  supportHoursMax: integer("support_hours_max").default(0).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
});

export const subGroups = sqliteTable("sub_groups", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  students: text("students"), // JSON array of student names for this subgroup
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
});

export const lessonAssignments = sqliteTable("lesson_assignments", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  subGroupId: text("sub_group_id").notNull().references(() => subGroups.id, { onDelete: "cascade" }),
  hours: integer("hours").notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).default(false).notNull(),
  concurrentGroupId: text("concurrent_group_id"), // Linked assignments that must occur at same slot
});

export const timetableSlots = sqliteTable("timetable_slots", {
  id: text("id").primaryKey(),
  day: integer("day").notNull(), // 0 = Δευτέρα ... 4 = Παρασκευή
  period: integer("period").notNull(), // 0 = 1η ώρα, etc.
  assignmentId: text("assignment_id"),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subGroupId: text("sub_group_id").notNull().references(() => subGroups.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  isSupport: integer("is_support", { mode: "boolean" }).default(false).notNull(),
  layer: integer("layer").default(1).notNull(), // 1 = Core, 2 = Support
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  students: text("students"), // JSON array of student names e.g. '["Γιάννης Π.", "Μαρία Κ."]'
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON payload for periods, timings, school info
});

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),           // "MUST_TEACH", "TIME_WINDOW", etc. (extensible string, not enum)
  enforcement: text("enforcement").default("hard").notNull(), // "hard" | "soft"
  weight: integer("weight").default(100),  // 1-100, relevance only for soft rules
  params: text("params").notNull(),        // JSON payload — shape depends on rule type
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  source: text("source").default("manual").notNull(), // "manual" | "ai"
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slotsData: text("slots_data").notNull(), // JSON payload of the timetable slots
  isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

// Relations
export const classesRelations = relations(classes, ({ many }) => ({
  subGroups: many(subGroups),
  slots: many(timetableSlots),
}));

export const subGroupsRelations = relations(subGroups, ({ one, many }) => ({
  class: one(classes, {
    fields: [subGroups.classId],
    references: [classes.id],
  }),
  assignments: many(lessonAssignments),
  slots: many(timetableSlots),
}));

export const teachersRelations = relations(teachers, ({ many }) => ({
  assignments: many(lessonAssignments),
  slots: many(timetableSlots),
  leaves: many(leaves),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  assignments: many(lessonAssignments),
  slots: many(timetableSlots),
}));

export const lessonAssignmentsRelations = relations(lessonAssignments, ({ one, many }) => ({
  teacher: one(teachers, {
    fields: [lessonAssignments.teacherId],
    references: [teachers.id],
  }),
  subject: one(subjects, {
    fields: [lessonAssignments.subjectId],
    references: [subjects.id],
  }),
  subGroup: one(subGroups, {
    fields: [lessonAssignments.subGroupId],
    references: [subGroups.id],
  }),
  slots: many(timetableSlots),
}));

export const timetableSlotsRelations = relations(timetableSlots, ({ one }) => ({
  assignment: one(lessonAssignments, {
    fields: [timetableSlots.assignmentId],
    references: [lessonAssignments.id],
  }),
  class: one(classes, {
    fields: [timetableSlots.classId],
    references: [classes.id],
  }),
  subGroup: one(subGroups, {
    fields: [timetableSlots.subGroupId],
    references: [subGroups.id],
  }),
  teacher: one(teachers, {
    fields: [timetableSlots.teacherId],
    references: [teachers.id],
  }),
  subject: one(subjects, {
    fields: [timetableSlots.subjectId],
    references: [subjects.id],
  }),
}));

export const leaves = sqliteTable("leaves", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "regular" | "medical" | "special" | "blood" | "parental" | "educational" | "other"
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  daysCount: integer("days_count").notNull(),
  protocolNumber: text("protocol_number"),
  protocolDate: text("protocol_date"),
  reason: text("reason"),
  status: text("status").default("approved").notNull(), // "approved" | "pending" | "rejected"
  documentsData: text("documents_data"), // JSON
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const leavesRelations = relations(leaves, ({ one }) => ({
  teacher: one(teachers, {
    fields: [leaves.teacherId],
    references: [teachers.id],
  }),
}));

