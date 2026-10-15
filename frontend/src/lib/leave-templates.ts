import { Leave, Teacher, SchoolProfile, LeaveTypeConfig, LeaveDecisionTemplate } from "@/types";
import { formatGreekDate, formatDaysInWords } from "@/lib/leave-documents";

// Greek grammatical helpers
export function isFemaleTeacher(firstName?: string | null): boolean {
  if (!firstName) return false;
  const name = firstName.trim();
  if (/^(άρτεμις|αρτεμις|ίρις|ιρις|δάμαρις|δαμαρις)$/i.test(name)) return true;
  if (/[ςΣsS]$/.test(name)) return false;
  if (/[αάεέηήιίοόυύωώ]$/i.test(name)) return true;
  return false;
}

export function getTeacherPrepTitle(firstName?: string | null): string {
  return isFemaleTeacher(firstName) ? "στην κ." : "στον κ.";
}

export function getTeacherGenitiveTitle(firstName?: string | null): string {
  return isFemaleTeacher(firstName) ? "της κ." : "του κ.";
}

export function getServingPhrase(firstName?: string | null): string {
  return isFemaleTeacher(firstName) ? "η οποία υπηρετεί στο" : "ο οποίος υπηρετεί στο";
}

export function getStaffRolePhrase(specialty?: string | null): string {
  if (!specialty) return "εκπαιδευτικό";
  const s = specialty.trim().toUpperCase();
  if (s.startsWith("ΠΕ2") || s.startsWith("ΠΕ31") || s.startsWith("ΠΕ21") || s.startsWith("ΠΕ23") || s.startsWith("ΠΕ25") || s.startsWith("ΠΕ28") || s.startsWith("ΠΕ29") || s.startsWith("ΠΕ30")) {
    return "μέλος ΕΕΠ";
  }
  if (s.startsWith("ΔΕ01") || s.startsWith("1ΔΕ") || s.startsWith("ΔΕ1")) {
    return "μέλος ΕΒΠ";
  }
  return "εκπαιδευτικό";
}

// Inflect Greek first name to genitive (e.g. Βαία -> Βαίας, Ιωάννης -> Ιωάννη, Γεώργιος -> Γεωργίου)
export function inflectGreekFirstNameToGenitive(name?: string | null): string {
  if (!name) return "";
  const n = name.trim();
  if (!n) return "";

  // Female first names
  if (/[αά]$/.test(n)) {
    return n + "ς"; // Βαία -> Βαίας, Μαρία -> Μαρίας, Γεωργία -> Γεωργίας
  }
  if (/[ηή]$/.test(n)) {
    return n + "ς"; // Ελένη -> Ελένης, Ζωή -> Ζωής
  }

  // Male first names
  if (/[όο]ς$/i.test(n)) {
    return n.replace(/[όο]ς$/i, (m) => (m === "ός" ? "ού" : "ου")); // Γεώργιος -> Γεωργίου, Νικόλαος -> Νικολάου
  }
  if (/[ήη]ς$/i.test(n)) {
    return n.slice(0, -1); // Ιωάννης -> Ιωάννη, Αντώνης -> Αντώνη
  }
  if (/[άα]ς$/i.test(n)) {
    return n.slice(0, -1); // Κώστας -> Κώστα, Ανδρέας -> Ανδρέα
  }

  return n;
}

// Inflect Greek last name to genitive (female surnames ending in -ου/-α/-η remain unchanged, male -ος -> -ου, etc.)
export function inflectGreekLastNameToGenitive(name?: string | null, isFemale = false): string {
  if (!name) return "";
  const n = name.trim();
  if (!n) return "";

  if (isFemale) {
    // Female surnames in Greek (π.χ. Βαίδου, Παπαδοπούλου, Καρά, Αλεξίου) remain unchanged in genitive
    return n;
  }

  // Male surnames
  if (/[όο]ς$/i.test(n)) {
    return n.replace(/[όο]ς$/i, (m) => (m === "ός" ? "ού" : "ου")); // Παπαδόπουλος -> Παπαδόπουλου
  }
  if (/[ήη]ς$/i.test(n)) {
    return n.slice(0, -1); // Ατλάσης -> Ατλάση
  }
  if (/[άα]ς$/i.test(n)) {
    return n.slice(0, -1); // Μελάς -> Μελά
  }

  return n;
}

export function getTeacherGenitiveFullName(teacher: Teacher): string {
  const isFemale = isFemaleTeacher(teacher.firstName);
  const genitiveLast = inflectGreekLastNameToGenitive(teacher.lastName, isFemale);
  const genitiveFirst = inflectGreekFirstNameToGenitive(teacher.firstName);
  return `${genitiveLast} ${genitiveFirst}`.trim();
}

// Default Permanent Template for Regular Leave matching official school document (ΒΑΙΔΟΥ ΒΑΙΑ ΚΑΝΟΝΙΚΗ 07.11.2025.docx)
export const DEFAULT_PERMANENT_REGULAR_TEMPLATE: LeaveDecisionTemplate = {
  legalBasis: [
    `Τις διατάξεις των άρθρων 48 και 49 του Ν.3528/2007 (ΦΕΚ 26/9-2-2007 τ. Α'), με θέμα «Κύρωση του Κώδικα κατάστασης Δημοσίων Πολιτικών Διοικητικών Υπαλλήλων και άλλες   διατάξεις».`,
    `Την αριθμ. ΔΙΔΑΔ/Φ.35.14/916/0ικ.4084/15-2-2007 εγκ. του Υπουρ. Εσωτερικών.`,
    `Την με αριθμ.Φ.353.1/26/153324/Δ1/25-9-2014 Υπουργική απόφαση, καθορισμού των αρμοδιοτήτων των  Διευθυντών Σχολικών Μονάδων .`,
    `Την από {{protocol_date}} αίτηση {{teacher_genitive_title}} {{teacher_genitive_full_name}}`,
  ],
  decisionText: `Χ ο ρ η γ ο ύ μ ε   {{teacher_prep_title}} {{teacher_full_name}}, {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, κανονική άδεια {{days_phrase}} με αποδοχές {{date_phrase}}{{reason_phrase}}.`,
  notifications: [
    "1. Π.Μ.Υ.",
    "2. Ενδιαφερόμενο/η",
    "3. Αρχείο Δημ. Σχολείου",
  ],
};

// Default Deputy Template for Regular Leave
export const DEFAULT_DEPUTY_REGULAR_TEMPLATE: LeaveDecisionTemplate = {
  legalBasis: [
    `Τις διατάξεις του άρθρου 20 του Π.Δ. 410/1988 (ΦΕΚ 191/τ.Α'/11-10-1988), περί χορήγησης κανονικής άδειας σε προσωπικό με σχέση εργασίας ΙΔΟΧ.`,
    `Τις διατάξεις του Ν. 4589/2019 και του Ν. 4823/2021, όπως ισχύουν.`,
    `Την ισχύουσα εγκύκλιο του Υ.ΠΑΙ.Θ.Α. περί αδειών προσωρινών αναπληρωτών εκπαιδευτικών και μελών ΕΕΠ-ΕΒΠ.`,
    `Την με αρ. πρωτ. {{hiring_decision_ref}} Απόφαση Πρόσληψης / Τοποθέτησης της {{directorate}} για το διδακτικό έτος {{school_year}}.`,
    `Την από {{protocol_date}} αίτηση {{teacher_genitive_title}} {{teacher_genitive_full_name}}`,
    `{{reason_basis}}`,
  ],
  decisionText: `Χορηγούμε {{teacher_prep_title}} {{teacher_full_name}}, προσωρινό/ή αναπληρωτή/τρια {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, κανονική άδεια {{days_count}} ({{days_words}}) ημέρας/ημερών με αποδοχές {{date_phrase}}{{reason_phrase}}.`,
  notifications: [
    "1. {{directorate}} - Τμήμα Γ' Προσωπικού",
    "2. Ενδιαφερόμενο/η",
    "3. Αρχείο Δημ. Σχολείου",
  ],
};

// Generic Fallback Templates for other leaves if not specifically defined
export function getDefaultTemplateForLeaveType(
  leaveTypeId: string,
  isDeputy: boolean
): LeaveDecisionTemplate {
  if (leaveTypeId === "regular") {
    return isDeputy ? DEFAULT_DEPUTY_REGULAR_TEMPLATE : DEFAULT_PERMANENT_REGULAR_TEMPLATE;
  }

  if (isDeputy) {
    return {
      legalBasis: [
        `Τις κείμενες διατάξεις για το προσωπικό με σχέση εργασίας ΙΔΟΧ (Π.Δ. 410/1988, Ν. 4589/2019) όπως ισχύουν.`,
        `Την σχετική εγκύκλιο του Υ.ΠΑΙ.Θ.Α. για τη χορήγηση αδειών σε αναπληρωτές εκπαιδευτικούς.`,
        `Την από {{protocol_date}} αίτηση {{teacher_genitive_title}} {{teacher_genitive_full_name}}`,
        `{{reason_basis}}`,
      ],
      decisionText: `Χορηγούμε {{teacher_prep_title}} {{teacher_full_name}}, προσωρινό/ή αναπληρωτή/τρια {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, άδεια {{days_count}} ({{days_words}}) ημέρας/ημερών {{date_phrase}}{{reason_phrase}}.`,
      notifications: [
        "1. {{directorate}} - Τμήμα Γ' Προσωπικού",
        "2. Ενδιαφερόμενο/η",
        "3. Αρχείο Σχολείου",
      ],
    };
  }

  return {
    legalBasis: [
      `Τις διατάξεις του Υπαλληλικού Κώδικα (Ν. 3528/2007) όπως τροποποιήθηκε και ισχύει.`,
      `Τις διατάξεις του Ν. 1566/1985 για τη δομή και λειτουργία της πρωτοβάθμιας και δευτεροβάθμιας εκπαίδευσης.`,
      `Την με αριθμ. Φ.353.1/26/153324/Δ1/25-9-2014 Υπουργική απόφαση καθορισμού των αρμοδιοτήτων των Διευθυντών Σχολικών Μονάδων.`,
      `Την από {{protocol_date}} αίτηση {{teacher_genitive_title}} {{teacher_genitive_full_name}}`,
      `{{reason_basis}}`,
    ],
    decisionText: `Χορηγούμε {{teacher_prep_title}} {{teacher_full_name}}, {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, άδεια {{days_count}} ({{days_words}}) ημέρας/ημερών {{date_phrase}}{{reason_phrase}}.`,
    notifications: [
      "1. Π.Μ.Υ.",
      "2. Ενδιαφερόμενο/η",
      "3. Αρχείο Δημ. Σχολείου",
    ],
  };
}

export function getEffectiveTemplate(
  leaveType?: LeaveTypeConfig | null,
  isDeputy = false
): LeaveDecisionTemplate {
  if (leaveType) {
    if (isDeputy && leaveType.deputyTemplate && leaveType.deputyTemplate.legalBasis?.length > 0) {
      return leaveType.deputyTemplate;
    }
    if (!isDeputy && leaveType.permanentTemplate && leaveType.permanentTemplate.legalBasis?.length > 0) {
      return leaveType.permanentTemplate;
    }
    return getDefaultTemplateForLeaveType(leaveType.id, isDeputy);
  }
  return getDefaultTemplateForLeaveType("regular", isDeputy);
}

// Available Placeholders definition for UI helpers & documentation
export const TEMPLATE_VARIABLES = [
  { tag: "{{teacher_full_name}}", label: "Ονοματεπώνυμο Εκπ/κού (π.χ. Βαίδου Βαία)" },
  { tag: "{{teacher_genitive_full_name}}", label: "Ονοματεπώνυμο στη Γενική (π.χ. Βαίδου Βαίας)" },
  { tag: "{{teacher_first_name}}", label: "Όνομα Εκπ/κού" },
  { tag: "{{teacher_last_name}}", label: "Επώνυμο Εκπ/κού" },
  { tag: "{{teacher_prep_title}}", label: "«στον κ.» ή «στην κ.» (αυτόματο βάσει φύλου)" },
  { tag: "{{teacher_genitive_title}}", label: "«του κ.» ή «της κ.» (αυτόματο βάσει φύλου)" },
  { tag: "{{serving_phrase}}", label: "«ο οποίος υπηρετεί στο» ή «η οποία υπηρετεί στο»" },
  { tag: "{{staff_role_phrase}}", label: "«μέλος ΕΕΠ» / «μέλος ΕΒΠ» / «εκπαιδευτικό»" },
  { tag: "{{specialty}}", label: "Κλάδος/Ειδικότητα (π.χ. ΠΕ21, ΠΕ70)" },
  { tag: "{{school_name}}", label: "Όνομα Σχολικής Μονάδας" },
  { tag: "{{directorate}}", label: "Διεύθυνση Εκπαίδευσης" },
  { tag: "{{school_year}}", label: "Σχολικό Έτος (π.χ. 2025-2026)" },
  { tag: "{{days_count}}", label: "Αριθμός ημερών αριθμητικώς (π.χ. 1)" },
  { tag: "{{days_words}}", label: "Αριθμός ημερών ολογράφως (π.χ. μιας, δύο)" },
  { tag: "{{days_phrase}}", label: "«μιας (1) ημέρας» ή «δύο (2) ημερών»" },
  { tag: "{{date_phrase}}", label: "«στις 07/11/2025» ή «από 07/11/2025 έως και 08/11/2025»" },
  { tag: "{{reason}}", label: "Αιτιολογία άδειας (π.χ. οικογενειακούς λόγους)" },
  { tag: "{{reason_phrase}}", label: "« για οικογενειακούς λόγους»" },
  { tag: "{{protocol_number}}", label: "Αριθμός Πρωτοκόλλου" },
  { tag: "{{protocol_date}}", label: "Ημερομηνία Πρωτοκόλλου (π.χ. 06/11/2025)" },
  { tag: "{{start_date}}", label: "Ημερομηνία έναρξης άδειας" },
  { tag: "{{end_date}}", label: "Ημερομηνία λήξης άδειας" },
  { tag: "{{hiring_decision_ref}}", label: "Απόφαση Τοποθέτησης Αναπληρωτή" },
];

export interface ResolveContext {
  leave: Leave;
  teacher: Teacher;
  school: SchoolProfile;
  leaveTypes: LeaveTypeConfig[];
}

export function resolveDecisionTemplate(
  template: LeaveDecisionTemplate,
  ctx: ResolveContext
): { legalBasis: string[]; decisionText: string; notifications: string[] } {
  const { leave, teacher, school } = ctx;

  const isFemale = isFemaleTeacher(teacher.firstName);
  const teacherFullName = `${teacher.lastName} ${teacher.firstName}`;
  const teacherGenitiveFullName = getTeacherGenitiveFullName(teacher);
  const daysInfo = formatDaysInWords(leave.daysCount);

  const startDateFormatted = formatGreekDate(leave.startDate);
  const endDateFormatted = formatGreekDate(leave.endDate);
  const protoDateFormatted = formatGreekDate(leave.protocolDate || leave.startDate);

  const datePhrase =
    leave.daysCount === 1 || leave.startDate === leave.endDate
      ? `στις ${startDateFormatted}`
      : `από ${startDateFormatted} έως και ${endDateFormatted}`;

  const reasonPhrase = leave.reason && leave.reason.trim().length > 0
    ? ` για ${leave.reason.trim()}`
    : "";

  const reasonBasis = leave.reason && leave.reason.trim().length > 0
    ? `Τους αναφερόμενους λόγους και τα συνυποβαλλόμενα δικαιολογητικά: «${leave.reason.trim()}».`
    : `Τα συνυποβαλλόμενα δικαιολογητικά στοιχεία.`;

  const daysPhrase =
    leave.daysCount === 1
      ? "μιας (1) ημέρας"
      : `${daysInfo.wordStr} (${leave.daysCount}) ημερών`;

  const map: Record<string, string> = {
    "{{teacher_full_name}}": teacherFullName,
    "{{teacher_genitive_full_name}}": teacherGenitiveFullName,
    "{{teacher_genitive_name}}": teacherGenitiveFullName,
    "{{teacher_name}}": teacherFullName,
    "{{teacher_first_name}}": teacher.firstName || "",
    "{{teacher_last_name}}": teacher.lastName || "",
    "{{teacher_prep_title}}": isFemale ? "στην κ." : "στον κ.",
    "{{teacher_genitive_title}}": isFemale ? "της κ." : "του κ.",
    "{{serving_phrase}}": isFemale ? "η οποία υπηρετεί στο" : "ο οποίος υπηρετεί στο",
    "{{staff_role_phrase}}": getStaffRolePhrase(teacher.specialty),
    "{{specialty}}": teacher.specialty || "",
    "{{school_name}}": school.schoolName || "Σχολείο",
    "{{directorate}}": school.directorate || "Διεύθυνση Π.Ε.",
    "{{school_year}}": school.schoolYear || "2025-2026",
    "{{days_count}}": `${leave.daysCount}`,
    "{{days_words}}": daysInfo.wordStr,
    "{{days_phrase}}": daysPhrase,
    "{{date_phrase}}": datePhrase,
    "{{start_date}}": startDateFormatted,
    "{{end_date}}": endDateFormatted,
    "{{reason}}": leave.reason || "",
    "{{reason_phrase}}": reasonPhrase,
    "{{reason_basis}}": reasonBasis,
    "{{protocol_number}}": leave.protocolNumber || "____",
    "{{protocol_date}}": protoDateFormatted,
    "{{hiring_decision_ref}}": ".......................",
  };

  const replaceTags = (text: string) => {
    let out = text;
    for (const [tag, val] of Object.entries(map)) {
      out = out.split(tag).join(val);
    }
    return out;
  };

  const resolvedLegalBasis = template.legalBasis
    .map(replaceTags)
    .filter((line) => line && line.trim().length > 0);

  const resolvedDecisionText = replaceTags(template.decisionText);

  const resolvedNotifications = (template.notifications || [
    "1. Π.Μ.Υ.",
    "2. Ενδιαφερόμενο/η",
    "3. Αρχείο Δημ. Σχολείου",
  ]).map(replaceTags);

  return {
    legalBasis: resolvedLegalBasis,
    decisionText: resolvedDecisionText,
    notifications: resolvedNotifications,
  };
}
