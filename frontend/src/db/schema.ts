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
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  color: text("color").default("#71717a").notNull(),
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  supportHoursMin: integer("support_hours_min").default(0).notNull(),
  supportHoursMax: integer("support_hours_max").default(0).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
});

export const subGroups = sqliteTable("sub_groups", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
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
  assignmentId: text("assignment_id").notNull().references(() => lessonAssignments.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subGroupId: text("sub_group_id").notNull().references(() => subGroups.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  isSupport: integer("is_support", { mode: "boolean" }).default(false).notNull(),
  layer: integer("layer").default(1).notNull(), // 1 = Core, 2 = Support
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON payload for periods, timings, school info
});

export const customRules = sqliteTable("custom_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  rulePayload: text("rule_payload").notNull(), // JSON payload for solver
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
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
