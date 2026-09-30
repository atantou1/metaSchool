"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { TimetableData, ClassEntity, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  Search,
  Filter,
  GraduationCap,
  Users,
  AlertTriangle,
  Loader2,
  Sparkles,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeGreekUpper } from "./teachers-manager";
import {
  getSupportSpecialties,
  getSpecialtyByCode,
  findSpecialty,
} from "@/lib/specialties";
import { ClassColorPicker } from "@/components/class-color-picker";
import {
  CLASS_15_PALETTE,
  getClassPaletteColorByHex,
} from "@/lib/palette";

interface ClassesManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: "teachers" | "classes" | "subjects" | "assignments";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "assignments") => void;
}

const CLASS_PALETTE = CLASS_15_PALETTE.map((c) => c.hex);

export const SUPPORT_SPECIALTIES_LIST = getSupportSpecialties("primary")
  .filter((s) => s.code !== "ΠΕ25")
  .map((s) => ({
    code: s.code,
    short: s.shortCode || s.code,
    name: s.name,
    color: s.color || "bg-zinc-100 text-zinc-800 border-zinc-300",
  }));

const GRADES_LIST = ["Α", "Β", "Γ", "Δ", "Ε", "ΣΤ", "Ολοήμερο", "Ειδικό"];

interface InlineClassEditState {
  id?: string;
  name: string;
  shortName: string;
  grade: string;
  color: string;
  studentsCount: number | "";
  headTeacherId: string;
  room: string;
  isAllDay: boolean;
  supportSpecialties: string[];
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({
  data,
  onRefresh,
  activeTab = "classes",
  onTabChange,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Inline row edit state ("__new__" for new draft row, or existing class.id)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<InlineClassEditState | null>(null);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Delete modal state
  const [classToDelete, setClassToDelete] = useState<ClassEntity | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Ref to focus on first input (name)
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Map subGroups to classId
  const subGroupToClassMap = useMemo(() => {
    const map = new Map<string, string>();
    data.subGroups.forEach((sg) => {
      map.set(sg.id, sg.classId);
    });
    return map;
  }, [data.subGroups]);


  // Calculate assignments count per class
  const classAssignmentsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    data.assignments.forEach((asg) => {
      const clsId = subGroupToClassMap.get(asg.subGroupId);
      if (clsId) {
        map.set(clsId, (map.get(clsId) || 0) + 1);
      }
    });
    return map;
  }, [data.assignments, subGroupToClassMap]);

  // Teachers map for quick lookup
  const teachersMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    data.teachers.forEach((t) => map.set(t.id, t));
    return map;
  }, [data.teachers]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return data.classes.filter((cls) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (cls.name || "").toLowerCase();
        const sName = (cls.shortName || "").toLowerCase();
        const room = (cls.room || "").toLowerCase();
        const headTch = cls.headTeacherId ? teachersMap.get(cls.headTeacherId) : null;
        const tchName = headTch ? `${headTch.lastName} ${headTch.firstName}`.toLowerCase() : "";
        if (
          !name.includes(q) &&
          !sName.includes(q) &&
          !room.includes(q) &&
          !tchName.includes(q)
        ) {
          return false;
        }
      }

      if (gradeFilter !== "all" && cls.grade !== gradeFilter) {
        return false;
      }

      if (typeFilter === "morning" && cls.isAllDay) return false;
      if (typeFilter === "allDay" && !cls.isAllDay) return false;

      return true;
    });
  }, [data.classes, searchQuery, gradeFilter, typeFilter, teachersMap]);

  // Auto focus input when editingRowId changes
  useEffect(() => {
    if (editingRowId) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [editingRowId]);

  // Start creating new class draft in row 1
  const handleStartNew = () => {
    const usedColors = data.classes.map((c) => c.color?.toLowerCase()).filter(Boolean);
    const nextColor =
      CLASS_15_PALETTE.find((c) => !usedColors.includes(c.hex.toLowerCase()))?.hex ||
      CLASS_15_PALETTE[data.classes.length % CLASS_15_PALETTE.length].hex;

    setInlineData({
      name: "",
      shortName: "",
      grade: "Α",
      color: nextColor,
      studentsCount: 20,
      headTeacherId: "",
      room: `Αίθουσα ${data.classes.length + 1}`,
      isAllDay: false,
      supportSpecialties: [],
    });
    setEditingRowId("__new__");
    setSelectedClassId(null);
  };

  // Start copying from selected class into row 1 draft
  const handleStartCopy = () => {
    const target = data.classes.find((c) => c.id === selectedTeacherOrClass);
    if (!target) {
      toast.warning("Επιλέξτε ένα τμήμα από τον πίνακα για αντιγραφή.");
      return;
    }

    setInlineData({
      name: "",
      shortName: "",
      grade: target.grade,
      color: target.color || "#3b82f6",
      studentsCount: target.studentsCount || 20,
      headTeacherId: target.headTeacherId || "",
      room: target.room || "",
      isAllDay: target.isAllDay || false,
      supportSpecialties: target.supportSpecialties || [],
    });
    setEditingRowId("__new__");
    setSelectedClassId(null);
    toast.info(`Αντιγράφηκαν οι ρυθμίσεις του τμήματος «${target.name}». Πληκτρολογήστε το νέο όνομα.`);
  };

  const selectedTeacherOrClass = selectedClassId;

  // Start editing existing class row
  const startInlineEdit = (cls: ClassEntity) => {
    setInlineData({
      id: cls.id,
      name: cls.name,
      shortName: normalizeGreekUpper(cls.shortName || cls.name),
      grade: cls.grade,
      color: cls.color || "#3b82f6",
      studentsCount: cls.studentsCount !== undefined ? cls.studentsCount : 20,
      headTeacherId: cls.headTeacherId || "",
      room: cls.room || "",
      isAllDay: cls.isAllDay || false,
      supportSpecialties: cls.supportSpecialties || [],
    });
    setEditingRowId(cls.id);
    setSelectedClassId(cls.id);
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineData(null);
  };

  // Save inline edit
  const saveInlineEdit = async () => {
    if (!inlineData) return;
    if (!inlineData.name.trim()) {
      toast.error("Συμπληρώστε το όνομα του τμήματος.");
      return;
    }

    setIsSavingInline(true);
    const finalShortName = normalizeGreekUpper(inlineData.shortName || inlineData.name.trim());

    const payload = {
      id: inlineData.id || undefined,
      name: inlineData.name.trim(),
      shortName: finalShortName,
      grade: inlineData.grade.trim(),
      color: inlineData.color,
      studentsCount: inlineData.studentsCount === "" ? 20 : Number(inlineData.studentsCount),
      headTeacherId: inlineData.headTeacherId || null,
      room: inlineData.room.trim() || null,
      isAllDay: inlineData.isAllDay,
      supportSpecialties: inlineData.supportSpecialties,
      weeklyHoursTarget: inlineData.isAllDay ? 20 : 30,
    };

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Αποτυχία αποθήκευσης τμήματος");

      toast.success(
        inlineData.id
          ? `Το τμήμα «${inlineData.name}» ενημερώθηκε επιτυχώς!`
          : `Το νέο τμήμα «${inlineData.name}» δημιουργήθηκε επιτυχώς!`
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

  // Keyboard shortcut: Enter to save, Escape to cancel (Capture Phase to avoid closing Sheet)
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

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editingRowId, inlineData]);

  // Toggle supportive specialty for inline edit
  const toggleInlineSpecialty = (code: string) => {
    if (!inlineData) return;
    setInlineData((prev) => {
      if (!prev) return prev;
      const list = prev.supportSpecialties;
      if (list.includes(code)) {
        return { ...prev, supportSpecialties: list.filter((c) => c !== code) };
      } else {
        return { ...prev, supportSpecialties: [...list, code] };
      }
    });
  };

  // Prompt delete modal
  const promptDeleteClass = () => {
    const target = data.classes.find((c) => c.id === selectedClassId);
    if (!target) {
      toast.warning("Επιλέξτε ένα τμήμα για διαγραφή.");
      return;
    }
    setClassToDelete(target);
  };

  // Perform actual deletion
  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeletingClass(true);
    try {
      const res = await fetch(`/api/classes?id=${classToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Αποτυχία διαγραφής τμήματος");
      toast.info(`Το τμήμα «${classToDelete.name}» διαγράφηκε.`);
      if (selectedClassId === classToDelete.id) setSelectedClassId(null);
      if (editingRowId === classToDelete.id) cancelInlineEdit();
      setClassToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingClass(false);
    }
  };

  // Render an editable row (both for __new__ and existing class)
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
        {/* Color Picker */}
        <td className="py-2 px-2 text-center">
          <ClassColorPicker
            value={inlineData.color}
            onChange={(hex) => setInlineData({ ...inlineData, color: hex })}
            usedColors={data.classes
              .filter((c) => c.id !== inlineData.id)
              .map((c) => c.color)
              .filter(Boolean) as string[]}
          />
        </td>

        {/* Name Input */}
        <td className="py-1.5 px-2">
          <Input
            ref={nameInputRef}
            value={inlineData.name}
            onChange={(e) => {
              const val = e.target.value;
              const updated = { ...inlineData, name: val };
              if (isNewDraft && (!inlineData.shortName || inlineData.shortName.length <= 3)) {
                updated.shortName = normalizeGreekUpper(val);
              }
              setInlineData(updated);
            }}
            placeholder="π.χ. Α1 *"
            className={`h-7 text-xs bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-semibold px-2 w-full`}
          />
        </td>

        {/* Short Name */}
        <td className="py-1.5 px-1.5 text-center">
          <Input
            value={inlineData.shortName}
            onChange={(e) =>
              setInlineData({
                ...inlineData,
                shortName: normalizeGreekUpper(e.target.value),
              })
            }
            maxLength={4}
            placeholder="ΣΥΝΤ"
            className={`h-7 text-xs w-16 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono font-bold text-center px-1 mx-auto`}
          />
        </td>

        {/* Grade / Level Select */}
        <td className="py-1.5 px-2">
          <Select
            value={inlineData.grade}
            onValueChange={(val) => val && setInlineData({ ...inlineData, grade: val })}
          >
            <SelectTrigger
              size="sm"
              className={`h-7 text-xs bg-white ${
                isNewDraft ? "border-emerald-400" : "border-sky-300"
              } w-24 text-zinc-800 font-medium px-2 py-0 justify-between`}
            >
              <SelectValue placeholder="Τάξη" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70] max-h-56 min-w-[120px]">
              {GRADES_LIST.map((g) => (
                <SelectItem key={g} value={g} className="text-xs py-1.5 cursor-pointer">
                  Τάξη {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* Students Count Input */}
        <td className="py-1.5 px-1.5 text-center border-r border-zinc-200">
          <Input
            type="number"
            min={1}
            max={40}
            value={inlineData.studentsCount}
            onChange={(e) =>
              setInlineData({
                ...inlineData,
                studentsCount: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            className={`h-7 text-xs w-16 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono text-center px-1 mx-auto`}
          />
        </td>

        {/* Head Teacher Select */}
        <td className="py-1.5 px-2">
          <Select
            value={inlineData.headTeacherId || "none"}
            onValueChange={(val) =>
              setInlineData({
                ...inlineData,
                headTeacherId: val === "none" ? "" : val || "",
              })
            }
          >
            <SelectTrigger
              size="sm"
              className={`h-7 text-xs bg-white ${
                isNewDraft ? "border-emerald-400" : "border-sky-300"
              } w-full text-zinc-800 font-medium px-2 py-0 justify-between min-w-[170px]`}
            >
              <SelectValue placeholder="Επιλέξτε Υπεύθυνο" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70] max-h-[360px] min-w-[240px]">
              <SelectItem value="none" className="text-xs py-1.5 text-zinc-500">
                — Χωρίς Ορισμό —
              </SelectItem>
              {data.teachers.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs py-1.5 cursor-pointer">
                  {t.lastName} {t.firstName} ({t.shortName || t.specialty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* Program Type (Morning vs All-Day) */}
        <td className="py-2 px-2 text-center">
          <button
            type="button"
            onClick={() => setInlineData({ ...inlineData, isAllDay: !inlineData.isAllDay })}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              inlineData.isAllDay
                ? "bg-indigo-100 border-indigo-300 text-indigo-800 shadow-2xs"
                : "bg-amber-50 border-amber-300 text-amber-800"
            }`}
            title="Κλικ για αλλαγή (Πρωινό / Ολοήμερο Πρόγραμμα)"
          >
            {inlineData.isAllDay ? "Ολοήμερο" : "Πρωινό"}
          </button>
        </td>

        {/* Room Input */}
        <td className="py-1.5 px-2 border-r border-zinc-200">
          <Input
            value={inlineData.room}
            onChange={(e) => setInlineData({ ...inlineData, room: e.target.value })}
            placeholder="π.χ. Αίθουσα 1"
            className={`h-7 text-xs bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} px-2 w-28`}
          />
        </td>

        {/* Supportive Specialties Multi-toggle Chips */}
        <td className="py-1.5 px-2">
          <div className="flex items-center gap-1 flex-wrap">
            {SUPPORT_SPECIALTIES_LIST.map((spec) => {
              const isActive = inlineData.supportSpecialties.includes(spec.code);
              return (
                <button
                  key={spec.code}
                  type="button"
                  onClick={() => toggleInlineSpecialty(spec.code)}
                  title={`${spec.name} (${spec.code}): Κλικ για ενεργοποίηση στο τμήμα`}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                    isActive
                      ? `${spec.color} shadow-2xs scale-105 ring-1 ring-black/10`
                      : "bg-white border-zinc-200 text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {spec.short}
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    );
  };

  const hasActiveFilters = gradeFilter !== "all" || typeFilter !== "all";
  const activeFiltersCount = (gradeFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-100/60">
      {/* Unified Top Header Bar */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Modern Tabs Switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange?.("teachers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "teachers"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Εκπαιδευτικοί</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("classes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "classes"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Τμήματα</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("subjects")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "subjects"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Μαθήματα</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("assignments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "assignments"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Αναθέσεις</span>
          </button>
        </div>

        {/* Middle: Search & Filters Modal Trigger & Count */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-center">
          <div className="relative w-52 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση τμήματος, αίθουσας..."
              className="pl-8 pr-7 h-8 text-xs bg-zinc-50 border-zinc-200 focus-visible:ring-1"
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterModalOpen(true)}
            className={`h-8 text-xs gap-1.5 border-zinc-200 font-medium ${
              hasActiveFilters
                ? "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900 shadow-2xs"
                : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Φίλτρα</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white font-bold rounded-full text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
            {filteredClasses.length} / {data.classes.length}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 pr-10">
          {editingRowId && inlineData ? (
            /* Active Inline Editing Controls */
            <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-300 px-3 py-1 rounded-lg animate-in fade-in">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                {editingRowId === "__new__" ? (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Νέο Τμήμα στη γραμμή</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Επεξεργασία: {inlineData.name}</span>
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/80">
                <Button
                  onClick={() => {
                    const target = data.classes.find((c) => c.id === selectedClassId);
                    if (target) startInlineEdit(target);
                    else toast.warning("Επιλέξτε ένα τμήμα από τον πίνακα.");
                  }}
                  disabled={!selectedClassId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
                  title="Επεξεργασία στη γραμμή (ή διπλό κλικ)"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                  Επεξεργασία
                </Button>
                <Button
                  onClick={handleStartCopy}
                  disabled={!selectedClassId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
                  title="Αντιγραφή ρυθμίσεων σε νέα γραμμή"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                  Αντιγραφή
                </Button>
                <Button
                  onClick={promptDeleteClass}
                  disabled={!selectedClassId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  title="Διαγραφή επιλεγμένου τμήματος"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                  Διαγραφή
                </Button>
              </div>

              <div className="h-5 w-px bg-zinc-200" />

              {/* Add Class Primary Button */}
              <Button
                onClick={handleStartNew}
                size="sm"
                className="h-8 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-xs rounded-lg flex items-center gap-1.5"
                title="Προσθήκη νέου τμήματος απευθείας στην 1η σειρά του πίνακα"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Νέο Τμήμα</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Full-Width Data Table */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
            {/* Super Headers & Sub Headers */}
            <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200 text-zinc-600 shadow-2xs select-none">
              {/* Row 1: Super Headers Grouping */}
              <tr className="border-b border-zinc-200 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                <th colSpan={5} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
                  ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ ΤΜΗΜΑΤΟΣ
                </th>
                <th colSpan={3} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΡΟΛΟΙ & ΧΩΡΟΣ
                </th>
                <th colSpan={1} className="py-2 px-3 bg-zinc-100/80 text-center">
                  ΣΥΜΠΛΗΡΩΜΑΤΙΚΕΣ ΕΙΔΙΚΟΤΗΤΕΣ
                </th>
              </tr>

              {/* Row 2: Detailed Column Headers */}
              <tr className="bg-zinc-50 text-[11px] font-semibold text-zinc-700">
                <th className="py-2.5 px-3 w-12 text-center" title="Χρώμα τμήματος για το ατομικό πρόγραμμα εκπαιδευτικού">Χρώμα</th>
                <th className="py-2.5 px-3 min-w-[130px]" title="Όνομα τμήματος (π.χ. Α1)">Όνομα Τμήματος</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Συντομογραφία (π.χ. Α1)">Συντ.</th>
                <th className="py-2.5 px-2.5 w-24 text-center" title="Τάξη / Βαθμίδα">Τάξη</th>
                <th className="py-2.5 px-2 w-20 text-center border-r border-zinc-200" title="Αριθμός μαθητών">Μαθητές</th>

                <th className="py-2.5 px-3 min-w-[190px]" title="Υπεύθυνος εκπαιδευτικός του τμήματος">Υπεύθυνος Τάξης</th>
                <th className="py-2.5 px-2 w-24 text-center" title="Πρόγραμμα (Πρωινό / Ολοήμερο)">Πρόγραμμα</th>
                <th className="py-2.5 px-2.5 w-32 border-r border-zinc-200" title="Αίθουσα αναφοράς">Αίθουσα</th>

                <th className="py-2.5 px-3 min-w-[200px] text-center" title="Υποστηρικτικές ειδικότητες που δικαιούται το τμήμα (Λογοθεραπεία, Εργοθεραπεία, κ.λπ.)">
                  Ειδικότητες Στήριξης
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100">
              {/* If creating a brand new class inline, render it as 1st row */}
              {editingRowId === "__new__" && renderEditRow(true)}

              {filteredClasses.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                const isEditing = editingRowId === cls.id && inlineData !== null;
                const headTeacher = cls.headTeacherId ? teachersMap.get(cls.headTeacherId) : null;
                const displayShortName = normalizeGreekUpper(cls.shortName || cls.name);
                const specialtiesList = cls.supportSpecialties || [];

                /* 1. ROW IN EDIT MODE */
                if (isEditing) {
                  return renderEditRow(false);
                }

                /* 2. NORMAL DISPLAY ROW */
                return (
                  <tr
                    key={cls.id}
                    onClick={() => {
                      if (!editingRowId) setSelectedClassId(cls.id);
                    }}
                    onDoubleClick={() => startInlineEdit(cls)}
                    className={`transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-sky-50/90 hover:bg-sky-50"
                        : "hover:bg-zinc-50/80"
                    }`}
                  >
                    {/* Color */}
                    <td className="py-2.5 px-3 text-center">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 mx-auto shadow-2xs"
                        style={{ backgroundColor: cls.color || "#3b82f6" }}
                        title={`Χρώμα τμήματος: ${
                          getClassPaletteColorByHex(cls.color)?.name || cls.color || "Μπλε"
                        }`}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-semibold text-zinc-900">
                      <span>{cls.name}</span>
                    </td>

                    {/* Short Name */}
                    <td className="py-2.5 px-2 text-center font-mono font-semibold text-zinc-700">
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] border border-zinc-200/60">
                        {displayShortName}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-2.5 px-2.5 text-center">
                      <Badge variant="outline" className="text-[11px] font-medium border-zinc-200 bg-zinc-50 text-zinc-700">
                        Τάξη {cls.grade}
                      </Badge>
                    </td>

                    {/* Students Count */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 border-r border-zinc-100">
                      {cls.studentsCount || 20}
                    </td>

                    {/* Head Teacher */}
                    <td className="py-2.5 px-3 text-zinc-700">
                      {headTeacher ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: headTeacher.color || "#71717a" }}
                          />
                          <span className="font-medium text-zinc-900">
                            {headTeacher.lastName} {headTeacher.firstName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">— Χωρίς ορισμό —</span>
                      )}
                    </td>

                    {/* Program Type */}
                    <td className="py-2.5 px-2 text-center">
                      {cls.isAllDay ? (
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                          Ολοήμερο
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-semibold">
                          Πρωινό
                        </Badge>
                      )}
                    </td>

                    {/* Room */}
                    <td className="py-2.5 px-2.5 text-zinc-600 border-r border-zinc-100">
                      {cls.room || "—"}
                    </td>

                    {/* Supportive Specialties */}
                    <td className="py-2.5 px-3 text-center">
                      {specialtiesList.length > 0 ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {specialtiesList.map((code) => {
                            const spec =
                              SUPPORT_SPECIALTIES_LIST.find((s) => s.code === code) ||
                              getSpecialtyByCode(code) ||
                              findSpecialty(code);
                            const shortLabel =
                              (spec && "short" in spec ? spec.short : undefined) ||
                              (spec && "shortCode" in spec ? spec.shortCode : undefined) ||
                              code;
                            return (
                              <span
                                key={code}
                                title={`${spec?.name || code}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  spec?.color || "bg-zinc-100 text-zinc-700 border-zinc-200"
                                }`}
                              >
                                {shortLabel}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredClasses.length === 0 && editingRowId !== "__new__" && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium text-sm text-zinc-700">Δεν βρέθηκαν τμήματα</p>
                      <p className="text-xs text-zinc-400">
                        {searchQuery || gradeFilter !== "all" || typeFilter !== "all"
                          ? "Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση."
                          : "Προσθέστε το πρώτο τμήμα κάνοντας κλικ στο «+ Νέο Τμήμα»."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Custom Styled Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(classToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingClass) setClassToDelete(null);
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
                  Διαγραφή Τμήματος
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                  Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά το τμήμα{" "}
                  <span className="font-semibold text-zinc-900">
                    «{classToDelete?.name}» (Τάξη {classToDelete?.grade})
                  </span>
                  ;
                </DialogDescription>
              </div>
            </div>

            {classToDelete && (classAssignmentsCountMap.get(classToDelete.id) || 0) > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Ενεργές Αναθέσεις:</span> Το τμήμα έχει{" "}
                  <strong>{classAssignmentsCountMap.get(classToDelete.id)}</strong> ενεργές αναθέσεις μαθημάτων.
                  Η διαγραφή του θα διαγράψει και τις αναθέσεις αυτές.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingClass}
              onClick={() => setClassToDelete(null)}
              className="h-8 text-xs font-medium"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingClass}
              onClick={confirmDeleteClass}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs"
            >
              {isDeletingClass ? (
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

      {/* Small Filter Modal (Dialog) */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-xl p-5 z-[80]">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-700" />
              <span>Φίλτρα Τμημάτων</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Επιλέξτε τάξη ή τύπο προγράμματος για να φιλτράρετε τα τμήματα.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Τάξη</label>
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 flex-wrap">
                <button
                  type="button"
                  onClick={() => setGradeFilter("all")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    gradeFilter === "all"
                      ? "bg-zinc-900 text-white shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 font-medium"
                  }`}
                >
                  Όλες
                </button>
                {GRADES_LIST.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeFilter(g)}
                    className={`flex-1 min-w-[36px] py-1 text-xs rounded-md transition-all ${
                      gradeFilter === g
                        ? "bg-zinc-900 text-white shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-900 font-medium"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Τύπος Προγράμματος</label>
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                {[
                  { value: "all", label: "Όλα" },
                  { value: "morning", label: "Πρωινά" },
                  { value: "allDay", label: "Ολοήμερα" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTypeFilter(opt.value)}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                      typeFilter === opt.value
                        ? "bg-zinc-900 text-white shadow-2xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters}
              onClick={() => {
                setGradeFilter("all");
                setTypeFilter("all");
              }}
              className="text-xs text-zinc-600 hover:text-zinc-900"
            >
              Επαναφορά
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFilterModalOpen(false)}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white px-4"
            >
              Εφαρμογή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
