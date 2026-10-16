import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, Packer, ImageRun, TabStopType, Footer } from "docx";
import { Leave, Teacher, SchoolProfile, LeaveTypeConfig } from "@/types";
import { GREEK_EMBLEM_BASE64 } from "@/lib/emblem-asset";
import { getEffectiveTemplate, resolveDecisionTemplate } from "@/lib/leave-templates";

// Helper to format Greek date (e.g., 12/10/2026)
export function formatGreekDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Format the protocol number with appropriate file prefix (e.g. "Φ.12/" for regular leaves).
 */
export function formatLeaveProtocolNumber(
  rawProtocol?: string | null,
  leaveType?: string,
  leaveTypes?: LeaveTypeConfig[]
): string {
  const cfg = leaveTypes?.find((lt) => lt.id === leaveType);
  // Default prefix for regular leave is "Φ.12/", or cfg?.protocolPrefix if configured
  let prefix = cfg?.protocolPrefix;
  if (!prefix && leaveType === "regular") {
    prefix = "Φ.12/";
  }

  const trimmed = (rawProtocol || "").trim();
  if (!trimmed) {
    return prefix ? `${prefix}____` : "____";
  }

  if (prefix) {
    const cleanPrefix = prefix.trim();
    if (trimmed.startsWith(cleanPrefix) || (cleanPrefix.startsWith("Φ.") && trimmed.startsWith("Φ."))) {
      return trimmed;
    }
    return `${cleanPrefix}${trimmed}`;
  }

  return trimmed;
}

/**
 * Convert Greek string to uppercase and strip diacritics / tonoi (e.g. "Ελληνική Δημοκρατία" -> "ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ").
 */
export function toGreekUpper(str?: string | null): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

/**
 * Remove postal code or city suffixes from school address to avoid duplication with Τ.Κ.-Πόλη line.
 */
export function getCleanSchoolAddress(address?: string | null, postalAddress?: string | null): string {
  const raw = address || postalAddress || "-";
  return raw
    .replace(/,?\s*Τ\.?Κ\.?.*$/i, "")
    .replace(/,?\s*\d{5}.*$/, "")
    .trim() || "-";
}

/**
 * Combine postal code and city into "Τ.Κ.-Πόλη" string (e.g. "62100 Σέρρες").
 */
export function getSchoolTkCity(school: SchoolProfile): string {
  let combined = [school.postalCode, school.city].filter(Boolean).join(" ");
  if (!combined) {
    const match = (school.postalAddress || school.address || "").match(/(\d{5})\s*,?\s*([^,]+)/);
    if (match) {
      combined = `${match[1]} ${match[2].trim()}`;
    } else {
      combined = `${school.city || "Σέρρες"}`;
    }
  }
  return combined || "62100 Σέρρες";
}

export function getLeaveTypeName(typeId: string, leaveTypes: LeaveTypeConfig[]): string {
  const found = leaveTypes.find((t) => t.id === typeId);
  return found ? found.name : typeId;
}

/**
 * Convert markdown bold tags (**text**) into an array of TextRun objects for Word.
 */
export function createFormattedTextRuns(text: string, defaultSize = 21): TextRun[] {
  if (!text) return [];
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: defaultSize,
        });
      }
      return new TextRun({
        text: part,
        size: defaultSize,
      });
    });
}

export function getEmploymentTypeLabel(empType?: string | null): string {
  switch (empType) {
    case "permanent":
      return "Μόνιμος Εκπαιδευτικός";
    case "deputy_regular":
      return "Αναπληρωτής (Τακτικού Προϋπολογισμού)";
    case "deputy_espa":
      return "Αναπληρωτής (ΕΣΠΑ)";
    case "hourly":
      return "Ωρομίσθιος Εκπαιδευτικός";
    default:
      return "Μόνιμος Εκπαιδευτικός";
  }
}

export function isDeputyTeacher(teacher?: Teacher | null): boolean {
  if (!teacher || !teacher.employmentType) return false;
  return teacher.employmentType.startsWith("deputy") || teacher.employmentType === "hourly";
}

export function isEspaDeputy(teacher?: Teacher | null): boolean {
  if (!teacher || !teacher.employmentType) return false;
  return teacher.employmentType === "deputy_espa";
}

// Automatically detect grammatical gender from Greek first name (99.9% accurate in Greek nominative)
export function getApplicantGenderLabel(firstName?: string | null): "Ο ΑΙΤΩΝ" | "Η ΑΙΤΟΥΣΑ" | "Ο/ Η ΑΙΤΩΝ/ΟΥΣΑ" {
  if (!firstName) return "Ο/ Η ΑΙΤΩΝ/ΟΥΣΑ";
  const name = firstName.trim();
  if (!name) return "Ο/ Η ΑΙΤΩΝ/ΟΥΣΑ";

  // Rare feminine names ending in -ις
  if (/^(άρτεμις|αρτεμις|ίρις|ιρις|δάμαρις|δαμαρις)$/i.test(name)) {
    return "Η ΑΙΤΟΥΣΑ";
  }

  // Greek masculine names in nominative end in -ς (π.χ. Αντώνης, Βασίλης, Δημήτριος, Ιωάννης, Λάζαρος)
  if (/[ςΣsS]$/.test(name)) {
    return "Ο ΑΙΤΩΝ";
  }

  // Greek feminine names in nominative end in vowels (π.χ. Μαρία, Ελένη, Αικατερίνη, Χρυσάνθη)
  if (/[αάεέηήιίοόυύωώ]$/i.test(name)) {
    return "Η ΑΙΤΟΥΣΑ";
  }

  return "Ο/ Η ΑΙΤΩΝ/ΟΥΣΑ";
}

export function formatDaysInWords(days: number): { numberStr: string; wordStr: string } {
  const words: Record<number, string> = {
    1: "μίας",
    2: "δύο",
    3: "τριών",
    4: "τεσσάρων",
    5: "πέντε",
    6: "έξι",
    7: "επτά",
    8: "οκτώ",
    9: "εννέα",
    10: "δέκα",
    11: "έντεκα",
    12: "δώδεκα",
    13: "δεκατριών",
    14: "δεκατεσσάρων",
    15: "δεκαπέντε",
  };
  return { numberStr: `${days}`, wordStr: words[days] || `${days}` };
}

// Algorithmic Greek inflection for leave names to genitive (e.g. "Αναρρωτική Άδεια" -> "αναρρωτικής άδειας")
export function inflectLeaveToGenitive(rawName: string): string {
  let name = rawName.trim().toLowerCase();
  if (!name) return "άδειας";

  // Retain parenthesis if present (e.g. "(σχολικής παρακολούθησης)")
  let extra = "";
  const parenMatch = name.match(/\s*(\(.*\))\s*$/);
  if (parenMatch) {
    extra = " " + parenMatch[1];
    name = name.replace(/\s*\(.*\)\s*$/, "").trim();
  }

  // Handle slashes if present (e.g. "επιμορφωτική / σεμιναρίου")
  if (name.includes("/")) {
    const primary = name.split("/")[0].trim();
    return inflectLeaveToGenitive(primary) + extra;
  }

  // Case 1: Already ends with " άδεια"
  if (name.endsWith(" άδεια")) {
    const base = name.slice(0, -6).trim();
    const inflectedBase = base
      .split(/\s+/)
      .map((w) => {
        if (w.endsWith("ική")) return w.slice(0, -3) + "ικής";
        if (w.endsWith("ικη")) return w.slice(0, -3) + "ικης";
        if (w.endsWith("αία")) return w.slice(0, -3) + "αίας";
        if (w.endsWith("αια")) return w.slice(0, -3) + "αιας";
        if (w.endsWith("η")) return w.slice(0, -1) + "ης";
        if (w.endsWith("ή")) return w.slice(0, -1) + "ής";
        if (w.endsWith("α")) return w.slice(0, -1) + "ας";
        if (w.endsWith("ά")) return w.slice(0, -1) + "άς";
        return w;
      })
      .join(" ");
    return `${inflectedBase} άδειας${extra}`;
  }

  // Case 2: Starts with "άδεια ..." (e.g. "άδεια άνευ αποδοχών", "άδεια μητρότητας")
  if (name.startsWith("άδεια ")) {
    return `άδειας ${name.slice(6)}${extra}`;
  }

  // Case 3: Just an adjective like "επιμορφωτική"
  if (name.endsWith("ική") || name.endsWith("ικη")) {
    return `${name}ς άδειας${extra}`;
  }

  return `${name} άδειας${extra}`;
}

// Algorithmic Greek inflection for leave names to accusative for request text (e.g. "αναρρωτική άδεια")
export function inflectLeaveToAccusative(rawName: string): string {
  let name = rawName.trim().toLowerCase();
  if (!name) return "άδεια";

  let extra = "";
  const parenMatch = name.match(/\s*(\(.*\))\s*$/);
  if (parenMatch) {
    extra = " " + parenMatch[1];
    name = name.replace(/\s*\(.*\)\s*$/, "").trim();
  }

  if (name.includes("/")) {
    const primary = name.split("/")[0].trim();
    return inflectLeaveToAccusative(primary) + extra;
  }

  if (name.endsWith(" άδεια")) {
    return `${name}${extra}`;
  }

  if (name.startsWith("άδεια ")) {
    return `${name}${extra}`;
  }

  if (name.endsWith("ική") || name.endsWith("ικη")) {
    return `${name} άδεια${extra}`;
  }

  return `${name} άδεια${extra}`;
}

export interface LeavePhrases {
  subject: string;    // π.χ. "Χορήγηση αναρρωτικής άδειας"
  genitive: string;   // π.χ. "αναρρωτικής άδειας"
  accusative: string; // π.χ. "αναρρωτική άδεια"
}

export function getLeavePhrases(leaveType: string, leaveTypes: LeaveTypeConfig[]): LeavePhrases {
  switch (leaveType) {
    case "regular":
      return {
        subject: "Χορήγηση κανονικής άδειας",
        genitive: "κανονικής άδειας",
        accusative: "κανονική άδεια",
      };
    case "medical":
    case "sick":
      return {
        subject: "Χορήγηση αναρρωτικής άδειας",
        genitive: "αναρρωτικής άδειας",
        accusative: "αναρρωτική άδεια",
      };
    case "special":
      return {
        subject: "Χορήγηση ειδικής άδειας",
        genitive: "ειδικής άδειας",
        accusative: "ειδική άδεια",
      };
    case "blood":
    case "blood_donation":
      return {
        subject: "Χορήγηση ειδικής άδειας αιμοδοσίας",
        genitive: "ειδικής άδειας αιμοδοσίας",
        accusative: "ειδική άδεια αιμοδοσίας",
      };
    case "parental":
    case "child_care":
      return {
        subject: "Χορήγηση γονικής άδειας (σχολικής παρακολούθησης)",
        genitive: "γονικής άδειας (σχολικής παρακολούθησης)",
        accusative: "γονική άδεια σχολικής παρακολούθησης",
      };
    case "educational":
      return {
        subject: "Χορήγηση επιμορφωτικής άδειας",
        genitive: "επιμορφωτικής άδειας",
        accusative: "επιμορφωτική άδεια",
      };
    case "short_term":
      return {
        subject: "Χορήγηση ολιγοήμερης άδειας",
        genitive: "ολιγοήμερης άδειας",
        accusative: "ολιγοήμερη άδεια",
      };
    case "other":
      return {
        subject: "Χορήγηση άδειας",
        genitive: "άδειας",
        accusative: "άδεια",
      };
    default: {
      const type = leaveTypes.find((t) => t.id === leaveType);
      const rawName = type ? type.name : leaveType;
      const genitive = inflectLeaveToGenitive(rawName);
      const accusative = inflectLeaveToAccusative(rawName);
      return {
        subject: `Χορήγηση ${genitive}`,
        genitive,
        accusative,
      };
    }
  }
}

export function getLeaveSubject(leaveType: string, leaveTypes: LeaveTypeConfig[]): string {
  return getLeavePhrases(leaveType, leaveTypes).subject;
}

export function getLeaveDecisionSubject(leaveType: string, leaveTypes: LeaveTypeConfig[]): string {
  if (leaveType === "regular") {
    return "«Χορήγηση κανονικής άδειας σε εκπαιδευτικό.»";
  }
  const phrases = getLeavePhrases(leaveType, leaveTypes);
  return `«${phrases.subject} σε εκπαιδευτικό.»`;
}

export function getLeaveAdjective(leaveType: string, leaveTypes: LeaveTypeConfig[]): string {
  const acc = getLeavePhrases(leaveType, leaveTypes).accusative;
  return acc.replace(/\s*άδεια.*$/, "").trim() || "άδεια";
}

export function formatTeacherAddress(t?: Teacher | null): string {
  if (!t) return "-";
  const parts: string[] = [];
  if (t.address) parts.push(t.address);
  if (t.postalCode) parts.push(`Τ.Κ. ${t.postalCode}`);
  if (t.city) parts.push(t.city);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export function isMedicalLeaveType(leaveTypeId: string, leaveTypes: LeaveTypeConfig[]): boolean {
  if (!leaveTypeId) return false;
  const normalized = leaveTypeId.toLowerCase();
  if (
    normalized === "medical" ||
    normalized === "sick" ||
    normalized.includes("medical") ||
    normalized.includes("sick")
  ) {
    return true;
  }
  const found = leaveTypes.find((lt) => lt.id === leaveTypeId);
  if (found) {
    const nameNorm = found.name.toLowerCase();
    if (
      nameNorm.includes("αναρρωτικ") ||
      nameNorm.includes("ιατρικ") ||
      nameNorm.includes("κύησ") ||
      nameNorm.includes("λοχεί") ||
      nameNorm.includes("νοσηλεί")
    ) {
      return true;
    }
  }
  return false;
}

export function calculateLeaveDays(
  startDateStr: string,
  endDateStr: string,
  isMedical: boolean
): { totalDays: number; calendarDays: number; workingDays: number; weekendDays: number } {
  if (!startDateStr || !endDateStr) {
    return { totalDays: 1, calendarDays: 1, workingDays: 1, weekendDays: 0 };
  }

  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  if (end < start) {
    return { totalDays: 1, calendarDays: 1, workingDays: 1, weekendDays: 0 };
  }

  let calendarDays = 0;
  let workingDays = 0;
  let weekendDays = 0;

  const cur = new Date(start);
  while (cur <= end) {
    calendarDays++;
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    } else {
      workingDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const totalDays = isMedical ? calendarDays : Math.max(1, workingDays);
  return { totalDays, calendarDays, workingDays, weekendDays };
}

export const LEAVE_DOCUMENT_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    color: #000000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12.5px;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-container, .print-container {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    padding: 16mm 18mm 12mm 18mm;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: #ffffff;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: 1fr 1fr; }
  .gap-10 { gap: 2.5rem; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-justify { text-align: justify; }
  .font-bold { font-weight: bold; }
  .font-semibold { font-weight: 600; }
  .font-normal { font-weight: normal; }
  .font-mono { font-family: monospace; }
  .underline { text-decoration: underline; }
  .underline-offset-4 { text-underline-offset: 4px; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .left-2 { left: 0.5rem; }
  .left-4 { left: 1rem; }
  .left-6 { left: 1.5rem; }
  .left-8 { left: 2rem; }
  .top-0 { top: 0; }
  .bottom-0 { bottom: 0; }
  .top-1\/2 { top: 50%; }
  .-translate-y-1\/2 { transform: translateY(-50%); }
  .z-10 { z-index: 10; }
  .opacity-90 { opacity: 0.9; }
  .pointer-events-none { pointer-events: none; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; }
  .mt-0\\.5 { margin-top: 0.125rem; }
  .mt-auto { margin-top: auto; }
  .mt-8 { margin-top: 2rem; }
  .pt-0\\.5 { padding-top: 0.125rem; }
  .pt-1 { padding-top: 0.25rem; }
  .pt-2 { padding-top: 0.5rem; }
  .pt-3 { padding-top: 0.75rem; }
  .pt-4 { padding-top: 1rem; }
  .pt-6 { padding-top: 1.5rem; }
  .pt-8 { padding-top: 2rem; }
  .pt-10 { padding-top: 2.5rem; }
  .pt-12 { padding-top: 3rem; }
  .pt-14 { padding-top: 3.5rem; }
  .pt-16 { padding-top: 4rem; }
  .pt-20 { padding-top: 5rem; }
  .pb-0\\.5 { padding-bottom: 0.125rem; }
  .pb-1 { padding-bottom: 0.25rem; }
  .pb-2 { padding-bottom: 0.5rem; }
  .pb-3 { padding-bottom: 0.75rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .w-full { width: 100%; }
  .w-64 { width: 16rem; }
  .w-12 { width: 3rem; }
  .h-12 { height: 3rem; }
  .h-20 { height: 5rem; }
  .h-24 { height: 6rem; }
  .h-6 { height: 1.5rem; }
  .max-h-14 { max-height: 3.5rem; }
  .max-h-16 { max-height: 4rem; }
  .max-h-20 { max-height: 5rem; }
  .max-h-24 { max-height: 6rem; }
  .max-w-24 { max-width: 6rem; }
  .max-w-40 { max-width: 10rem; }
  .max-w-full { max-width: 100%; }
  .object-contain { object-fit: contain; }
  .border { border: 1px solid #d4d4d8; }
  .border-t { border-top: 1px solid #d4d4d8; }
  .border-b { border-bottom: 1px solid #d4d4d8; }
  .border-dashed { border-style: dashed; }
  .border-zinc-200 { border-color: #e4e4e7; }
  .border-zinc-300 { border-color: #d4d4d8; }
  .text-zinc-950, .text-zinc-900 { color: #09090b; }
  .text-zinc-800 { color: #27272a; }
  .text-zinc-700 { color: #3f3f46; }
  .text-zinc-600 { color: #52525b; }
  .text-zinc-500 { color: #71717a; }
  .text-zinc-400 { color: #a1a1aa; }
  .bg-white { background-color: #ffffff; }
  .text-xs { font-size: 12px; }
  .text-sm { font-size: 14px; }
  .text-\\[11\\.5px\\] { font-size: 11.5px; }
  .text-\\[12\\.5px\\] { font-size: 12.5px; }
  .text-\\[13px\\] { font-size: 13px; }
  .text-\\[14px\\] { font-size: 14px; }
  .text-\\[15px\\] { font-size: 15px; }
  .text-\\[16px\\] { font-size: 16px; }
  .text-\\[10pt\\] { font-size: 10pt; }
  .text-\\[10\\.5pt\\] { font-size: 10.5pt; }
  .text-\\[11pt\\] { font-size: 11pt; }
  .text-\\[14pt\\] { font-size: 14pt; }
  .h-7 { height: 1.75rem; }
  .inline-block { display: inline-block; }
  .w-\\[110px\\] { width: 110px; }
  .mb-1 { margin-bottom: 0.25rem; }
  .leading-snug { line-height: 1.375; }
  .leading-tight { line-height: 1.25; }
  .leading-relaxed { line-height: 1.625; }
  .tracking-wide { letter-spacing: 0.025em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-\\[0\\.25em\\] { letter-spacing: 0.25em; }
  .tracking-\\[0\\.3em\\] { letter-spacing: 0.3em; }
  .tracking-\\[0\\.35em\\] { letter-spacing: 0.35em; }
  .grid-cols-\\[1\\.35fr_1fr\\] { grid-template-columns: 1.35fr 1fr; }
  .gap-6 { gap: 1.5rem; }
  .gap-8 { gap: 2rem; }
  .indent-4 { text-indent: 1rem; }
  .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
  .space-y-1 > * + * { margin-top: 0.25rem; }
  .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
  .space-y-2 > * + * { margin-top: 0.5rem; }
  .space-y-3 > * + * { margin-top: 0.75rem; }
  .space-y-4 > * + * { margin-top: 1rem; }
  .space-y-5 > * + * { margin-top: 1.25rem; }
  .space-y-6 > * + * { margin-top: 1.5rem; }
  ol { padding-left: 1.25rem; }
  li { margin-top: 0.25rem; }
  img { object-fit: contain; }
  .no-print { display: none !important; }
`;

// Client-side PDF generator from an existing DOM node using an isolated clean sandbox
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  // 1. Create an isolated hidden iframe to sandbox rendering away from Tailwind v4 oklch styles
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // 210mm at 96 DPI
  iframe.style.height = "1123px"; // 297mm at 96 DPI
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Could not initialize PDF renderer");
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.origin}/" />
          <style>
            ${LEAVE_DOCUMENT_PRINT_CSS}
          </style>
        </head>
        <body>
          <div id="capture-container" class="page-container"></div>
        </body>
      </html>
    `);
    doc.close();

    const captureContainer = doc.getElementById("capture-container");
    if (!captureContainer) {
      throw new Error("Capture container not found");
    }

    // 2. Clone the element and enforce active display styling even if source was in a background tab
    const clone = element.cloneNode(true) as HTMLElement;
    clone.classList.remove("hidden");
    clone.classList.add("flex", "flex-col", "justify-between");
    clone.style.display = "flex";
    clone.style.flexDirection = "column";
    clone.style.justifyContent = "space-between";
    clone.style.width = "100%";
    clone.style.minHeight = "265mm";
    clone.style.height = "100%";
    clone.style.boxSizing = "border-box";

    // Remove buttons or interactive icons marked as .no-print
    clone.querySelectorAll(".no-print").forEach((el) => el.remove());

    captureContainer.appendChild(clone);

    // 3. Wait for all embedded images (signature, ESPA logo, stamp) to complete loading
    const images = Array.from(doc.querySelectorAll("img"));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );
    }
    // Allow short tick for font/layout settlement
    await new Promise((resolve) => setTimeout(resolve, 80));

    // 4. Capture with html2canvas inside the isolated iframe without encountering any oklch
    const canvas = await html2canvas(captureContainer, {
      scale: 2, // 2x for sharp printing output
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      windowHeight: 1123,
    });

    const imgData = canvas.toDataURL("image/png");
    // Standard A4: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
    pdf.save(filename);

    return pdf.output("blob");
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

// Generate Word (.docx) for Leave Application (Αίτηση) in 2-column layout matching template
export async function downloadLeaveApplicationDocx(
  leave: Leave,
  teacher: Teacher,
  school: SchoolProfile,
  leaveTypes: LeaveTypeConfig[]
) {
  const leavePhrases = getLeavePhrases(leave.type, leaveTypes);
  const leaveSubject = leavePhrases.subject;
  const { numberStr, wordStr } = formatDaysInWords(leave.daysCount);
  const isEspa = isEspaDeputy(teacher);

  const requestText =
    leave.daysCount === 1 || leave.startDate === leave.endDate
      ? `Σας παρακαλώ να μου χορηγήσετε ${leavePhrases.accusative} 1 (μίας) ημέρας στις ${formatGreekDate(leave.startDate)}.`
      : `Σας παρακαλώ να μου χορηγήσετε ${leavePhrases.accusative} ${numberStr} (${wordStr}) ημερών από ${formatGreekDate(leave.startDate)} έως και ${formatGreekDate(leave.endDate)}.`;

  const leftColumnChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1100, after: 260 },
      children: [
        new TextRun({ text: "Α  Ι  Τ  Η  Σ  Η", bold: true, size: 24, underline: {} }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "ΕΠΩΝΥΜΟ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.lastName, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "ΟΝΟΜΑ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.firstName, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "ΟΝ. ΠΑΤΡΟΣ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.fatherName || "", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({ text: "ΕΙΔΙΚΟΤΗΤΑ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.specialty, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Δ/ΝΣΗ ΚΑΤΟΙΚΙΑΣ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.address || "", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Τ.Κ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.postalCode || "", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "ΠΟΛΗ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.city || "", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({ text: "ΤΗΛΕΦΩΝΟ: ", bold: true, size: 22 }),
        new TextRun({ text: teacher.phone || "", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({ text: "ΘΕΜΑ: ", bold: true, size: 22 }),
        new TextRun({ text: leaveSubject, bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `${school.city || "Σέρρες"},  ${formatGreekDate(leave.protocolDate || leave.startDate)}`,
          size: 22,
        }),
      ],
    }),
  ];

  const applicantLabel = getApplicantGenderLabel(teacher.firstName);

  const rightColumnChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Π  Ρ  Ο  Σ", bold: true, size: 24, underline: {} }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "τη Διεύθυνση", bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: school.schoolNameGenitive || `του ${school.schoolName || "Σχολείου"}`,
          bold: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200, after: 600 },
      children: [
        new TextRun({ text: requestText, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({ text: `${applicantLabel}`, bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: "...................................", size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${teacher.firstName} ${teacher.lastName}`, size: 22 }),
      ],
    }),
  ];

  const borderless = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...borderless,
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: leftColumnChildren,
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: rightColumnChildren,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
          },
        },
        children: [
          table,
          ...(isEspa && school.deputyLogo
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 900 },
                  children: [
                    new ImageRun({
                      type: school.deputyLogo.includes("image/jpeg") || school.deputyLogo.includes("image/jpg")
                        ? "jpg"
                        : "png",
                      data: Buffer.from(
                        school.deputyLogo.includes(",")
                          ? school.deputyLogo.split(",")[1]
                          : school.deputyLogo,
                        "base64"
                      ),
                      transformation: { width: 500, height: 48 },
                    }),
                  ],
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Αίτηση_Άδειας_${teacher.lastName}_${formatGreekDate(leave.startDate).replace(/\//g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Composite school stamp and principal signature into a single image where
 * the signature naturally touches/overlaps the right side of the round stamp.
 */
export async function createCompositeStampAndSignature(
  stampBase64: string,
  sigBase64: string
): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve({ base64: stampBase64, width: 75, height: 75 });
      return;
    }

    const stampImg = new window.Image();
    const sigImg = new window.Image();

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        // Stamp target: 150x150, Signature target: 240x100
        // Canvas: 330x150
        // Signature placed at x = 95, y = 25 (overlaps right part of stamp naturally)
        const canvas = document.createElement("canvas");
        canvas.width = 330;
        canvas.height = 150;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // 1. Draw stamp on left
          ctx.drawImage(stampImg, 0, 0, 150, 150);
          // 2. Draw signature slightly overlapping on the right
          ctx.drawImage(sigImg, 95, 25, 235, 100);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({
            base64: dataUrl.split(",")[1],
            width: 145,
            height: 62,
          });
        } else {
          resolve({ base64: stampBase64, width: 75, height: 75 });
        }
      }
    };

    stampImg.onload = onLoad;
    sigImg.onload = onLoad;
    stampImg.onerror = () => resolve({ base64: sigBase64, width: 120, height: 50 });
    sigImg.onerror = () => resolve({ base64: stampBase64, width: 75, height: 75 });

    stampImg.src = stampBase64.includes(",") ? stampBase64 : `data:image/png;base64,${stampBase64}`;
    sigImg.src = sigBase64.includes(",") ? sigBase64 : `data:image/png;base64,${sigBase64}`;
  });
}

// Generate Word (.docx) for Leave Decision (Απόφαση)
export async function downloadLeaveDecisionDocx(
  leave: Leave,
  teacher: Teacher,
  school: SchoolProfile,
  leaveTypes: LeaveTypeConfig[],
  customDecisionContent?: {
    legalBasis: string[];
    decisionText: string;
    notifications: string[];
  }
) {
  const normalizedSchoolName =
    school.schoolName?.includes("Ειδικό Πειραματικό Σχολείο") && !school.schoolName.includes("Δημοτικό")
      ? school.schoolName.replace("Ειδικό Πειραματικό Σχολείο", "Ειδικό Πειραματικό Δημοτικό Σχολείο")
      : school.schoolName;

  const normalizedSchool: SchoolProfile = {
    ...school,
    schoolName: normalizedSchoolName,
  };

  const isDeputy = isDeputyTeacher(teacher);
  const leavePhrases = getLeavePhrases(leave.type, leaveTypes);
  const foundLeaveType = leaveTypes.find((lt) => lt.id === leave.type);

  // Determine content (either custom edits from modal or resolved from effective template)
  const resolvedContent = customDecisionContent || resolveDecisionTemplate(
    getEffectiveTemplate(foundLeaveType, isDeputy),
    { leave, teacher, school: normalizedSchool, leaveTypes }
  );

  const legalBasis = resolvedContent.legalBasis.map((l) =>
    l.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
  );
  const decisionText = resolvedContent.decisionText.replace(
    /Ειδικό Πειραματικό Σχολείο Σερρών/g,
    "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών"
  );
  const notifications = resolvedContent.notifications.map((n) =>
    n.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
  );

  const borderless = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  // Header Table - Left Column (Official Ministry & School Identity)
  const headerLogoData = school.schoolLogo
    ? (school.schoolLogo.includes(",") ? school.schoolLogo.split(",")[1] : school.schoolLogo)
    : GREEK_EMBLEM_BASE64;

  const isJpeg = school.schoolLogo
    ? (school.schoolLogo.includes("image/jpeg") || school.schoolLogo.includes("image/jpg"))
    : false;

  const headerLogoRun = new ImageRun({
    type: isJpeg ? "jpg" : "png",
    data: Buffer.from(headerLogoData, "base64"),
    transformation: { width: 42, height: 42 },
  });

  const cleanSchoolAddress = getCleanSchoolAddress(school.address, school.postalAddress);
  const schoolTkCity = getSchoolTkCity(school);

  // Row 0: Logo, Greek Republic, Ministry, Separator (Right side blank)
  const row0LeftChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [headerLogoRun],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ", bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: toGreekUpper(school.ministry || "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ"),
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "--------", bold: true, size: 20 }),
      ],
    }),
  ];

  // Row 1: Regional Directorate, Directorate, School Name
  const row1LeftChildren: Paragraph[] = [
    ...(school.regionalDirectorate ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 15 },
        children: [
          new TextRun({ text: toGreekUpper(school.regionalDirectorate), bold: true, size: 20 }),
        ],
      })
    ] : []),
    ...(school.directorate ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 15 },
        children: [
          new TextRun({ text: toGreekUpper(school.directorate), bold: true, size: 20 }),
        ],
      })
    ] : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 15 },
      children: [
        new TextRun({ text: toGreekUpper(school.schoolName || ""), bold: true, size: 20 }),
      ],
    }),
  ];

  const formattedProtocol = formatLeaveProtocolNumber(leave.protocolNumber, leave.type, leaveTypes);

  // Row 1: Right Column (Date, Protocol - starts aligned with Regional Directorate)
  const row1RightChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: `${school.city || "Σέρρες"}, ${formatGreekDate(leave.protocolDate || leave.startDate)}`,
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: `Αρ. Πρωτ. ${formattedProtocol}`,
          bold: true,
          size: 20,
        }),
      ],
    }),
  ];

  const decisionSubject = getLeaveDecisionSubject(leave.type, leaveTypes);

  // Row 2: Left Column (Information, Address, TK-City, Phone, Email, Subject)
  // Using native Word TabStop to guarantee 100% exact colon alignment across all lines
  const contactTabStop = [{ type: TabStopType.LEFT, position: 1800 }];

  const row2LeftChildren: Paragraph[] = [
    new Paragraph({ children: [] }),
    new Paragraph({
      spacing: { after: 15 },
      tabStops: contactTabStop,
      children: [
        new TextRun({ text: "Πληροφορίες", bold: true, size: 20 }),
        new TextRun({ text: "\t: ", bold: true, size: 20 }),
        new TextRun({ text: school.principalName || "-", bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 15 },
      tabStops: contactTabStop,
      children: [
        new TextRun({ text: "Διεύθυνση", bold: true, size: 20 }),
        new TextRun({ text: "\t: ", bold: true, size: 20 }),
        new TextRun({ text: cleanSchoolAddress, bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 15 },
      tabStops: contactTabStop,
      children: [
        new TextRun({ text: "Τ.Κ.-Πόλη", bold: true, size: 20 }),
        new TextRun({ text: "\t: ", bold: true, size: 20 }),
        new TextRun({ text: schoolTkCity, bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 15 },
      tabStops: contactTabStop,
      children: [
        new TextRun({ text: "Τηλέφωνο", bold: true, size: 20 }),
        new TextRun({ text: "\t: ", bold: true, size: 20 }),
        new TextRun({ text: school.phone || "-", bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 30 },
      tabStops: contactTabStop,
      children: [
        new TextRun({ text: "e-mail", bold: true, size: 20 }),
        new TextRun({ text: "\t: ", bold: true, size: 20 }),
        new TextRun({ text: school.email || "-", bold: true, size: 20 }),
      ],
    }),
  ];

  // Row 2: Right Column ("ΑΠΟΦΑΣΗ" aligned horizontally with "Πληροφορίες")
  const row2RightChildren: Paragraph[] = [
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "ΑΠΟΦΑΣΗ",
          bold: true,
          size: 22,
        }),
      ],
    }),
  ];

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...borderless,
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: row0LeftChildren,
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: [new Paragraph({ children: [] })],
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: row1LeftChildren,
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: row1RightChildren,
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: row2LeftChildren,
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: row2RightChildren,
          }),
        ],
      }),
    ],
  });

  // Determine Title of School Principal
  let principalIntro = `Ο   Διευθυντής του ${school.schoolName || "Σχολείου"}`;
  if (school.principalTitle) {
    if (school.principalTitle.includes("Σχολείου") && school.schoolName) {
      principalIntro = school.principalTitle.replace(/του Σχολείου/i, school.schoolNameGenitive || `του ${school.schoolName}`);
    } else {
      principalIntro = school.principalTitle;
    }
  }

  // Prepare Stamp and Signature for Word export
  const stampData = school.schoolStamp
    ? (school.schoolStamp.includes(",") ? school.schoolStamp.split(",")[1] : school.schoolStamp)
    : null;
  const isStampJpeg = school.schoolStamp
    ? (school.schoolStamp.includes("image/jpeg") || school.schoolStamp.includes("image/jpg"))
    : false;

  const sigData = school.principalSignature
    ? (school.principalSignature.includes(",") ? school.principalSignature.split(",")[1] : school.principalSignature)
    : null;
  const isSigJpeg = school.principalSignature
    ? (school.principalSignature.includes("image/jpeg") || school.principalSignature.includes("image/jpg"))
    : false;

  const stampRun = stampData
    ? new ImageRun({
        type: isStampJpeg ? "jpg" : "png",
        data: Buffer.from(stampData, "base64"),
        transformation: { width: 70, height: 70 },
      })
    : null;

  const sigRun = sigData
    ? new ImageRun({
        type: isSigJpeg ? "jpg" : "png",
        data: Buffer.from(sigData, "base64"),
        transformation: { width: 120, height: 50 },
      })
    : null;

  let signatureParagraphs: Paragraph[] = [];
  if (stampData && sigData) {
    try {
      const composite = await createCompositeStampAndSignature(stampData, sigData);
      signatureParagraphs = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 30, after: 30 },
          children: [
            new ImageRun({
              type: "png",
              data: Buffer.from(composite.base64, "base64"),
              transformation: { width: composite.width, height: composite.height },
            }),
          ],
        }),
      ];
    } catch {
      signatureParagraphs = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [stampRun!, sigRun!],
        }),
      ];
    }
  } else if (stampRun) {
    signatureParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [stampRun],
      }),
    ];
  } else if (sigRun) {
    signatureParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [sigRun],
      }),
    ];
  } else {
    signatureParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 30 },
        children: [new TextRun({ text: "", size: 21 })],
      }),
    ];
  }

  // Footer Table (Left: Notifications, Right: Principal Signature)
  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...borderless,
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: [
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({ text: "ΚΟΙΝΟΠΟΙΗΣΗ", bold: true, size: 21 }),
                ],
              }),
              ...notifications.map((notif, idx) => {
                const hasNum = /^\d+[\.\)]/.test(notif.trim());
                const textToRender = hasNum ? notif.trim() : `${idx + 1}. ${notif.trim()}`;
                return new Paragraph({
                  spacing: { after: 18 },
                  children: createFormattedTextRuns(textToRender, 20),
                });
              }),
            ],
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: school.principalTitle || "Ο Δ/ντής  του  σχολείου",
                    bold: true,
                    size: 21,
                  }),
                ],
              }),
              ...signatureParagraphs,
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: school.principalName || "Ονοματεπώνυμο Διευθυντή",
                    bold: true,
                    size: 21,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Deputy ESPA Banner (configured as a fixed page footer, pinned to the very bottom)
  const deputyLogoData = school.deputyLogo
    ? (school.deputyLogo.includes(",") ? school.deputyLogo.split(",")[1] : school.deputyLogo)
    : null;
  const isDeputyLogoJpeg = school.deputyLogo
    ? (school.deputyLogo.includes("image/jpeg") || school.deputyLogo.includes("image/jpg"))
    : false;

  const docFooters = isDeputy && school.deputyLogo && deputyLogoData
    ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new ImageRun({
                  type: isDeputyLogoJpeg ? "jpg" : "png",
                  data: Buffer.from(deputyLogoData, "base64"),
                  transformation: { width: 440, height: 48 },
                }),
              ],
            }),
          ],
        }),
      }
    : undefined;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 21,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 800, bottom: 950, left: 1300, right: 1300, footer: 400 },
          },
        },
        ...(docFooters ? { footers: docFooters } : {}),
        children: [
          // 1. Header Table (2 columns)
          headerTable,

          // Empty line before ΘΕΜΑ
          new Paragraph({ children: [] }),

          // Full-Width Subject (ΘΕΜΑ) - not constrained by header columns
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({ text: "ΘΕΜΑ: ", bold: true, size: 20 }),
              new TextRun({ text: decisionSubject, bold: true, size: 20 }),
            ],
          }),

          // Empty line before "Ο Διευθυντής..."
          new Paragraph({ children: [] }),

          // 2. Preamble
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({ text: principalIntro, bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Έχοντας υπόψη :", bold: true, size: 21 }),
            ],
          }),

          // 3. Numbered Legal Basis
          ...legalBasis.map((line, idx) => {
            const hasNum = /^\d+[\.\)]/.test(line.trim());
            const textToRender = hasNum ? line.trim() : `${idx + 1}. ${line.trim()}`;
            return new Paragraph({
              alignment: AlignmentType.BOTH,
              indent: { left: 420, hanging: 420 },
              spacing: { after: 40, line: 240 },
              children: createFormattedTextRuns(textToRender, 21),
            });
          }),

          // Empty line before "Αποφασίζουμε"
          new Paragraph({ children: [] }),

          // 4. ΑΠΟΦΑΣΙΖΟΥΜΕ (only first letter capital, balanced spacing)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({ text: "Α π ο φ α σ ί ζ ο υ μ ε", bold: true, size: 22 }),
            ],
          }),

          // Empty line before "Χορηγούμε..." (Decision Text)
          new Paragraph({ children: [] }),

          // 5. Decision Text
          new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { before: 0, after: 120, line: 250 },
            children: createFormattedTextRuns(decisionText, 21),
          }),

          // Empty line before Signatures and Notifications Table
          new Paragraph({ children: [] }),

          // 6. Footer Table (Left: Notifications, Right: Principal Signature)
          footerTable,

          // 7. Trailing minimal paragraph to absorb Word's table spacing
          new Paragraph({
            spacing: { before: 0, after: 0, line: 1 },
            children: [new TextRun({ text: "", size: 1 })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Απόφαση_Άδειας_${teacher.lastName}_${formatGreekDate(leave.startDate).replace(/\//g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
