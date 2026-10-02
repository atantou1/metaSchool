// ============================================================================
// Conditional Rule Engine — Type Definitions & Registry
// ============================================================================
// Replaces the flat Rule Registry with a full IF(WHEN) → THEN engine.
// Every rule is a logical proposition: "When X (AND/OR Y), Then do Z (and W)."
// ============================================================================

// ─── WHEN — Condition Types ──────────────────────────────────────────────────

export type ConditionPredicate =
  // Teacher predicates
  | "teacher_has_subject"      // Teacher is teaching subject X at this slot
  | "teacher_in_class"         // Teacher is in class X at this slot
  | "teacher_has_lesson"       // Teacher has any lesson at this slot
  | "teacher_is_free"          // Teacher has no lesson at this slot
  | "teacher_daily_hours_gt"   // Teacher has > N hours on this day
  | "teacher_daily_hours_lt"   // Teacher has < N hours on this day
  | "teacher_daily_hours_eq"   // Teacher has exactly N hours on this day
  // Day/Period predicates
  | "is_day"                   // It is one of the specified days
  | "is_period"                // It is one of the specified periods
  | "is_period_gte"            // Period >= N (e.g., "from 3rd period onwards")
  | "is_period_lte"            // Period <= N (e.g., "up to 4th period")
  | "is_period_range"          // Period between N and M
  // Class/Subject predicates
  | "class_has_subject"        // Class X has subject Y at this slot
  | "class_has_support"        // Class X has a support session at this slot
  | "class_is_free"            // Class X is free at this slot
  | "subject_is_scheduled"     // Subject X is scheduled (anywhere) at this slot

export interface Condition {
  id: string;                         // local UUID for React key
  predicate: ConditionPredicate;
  // Common optional fields — only used by matching predicates
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  days?: number[];                    // 0=Mon, 1=Tue, ... 4=Fri
  periods?: number[];                 // 0=1st, 1=2nd, ...
  periodFrom?: number;
  periodTo?: number;
  value?: number;                     // for hours comparisons
}

export type GroupOperator = "AND" | "OR";

export interface ConditionGroup {
  id: string;                         // local UUID for React key
  operator: GroupOperator;
  conditions: Condition[];
}

export interface WhenClause {
  operator: GroupOperator;            // how groups are combined: (G1) AND/OR (G2) ...
  groups: ConditionGroup[];
}

// ─── THEN — Action Types ─────────────────────────────────────────────────────

export type ActionType =
  // Simultaneity
  | "teacher_has_subject_same_slot"   // Teacher B must teach subject X at the same slot
  | "teacher_free_same_slot"          // Teacher B must be free at the same slot
  | "teacher_has_lesson_same_slot"    // Teacher B must have any lesson at the same slot
  // Schedule start/end (day-level)
  | "teacher_start_not_before"        // Teacher doesn't start earlier than period N (that day)
  | "teacher_start_not_after"         // Teacher doesn't start later than period N (that day)
  | "teacher_end_not_before"          // Teacher doesn't finish earlier than period N
  | "teacher_end_not_after"           // Teacher doesn't finish later than period N
  // Daily hours limits
  | "teacher_max_hours_day"           // Teacher has at most N hours that day
  | "teacher_min_hours_day"           // Teacher has at least N hours that day
  // Gaps
  | "teacher_max_gaps_day"            // Teacher has at most N gaps that day
  | "teacher_no_gap_after"            // Teacher has no gap immediately after this slot
  // Subject placement
  | "subject_in_period"               // Subject X must be placed in period(s) Y
  | "subject_on_day"                  // Subject X must be placed on day(s) Y
  | "subject_not_in_period"           // Subject X must NOT be in period(s) Y
  | "subject_not_on_day"              // Subject X must NOT be on day(s) Y
  // Class
  | "class_free_slot"                 // Class X must have a free slot at the triggered period

export interface Action {
  id: string;                         // local UUID for React key
  action: ActionType;
  // Common optional fields
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  days?: number[];
  periods?: number[];
  period?: number;                    // single period for start/end constraints
  value?: number;                     // for hours/gaps limits
}

// ─── Full Conditional Rule ───────────────────────────────────────────────────

export interface ConditionalRule {
  id: string;
  name: string;
  description?: string | null;
  type: "CONDITIONAL";
  enforcement: "hard" | "soft";
  weight?: number;
  isActive: boolean;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
  // The actual logic lives in params, stored as JSON in DB
  params: {
    when: WhenClause;
    then: Action[];
  };
}

// ─── Condition Metadata (for Builder UI) ────────────────────────────────────

export interface ConditionDef {
  predicate: ConditionPredicate;
  label: string;
  description: string;
  category: "teacher" | "time" | "class_subject";
  fields: ConditionField[];
}

export type ConditionFieldType =
  | "teacher" | "subject" | "class"
  | "days" | "periods"
  | "number" | "period_number";

export interface ConditionField {
  key: keyof Condition;
  label: string;
  type: ConditionFieldType;
  required: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}

export const CONDITION_REGISTRY: Record<ConditionPredicate, ConditionDef> = {
  teacher_has_subject: {
    predicate: "teacher_has_subject",
    label: "Ο εκπαιδευτικός διδάσκει μάθημα",
    description: "Ο εκπαιδευτικός είναι σε μάθημα Χ αυτή την ώρα",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
    ],
  },
  teacher_in_class: {
    predicate: "teacher_in_class",
    label: "Ο εκπαιδευτικός είναι σε τμήμα",
    description: "Ο εκπαιδευτικός διδάσκει στο συγκεκριμένο τμήμα",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "classId", label: "Τμήμα", type: "class", required: true },
    ],
  },
  teacher_has_lesson: {
    predicate: "teacher_has_lesson",
    label: "Ο εκπαιδευτικός έχει μάθημα",
    description: "Ο εκπαιδευτικός έχει οποιοδήποτε μάθημα αυτή την ώρα",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
    ],
  },
  teacher_is_free: {
    predicate: "teacher_is_free",
    label: "Ο εκπαιδευτικός είναι ελεύθερος",
    description: "Ο εκπαιδευτικός δεν έχει μάθημα αυτή την ώρα",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
    ],
  },
  teacher_daily_hours_gt: {
    predicate: "teacher_daily_hours_gt",
    label: "Ο εκπαιδευτικός έχει > Ν ώρες σήμερα",
    description: "Ο συνολικός αριθμός ωρών του εκπαιδευτικού για την ημέρα υπερβαίνει το όριο",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Ν ώρες", type: "number", required: true, min: 1, max: 10 },
    ],
  },
  teacher_daily_hours_lt: {
    predicate: "teacher_daily_hours_lt",
    label: "Ο εκπαιδευτικός έχει < Ν ώρες σήμερα",
    description: "Ο συνολικός αριθμός ωρών του εκπαιδευτικού είναι κάτω από το όριο",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Ν ώρες", type: "number", required: true, min: 1, max: 10 },
    ],
  },
  teacher_daily_hours_eq: {
    predicate: "teacher_daily_hours_eq",
    label: "Ο εκπαιδευτικός έχει ακριβώς Ν ώρες σήμερα",
    description: "Ο συνολικός αριθμός ωρών του εκπαιδευτικού για την ημέρα είναι ακριβώς Ν",
    category: "teacher",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Ν ώρες", type: "number", required: true, min: 1, max: 10 },
    ],
  },
  is_day: {
    predicate: "is_day",
    label: "Είναι συγκεκριμένη ημέρα",
    description: "Η συνθήκη εφαρμόζεται μόνο σε αυτές τις ημέρες",
    category: "time",
    fields: [
      { key: "days", label: "Ημέρες", type: "days", required: true },
    ],
  },
  is_period: {
    predicate: "is_period",
    label: "Είναι συγκεκριμένη ώρα",
    description: "Η συνθήκη εφαρμόζεται μόνο σε αυτές τις ώρες",
    category: "time",
    fields: [
      { key: "periods", label: "Ώρες", type: "periods", required: true },
    ],
  },
  is_period_gte: {
    predicate: "is_period_gte",
    label: "Είναι από Νη ώρα και μετά",
    description: "Η ώρα είναι μεγαλύτερη ή ίση από Ν",
    category: "time",
    fields: [
      { key: "periodFrom", label: "Από ώρα (N)", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  is_period_lte: {
    predicate: "is_period_lte",
    label: "Είναι έως Νη ώρα",
    description: "Η ώρα είναι μικρότερη ή ίση από Ν",
    category: "time",
    fields: [
      { key: "periodTo", label: "Έως ώρα (N)", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  is_period_range: {
    predicate: "is_period_range",
    label: "Ώρα μεταξύ Ν και Μ",
    description: "Η ώρα είναι μεταξύ δύο ορίων",
    category: "time",
    fields: [
      { key: "periodFrom", label: "Από ώρα", type: "period_number", required: true, min: 0, max: 9 },
      { key: "periodTo", label: "Έως ώρα", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  class_has_subject: {
    predicate: "class_has_subject",
    label: "Το τμήμα έχει μάθημα",
    description: "Το τμήμα έχει το συγκεκριμένο μάθημα αυτή την ώρα",
    category: "class_subject",
    fields: [
      { key: "classId", label: "Τμήμα", type: "class", required: true },
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
    ],
  },
  class_has_support: {
    predicate: "class_has_support",
    label: "Το τμήμα έχει υποστηρικτική ώρα",
    description: "Ένας υποστηρικτικός εκπαιδευτικός είναι στο τμήμα αυτή την ώρα",
    category: "class_subject",
    fields: [
      { key: "classId", label: "Τμήμα", type: "class", required: true },
    ],
  },
  class_is_free: {
    predicate: "class_is_free",
    label: "Το τμήμα είναι ελεύθερο",
    description: "Το τμήμα δεν έχει κανένα μάθημα αυτή την ώρα",
    category: "class_subject",
    fields: [
      { key: "classId", label: "Τμήμα", type: "class", required: true },
    ],
  },
  subject_is_scheduled: {
    predicate: "subject_is_scheduled",
    label: "Το μάθημα είναι στο πρόγραμμα",
    description: "Το μάθημα είναι τοποθετημένο κάπου αυτή την ώρα",
    category: "class_subject",
    fields: [
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
    ],
  },
};

// ─── Action Metadata (for Builder UI) ───────────────────────────────────────

export interface ActionDef {
  action: ActionType;
  label: string;
  description: string;
  category: "simultaneity" | "schedule" | "gaps" | "placement";
  fields: ActionField[];
}

export type ActionFieldType =
  | "teacher" | "subject" | "class"
  | "days" | "periods"
  | "number" | "period_number";

export interface ActionField {
  key: keyof Action;
  label: string;
  type: ActionFieldType;
  required: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}

export const ACTION_REGISTRY: Record<ActionType, ActionDef> = {
  teacher_has_subject_same_slot: {
    action: "teacher_has_subject_same_slot",
    label: "Εκπαιδευτικός κάνει μάθημα ταυτόχρονα",
    description: "Ο εκπαιδευτικός πρέπει να διδάσκει το συγκεκριμένο μάθημα την ίδια ώρα",
    category: "simultaneity",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
    ],
  },
  teacher_free_same_slot: {
    action: "teacher_free_same_slot",
    label: "Εκπαιδευτικός ελεύθερος ταυτόχρονα",
    description: "Ο εκπαιδευτικός δεν πρέπει να έχει μάθημα την ίδια ώρα",
    category: "simultaneity",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
    ],
  },
  teacher_has_lesson_same_slot: {
    action: "teacher_has_lesson_same_slot",
    label: "Εκπαιδευτικός έχει οτιδήποτε ταυτόχρονα",
    description: "Ο εκπαιδευτικός πρέπει να έχει οποιοδήποτε μάθημα την ίδια ώρα",
    category: "simultaneity",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
    ],
  },
  teacher_start_not_before: {
    action: "teacher_start_not_before",
    label: "Ωράριο: Δεν ξεκινά νωρίτερα από",
    description: "Ο εκπαιδευτικός δεν μπορεί να έχει μάθημα πριν από αυτή την ώρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "period", label: "Από ώρα (0=1η, 1=2η, ...)", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  teacher_start_not_after: {
    action: "teacher_start_not_after",
    label: "Ωράριο: Δεν ξεκινά αργότερα από",
    description: "Ο εκπαιδευτικός πρέπει να έχει μάθημα πριν ή στη συγκεκριμένη ώρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "period", label: "Έως ώρα (0=1η, 1=2η, ...)", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  teacher_end_not_before: {
    action: "teacher_end_not_before",
    label: "Ωράριο: Δεν τελειώνει νωρίτερα από",
    description: "Ο εκπαιδευτικός έχει μάθημα τουλάχιστον έως αυτή την ώρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "period", label: "Τουλάχιστον έως ώρα", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  teacher_end_not_after: {
    action: "teacher_end_not_after",
    label: "Ωράριο: Δεν τελειώνει αργότερα από",
    description: "Ο εκπαιδευτικός δεν έχει μάθημα μετά από αυτή την ώρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "period", label: "Τελευταία ώρα (0=1η, 1=2η, ...)", type: "period_number", required: true, min: 0, max: 9 },
    ],
  },
  teacher_max_hours_day: {
    action: "teacher_max_hours_day",
    label: "Μέγιστες ώρες ημέρας",
    description: "Ο εκπαιδευτικός δεν υπερβαίνει αυτόν τον αριθμό ωρών για τη συγκεκριμένη ημέρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Μέγιστες ώρες", type: "number", required: true, min: 1, max: 10 },
    ],
  },
  teacher_min_hours_day: {
    action: "teacher_min_hours_day",
    label: "Ελάχιστες ώρες ημέρας",
    description: "Ο εκπαιδευτικός έχει τουλάχιστον αυτόν τον αριθμό ωρών εκείνη την ημέρα",
    category: "schedule",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Ελάχιστες ώρες", type: "number", required: true, min: 1, max: 10 },
    ],
  },
  teacher_max_gaps_day: {
    action: "teacher_max_gaps_day",
    label: "Μέγιστα κενά ημέρας",
    description: "Ο εκπαιδευτικός δεν έχει περισσότερα από Ν κενά εκείνη την ημέρα",
    category: "gaps",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
      { key: "value", label: "Μέγιστα κενά", type: "number", required: true, min: 0, max: 8 },
    ],
  },
  teacher_no_gap_after: {
    action: "teacher_no_gap_after",
    label: "Χωρίς κενό αμέσως μετά",
    description: "Αμέσως μετά από αυτό το slot, ο εκπαιδευτικός δεν μπορεί να έχει κενό",
    category: "gaps",
    fields: [
      { key: "teacherId", label: "Εκπαιδευτικός", type: "teacher", required: true },
    ],
  },
  subject_in_period: {
    action: "subject_in_period",
    label: "Μάθημα σε συγκεκριμένη ώρα",
    description: "Το μάθημα πρέπει να τοποθετηθεί σε μία από αυτές τις ώρες",
    category: "placement",
    fields: [
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
      { key: "periods", label: "Επιτρεπτές ώρες", type: "periods", required: true },
    ],
  },
  subject_on_day: {
    action: "subject_on_day",
    label: "Μάθημα σε συγκεκριμένη ημέρα",
    description: "Το μάθημα πρέπει να τοποθετηθεί σε μία από αυτές τις ημέρες",
    category: "placement",
    fields: [
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
      { key: "days", label: "Επιτρεπτές ημέρες", type: "days", required: true },
    ],
  },
  subject_not_in_period: {
    action: "subject_not_in_period",
    label: "Μάθημα ΌΧΙ σε αυτή την ώρα",
    description: "Το μάθημα δεν επιτρέπεται να τοποθετηθεί σε αυτές τις ώρες",
    category: "placement",
    fields: [
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
      { key: "periods", label: "Απαγορευμένες ώρες", type: "periods", required: true },
    ],
  },
  subject_not_on_day: {
    action: "subject_not_on_day",
    label: "Μάθημα ΌΧΙ σε αυτή την ημέρα",
    description: "Το μάθημα δεν επιτρέπεται να τοποθετηθεί σε αυτές τις ημέρες",
    category: "placement",
    fields: [
      { key: "subjectId", label: "Μάθημα", type: "subject", required: true },
      { key: "classId", label: "Τμήμα (προαιρετικό)", type: "class", required: false },
      { key: "days", label: "Απαγορευμένες ημέρες", type: "days", required: true },
    ],
  },
  class_free_slot: {
    action: "class_free_slot",
    label: "Τμήμα ελεύθερο σε αυτή την ώρα",
    description: "Το τμήμα δεν επιτρέπεται να έχει μάθημα την ώρα που ενεργοποιείται η συνθήκη",
    category: "placement",
    fields: [
      { key: "classId", label: "Τμήμα", type: "class", required: true },
    ],
  },
};

// ─── Category metadata ───────────────────────────────────────────────────────

export const CONDITION_CATEGORIES = {
  teacher: { label: "Εκπαιδευτικός", icon: "User" },
  time: { label: "Ημέρα / Ώρα", icon: "Clock" },
  class_subject: { label: "Τμήμα / Μάθημα", icon: "BookOpen" },
} as const;

export const ACTION_CATEGORIES = {
  simultaneity: { label: "Ταυτοχρονισμός", icon: "Layers", color: "violet" },
  schedule: { label: "Ωράριο", icon: "CalendarClock", color: "blue" },
  gaps: { label: "Κενά", icon: "Minus", color: "amber" },
  placement: { label: "Τοποθέτηση", icon: "MapPin", color: "green" },
} as const;

// ─── Helper: Generate human-readable sentence from a rule ────────────────────

const DAY_LABELS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];
const PERIOD_LABELS = ["1η", "2η", "3η", "4η", "5η", "6η", "7η", "8η", "9η", "10η"];

export function buildRuleSentence(
  rule: ConditionalRule,
  teachers: { id: string; firstName: string; lastName: string }[],
  subjects: { id: string; title: string }[],
  classes: { id: string; name: string }[]
): string {
  const teacherName = (id?: string) =>
    id ? (teachers.find((t) => t.id === id)?.lastName ?? id) : "?";
  const subjectName = (id?: string) =>
    id ? (subjects.find((s) => s.id === id)?.title ?? id) : "?";
  const className = (id?: string) =>
    id ? (classes.find((c) => c.id === id)?.name ?? id) : "?";
  const dayName = (d: number) => DAY_LABELS[d] ?? `Ημ.${d}`;
  const periodName = (p: number) => PERIOD_LABELS[p] ?? `${p + 1}η`;

  const renderCondition = (c: Condition): string => {
    switch (c.predicate) {
      case "teacher_has_subject":
        return `ο ${teacherName(c.teacherId)} κάνει ${subjectName(c.subjectId)}`;
      case "teacher_in_class":
        return `ο ${teacherName(c.teacherId)} είναι στο ${className(c.classId)}`;
      case "teacher_has_lesson":
        return `ο ${teacherName(c.teacherId)} έχει μάθημα`;
      case "teacher_is_free":
        return `ο ${teacherName(c.teacherId)} είναι ελεύθερος`;
      case "teacher_daily_hours_gt":
        return `ο ${teacherName(c.teacherId)} έχει > ${c.value} ώρες`;
      case "teacher_daily_hours_lt":
        return `ο ${teacherName(c.teacherId)} έχει < ${c.value} ώρες`;
      case "teacher_daily_hours_eq":
        return `ο ${teacherName(c.teacherId)} έχει ${c.value} ώρες`;
      case "is_day":
        return `είναι ${c.days?.map(dayName).join(" ή ") ?? "?"}`;
      case "is_period":
        return `είναι ${c.periods?.map(periodName).join(" ή ") ?? "?"} ώρα`;
      case "is_period_gte":
        return `είναι από ${periodName(c.periodFrom ?? 0)} ώρα`;
      case "is_period_lte":
        return `είναι έως ${periodName(c.periodTo ?? 0)} ώρα`;
      case "is_period_range":
        return `είναι ${periodName(c.periodFrom ?? 0)}-${periodName(c.periodTo ?? 0)} ώρα`;
      case "class_has_subject":
        return `το ${className(c.classId)} έχει ${subjectName(c.subjectId)}`;
      case "class_has_support":
        return `το ${className(c.classId)} έχει υποστήριξη`;
      case "class_is_free":
        return `το ${className(c.classId)} είναι ελεύθερο`;
      case "subject_is_scheduled":
        return `το ${subjectName(c.subjectId)} είναι στο πρόγραμμα`;
      default:
        return c.predicate;
    }
  };

  const renderAction = (a: Action): string => {
    switch (a.action) {
      case "teacher_has_subject_same_slot":
        return `ο ${teacherName(a.teacherId)} κάνει ${subjectName(a.subjectId)} ταυτόχρονα`;
      case "teacher_free_same_slot":
        return `ο ${teacherName(a.teacherId)} είναι ελεύθερος`;
      case "teacher_has_lesson_same_slot":
        return `ο ${teacherName(a.teacherId)} έχει μάθημα ταυτόχρονα`;
      case "teacher_start_not_before":
        return `ο ${teacherName(a.teacherId)} ξεκινά όχι νωρίτερα από ${periodName(a.period ?? 0)}`;
      case "teacher_start_not_after":
        return `ο ${teacherName(a.teacherId)} ξεκινά το αργότερο ${periodName(a.period ?? 0)}`;
      case "teacher_end_not_before":
        return `ο ${teacherName(a.teacherId)} τελειώνει όχι νωρίτερα από ${periodName(a.period ?? 0)}`;
      case "teacher_end_not_after":
        return `ο ${teacherName(a.teacherId)} τελειώνει το αργότερο ${periodName(a.period ?? 0)}`;
      case "teacher_max_hours_day":
        return `ο ${teacherName(a.teacherId)} έχει max ${a.value} ώρες`;
      case "teacher_min_hours_day":
        return `ο ${teacherName(a.teacherId)} έχει min ${a.value} ώρες`;
      case "teacher_max_gaps_day":
        return `ο ${teacherName(a.teacherId)} έχει max ${a.value} κενά`;
      case "teacher_no_gap_after":
        return `ο ${teacherName(a.teacherId)} δεν έχει κενό αμέσως μετά`;
      case "subject_in_period":
        return `το ${subjectName(a.subjectId)} μόνο σε ${a.periods?.map(periodName).join(",")} ώρα`;
      case "subject_on_day":
        return `το ${subjectName(a.subjectId)} μόνο ${a.days?.map(dayName).join(",")}`;
      case "subject_not_in_period":
        return `το ${subjectName(a.subjectId)} όχι σε ${a.periods?.map(periodName).join(",")} ώρα`;
      case "subject_not_on_day":
        return `το ${subjectName(a.subjectId)} όχι ${a.days?.map(dayName).join(",")}`;
      case "class_free_slot":
        return `το ${className(a.classId)} να είναι ελεύθερο`;
      default:
        return a.action;
    }
  };

  const when = rule.params.when;
  const whenParts = when.groups.map((g) => {
    const parts = g.conditions.map(renderCondition);
    return parts.length > 1 ? `(${parts.join(` ${g.operator} `)})` : parts[0] ?? "";
  });
  const whenStr = whenParts.join(` ${when.operator} `);
  const thenStr = rule.params.then.map(renderAction).join(", και ");

  return `ΟΤΑΝ ${whenStr} → ΤΟΤΕ ${thenStr}`;
}

// ─── Empty state factories ────────────────────────────────────────────────────

export function newCondition(): Condition {
  return { id: crypto.randomUUID(), predicate: "teacher_has_subject" };
}

export function newConditionGroup(): ConditionGroup {
  return { id: crypto.randomUUID(), operator: "AND", conditions: [newCondition()] };
}

export function newWhen(): WhenClause {
  return { operator: "AND", groups: [newConditionGroup()] };
}

export function newAction(): Action {
  return { id: crypto.randomUUID(), action: "teacher_has_subject_same_slot" };
}
