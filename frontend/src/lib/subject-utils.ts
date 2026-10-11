import { Subject, Teacher } from "@/types";
import { getSpecialtyByCode, findSpecialty } from "./specialties";

export interface SubjectBadgeInfo {
  code: string;
  color: string;
  title: string;
}

/** Check if a specialty code corresponds to general elementary education (ΠΕ70 / ΠΕ71) */
export function isGeneralSpecialty(specialty?: string | null): boolean {
  if (!specialty) return false;
  const clean = specialty.trim().toUpperCase().replace(/\s+/g, "");
  return (
    clean === "ΠΕ70" ||
    clean === "ΠΕ71" ||
    clean === "PE70" ||
    clean === "PE71" ||
    clean.startsWith("ΠΕ70") ||
    clean.startsWith("ΠΕ71")
  );
}

/**
 * Resolves the subject badge for a teacher in a class/slot according to school rules:
 * - If teacher has specialty ΠΕ70 or ΠΕ71: returns null (no badge).
 * - For all other teacher specialties: finds the corresponding subject (from class assignments
 *   or teacher specialty) and returns the abbreviation (code), subject color, and title.
 */
export function resolveTeacherSubjectBadge(
  teacher: Teacher | undefined | null,
  subjects: Subject[],
  classId?: string,
  slotSubjectId?: string
): SubjectBadgeInfo | null {
  if (!teacher || teacher.id === "tch-unassigned") return null;

  // Rule: If specialty is ΠΕ70 or ΠΕ71, don't show any badge
  if (isGeneralSpecialty(teacher.specialty)) {
    return null;
  }

  // 1. If slot already has a specific non-glossa subject assigned
  if (slotSubjectId && slotSubjectId !== "sub-glossa") {
    const s = subjects.find((sub) => sub.id === slotSubjectId);
    if (s && s.title !== "Γλώσσα") {
      return {
        code: s.code || s.title.substring(0, 3).toUpperCase(),
        color: s.color || "#6366f1",
        title: s.title,
      };
    }
  }

  // 2. Check if this teacher is assigned to a subject in this class (from "καρτέλα μαθήματα")
  if (classId) {
    const assignedSubj = subjects.find((s) => {
      if (s.id === "sub-glossa") return false;
      const asgs = s.classAssignments?.[classId];
      if (Array.isArray(asgs) && asgs.some((a) => a.teacherId === teacher.id)) return true;
      const ct = s.classTeachers?.[classId];
      if (Array.isArray(ct) && ct.includes(teacher.id)) return true;
      if (typeof ct === "string" && ct === teacher.id) return true;
      return false;
    });
    if (assignedSubj) {
      return {
        code: assignedSubj.code || assignedSubj.title.substring(0, 3).toUpperCase(),
        color: assignedSubj.color || "#6366f1",
        title: assignedSubj.title,
      };
    }
  }

  // 3. Match subject by teacher's specialty
  const spec = (teacher.specialty || "").trim().toUpperCase();
  if (spec) {
    const matchedSubject = subjects.find((s) => {
      if (s.id === "sub-glossa") return false;
      if (s.defaultSpecialty && s.defaultSpecialty.trim().toUpperCase() === spec) return true;
      if (Array.isArray(s.allowedSpecialties)) {
        return s.allowedSpecialties.some((as) => as.trim().toUpperCase() === spec);
      }
      return false;
    });

    if (matchedSubject) {
      return {
        code: matchedSubject.code || matchedSubject.title.substring(0, 3).toUpperCase(),
        color: matchedSubject.color || "#6366f1",
        title: matchedSubject.title,
      };
    }

    // Check alias or specialty table (e.g. ΠΕ79 -> ΠΕ79.01, ΠΕ91 -> ΠΕ91.01)
    const sp = getSpecialtyByCode(spec) || findSpecialty(spec);
    if (sp) {
      const aliasMatch = subjects.find((s) => {
        if (s.id === "sub-glossa") return false;
        if (s.defaultSpecialty && s.defaultSpecialty.trim().toUpperCase() === sp.code.toUpperCase()) {
          return true;
        }
        if (Array.isArray(s.allowedSpecialties)) {
          return s.allowedSpecialties.some((as) => as.trim().toUpperCase() === sp.code.toUpperCase());
        }
        return false;
      });
      if (aliasMatch) {
        return {
          code: aliasMatch.code || aliasMatch.title.substring(0, 3).toUpperCase(),
          color: aliasMatch.color || "#6366f1",
          title: aliasMatch.title,
        };
      }

      if (sp.shortCode) {
        return {
          code: sp.shortCode,
          color: "#6366f1",
          title: sp.name,
        };
      }
    }
  }

  return null;
}
