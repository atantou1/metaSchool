export type SpecialtyType = "ΒΑΣΙΚΗ" | "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ";

export interface Specialty {
  code: string;
  name: string;
  type: SpecialtyType;
  isPrimary: boolean;
  isSecondary: boolean;
  shortCode?: string;
  color?: string; // Chip styling for supportive specialties
}

export const SPECIALTIES: readonly Specialty[] = [
  {
    code: "ΔΕ01",
    name: "ΕΒΠ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΕΒΠ",
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    code: "ΠΕ06",
    name: "ΑΓΓΛΙΚΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΑΓΓ",
  },
  {
    code: "ΠΕ08",
    name: "ΕΙΚΑΣΤΙΚΩΝ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΕΙΚ",
  },
  {
    code: "ΠΕ11",
    name: "ΦΥΣΙΚΗΣ ΑΓΩΓΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΦΥΣ",
  },
  {
    code: "ΠΕ21",
    name: "ΛΟΓΟΘΕΡΑΠΕΙΑΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΛΟΓ",
    color: "bg-purple-100 text-purple-800 border-purple-300",
  },
  {
    code: "ΠΕ23",
    name: "ΨΥΧΟΛΟΓΙΑΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΨΥΧ",
    color: "bg-rose-100 text-rose-800 border-rose-300",
  },
  {
    code: "ΠΕ25",
    name: "ΝΟΣΗΛΕΥΤΙΚΗΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΝΟΣ",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    code: "ΠΕ28",
    name: "ΦΥΣΙΚΟΘΕΡΑΠΕΙΑΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΦΘΕ",
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  {
    code: "ΠΕ29",
    name: "ΕΡΓΟΘΕΡΑΠΕΙΑΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΕΡΓ",
    color: "bg-teal-100 text-teal-800 border-teal-300",
  },
  {
    code: "ΠΕ30",
    name: "ΚΟΙΝΩΝΙΚΗΣ ΕΡΓΑΣΙΑΣ",
    type: "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΚΟΙ",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  {
    code: "ΠΕ70",
    name: "ΔΑΣΚΑΛΟΙ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: false,
    shortCode: "ΔΑΣ",
  },
  {
    code: "ΠΕ71",
    name: "ΔΑΣΚΑΛΟΙ ΕAE",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: false,
    shortCode: "ΕΑΕ",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  {
    code: "ΠΕ79.01",
    name: "ΜΟΥΣΙΚΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΜΟΥ",
  },
  {
    code: "ΠΕ86",
    name: "ΠΛΗΡΟΦΟΡΙΚΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΠΛΗ",
  },
  {
    code: "ΠΕ91.01",
    name: "ΘΕΑΤΡΙΚΗΣ ΑΓΩΓΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΘΕΑ",
  },
  {
    code: "ΠΕ91.02",
    name: "ΘΕΑΤΡΙΚΗΣ ΑΓΩΓΗΣ",
    type: "ΒΑΣΙΚΗ",
    isPrimary: true,
    isSecondary: true,
    shortCode: "ΘΕΑ",
  },
] as const;

/** Aliases for legacy data support */
const SPECIALTY_ALIASES: Record<string, string> = {
  "ΠΕ26": "ΠΕ21", // Λογοθεραπεία
  "ΠΕ79": "ΠΕ79.01", // Μουσική
  "ΠΕ91": "ΠΕ91.01", // Θεατρική
};

/** Get all specialties filtered by level or type */
export function getSpecialties(options?: {
  level?: "primary" | "secondary" | "all";
  type?: SpecialtyType | "all";
}): Specialty[] {
  let list = [...SPECIALTIES];
  if (options?.level === "primary") {
    list = list.filter((s) => s.isPrimary);
  } else if (options?.level === "secondary") {
    list = list.filter((s) => s.isSecondary);
  }

  if (options?.type && options.type !== "all") {
    list = list.filter((s) => s.type === options.type);
  }

  return list;
}

/** Get supportive / supplementary specialties (with chip styles) */
export function getSupportSpecialties(level: "primary" | "secondary" | "all" = "all"): Specialty[] {
  return SPECIALTIES.filter((s) => {
    const isLevelMatch =
      level === "all" ||
      (level === "primary" && s.isPrimary) ||
      (level === "secondary" && s.isSecondary);
    return isLevelMatch && (s.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ" || s.code === "ΠΕ71");
  });
}

/** Find specialty by code (e.g. 'ΠΕ70', 'ΠΕ79.01') or alias */
export function getSpecialtyByCode(code: string): Specialty | undefined {
  if (!code) return undefined;
  const cleanCode = code.trim().toUpperCase();
  const targetCode = SPECIALTY_ALIASES[cleanCode] || cleanCode;
  return SPECIALTIES.find((s) => s.code.toUpperCase() === targetCode);
}

/** Match code or legacy string e.g. "ΠΕ70 - Δάσκαλοι" -> Specialty */
export function findSpecialty(input: string): Specialty | undefined {
  if (!input) return undefined;
  const clean = input.trim();

  // 1. Exact code match
  const byCode = getSpecialtyByCode(clean);
  if (byCode) return byCode;

  // 2. Extract leading code e.g. "ΠΕ70 - Δάσκαλοι" or "ΠΕ79.01 ΜΟΥΣΙΚΗΣ"
  const match = clean.match(/^([A-ZΑ-Ω0-9.]+)/i);
  if (match) {
    const extracted = match[1].toUpperCase();
    const byExtracted = getSpecialtyByCode(extracted);
    if (byExtracted) return byExtracted;
  }

  // 3. Match by name
  const upper = clean.toUpperCase();
  return SPECIALTIES.find((s) => upper.includes(s.name.toUpperCase()));
}

/** Format a specialty code into a clean label e.g. "ΠΕ70 - ΔΑΣΚΑΛΟΙ" */
export function formatSpecialtyLabel(codeOrText: string): string {
  if (!codeOrText) return "";
  const spec = findSpecialty(codeOrText);
  if (spec) {
    return `${spec.code} - ${spec.name}`;
  }
  return codeOrText;
}

/** Format short label e.g. "ΠΕ70" */
export function formatSpecialtyCode(codeOrText: string): string {
  if (!codeOrText) return "";
  const spec = findSpecialty(codeOrText);
  return spec ? spec.code : codeOrText;
}
