import React from "react";
import { Teacher } from "@/types";
import {
  TEACHER_50_PALETTE,
  getTeacherTileStyle,
  getDeterministicPaletteColor,
  getPaletteColorByHex,
} from "./palette";

export interface TeacherStyle {
  className: string;
  bg: string;
  color: string;
  borderColor: string;
}

export { TEACHER_50_PALETTE, getTeacherTileStyle };

/**
 * Strips Greek accent marks and converts text to uppercase.
 * Handles both composite characters (Ά, Έ, etc.) and decomposed unicode sequences.
 */
export function stripGreekAccents(text: string): string {
  if (!text) return "";
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε")
    .replace(/Ή/g, "Η")
    .replace(/Ί/g, "Ι")
    .replace(/Ϊ/g, "Ι")
    .replace(/Ό/g, "Ο")
    .replace(/Ύ/g, "Υ")
    .replace(/Ϋ/g, "Υ")
    .replace(/Ώ/g, "Ω");
}

export function getTeacherAbbr(teacher?: Teacher | null, fallbackName?: string): string {
  if (teacher?.id === "tch-unassigned") return "+";
  if (!teacher && !fallbackName) return "—";
  const raw = teacher?.shortName || teacher?.lastName || teacher?.firstName || fallbackName || "";
  const trimmed = raw.trim();
  if (trimmed === "Χωρίς Ανάθεση") return "+";
  const clean = stripGreekAccents(trimmed);
  if (clean.length <= 4) return clean;
  return clean.substring(0, 4);
}

/** Get inline CSS properties for a teacher tile with contrast text and border */
export function getTeacherTileInlineStyle(
  teacher?: Teacher | null,
  fallbackColor?: string
): React.CSSProperties {
  if (!teacher && !fallbackColor) {
    return {
      backgroundColor: "#f4f4f5",
      color: "#71717a",
      borderColor: "#a1a1aa",
      borderStyle: "dashed",
    };
  }
  const hex = teacher?.color || fallbackColor || (teacher ? getDeterministicPaletteColor(teacher.id).hex : "#fef08a");
  const tileStyle = getTeacherTileStyle(hex);

  return {
    backgroundColor: tileStyle.backgroundColor,
    color: tileStyle.color,
    borderColor: tileStyle.borderColor,
  };
}

/** Fallback class string for backwards compatibility */
export function getTeacherStyleClass(abbr: string): string {
  const clean = abbr.trim().toUpperCase();
  if (clean === "+" || clean === "—") {
    return "t-unassigned";
  }
  return "";
}
