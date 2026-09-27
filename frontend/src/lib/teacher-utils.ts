import { Teacher } from "@/types";

export interface TeacherStyle {
  className: string;
  bg: string;
  color: string;
  borderColor: string;
}

export const PRESET_TEACHER_STYLES: Record<string, TeacherStyle> = {
  ΠΑΠ: { className: "t-pap", bg: "#fef08a", color: "#713f12", borderColor: "#eab308" },
  ΝΙΚ: { className: "t-nik", bg: "#fed7aa", color: "#7c2d12", borderColor: "#f97316" },
  ΔΗΜ: { className: "t-dhm", bg: "#bae6fd", color: "#0369a1", borderColor: "#38bdf8" },
  ΚΑΡ: { className: "t-kar", bg: "#a7f3d0", color: "#065f46", borderColor: "#34d399" },
  ΣΠΥ: { className: "t-spy", bg: "#ddd6fe", color: "#5b21b6", borderColor: "#a78bfa" },
  ΜΙΧ: { className: "t-mix", bg: "#fecdd3", color: "#9f1239", borderColor: "#fb7185" },
  ΚΩΝ: { className: "t-kwn", bg: "#99f6e4", color: "#115e59", borderColor: "#2dd4bf" },
  ΑΛΕ: { className: "t-ale", bg: "#d9f99d", color: "#3f6212", borderColor: "#a3e635" },
  ΖΕΡ: { className: "t-zer", bg: "#c7d2fe", color: "#3730a3", borderColor: "#818cf8" },
  ΒΑΣ: { className: "t-vas", bg: "#fbcfe8", color: "#831843", borderColor: "#f472b6" },
  ΣΩΤ: { className: "t-swt", bg: "#f3e8ff", color: "#6b21a8", borderColor: "#c084fc" },
};

export const FALLBACK_PALETTE_CLASSES = [
  "t-pap", "t-nik", "t-dhm", "t-kar", "t-spy", "t-mix",
  "t-kwn", "t-ale", "t-zer", "t-vas", "t-swt"
];

export function getTeacherAbbr(teacher?: Teacher | null, fallbackName?: string): string {
  if (teacher?.id === "tch-unassigned") return "+";
  if (!teacher && !fallbackName) return "—";
  const name = teacher?.lastName || teacher?.firstName || fallbackName || "";
  const trimmed = name.trim();
  if (trimmed === "Χωρίς Ανάθεση") return "+";
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed.substring(0, 3).toUpperCase();
}

export function getTeacherStyleClass(abbr: string): string {
  const clean = abbr.trim().toUpperCase();
  if (clean === "+" || clean === "—") {
    return "t-unassigned";
  }
  if (PRESET_TEACHER_STYLES[clean]) {
    return PRESET_TEACHER_STYLES[clean].className;
  }
  // deterministic hash for unknown teachers
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE_CLASSES.length;
  return FALLBACK_PALETTE_CLASSES[index];
}
