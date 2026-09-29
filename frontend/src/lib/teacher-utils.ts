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

export function getTeacherAbbr(teacher?: Teacher | null, fallbackName?: string): string {
  if (teacher?.id === "tch-unassigned") return "+";
  if (!teacher && !fallbackName) return "—";
  const name = teacher?.lastName || teacher?.firstName || fallbackName || "";
  const trimmed = name.trim();
  if (trimmed === "Χωρίς Ανάθεση") return "+";
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed.substring(0, 3).toUpperCase();
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
