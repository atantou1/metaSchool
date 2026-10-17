import { Leave, Teacher, SchoolProfile, LeaveTypeConfig, LeaveDecisionTemplate } from "@/types";
import {
  formatGreekDate,
  formatDaysInWords,
  formatLeaveProtocolNumber,
  isEspaDeputy,
} from "@/lib/leave-documents";

// Greek grammatical helpers
export function isFemaleTeacher(firstName?: string | null): boolean {
  if (!firstName) return false;
  const name = firstName.trim();
  if (/^(άρτεμις|αρτεμις|ίρις|ιρις|δάμαρις|δαμαρις)$/i.test(name)) return true;
  if (/[ςΣsS]$/.test(name)) return false;
  if (/[αάεέηήιίοόυύωώ]$/i.test(name)) return true;
  return false;
}

export function getTeacherPrep(firstName?: string | null): string {
  return isFemaleTeacher(firstName) ? "στην" : "στον";
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

/**
 * Remove trailing -ΕΒΠ or -ΕΕΠ from specialty code (e.g. "ΔΕ01-ΕΒΠ" -> "ΔΕ01")
 */
export function cleanSpecialtyCode(specialty?: string | null): string {
  if (!specialty) return "";
  return specialty
    .replace(/[-_/\s]*(ΕΒΠ|ΕΕΠ)$/i, "")
    .replace(/[-_/\s]*(EBP|EEP)$/i, "")
    .trim();
}

export function getStaffRolePhrase(specialty?: string | null): string {
  if (!specialty) return "εκπαιδευτικό";
  const s = specialty.trim().toUpperCase();
  if (s.startsWith("ΠΕ2") || s.startsWith("ΠΕ31") || s.startsWith("ΠΕ21") || s.startsWith("ΠΕ23") || s.startsWith("ΠΕ25") || s.startsWith("ΠΕ28") || s.startsWith("ΠΕ29") || s.startsWith("ΠΕ30")) {
    return "μέλος ΕΕΠ";
  }
  if (s.startsWith("ΔΕ01") || s.startsWith("1ΔΕ") || s.startsWith("ΔΕ1") || s.includes("ΕΒΠ") || s.includes("EBP")) {
    return "μέλος ΕΒΠ";
  }
  return "εκπαιδευτικό";
}

// Inflect Greek first name to genitive (e.g. Βαία -> Βαίας, Ιωάννης -> Ιωάννη, Γεώργιος -> Γεωργίου, Δημήτριος -> Δημητρίου)
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
    // Proparoxytone names ending in -ιος: e.g. Δημήτριος -> Δημητρίου, Βασίλειος -> Βασιλείου, Γεώργιος -> Γεωργίου
    if (/[ήηίιέεάαόούυώω][^αειηουως]*ι[οό]ς$/i.test(n)) {
      const vowelsAccented: Record<string, string> = {
        "ά": "α", "έ": "ε", "ή": "η", "ί": "ι", "ό": "ο", "ύ": "υ", "ώ": "ω",
        "Ά": "Α", "Έ": "Ε", "Ή": "Η", "Ί": "Ι", "Ό": "Ο", "Ύ": "Υ", "Ώ": "Ω",
      };
      const unaccented = n.replace(/[άέήίόύώ]/i, (v) => vowelsAccented[v] || v);
      return unaccented.replace(/ι[οό]ς$/i, "ίου");
    }
    return n.replace(/[όο]ς$/i, (m) => (m === "ός" ? "ού" : "ου")); // Νικόλαος -> Νικολάου, Παύλος -> Παύλου
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

// Inflect Greek first name to accusative (e.g. Δημήτριος -> Δημήτριο, Αντώνης -> Αντώνη, Βαία -> Βαία)
export function inflectGreekFirstNameToAccusative(name?: string | null): string {
  if (!name) return "";
  const n = name.trim();
  if (!n) return "";
  if (isFemaleTeacher(n)) {
    if (/[ςΣsS]$/.test(n)) {
      return n.slice(0, -1);
    }
    return n;
  }
  // Masculine names drop the final -ς in accusative singular
  if (/[ςΣsS]$/.test(n)) {
    return n.slice(0, -1);
  }
  return n;
}

// Inflect Greek last name to accusative (e.g. Δημητρόπουλος -> Δημητρόπουλο, Ατλάσης -> Ατλάση, Βαΐδου -> Βαΐδου)
export function inflectGreekLastNameToAccusative(name?: string | null, isFemale = false): string {
  if (!name) return "";
  const n = name.trim();
  if (!n) return "";
  if (isFemale) {
    return n;
  }
  if (/[ςΣsS]$/.test(n)) {
    return n.slice(0, -1);
  }
  return n;
}

export function getTeacherAccusativeFullName(teacher: Teacher): string {
  const isFemale = isFemaleTeacher(teacher.firstName);
  const accLast = inflectGreekLastNameToAccusative(teacher.lastName, isFemale);
  const accFirst = inflectGreekFirstNameToAccusative(teacher.firstName);
  return `${accLast} ${accFirst}`.trim();
}

export function getTeacherFatherGenitive(teacher: Teacher): string {
  if (!teacher.fatherName) return "";
  const fn = teacher.fatherName.trim();
  if (!fn) return "";
  return inflectGreekFirstNameToGenitive(fn);
}

export function getTeacherFatherPhrase(teacher: Teacher): string {
  const gen = getTeacherFatherGenitive(teacher);
  if (!gen) return "";
  if (gen.toLowerCase().startsWith("του ")) {
    return ` ${gen}`;
  }
  return ` του ${gen}`;
}

export function getDeputyRolePhrases(teacher?: Teacher | null): {
  deputyGenitivePhrase: string;
  deputyAccusativePhrase: string;
} {
  const isFemale = isFemaleTeacher(teacher?.firstName);
  const isEspa = isEspaDeputy(teacher) || teacher?.employmentType === "deputy_espa";

  return {
    deputyGenitivePhrase: isFemale
      ? (isEspa ? "αναπληρώτριας ΕΣΠΑ" : "αναπληρώτριας")
      : (isEspa ? "αναπληρωτή ΕΣΠΑ" : "αναπληρωτή"),
    deputyAccusativePhrase: isFemale
      ? (isEspa ? "αναπληρώτρια ΕΣΠΑ" : "αναπληρώτρια")
      : (isEspa ? "αναπληρωτή ΕΣΠΑ" : "αναπληρωτή"),
  };
}

// Default Permanent Template for Regular Leave matching official school document (ΒΑΙΔΟΥ ΒΑΙΑ ΚΑΝΟΝΙΚΗ 07.11.2025.docx)
export const DEFAULT_PERMANENT_REGULAR_TEMPLATE: LeaveDecisionTemplate = {
  legalBasis: [
    `Τις διατάξεις των άρθρων 48 και 49 του Ν.3528/2007 (ΦΕΚ 26/9-2-2007 τ. Α'), με θέμα «Κύρωση του Κώδικα κατάστασης Δημοσίων Πολιτικών Διοικητικών Υπαλλήλων και άλλες   διατάξεις».`,
    `Την αριθμ. ΔΙΔΑΔ/Φ.35.14/916/0ικ.4084/15-2-2007 εγκ. του Υπουρ. Εσωτερικών.`,
    `Την με αριθμ.Φ.353.1/26/153324/Δ1/25-9-2014 Υπουργική απόφαση, καθορισμού των αρμοδιοτήτων των  Διευθυντών Σχολικών Μονάδων .`,
    `Την από {{protocol_date}} αίτηση **{{teacher_genitive_title}} {{teacher_genitive_full_name}}**`,
  ],
  decisionText: `**Χορηγούμε** {{teacher_prep}} **κ. {{teacher_full_name}}**, {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, κανονική άδεια {{days_phrase}} με αποδοχές {{date_phrase}}{{reason_phrase}}.`,
  notifications: [
    "1. Π.Μ.Υ.",
    "2. {{interested_party}}",
    "3. Αρχείο Δημ. Σχολείου",
  ],
};

// Default Deputy Template for Regular Leave
export const DEFAULT_DEPUTY_REGULAR_TEMPLATE: LeaveDecisionTemplate = {
  legalBasis: [
    `Τις διατάξεις της παρ. 8 του άρθρ. 20 του Π.Δ. 410/88  και της 44/90  γνωμοδότησης του Νομικού   Συμβουλίου του Κράτους.`,
    `Την αριθμ.Φ.353.1/26/153324/Δ1/25-9-2014 Υπουργική απόφαση, καθορισμού των καθηκόντων και αρμοδιοτήτων των Διευθυντών  Σχολικών Μονάδων.`,
    `Την Πράξη με τίτλο: «Υποστήριξη φοίτησης μαθητών/τριών με αναπηρία ή ειδικές εκπαιδευτικές ανάγκες, σχολικό έτος 2026-2027», με κωδικό ΟΠΣ: 6063312, του Τομεακού Προγράμματος «Ανθρώπινο Δυναμικό και Κοινωνική Συνοχή», του ΕΣΠΑ 2021-2027»`,
    `Τη με ημερ. {{protocol_date}} αίτηση {{teacher_genitive_title}} **{{teacher_genitive_full_name}}**, εκπ/κού κλάδου {{specialty}} {{deputy_genitive_phrase}}.`,
  ],
  decisionText: `**Χ ο ρ η γ ο ύ μ ε** {{teacher_prep}} **κ. {{teacher_accusative_full_name}}**{{teacher_father_phrase}}, εκπ/κό κλάδου {{specialty}} {{deputy_accusative_phrase}}, {{serving_phrase}} {{school_name}}, κανονική άδεια {{days_phrase}} με αποδοχές {{date_phrase}}{{reason_phrase}}.`,
  notifications: [
    "1. Π.Μ.Υ.",
    "2. {{interested_party}}",
    "3. Αρχείο ",
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
        `Την από {{protocol_date}} αίτηση **{{teacher_genitive_title}} {{teacher_genitive_full_name}}**`,
        `{{reason_basis}}`,
      ],
      decisionText: `**Χορηγούμε** {{teacher_prep}} **κ. {{teacher_full_name}}**, προσωρινό/ή αναπληρωτή/τρια {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, άδεια {{days_count}} ({{days_words}}) ημέρας/ημερών {{date_phrase}}{{reason_phrase}}.`,
      notifications: [
        "1. {{directorate}} - Τμήμα Γ' Προσωπικού",
        "2. {{interested_party}}",
        "3. Αρχείο Σχολείου",
      ],
    };
  }

  return {
    legalBasis: [
      `Τις διατάξεις του Υπαλληλικού Κώδικα (Ν. 3528/2007) όπως τροποποιήθηκε και ισχύει.`,
      `Τις διατάξεις του Ν. 1566/1985 για τη δομή και λειτουργία της πρωτοβάθμιας και δευτεροβάθμιας εκπαίδευσης.`,
      `Την με αριθμ. Φ.353.1/26/153324/Δ1/25-9-2014 Υπουργική απόφαση καθορισμού των αρμοδιοτήτων των Διευθυντών Σχολικών Μονάδων.`,
      `Την από {{protocol_date}} αίτηση **{{teacher_genitive_title}} {{teacher_genitive_full_name}}**`,
      `{{reason_basis}}`,
    ],
    decisionText: `**Χορηγούμε** {{teacher_prep}} **κ. {{teacher_full_name}}**, {{staff_role_phrase}} κλάδου {{specialty}}, {{serving_phrase}} {{school_name}}, άδεια {{days_count}} ({{days_words}}) ημέρας/ημερών {{date_phrase}}{{reason_phrase}}.`,
    notifications: [
      "1. Π.Μ.Υ.",
      "2. {{interested_party}}",
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
  { tag: "{{teacher_full_name}}", label: "Ονοματεπώνυμο Εκπ/κού (αυτόματη αιτιατική στην απόφαση)" },
  { tag: "{{teacher_accusative_full_name}}", label: "Ονοματεπώνυμο στην Αιτιατική (π.χ. Δημητρόπουλο Δημήτριο)" },
  { tag: "{{teacher_genitive_full_name}}", label: "Ονοματεπώνυμο στη Γενική (π.χ. Δημητρόπουλου Δημητρίου)" },
  { tag: "{{teacher_first_name}}", label: "Όνομα Εκπ/κού" },
  { tag: "{{teacher_last_name}}", label: "Επώνυμο Εκπ/κού" },
  { tag: "{{teacher_father_phrase}}", label: "« του Πατρωνύμου» (π.χ. του Κωνσταντίνου)" },
  { tag: "{{teacher_father_name}}", label: "Όνομα πατρός στη Γενική (π.χ. Κωνσταντίνου)" },
  { tag: "{{teacher_prep}}", label: "«στην» ή «στον» (αυτόματο βάσει φύλου)" },
  { tag: "{{teacher_prep_title}}", label: "«στην κ.» ή «στον κ.» (αυτόματο βάσει φύλου)" },
  { tag: "{{teacher_genitive_title}}", label: "«της κ.» ή «του κ.» (αυτόματο βάσει φύλου)" },
  { tag: "{{interested_party}}", label: "«Ενδιαφερόμενη» ή «Ενδιαφερόμενο» (αυτόματο βάσει φύλου)" },
  { tag: "{{serving_phrase}}", label: "«ο οποίος υπηρετεί στο» ή «η οποία υπηρετεί στο»" },
  { tag: "{{staff_role_phrase}}", label: "«μέλος ΕΕΠ» / «μέλος ΕΒΠ» / «εκπαιδευτικό»" },
  { tag: "{{deputy_genitive_phrase}}", label: "«αναπληρωτή ΕΣΠΑ» ή «αναπληρώτριας ΕΣΠΑ» (Γενική)" },
  { tag: "{{deputy_accusative_phrase}}", label: "«αναπληρωτή ΕΣΠΑ» ή «αναπληρώτρια ΕΣΠΑ» (Αιτιατική)" },
  { tag: "{{specialty}}", label: "Κλάδος/Ειδικότητα (π.χ. ΠΕ86, ΠΕ70, ΔΕ01)" },
  { tag: "{{school_name}}", label: "Όνομα Σχολικής Μονάδας" },
  { tag: "{{directorate}}", label: "Διεύθυνση Εκπαίδευσης" },
  { tag: "{{school_year}}", label: "Σχολικό Έτος (π.χ. 2026-2027)" },
  { tag: "{{days_count}}", label: "Αριθμός ημερών αριθμητικώς (π.χ. 1)" },
  { tag: "{{days_words}}", label: "Αριθμός ημερών ολογράφως (π.χ. μιας, δύο)" },
  { tag: "{{days_phrase}}", label: "«μιας (1) ημέρας» ή «δύο (2) ημερών»" },
  { tag: "{{date_phrase}}", label: "«στις 16/10/2026» ή «από 16/10/2026 έως και 17/10/2026»" },
  { tag: "{{reason}}", label: "Αιτιολογία άδειας (π.χ. οικογενειακούς λόγους)" },
  { tag: "{{reason_phrase}}", label: "« για οικογενειακούς λόγους»" },
  { tag: "{{protocol_number}}", label: "Αριθμός Πρωτοκόλλου" },
  { tag: "{{protocol_date}}", label: "Ημερομηνία Πρωτοκόλλου (π.χ. 16/10/2026)" },
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
  const teacherNominativeFullName = `${teacher.lastName} ${teacher.firstName}`.trim();
  const teacherAccusativeFullName = getTeacherAccusativeFullName(teacher);
  const teacherGenitiveFullName = getTeacherGenitiveFullName(teacher);
  const teacherFatherPhrase = getTeacherFatherPhrase(teacher);
  const teacherFatherName = getTeacherFatherGenitive(teacher);
  const { deputyGenitivePhrase, deputyAccusativePhrase } = getDeputyRolePhrases(teacher);
  const daysInfo = formatDaysInWords(leave.daysCount);

  const startDateFormatted = formatGreekDate(leave.startDate);
  const endDateFormatted = formatGreekDate(leave.endDate);
  const protoDateFormatted = formatGreekDate(leave.protocolDate || leave.startDate);

  const datePhrase =
    leave.daysCount === 1 || leave.startDate === leave.endDate
      ? `στις ${startDateFormatted}`
      : `από ${startDateFormatted} έως και ${endDateFormatted}`;

  const isRegularLeave = leave.type === "regular";

  // Build clean reason and reason phrase dynamically
  let rawReason = (leave.reason || "").trim();
  if (!rawReason && isRegularLeave) {
    rawReason = "για οικογενειακούς λόγους";
  }

  // Strip trailing period(s)
  rawReason = rawReason.replace(/\.+$/, "").trim();

  let reasonPhrase = "";
  let reasonOnly = rawReason;

  if (rawReason.length > 0) {
    if (/^(για|λόγω|λογω)\s+/i.test(rawReason)) {
      reasonPhrase = `, ${rawReason}`;
      reasonOnly = rawReason.replace(/^(για|λόγω|λογω)\s+/i, "").trim();
    } else {
      reasonPhrase = `, για ${rawReason}`;
      reasonOnly = rawReason;
    }
  }

  const reasonBasis = rawReason.length > 0
    ? `Τους αναφερόμενους λόγους και τα συνυποβαλλόμενα δικαιολογητικά: «${rawReason}».`
    : `Τα συνυποβαλλόμενα δικαιολογητικά στοιχεία.`;

  const daysPhrase =
    leave.daysCount === 1
      ? "μιας (1) ημέρας"
      : `${daysInfo.wordStr} (${leave.daysCount}) ημερών`;

  const interestedParty = isFemale ? "Ενδιαφερόμενη" : "Ενδιαφερόμενο";
  const teacherPrep = isFemale ? "στην" : "στον";
  const teacherGenitiveTitle = isFemale ? "της κ." : "του κ.";
  const cleanSpecialty = cleanSpecialtyCode(teacher.specialty);

  const map: Record<string, string> = {
    "{{teacher_full_name}}": teacherAccusativeFullName,
    "{{teacher_accusative_full_name}}": teacherAccusativeFullName,
    "{{teacher_accusative_name}}": teacherAccusativeFullName,
    "{{teacher_nominative_full_name}}": teacherNominativeFullName,
    "{{teacher_genitive_full_name}}": teacherGenitiveFullName,
    "{{teacher_genitive_name}}": teacherGenitiveFullName,
    "{{teacher_name}}": teacherAccusativeFullName,
    "{{teacher_first_name}}": teacher.firstName || "",
    "{{teacher_last_name}}": teacher.lastName || "",
    "{{teacher_father_phrase}}": teacherFatherPhrase,
    "{{teacher_father_name}}": teacherFatherName,
    "{{teacher_prep}}": teacherPrep,
    "{{teacher_prep_title}}": `${teacherPrep} κ.`,
    "{{teacher_genitive_title}}": teacherGenitiveTitle,
    "{{interested_party}}": interestedParty,
    "{{serving_phrase}}": isFemale ? "η οποία υπηρετεί στο" : "ο οποίος υπηρετεί στο",
    "{{staff_role_phrase}}": getStaffRolePhrase(teacher.specialty),
    "{{deputy_genitive_phrase}}": deputyGenitivePhrase,
    "{{deputy_accusative_phrase}}": deputyAccusativePhrase,
    "{{deputy_phrase}}": deputyAccusativePhrase,
    "{{specialty}}": cleanSpecialty,
    "{{school_name}}": (
      school.schoolName?.includes("Ειδικό Πειραματικό Σχολείο") && !school.schoolName.includes("Δημοτικό")
        ? school.schoolName.replace("Ειδικό Πειραματικό Σχολείο", "Ειδικό Πειραματικό Δημοτικό Σχολείο")
        : (school.schoolName || "Σχολείο")
    ),
    "{{directorate}}": school.directorate || "Διεύθυνση Π.Ε.",
    "{{school_year}}": school.schoolYear || "2026-2027",
    "{{days_count}}": `${leave.daysCount}`,
    "{{days_words}}": daysInfo.wordStr,
    "{{days_phrase}}": daysPhrase,
    "{{date_phrase}}": datePhrase,
    "{{start_date}}": startDateFormatted,
    "{{end_date}}": endDateFormatted,
    "{{reason}}": reasonOnly,
    "{{reason_phrase}}": reasonPhrase,
    "{{reason_basis}}": reasonBasis,
    "{{protocol_number}}": formatLeaveProtocolNumber(leave.protocolNumber, leave.type, ctx.leaveTypes),
    "{{protocol_date}}": protoDateFormatted,
    "{{hiring_decision_ref}}": ".......................",
  };

  const replaceTags = (text: string) => {
    let out = text;
    for (const [tag, val] of Object.entries(map)) {
      out = out.split(tag).join(val);
    }
    // Universal safeguard: normalize school name
    out = out.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών");
    // Normalize punctuation e.g. ", ," -> "," and clean spaces before comma
    out = out.replace(/\s+,/g, ",");
    out = out.replace(/,\s*,/g, ",");
    // Normalize consecutive spaces while preserving single spaces in "Χ ο ρ η γ ο ύ μ ε"
    out = out.replace(/ {2,}/g, " ");
    return out;
  };

  const resolvedLegalBasis = template.legalBasis
    .map(replaceTags)
    .filter((line) => line && line.trim().length > 0)
    .map((line) => {
      // Ensure "της/του κ. [Όνομα]" is bolded in application clause without bolding the following role
      if (line.includes("αίτηση") && !line.includes("**")) {
        return line.replace(/(αίτηση\s+)(της\s+κ\.\s+[^*,]+|του\s+κ\.\s+[^*,]+)/i, "$1**$2**");
      }
      return line;
    });

  let resolvedDecisionText = replaceTags(template.decisionText);

  // Normalize school name in decision text
  resolvedDecisionText = resolvedDecisionText.replace(
    /Ειδικό Πειραματικό Σχολείο Σερρών/g,
    "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών"
  );

  // Ensure "Χ ο ρ η γ ο ύ μ ε" or "Χορηγούμε" is bold
  if (!resolvedDecisionText.startsWith("**Χ ο ρ η γ ο ύ μ ε**") && resolvedDecisionText.startsWith("Χ ο ρ η γ ο ύ μ ε")) {
    resolvedDecisionText = resolvedDecisionText.replace(/^Χ ο ρ η γ ο ύ μ ε/, "**Χ ο ρ η γ ο ύ μ ε**");
  } else if (!resolvedDecisionText.startsWith("**Χορηγούμε**") && resolvedDecisionText.startsWith("Χορηγούμε")) {
    resolvedDecisionText = resolvedDecisionText.replace(/^Χορηγούμε/, "**Χορηγούμε**");
  }

  // Ensure "κ. [Ονοματεπώνυμο]" is bold (while "στην" / "στον" remains regular)
  if (!resolvedDecisionText.includes("**κ.") && !resolvedDecisionText.includes(`**${teacherAccusativeFullName}`)) {
    resolvedDecisionText = resolvedDecisionText.replace(
      /(στην|στον)\s+κ\.\s+([^*,]+)/i,
      "$1 **κ. $2**"
    );
  }

  // Ensure decision ends cleanly with a period
  if (!resolvedDecisionText.trim().endsWith(".")) {
    resolvedDecisionText = `${resolvedDecisionText.trim()}.`;
  }

  const resolvedNotifications = (template.notifications || [
    "1. Π.Μ.Υ.",
    `2. ${interestedParty}`,
    "3. Αρχείο Δημ. Σχολείου",
  ]).map((notif) => {
    let replaced = replaceTags(notif);
    // Replace any legacy or hardcoded "Ενδιαφερόμενο/η"
    replaced = replaced.replace(/Ενδιαφερόμενο\/η/gi, interestedParty);
    replaced = replaced.replace(/Ενδιαφερόμενος\/η/gi, interestedParty);
    return replaced;
  });

  return {
    legalBasis: resolvedLegalBasis,
    decisionText: resolvedDecisionText,
    notifications: resolvedNotifications,
  };
}
