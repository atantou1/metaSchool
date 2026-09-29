"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { TimetableData, Teacher, TeacherConstraints } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  SPECIALTIES,
  getSpecialties,
  getSpecialtyByCode,
  findSpecialty,
  formatSpecialtyLabel,
  formatSpecialtyCode,
} from "@/lib/specialties";
import { ColorSwatchPicker } from "@/components/color-swatch-picker";
import {
  TEACHER_50_PALETTE,
  getPaletteColorByHex,
} from "@/lib/palette";

interface TeachersManagerProps {
  data: TimetableData;
  onRefresh: () => void;
}

const ALL_DAYS_INDICES = [0, 1, 2, 3, 4];
const DAY_LABELS = [
  { index: 0, short: "Δ", name: "Δευτέρα" },
  { index: 1, short: "Τ", name: "Τρίτη" },
  { index: 2, short: "Τ", name: "Τετάρτη" },
  { index: 3, short: "Π", name: "Πέμπτη" },
  { index: 4, short: "Π", name: "Παρασκευή" },
];

const PALETTE = [
  "#3b82f6", "#10b981", "#6366f1", "#ec4899", "#f59e0b",
  "#8b5cf6", "#14b8a6", "#f97316", "#0284c7", "#71717a",
];

export const PREDEFINED_SPECIALTIES = SPECIALTIES.map((s) => s.code);


/** Normalize Greek text to uppercase WITHOUT accents (Ά -> Α, Έ -> Ε, etc.) */
export function normalizeGreekUpper(text: string): string {
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

export function generateDefaultShortName(lastName: string): string {
  if (!lastName) return "";
  return normalizeGreekUpper(lastName.trim().substring(0, 3));
}

interface InlineEditState {
  id?: string; // undefined if new
  firstName: string;
  lastName: string;
  shortName: string;
  specialty: string;
  color: string;
  isTeaching: boolean;
  isOnCall: boolean;
  isMorning: boolean;
  isAllDay: boolean;
  isSupport: boolean;
  isActive: boolean;
  maxWeeklyHours: number | "";
  minHoursPerDay: number | "";
  maxHoursPerDay: number | "";
  maxConsecutiveHours: number | "";
  maxConsecutiveGaps: number | "";
  maxTotalGapsPerDay: number | "";
  maxTotalGapsPerWeek: number | "";
  availableDays: number[];
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  data,
  onRefresh,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inline row edit state ("__new__" for new record, or existing teacher.id)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<InlineEditState | null>(null);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Delete confirmation modal state
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // Ref to focus on the first input (lastName) when entering edit mode
  const lastNameInputRef = useRef<HTMLInputElement>(null);

  // Available specialties for filtering & selection
  const allSpecialties = useMemo(() => {
    const list = [...SPECIALTIES];
    // Also include any legacy/custom specialties found in existing data that aren't in SPECIALTIES
    data.teachers.forEach((t) => {
      if (t.specialty && !findSpecialty(t.specialty)) {
        list.push({
          code: t.specialty,
          name: t.specialty,
          type: "ΒΑΣΙΚΗ",
          isPrimary: true,
          isSecondary: true,
        });
      }
    });
    return list;
  }, [data.teachers]);

  const filteredTeachers = useMemo(() => {
    return data.teachers.filter((tch) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${tch.lastName} ${tch.firstName}`.toLowerCase();
        const sName = (tch.shortName || "").toLowerCase();
        const spec = (tch.specialty || "").toLowerCase();
        const specName = (findSpecialty(tch.specialty)?.name || "").toLowerCase();
        if (!fullName.includes(query) && !sName.includes(query) && !spec.includes(query) && !specName.includes(query)) {
          return false;
        }
      }
      if (specialtyFilter !== "all") {
        const tchCode = formatSpecialtyCode(tch.specialty);
        if (tchCode !== specialtyFilter && tch.specialty !== specialtyFilter) {
          return false;
        }
      }
      if (statusFilter === "active" && tch.isActive === false) return false;
      if (statusFilter === "inactive" && tch.isActive !== false) return false;

      return true;
    });
  }, [data.teachers, searchQuery, specialtyFilter, statusFilter]);

  // Focus on input when editingRowId changes
  useEffect(() => {
    if (editingRowId) {
      setTimeout(() => {
        lastNameInputRef.current?.focus();
      }, 50);
    }
  }, [editingRowId]);

  // Start creating a brand new teacher inline (1st row)
  const handleStartNew = () => {
    const usedColors = new Set(data.teachers.map((t) => (t.color || "").toLowerCase()));
    const nextColor =
      TEACHER_50_PALETTE.find((c) => !usedColors.has(c.hex.toLowerCase()))?.hex ||
      TEACHER_50_PALETTE[data.teachers.length % TEACHER_50_PALETTE.length].hex;

    setInlineData({
      firstName: "",
      lastName: "",
      shortName: "",
      specialty: "ΠΕ70",
      color: nextColor,
      isTeaching: true,
      isOnCall: false,
      isMorning: true,
      isAllDay: false,
      isSupport: false,
      isActive: true,
      maxWeeklyHours: 24,
      minHoursPerDay: 2,
      maxHoursPerDay: 5,
      maxConsecutiveHours: 4,
      maxConsecutiveGaps: 1,
      maxTotalGapsPerDay: 1,
      maxTotalGapsPerWeek: 2,
      availableDays: ALL_DAYS_INDICES,
    });
    setEditingRowId("__new__");
    setSelectedTeacherId(null);
  };

  // Start copying from selected teacher into inline draft (1st row)
  const handleStartCopy = () => {
    const target = data.teachers.find((t) => t.id === selectedTeacherId);
    if (!target) {
      toast.warning("Επιλέξτε έναν εκπαιδευτικό από τον πίνακα για αντιγραφή.");
      return;
    }
    const c = target.constraints;
    const daysList = c?.availableDays && c.availableDays.length > 0 ? c.availableDays : ALL_DAYS_INDICES;

    setInlineData({
      firstName: "", // empty so user enters new name
      lastName: "",  // empty so user enters new name
      shortName: "",
      specialty: target.specialty ? formatSpecialtyCode(target.specialty) : "ΠΕ70",
      color: target.color || "#3b82f6",
      isTeaching: target.isTeaching ?? true,
      isOnCall: target.isOnCall ?? false,
      isMorning: target.isMorning ?? true,
      isAllDay: target.isAllDay ?? false,
      isSupport: target.isSupport,
      isActive: target.isActive ?? true,
      maxWeeklyHours: target.maxWeeklyHours ?? 24,
      minHoursPerDay: c?.minHoursPerDay ?? 2,
      maxHoursPerDay: c?.maxHoursPerDay ?? 5,
      maxConsecutiveHours: c?.maxConsecutiveHours ?? 4,
      maxConsecutiveGaps: c?.maxConsecutiveGaps ?? 1,
      maxTotalGapsPerDay: c?.maxTotalGapsPerDay ?? 1,
      maxTotalGapsPerWeek: c?.maxTotalGapsPerWeek ?? 2,
      availableDays: daysList,
    });
    setEditingRowId("__new__");
    setSelectedTeacherId(null);
    toast.info(`Αντιγράφηκαν οι ρυθμίσεις του/της «${target.lastName}». Πληκτρολογήστε το ονοματεπώνυμο.`);
  };

  // Start inline editing of an existing teacher
  const startInlineEdit = (tch: Teacher) => {
    const c = tch.constraints;
    const daysList = c?.availableDays && c.availableDays.length > 0 ? c.availableDays : ALL_DAYS_INDICES;
    const prefilledShort = normalizeGreekUpper(tch.shortName || generateDefaultShortName(tch.lastName));

    setInlineData({
      id: tch.id,
      firstName: tch.firstName,
      lastName: tch.lastName,
      shortName: prefilledShort,
      specialty: tch.specialty ? formatSpecialtyCode(tch.specialty) : "ΠΕ70",
      color: tch.color || "#3b82f6",
      isTeaching: tch.isTeaching ?? true,
      isOnCall: tch.isOnCall ?? false,
      isMorning: tch.isMorning ?? true,
      isAllDay: tch.isAllDay ?? false,
      isSupport: tch.isSupport,
      isActive: tch.isActive ?? true,
      maxWeeklyHours: tch.maxWeeklyHours ?? 24,
      minHoursPerDay: c?.minHoursPerDay ?? 2,
      maxHoursPerDay: c?.maxHoursPerDay ?? 5,
      maxConsecutiveHours: c?.maxConsecutiveHours ?? 4,
      maxConsecutiveGaps: c?.maxConsecutiveGaps ?? 1,
      maxTotalGapsPerDay: c?.maxTotalGapsPerDay ?? c?.maxConsecutiveGaps ?? 1,
      maxTotalGapsPerWeek: c?.maxTotalGapsPerWeek ?? 2,
      availableDays: daysList,
    });
    setEditingRowId(tch.id);
    setSelectedTeacherId(tch.id);
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineData(null);
  };

  const saveInlineEdit = async () => {
    if (!inlineData) return;
    if (!inlineData.lastName.trim() || !inlineData.firstName.trim()) {
      toast.error("Συμπληρώστε Όνομα και Επώνυμο.");
      return;
    }

    setIsSavingInline(true);
    const finalShortName = normalizeGreekUpper(inlineData.shortName || generateDefaultShortName(inlineData.lastName));

    const constraintsData: TeacherConstraints = {
      availableDays: inlineData.availableDays.length > 0 ? inlineData.availableDays : ALL_DAYS_INDICES,
      maxHoursPerDay: inlineData.maxHoursPerDay === "" ? null : Number(inlineData.maxHoursPerDay),
      minHoursPerDay: inlineData.minHoursPerDay === "" ? null : Number(inlineData.minHoursPerDay),
      maxConsecutiveHours: inlineData.maxConsecutiveHours === "" ? null : Number(inlineData.maxConsecutiveHours),
      maxConsecutiveGaps: inlineData.maxConsecutiveGaps === "" ? null : Number(inlineData.maxConsecutiveGaps),
      maxTotalGapsPerDay: inlineData.maxTotalGapsPerDay === "" ? null : Number(inlineData.maxTotalGapsPerDay),
      maxTotalGapsPerWeek: inlineData.maxTotalGapsPerWeek === "" ? null : Number(inlineData.maxTotalGapsPerWeek),
    };

    const payload = {
      id: inlineData.id || undefined,
      firstName: inlineData.firstName.trim(),
      lastName: inlineData.lastName.trim(),
      shortName: finalShortName || null,
      specialty: inlineData.specialty.trim(),
      color: inlineData.color,
      isTeaching: inlineData.isTeaching,
      isOnCall: inlineData.isOnCall,
      isMorning: inlineData.isMorning,
      isAllDay: inlineData.isAllDay,
      isSupport: inlineData.isSupport,
      isActive: inlineData.isActive,
      maxWeeklyHours: inlineData.maxWeeklyHours === "" ? 24 : Number(inlineData.maxWeeklyHours),
      constraints: constraintsData,
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Αποτυχία αποθήκευσης εκπαιδευτικού");

      toast.success(
        inlineData.id
          ? `Οι αλλαγές για τον/την «${inlineData.lastName}» αποθηκεύτηκαν!`
          : `Ο νέος εκπαιδευτικός «${inlineData.lastName} ${inlineData.firstName}» προστέθηκε επιτυχώς!`
      );
      setEditingRowId(null);
      setInlineData(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingInline(false);
    }
  };

  // Keyboard shortcut: Enter to save, Escape to cancel when inline editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingRowId) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        cancelInlineEdit();
      } else if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.closest("tr")
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          saveInlineEdit();
        }
      }
    };

    // Use capture phase (true) so we intercept Escape BEFORE the parent Sheet / Dialog closes
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editingRowId, inlineData]);

  // Toggle day for inline edit
  const toggleInlineDay = (dayIndex: number) => {
    if (!inlineData) return;
    setInlineData((prev) => {
      if (!prev) return prev;
      const days = prev.availableDays;
      if (days.includes(dayIndex)) {
        if (days.length === 1) {
          toast.info("Πρέπει να επιλεγεί τουλάχιστον 1 ημέρα.");
          return prev;
        }
        return { ...prev, availableDays: days.filter((d) => d !== dayIndex).sort() };
      } else {
        return { ...prev, availableDays: [...days, dayIndex].sort() };
      }
    });
  };

  // Count active assignments for the teacher being deleted
  const teacherAssignmentsCount = useMemo(() => {
    if (!teacherToDelete || !data.assignments) return 0;
    return data.assignments.filter((a) => a.teacherId === teacherToDelete.id).length;
  }, [data.assignments, teacherToDelete]);

  // Open delete dialog
  const promptDeleteTeacher = () => {
    const target = data.teachers.find((t) => t.id === selectedTeacherId);
    if (!target) {
      toast.warning("Επιλέξτε έναν εκπαιδευτικό για διαγραφή.");
      return;
    }
    setTeacherToDelete(target);
  };

  // Perform actual deletion
  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setIsDeletingTeacher(true);
    try {
      const res = await fetch(`/api/teachers?id=${teacherToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Αποτυχία διαγραφής εκπαιδευτικού");
      toast.info(`Ο εκπαιδευτικός «${teacherToDelete.lastName} ${teacherToDelete.firstName}» διαγράφηκε.`);
      if (selectedTeacherId === teacherToDelete.id) setSelectedTeacherId(null);
      if (editingRowId === teacherToDelete.id) cancelInlineEdit();
      setTeacherToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  // Render an editable row (used for both New Draft and Existing Editing)
  const renderEditRow = (isNewDraft: boolean) => {
    if (!inlineData) return null;

    return (
      <tr
        key={isNewDraft ? "__new__" : inlineData.id}
        className={`${
          isNewDraft
            ? "bg-emerald-50/60 border-y-2 border-emerald-500 ring-2 ring-emerald-400/40"
            : "bg-sky-50/70 border-y-2 border-sky-400 ring-2 ring-sky-400/50"
        } transition-colors`}
      >
        {/* Color Picker (50-Swatch Curated Popover) */}
        <td className="py-1.5 px-2 text-center">
          <ColorSwatchPicker
            value={inlineData.color}
            onChange={(hex) => setInlineData({ ...inlineData, color: hex })}
            usedColors={data.teachers
              .filter((t) => t.id !== inlineData.id)
              .map((t) => t.color)}
          />
        </td>

        {/* Name Inputs */}
        <td className="py-1.5 px-2">
          <div className="flex gap-1.5">
            <Input
              ref={lastNameInputRef}
              value={inlineData.lastName}
              onChange={(e) => {
                const val = e.target.value;
                const updated = { ...inlineData, lastName: val };
                if (isNewDraft && (!inlineData.shortName || inlineData.shortName.length <= 3)) {
                  updated.shortName = generateDefaultShortName(val);
                }
                setInlineData(updated);
              }}
              placeholder="Επώνυμο *"
              className={`h-7 text-xs bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-semibold px-2`}
            />
            <Input
              value={inlineData.firstName}
              onChange={(e) => setInlineData({ ...inlineData, firstName: e.target.value })}
              placeholder="Όνομα *"
              className={`h-7 text-xs bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} px-2`}
            />
          </div>
        </td>

        {/* Short Name Input (No Accents, Uppercase) */}
        <td className="py-1.5 px-1.5 text-center">
          <Input
            value={inlineData.shortName}
            onChange={(e) => setInlineData({ ...inlineData, shortName: normalizeGreekUpper(e.target.value) })}
            maxLength={4}
            placeholder="ΣΥΝΤ"
            className={`h-7 text-xs w-16 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono font-bold text-center px-1 mx-auto`}
          />
        </td>

        {/* Specialty Select Dropdown (Shadcn UI Select) */}
        <td className="py-1.5 px-2 border-r border-zinc-200">
          <Select
            value={formatSpecialtyCode(inlineData.specialty)}
            onValueChange={(val) => {
              if (val) {
                const spec = getSpecialtyByCode(val) || findSpecialty(val);
                setInlineData({
                  ...inlineData,
                  specialty: val,
                  isSupport: spec ? spec.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ" : inlineData.isSupport,
                });
              }
            }}
          >
            <SelectTrigger
              size="sm"
              className={`h-7 text-xs bg-white ${
                isNewDraft
                  ? "border-emerald-400 focus-visible:border-emerald-500"
                  : "border-sky-300 focus-visible:border-sky-400"
              } w-full text-zinc-800 font-medium px-2 py-0 justify-between`}
            >
              <SelectValue placeholder="Επιλέξτε ειδικότητα">
                {(() => {
                  const spec = findSpecialty(inlineData.specialty);
                  return spec ? `${spec.code} - ${spec.name}` : inlineData.specialty;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70] max-h-[420px] min-w-[300px] shadow-xl p-1">
              {allSpecialties.map((spec) => (
                <SelectItem key={spec.code} value={spec.code} className="text-xs py-2 px-2.5 cursor-pointer rounded-md">
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-zinc-900 font-mono text-[11.5px]">{spec.code}</span>
                      <span className="text-zinc-600 text-[11px] truncate">— {spec.name}</span>
                    </div>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded font-medium border shrink-0 ml-auto ${
                        spec.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {spec.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ" ? "Συμπλ." : "Βασική"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* Teaching Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isTeaching: !inlineData.isTeaching })}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isTeaching
                ? "bg-emerald-500 border-emerald-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            }`}
            title="Κλικ για αλλαγή (Διδάσκει στο πρόγραμμα)"
          >
            {inlineData.isTeaching ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* On-Call Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isOnCall: !inlineData.isOnCall })}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isOnCall
                ? "bg-emerald-500 border-emerald-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            }`}
            title="Κλικ για αλλαγή (Συμμετοχή σε εφημερία)"
          >
            {inlineData.isOnCall ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* Morning Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isMorning: !inlineData.isMorning })}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isMorning
                ? "bg-amber-500 border-amber-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            }`}
            title="Κλικ για αλλαγή (Πρωινό πρόγραμμα)"
          >
            {inlineData.isMorning ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* All-Day Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isAllDay: !inlineData.isAllDay })}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isAllDay
                ? "bg-indigo-500 border-indigo-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            }`}
            title="Κλικ για αλλαγή (Ολοήμερο πρόγραμμα)"
          >
            {inlineData.isAllDay ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* Type Toggle */}
        <td className="py-2 px-1.5 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isSupport: !inlineData.isSupport })}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
              inlineData.isSupport
                ? "bg-sky-100 border-sky-300 text-sky-800"
                : "bg-emerald-100 border-emerald-300 text-emerald-800"
            }`}
            title="Κλικ για αλλαγή τύπου (Βασική / Συμπληρωματική)"
          >
            {inlineData.isSupport ? "Συμπλ." : "Βασική"}
          </button>
        </td>

        {/* Status Toggle */}
        <td className="py-2 px-1.5 text-center border-r border-zinc-200">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isActive: !inlineData.isActive })}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
              inlineData.isActive
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
            title="Κλικ για αλλαγή κατάστασης (Ενεργός / Άδεια)"
          >
            {inlineData.isActive ? "Ενεργός" : "Άδεια"}
          </button>
        </td>

        {/* Available Days - Compact Interactive Mini Chips */}
        <td className="py-2 px-1.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            {DAY_LABELS.map((d) => {
              const isAvail = inlineData.availableDays.includes(d.index);
              return (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => toggleInlineDay(d.index)}
                  title={`${d.name}: Κλικ για ενεργοποίηση/απενεργοποίηση`}
                  className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold border transition-all ${
                    isAvail
                      ? "bg-sky-500 border-sky-600 text-white shadow-2xs"
                      : "bg-white border-zinc-200 text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </td>

        {/* Weekly Hours Input */}
        <td className="py-1.5 px-1.5 text-center">
          <Input
            type="number"
            min={0}
            max={35}
            value={inlineData.maxWeeklyHours}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxWeeklyHours: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-16 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono font-bold text-center px-1 mx-auto`}
          />
        </td>

        {/* Min Hours/Day */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={1}
            max={7}
            value={inlineData.minHoursPerDay}
            onChange={(e) => setInlineData({
              ...inlineData,
              minHoursPerDay: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Max Hours/Day */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={1}
            max={7}
            value={inlineData.maxHoursPerDay}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxHoursPerDay: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Max Consecutive Hours */}
        <td className="py-1.5 px-1 text-center border-r border-zinc-200">
          <Input
            type="number"
            min={1}
            max={6}
            value={inlineData.maxConsecutiveHours}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxConsecutiveHours: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Max Consecutive Gaps */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={4}
            value={inlineData.maxConsecutiveGaps}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxConsecutiveGaps: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Max Gaps / Day */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={5}
            value={inlineData.maxTotalGapsPerDay}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxTotalGapsPerDay: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Max Gaps / Week */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={15}
            value={inlineData.maxTotalGapsPerWeek}
            onChange={(e) => setInlineData({
              ...inlineData,
              maxTotalGapsPerWeek: e.target.value === "" ? "" : Number(e.target.value),
            })}
            className={`h-7 text-xs w-12 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-3 p-1">
      {/* Top Header Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Filters */}
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[300px]">
          <div className="relative w-64 max-w-full">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση ονόματος, συντ., ειδικ..."
              className="pl-8.5 pr-7 h-8.5 text-xs bg-zinc-50 border-zinc-200 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <Select value={specialtyFilter} onValueChange={(val) => val && setSpecialtyFilter(val)}>
              <SelectTrigger size="sm" className="h-8.5 text-xs bg-zinc-50 border-zinc-200 text-zinc-700 min-w-[170px] max-w-[220px]">
                <SelectValue placeholder="Ειδικότητα" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70] max-h-[420px] min-w-[280px] shadow-xl p-1">
                <SelectItem value="all" className="text-xs py-2 px-2.5 font-medium">Όλες οι ειδικότητες</SelectItem>
                {allSpecialties.map((spec) => (
                  <SelectItem key={spec.code} value={spec.code} className="text-xs py-2 px-2.5">
                    <span className="font-bold font-mono">{spec.code}</span> - {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger size="sm" className="h-8.5 text-xs bg-zinc-50 border-zinc-200 text-zinc-700 min-w-[140px]">
                <SelectValue placeholder="Κατάσταση" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70]">
                <SelectItem value="all" className="text-xs">Όλες οι καταστάσεις</SelectItem>
                <SelectItem value="active" className="text-xs">Μόνο Ενεργοί</SelectItem>
                <SelectItem value="inactive" className="text-xs">Μόνο Ανενεργοί</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Badge variant="secondary" className="text-[11px] font-normal text-zinc-600 ml-1 py-1">
            {filteredTeachers.length} / {data.teachers.length} εκπαιδευτικοί
          </Badge>
        </div>

        {/* Right: Actions (Inline Save/Cancel or Standard Tools) */}
        <div className="flex items-center gap-2 shrink-0">
          {editingRowId && inlineData ? (
            /* Active Inline Editing Controls */
            <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-300 px-3 py-1.5 rounded-lg animate-in fade-in">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                {editingRowId === "__new__" ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Νέος Εκπαιδευτικός στη γραμμή</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Επεξεργασία: {inlineData.lastName} {inlineData.firstName}</span>
                  </>
                )}
              </span>
              <div className="h-4 w-px bg-emerald-200 mx-1" />
              <Button
                onClick={saveInlineEdit}
                disabled={isSavingInline}
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 shadow-2xs gap-1"
                title="Αποθήκευση αλλαγών (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
                Αποθήκευση
              </Button>
              <Button
                onClick={cancelInlineEdit}
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600 hover:text-zinc-900 px-2"
                title="Ακύρωση (Esc)"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Ακύρωση
              </Button>
            </div>
          ) : (
            /* Standard Action Buttons */
            <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/80">
              <Button
                onClick={() => {
                  const target = data.teachers.find((t) => t.id === selectedTeacherId);
                  if (target) startInlineEdit(target);
                  else toast.warning("Επιλέξτε έναν εκπαιδευτικό από τον πίνακα.");
                }}
                disabled={!selectedTeacherId}
                variant="ghost"
                size="sm"
                className="h-7.5 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
                title="Επεξεργασία στη γραμμή (ή διπλό κλικ)"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                Επεξεργασία
              </Button>
              <Button
                onClick={handleStartCopy}
                disabled={!selectedTeacherId}
                variant="ghost"
                size="sm"
                className="h-7.5 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
                title="Αντιγραφή ρυθμίσεων σε νέα γραμμή επεξεργασίας"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                Αντιγραφή
              </Button>
              <Button
                onClick={promptDeleteTeacher}
                disabled={!selectedTeacherId}
                variant="ghost"
                size="sm"
                className="h-7.5 text-xs px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                title="Διαγραφή επιλεγμένου"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                Διαγραφή
              </Button>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-200 mx-1" />

          {/* Add Teacher Primary Button (Creates 1st Row Draft Inline!) */}
          <Button
            onClick={handleStartNew}
            size="sm"
            className="h-8.5 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-xs rounded-lg flex items-center gap-1.5"
            title="Προσθήκη νέου εκπαιδευτικού απευθείας στην 1η σειρά του πίνακα"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Νέος Εκπαιδευτικός</span>
          </Button>
        </div>
      </div>

      {/* Main Full-Width Data Table (Pure 100% Inline Data Grid) */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Super Headers & Sub Headers */}
            <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200 text-zinc-600 shadow-2xs select-none">
              {/* Row 1: Super Headers Grouping */}
              <tr className="border-b border-zinc-200 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                <th colSpan={4} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
                  ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
                </th>
                <th colSpan={6} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΙΔΙΟΤΗΤΕΣ & ΡΟΛΟΙ
                </th>
                <th colSpan={5} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΗΜΕΡΕΣ & ΩΡΕΣ ΔΙΔΑΣΚΑΛΙΑΣ
                </th>
                <th colSpan={3} className="py-2 px-3 bg-zinc-100/80 text-center">
                  ΠΕΡΙΟΡΙΣΜΟΙ ΚΕΝΩΝ
                </th>
              </tr>

              {/* Row 2: Detailed Column Headers */}
              <tr className="bg-zinc-50 text-[11px] font-semibold text-zinc-700">
                {/* Basic info (4) */}
                <th className="py-2.5 px-3 w-12 text-center">Χρώμα</th>
                <th className="py-2.5 px-3 min-w-[160px]">Ονοματεπώνυμο</th>
                <th className="py-2.5 px-2.5 w-16 text-center">Συντ.</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-zinc-200">Ειδικότητα</th>

                {/* Properties & Roles (6) */}
                <th className="py-2.5 px-2 w-14 text-center" title="Διδάσκει στο πρόγραμμα">Διδάσκει</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Συμμετοχή σε εφημερίες">Εφημερία</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Διδάσκει στο Πρωινό Πρόγραμμα">Πρωινό</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Διδάσκει στο Ολοήμερο Πρόγραμμα">Ολοήμερο</th>
                <th className="py-2.5 px-2.5 w-24 text-center" title="Τύπος ανάθεσης">Τύπος</th>
                <th className="py-2.5 px-2.5 w-20 text-center border-r border-zinc-200" title="Κατάσταση">Κατάσταση</th>

                {/* Days & Hours (5) - Compact Days Column */}
                <th className="py-2.5 px-2.5 w-[115px] text-center" title="Ημέρες παρουσίας στο σχολείο">Ημέρες</th>
                <th className="py-2.5 px-2.5 w-16 text-center font-bold text-zinc-800" title="Εβδομαδιαίο διδακτικό ωράριο">Εβδομάδα</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Ελάχιστες ώρες ανά ημέρα">Min/ημ.</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Μέγιστες ώρες ανά ημέρα">Max/ημ.</th>
                <th className="py-2.5 px-2 w-14 text-center border-r border-zinc-200" title="Μέγιστες συνεχόμενες ώρες">Συνεχ.</th>

                {/* Gaps (3) */}
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνεχόμενα κενά">Συνεχ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά ημέρα">Max/ημ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά εβδομάδα">Max/εβδ.</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100">
              {/* If creating a brand new teacher inline, render it as 1st row */}
              {editingRowId === "__new__" && renderEditRow(true)}

              {filteredTeachers.map((tch) => {
                const isSelected = selectedTeacherId === tch.id;
                const isEditing = editingRowId === tch.id && inlineData !== null;
                const c = tch.constraints;
                const daysList = c?.availableDays && c.availableDays.length > 0 ? c.availableDays : ALL_DAYS_INDICES;
                const isAllDays = daysList.length === 5;
                const displayShortName = normalizeGreekUpper(tch.shortName || generateDefaultShortName(tch.lastName));

                /* 1. EXISTING ROW IN EDIT MODE */
                if (isEditing) {
                  return renderEditRow(false);
                }

                /* 2. NORMAL DISPLAY ROW */
                return (
                  <tr
                    key={tch.id}
                    onClick={() => {
                      if (!editingRowId) setSelectedTeacherId(tch.id);
                    }}
                    onDoubleClick={() => startInlineEdit(tch)}
                    className={`transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-sky-50/90 hover:bg-sky-50"
                        : "hover:bg-zinc-50/80"
                    }`}
                  >
                    {/* Color */}
                    <td className="py-2.5 px-3 text-center">
                      <div
                        className="w-4.5 h-4.5 rounded-full border border-black/20 mx-auto shadow-2xs cursor-default"
                        style={{ backgroundColor: tch.color || "#fef08a" }}
                        title={`Χρώμα: ${getPaletteColorByHex(tch.color)?.name || tch.color}`}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-medium text-zinc-900">
                      <span>{tch.lastName} {tch.firstName}</span>
                    </td>

                    {/* Short Name (No Accents, Uppercase) */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-zinc-700">
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] border border-zinc-200/60">
                        {displayShortName}
                      </span>
                    </td>

                    {/* Specialty */}
                    <td className="py-2.5 px-3 text-zinc-700 border-r border-zinc-100 font-medium text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-900 font-mono text-[11.5px]">
                          {formatSpecialtyCode(tch.specialty)}
                        </span>
                        {(() => {
                          const spec = findSpecialty(tch.specialty);
                          return spec ? (
                            <span className="text-zinc-500 text-[11px]">
                              {spec.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>

                    {/* Teaching */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isTeaching !== false ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* On Call */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isOnCall ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* Morning */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isMorning !== false ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* All Day */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isAllDay ? (
                        <Check className="w-4 h-4 text-indigo-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-2.5 text-center">
                      {tch.isSupport ? (
                        <Badge variant="outline" className="text-[10px] font-normal border-sky-200 bg-sky-50 text-sky-700 px-1.5 py-0.5">
                          Συμπληρωματική
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0.5">
                          Βασική
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2.5 text-center border-r border-zinc-100">
                      {tch.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Ενεργός
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          Άδεια
                        </span>
                      )}
                    </td>

                    {/* Available Days - Compact Slim View */}
                    <td className="py-2.5 px-2 text-center">
                      {isAllDays ? (
                        <Badge variant="outline" className="bg-emerald-50/80 text-emerald-700 border-emerald-200 font-medium text-[10px] px-1.5 py-0.5">
                          Όλες (5/5)
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          {DAY_LABELS.map((d) => {
                            const isAvail = daysList.includes(d.index);
                            return (
                              <span
                                key={d.index}
                                title={`${d.name}: ${isAvail ? "Διαθέσιμος" : "Μη διαθέσιμος"}`}
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold transition-all ${
                                  isAvail
                                    ? "bg-sky-500 text-white shadow-2xs"
                                    : "bg-zinc-100 text-zinc-300 line-through"
                                }`}
                              >
                                {d.short}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Weekly Hours */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-zinc-900 bg-zinc-50/50">
                      {tch.maxWeeklyHours || 24}ω
                    </td>

                    {/* Min Hours/Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.minHoursPerDay ?? 2}ω
                    </td>

                    {/* Max Hours/Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxHoursPerDay ?? 5}ω
                    </td>

                    {/* Max Consecutive Hours */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 border-r border-zinc-100">
                      {c?.maxConsecutiveHours ?? 4}ω
                    </td>

                    {/* Max Consecutive Gaps */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 font-medium">
                      {c?.maxConsecutiveGaps ?? 1}
                    </td>

                    {/* Max Gaps / Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxTotalGapsPerDay ?? c?.maxConsecutiveGaps ?? 1}
                    </td>

                    {/* Max Gaps / Week */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxTotalGapsPerWeek ?? 2}
                    </td>
                  </tr>
                );
              })}

              {filteredTeachers.length === 0 && editingRowId !== "__new__" && (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium text-sm text-zinc-700">Δεν βρέθηκαν εκπαιδευτικοί</p>
                      <p className="text-xs text-zinc-400">
                        {searchQuery || specialtyFilter !== "all" || statusFilter !== "all"
                          ? "Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση."
                          : "Προσθέστε τον πρώτο εκπαιδευτικό κάνοντας κλικ στο «+ Νέος Εκπαιδευτικός»."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Styled Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(teacherToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingTeacher) setTeacherToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-zinc-200 z-[60]">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100/80 flex items-center justify-center shrink-0 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-bold text-zinc-900">
                  Διαγραφή Εκπαιδευτικού
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                  Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά τον/την εκπαιδευτικό{" "}
                  <span className="font-semibold text-zinc-900">
                    «{teacherToDelete?.lastName} {teacherToDelete?.firstName}»
                  </span>
                  {teacherToDelete?.specialty && (
                    <span className="text-zinc-500"> ({formatSpecialtyLabel(teacherToDelete.specialty)})</span>
                  )}
                </DialogDescription>
              </div>
            </div>

            {teacherAssignmentsCount > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Ενεργές Αναθέσεις:</span> Ο εκπαιδευτικός έχει{" "}
                  <strong>{teacherAssignmentsCount}</strong> αναθέσεις μαθημάτων σε τμήματα. Η διαγραφή του θα αφαιρέσει αυτόματα και τις αναθέσεις αυτές.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingTeacher}
              onClick={() => setTeacherToDelete(null)}
              className="h-8 text-xs font-medium"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingTeacher}
              onClick={confirmDeleteTeacher}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs"
            >
              {isDeletingTeacher ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Διαγραφή...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Οριστική Διαγραφή</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
