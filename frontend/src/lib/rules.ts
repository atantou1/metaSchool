// ============================================================================
// Rule Builder — Type Definitions & Registry
// ============================================================================
// This file defines the core Rule types and the extensible Rule Type Registry.
// To add a new rule type: add an entry to RULE_TYPE_REGISTRY below.
// No other files need to change (the visual builder reads this registry).
// ============================================================================

// ─── Core Rule Type ─────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  name: string;
  description?: string | null;
  type: string;                          // extensible string, e.g. "MUST_TEACH"
  enforcement: "hard" | "soft";
  weight?: number;                       // 1-100, only relevant for soft rules
  params: Record<string, any>;           // shape depends on rule type
  isActive: boolean;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
}

// ─── Param Field Definition (for the Visual Builder) ────────────────────────

export type ParamFieldType =
  | "teacher"          // single teacher picker
  | "subject"          // single subject picker
  | "class"            // single class picker
  | "subgroup"         // single subgroup picker (depends on class)
  | "specialty"        // single specialty picker
  | "teacher[]"        // multi-teacher picker
  | "subject[]"        // multi-subject picker
  | "class[]"          // multi-class picker
  | "days"             // multi-day picker (checkboxes for Δ, Τ, Τε, Π, Πα)
  | "periods"          // multi-period picker (checkboxes for 1η, 2η, ...)
  | "number"           // numeric input
  | "range"            // [min, max] dual input
  | "select"           // dropdown with fixed options
  | "boolean";         // toggle

export interface ParamFieldOption {
  value: string;
  label: string;
}

export interface ParamField {
  key: string;                           // maps to params[key]
  label: string;                         // UI label in Greek
  type: ParamFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: ParamFieldOption[];          // only for "select" type
  dependsOn?: string;                   // key of another param this depends on (e.g. subgroup depends on class)
  min?: number;                          // for "number" type
  max?: number;                          // for "number" type
  defaultValue?: any;
}

// ─── Rule Type Definition (Registry Entry) ──────────────────────────────────

export type RuleCategory = "assignment" | "time" | "relationship" | "distribution";

export interface RuleTypeDefinition {
  type: string;                          // unique identifier, e.g. "MUST_TEACH"
  category: RuleCategory;
  label: string;                         // Greek display name
  icon: string;                          // Lucide icon name
  description: string;                   // What this rule does
  paramsSchema: ParamField[];            // Fields the visual builder will render
  sentenceTemplate: string;              // "Ο {teacher} πρέπει να διδάξει {subject}..."
  defaultEnforcement: "hard" | "soft";
  examples?: string[];                   // Example natural language inputs for AI
}

// ============================================================================
// RULE TYPE REGISTRY
// ============================================================================
// This is the single source of truth for all available rule types.
// The Visual Builder reads this to know what fields to show.
// The Solver reads the `type` string and dispatches to the right handler.
// To add a new rule type, just add a new entry here + a handler in the solver.
// ============================================================================

export const RULE_TYPE_REGISTRY: Record<string, RuleTypeDefinition> = {
  // ─── Category: Assignment ───────────────────────────────────────────────
  MUST_TEACH: {
    type: "MUST_TEACH",
    category: "assignment",
    label: "Πρέπει να Διδάξει",
    icon: "UserCheck",
    description: "Ο εκπαιδευτικός πρέπει να διδάξει συγκεκριμένο μάθημα (προαιρετικά σε συγκεκριμένο τμήμα).",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {teacherId} πρέπει να διδάξει {subjectId} στο {classId}",
    examples: [
      "Ο Γιώργος να κάνει Πληροφορική στο Τμήμα 3",
      "Η Μαρία να διδάξει Μουσική",
    ],
    paramsSchema: [
      {
        key: "teacherId",
        label: "Εκπαιδευτικός",
        type: "teacher",
        required: true,
        placeholder: "Επιλέξτε εκπαιδευτικό",
      },
      {
        key: "subjectId",
        label: "Μάθημα",
        type: "subject",
        required: true,
        placeholder: "Επιλέξτε μάθημα",
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: false,
        placeholder: "Οποιοδήποτε (ο solver αποφασίζει)",
        helpText: "Αν δεν επιλέξετε τμήμα, ο αλγόριθμος αποφασίζει πού θα τοποθετηθεί.",
      },
      {
        key: "subGroupId",
        label: "Ομάδα",
        type: "subgroup",
        required: false,
        placeholder: "Ολομέλεια",
        dependsOn: "classId",
        helpText: "Προαιρετικά, σε ποια υπο-ομάδα του τμήματος.",
      },
      {
        key: "hours",
        label: "Ώρες",
        type: "number",
        required: false,
        placeholder: "Αυτόματα (βάσει εύρους μαθήματος)",
        helpText: "Αν αφήσετε κενό, ο αλγόριθμος αποφασίζει τις ώρες βάσει του εύρους που ορίζει το μάθημα.",
        min: 1,
        max: 35,
      },
    ],
  },

  MUST_NOT_TEACH: {
    type: "MUST_NOT_TEACH",
    category: "assignment",
    label: "Δεν Πρέπει να Διδάξει",
    icon: "UserX",
    description: "Ο εκπαιδευτικός ΔΕΝ πρέπει να διδάξει σε συγκεκριμένο τμήμα ή μάθημα.",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {teacherId} δεν πρέπει να διδάξει {subjectId} στο {classId}",
    examples: [
      "Η Μαρία να μην πάει στο Τμήμα 5",
      "Ο Νίκος να μην κάνει Γυμναστική",
    ],
    paramsSchema: [
      {
        key: "teacherId",
        label: "Εκπαιδευτικός",
        type: "teacher",
        required: true,
        placeholder: "Επιλέξτε εκπαιδευτικό",
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: false,
        placeholder: "Κανένα (εφαρμόζεται σε όλα)",
        helpText: "Σε ποιο τμήμα δεν πρέπει να πάει. Αν κενό, εφαρμόζεται σε όλα.",
      },
      {
        key: "subjectId",
        label: "Μάθημα",
        type: "subject",
        required: false,
        placeholder: "Κανένα (εφαρμόζεται σε όλα τα μαθήματα)",
        helpText: "Ποιο μάθημα δεν πρέπει να διδάξει. Αν κενό, δεν πρέπει να πάει καθόλου στο τμήμα.",
      },
    ],
  },

  // ─── Category: Time ─────────────────────────────────────────────────────
  TIME_WINDOW: {
    type: "TIME_WINDOW",
    category: "time",
    label: "Χρονικό Παράθυρο",
    icon: "Clock",
    description: "Ένας εκπαιδευτικός ή μάθημα πρέπει/δεν πρέπει να τοποθετείται σε συγκεκριμένες ημέρες/ώρες.",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {targetId} {mode} σε {days} {periods}",
    examples: [
      "Ο Γιώργος θέλω Τετάρτη να κάνει τις 4 πρώτες ώρες",
      "Γλώσσα μόνο 1η-3η ώρα",
      "Ο Νίκος δεν θέλει Παρασκευή",
    ],
    paramsSchema: [
      {
        key: "targetType",
        label: "Τύπος",
        type: "select",
        required: true,
        options: [
          { value: "teacher", label: "Εκπαιδευτικός" },
          { value: "subject", label: "Μάθημα" },
        ],
        defaultValue: "teacher",
      },
      {
        key: "targetId",
        label: "Ποιος/Ποιο",
        type: "teacher",  // dynamically changes based on targetType
        required: true,
        placeholder: "Επιλέξτε...",
      },
      {
        key: "days",
        label: "Ημέρες",
        type: "days",
        required: false,
        helpText: "Αν δεν επιλέξετε ημέρες, εφαρμόζεται σε όλες.",
      },
      {
        key: "periods",
        label: "Ώρες",
        type: "periods",
        required: false,
        helpText: "Αν δεν επιλέξετε ώρες, εφαρμόζεται σε όλες.",
      },
      {
        key: "mode",
        label: "Λειτουργία",
        type: "select",
        required: true,
        options: [
          { value: "only", label: "ΜΟΝΟ σε αυτές (περιορισμός)" },
          { value: "never", label: "ΠΟΤΕ σε αυτές (αποκλεισμός)" },
        ],
        defaultValue: "only",
      },
    ],
  },

  FIXED_SLOT: {
    type: "FIXED_SLOT",
    category: "time",
    label: "Σταθερή Θέση",
    icon: "Pin",
    description: "Κάτι πρέπει να γίνει σε ακριβώς αυτή τη θέση (pin σε ημέρα + ώρα).",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {teacherId} κάνει {subjectId} στο {classId} τη {day} {period}η ώρα",
    examples: [
      "Δευτέρα 1η ώρα Γιώργος Πληροφορική Τμ.3",
    ],
    paramsSchema: [
      {
        key: "teacherId",
        label: "Εκπαιδευτικός",
        type: "teacher",
        required: true,
      },
      {
        key: "subjectId",
        label: "Μάθημα",
        type: "subject",
        required: true,
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: true,
      },
      {
        key: "day",
        label: "Ημέρα",
        type: "number",
        required: true,
        min: 0,
        max: 4,
        helpText: "0=Δευτέρα, 1=Τρίτη, 2=Τετάρτη, 3=Πέμπτη, 4=Παρασκευή",
      },
      {
        key: "period",
        label: "Ώρα",
        type: "number",
        required: true,
        min: 0,
        max: 9,
        helpText: "0=1η ώρα, 1=2η ώρα, κ.λπ.",
      },
    ],
  },

  DAY_PATTERN: {
    type: "DAY_PATTERN",
    category: "time",
    label: "Μοτίβο Ημερών",
    icon: "CalendarRange",
    description: "Ο εκπαιδευτικός πρέπει να εργάζεται ακριβώς Ν ημέρες ή σε συγκεκριμένες ημέρες.",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {teacherId} δουλεύει {exactDays} ημέρες",
    examples: [
      "Ο Γιώργος να έρχεται ακριβώς 4 ημέρες",
      "Η Μαρία χωρίς Παρασκευή",
    ],
    paramsSchema: [
      {
        key: "teacherId",
        label: "Εκπαιδευτικός",
        type: "teacher",
        required: true,
      },
      {
        key: "exactDays",
        label: "Ακριβώς Ν ημέρες",
        type: "number",
        required: false,
        min: 1,
        max: 5,
        helpText: "Ο εκπαιδευτικός πρέπει να δουλεύει ακριβώς τόσες ημέρες.",
      },
      {
        key: "specificDays",
        label: "Μόνο αυτές τις ημέρες",
        type: "days",
        required: false,
        helpText: "Αν επιλέξετε ημέρες, θα εργάζεται ΜΟΝΟ αυτές.",
      },
      {
        key: "excludeDays",
        label: "Εκτός αυτών των ημερών",
        type: "days",
        required: false,
        helpText: "Ημέρες που ΔΕΝ πρέπει να εργάζεται.",
      },
    ],
  },

  // ─── Category: Relationship ─────────────────────────────────────────────
  CONCURRENT: {
    type: "CONCURRENT",
    category: "relationship",
    label: "Ταυτόχρονα",
    icon: "Layers",
    description: "Δύο ή περισσότερα μαθήματα/αναθέσεις πρέπει να γίνονται ταυτόχρονα (ίδια ημέρα + ώρα).",
    defaultEnforcement: "hard",
    sentenceTemplate: "{assignmentA} ταυτόχρονα με {assignmentB}",
    examples: [
      "Πληροφορική Ομάδα Α ταυτόχρονα με Γλώσσα Ομάδα Β στο Τμ.1",
    ],
    paramsSchema: [
      {
        key: "assignmentA_subjectId",
        label: "Μάθημα Α",
        type: "subject",
        required: true,
      },
      {
        key: "assignmentA_classId",
        label: "Τμήμα Α",
        type: "class",
        required: true,
      },
      {
        key: "assignmentA_subGroupId",
        label: "Ομάδα Α",
        type: "subgroup",
        required: false,
        dependsOn: "assignmentA_classId",
      },
      {
        key: "assignmentA_teacherId",
        label: "Εκπαιδ. Α",
        type: "teacher",
        required: false,
        placeholder: "Οποιοσδήποτε",
      },
      {
        key: "assignmentB_subjectId",
        label: "Μάθημα Β",
        type: "subject",
        required: true,
      },
      {
        key: "assignmentB_classId",
        label: "Τμήμα Β",
        type: "class",
        required: true,
      },
      {
        key: "assignmentB_subGroupId",
        label: "Ομάδα Β",
        type: "subgroup",
        required: false,
        dependsOn: "assignmentB_classId",
      },
      {
        key: "assignmentB_teacherId",
        label: "Εκπαιδ. Β",
        type: "teacher",
        required: false,
        placeholder: "Οποιοσδήποτε",
      },
    ],
  },

  NOT_SIMULTANEOUS: {
    type: "NOT_SIMULTANEOUS",
    category: "relationship",
    label: "Ποτέ Ταυτόχρονα",
    icon: "Unlink",
    description: "Δύο μαθήματα ή εκπαιδευτικοί δεν πρέπει να γίνονται ταυτόχρονα.",
    defaultEnforcement: "hard",
    sentenceTemplate: "{entityA} και {entityB} ποτέ ταυτόχρονα {scope}",
    examples: [
      "Μουσική και Γυμναστική ποτέ ταυτόχρονα σε όλο το σχολείο",
      "Ο Γιώργος και η Μαρία ποτέ ταυτόχρονα στο ίδιο τμήμα",
    ],
    paramsSchema: [
      {
        key: "entityA_type",
        label: "Τύπος Α",
        type: "select",
        required: true,
        options: [
          { value: "subject", label: "Μάθημα" },
          { value: "teacher", label: "Εκπαιδευτικός" },
        ],
        defaultValue: "subject",
      },
      {
        key: "entityA_id",
        label: "Οντότητα Α",
        type: "subject", // dynamic based on entityA_type
        required: true,
      },
      {
        key: "entityB_type",
        label: "Τύπος Β",
        type: "select",
        required: true,
        options: [
          { value: "subject", label: "Μάθημα" },
          { value: "teacher", label: "Εκπαιδευτικός" },
        ],
        defaultValue: "subject",
      },
      {
        key: "entityB_id",
        label: "Οντότητα Β",
        type: "subject", // dynamic based on entityB_type
        required: true,
      },
      {
        key: "scope",
        label: "Εφαρμογή",
        type: "select",
        required: true,
        options: [
          { value: "school", label: "Σε όλο το σχολείο" },
          { value: "class", label: "Στο ίδιο τμήμα" },
        ],
        defaultValue: "school",
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: false,
        helpText: "Μόνο αν η εφαρμογή είναι 'Στο ίδιο τμήμα' — αν κενό, εφαρμόζεται σε κάθε τμήμα.",
      },
    ],
  },

  // ─── Category: Distribution ─────────────────────────────────────────────
  SPREAD_ACROSS_DAYS: {
    type: "SPREAD_ACROSS_DAYS",
    category: "distribution",
    label: "Εξάπλωση σε Ημέρες",
    icon: "LayoutGrid",
    description: "Ένα μάθημα πρέπει να κατανέμεται σε διαφορετικές ημέρες (αποφυγή συγκέντρωσης).",
    defaultEnforcement: "hard",
    sentenceTemplate: "{subjectId} στο {classId} το πολύ {maxPerDay}ω/ημέρα",
    examples: [
      "Πληροφορική σε διαφορετικές μέρες",
      "Γλώσσα το πολύ 2 ώρες ανά μέρα",
    ],
    paramsSchema: [
      {
        key: "subjectId",
        label: "Μάθημα",
        type: "subject",
        required: true,
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: false,
        placeholder: "Όλα τα τμήματα",
        helpText: "Αν κενό, εφαρμόζεται σε όλα τα τμήματα.",
      },
      {
        key: "maxPerDay",
        label: "Μέγιστο ώρες/ημέρα",
        type: "number",
        required: true,
        min: 1,
        max: 10,
        defaultValue: 1,
      },
    ],
  },

  CONSECUTIVE_BLOCK: {
    type: "CONSECUTIVE_BLOCK",
    category: "distribution",
    label: "Block Ωρών",
    icon: "Rows3",
    description: "Ένα μάθημα πρέπει ή δεν πρέπει να γίνεται σε συνεχόμενες ώρες (block).",
    defaultEnforcement: "soft",
    sentenceTemplate: "{subjectId} {mode} σε block {blockSize}ω",
    examples: [
      "Εικαστικά σε δίωρο block",
      "Πληροφορική max 1 συνεχόμενη",
    ],
    paramsSchema: [
      {
        key: "subjectId",
        label: "Μάθημα",
        type: "subject",
        required: true,
      },
      {
        key: "classId",
        label: "Τμήμα",
        type: "class",
        required: false,
        placeholder: "Όλα τα τμήματα",
      },
      {
        key: "mode",
        label: "Λειτουργία",
        type: "select",
        required: true,
        options: [
          { value: "must_consecutive", label: "ΠΡΕΠΕΙ σε block" },
          { value: "max_consecutive", label: "ΜΕΓΙΣΤΟ συνεχόμενες" },
        ],
        defaultValue: "must_consecutive",
      },
      {
        key: "blockSize",
        label: "Μέγεθος block",
        type: "number",
        required: false,
        min: 1,
        max: 6,
        defaultValue: 2,
        helpText: "Πόσες συνεχόμενες ώρες ανά block.",
      },
    ],
  },

  DAILY_HOURS_LIMIT: {
    type: "DAILY_HOURS_LIMIT",
    category: "distribution",
    label: "Ώρες ανά Ημέρα",
    icon: "Gauge",
    description: "Μέγιστες/ελάχιστες ώρες ανά ημέρα για εκπαιδευτικό ή μάθημα.",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {targetId} {min}-{max}ω/ημέρα",
    examples: [
      "Ο Γιώργος μέγιστο 5 ώρες ανά ημέρα",
      "Η Μαρία τουλάχιστον 2 ώρες τις μέρες που έρχεται",
    ],
    paramsSchema: [
      {
        key: "targetType",
        label: "Τύπος",
        type: "select",
        required: true,
        options: [
          { value: "teacher", label: "Εκπαιδευτικός" },
          { value: "subject", label: "Μάθημα" },
        ],
        defaultValue: "teacher",
      },
      {
        key: "targetId",
        label: "Ποιος/Ποιο",
        type: "teacher",
        required: true,
      },
      {
        key: "min",
        label: "Ελάχιστο",
        type: "number",
        required: false,
        min: 0,
        max: 10,
        helpText: "Ελάχιστες ώρες ανά ημέρα (τις ημέρες που εργάζεται).",
      },
      {
        key: "max",
        label: "Μέγιστο",
        type: "number",
        required: false,
        min: 0,
        max: 10,
        helpText: "Μέγιστες ώρες ανά ημέρα.",
      },
    ],
  },

  TOTAL_HOURS: {
    type: "TOTAL_HOURS",
    category: "distribution",
    label: "Σύνολο Εβδομαδιαίων Ωρών",
    icon: "Sigma",
    description: "Ο εκπαιδευτικός πρέπει να έχει συνολικά Ν ώρες την εβδομάδα.",
    defaultEnforcement: "hard",
    sentenceTemplate: "Ο {teacherId} {min}-{max}ω/εβδομάδα",
    examples: [
      "Ο Γιώργος 24 ώρες την εβδομάδα",
      "Η Μαρία 20-22 ώρες",
    ],
    paramsSchema: [
      {
        key: "teacherId",
        label: "Εκπαιδευτικός",
        type: "teacher",
        required: true,
      },
      {
        key: "min",
        label: "Ελάχιστο",
        type: "number",
        required: true,
        min: 0,
        max: 40,
      },
      {
        key: "max",
        label: "Μέγιστο",
        type: "number",
        required: true,
        min: 0,
        max: 40,
      },
    ],
  },
};

// ─── Helper Utilities ───────────────────────────────────────────────────────

/** Get all rule types as an array */
export function getAllRuleTypes(): RuleTypeDefinition[] {
  return Object.values(RULE_TYPE_REGISTRY);
}

/** Get rule types grouped by category */
export function getRuleTypesByCategory(): Record<RuleCategory, RuleTypeDefinition[]> {
  const grouped: Record<RuleCategory, RuleTypeDefinition[]> = {
    assignment: [],
    time: [],
    relationship: [],
    distribution: [],
  };
  for (const def of Object.values(RULE_TYPE_REGISTRY)) {
    grouped[def.category].push(def);
  }
  return grouped;
}

/** Get a single rule type definition by type string */
export function getRuleTypeDefinition(type: string): RuleTypeDefinition | undefined {
  return RULE_TYPE_REGISTRY[type];
}

/** Category display info */
export const RULE_CATEGORY_INFO: Record<RuleCategory, { label: string; icon: string; description: string }> = {
  assignment: {
    label: "Ανάθεση",
    icon: "UserCheck",
    description: "Ποιος διδάσκει τι και πού",
  },
  time: {
    label: "Χρόνος",
    icon: "Clock",
    description: "Πότε γίνεται κάτι",
  },
  relationship: {
    label: "Σχέσεις",
    icon: "Layers",
    description: "Πώς σχετίζονται μαθήματα/εκπαιδευτικοί",
  },
  distribution: {
    label: "Κατανομή",
    icon: "LayoutGrid",
    description: "Πώς κατανέμονται οι ώρες",
  },
};
