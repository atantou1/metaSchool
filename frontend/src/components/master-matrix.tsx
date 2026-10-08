"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TimetableData,
  TimetableSlot,
  Teacher,
  ClassEntity,
  Subject,
} from "@/types";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { getTeacherAbbr, getTeacherStyleClass, getTeacherTileInlineStyle } from "@/lib/teacher-utils";
import { formatSpecialtyLabel, getSpecialtyByCode, findSpecialty } from "@/lib/specialties";
import {
  ArrowRightLeft,
  UserCheck,
  Trash2,
  Plus,
  CircleDot,
  Circle,
  Copy,
  ClipboardPaste,
  X,
  CalendarDays,
  Users,
  Check,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { ClassTimetableModal } from "./class-timetable-modal";
import { TeacherTimetableModal } from "./teacher-timetable-modal";
import { StudentSelectModal } from "./student-select-modal";

interface MasterMatrixProps {
  data: TimetableData;
  onRefresh: () => void;
  spotlightTeacherId: string | null;
  onSelectTeacherSpotlight: (teacherId: string | null) => void;
  showAllDay?: boolean;
  onToggleAllDay?: (show: boolean) => void;
}

export const MasterMatrix: React.FC<MasterMatrixProps> = ({
  data,
  onRefresh,
  spotlightTeacherId,
  onSelectTeacherSpotlight,
  showAllDay: controlledShowAllDay,
  onToggleAllDay,
}) => {
  const [internalShowAllDay, setInternalShowAllDay] = useState(false);
  const showAllDay = controlledShowAllDay !== undefined ? controlledShowAllDay : internalShowAllDay;

  // Floating tooltip state on left-click
  const [focusedTile, setFocusedTile] = useState<{
    slotId: string;
    teacherName: string;
    x: number;
    y: number;
  } | null>(null);

  // Swap mode state
  const [swapSourceSlot, setSwapSourceSlot] = useState<{
    slot: TimetableSlot;
    label: string;
  } | null>(null);

  // Copied teacher state for right-click copy & paste
  const [copiedTeacher, setCopiedTeacher] = useState<{
    id: string;
    abbr: string;
    name: string;
  } | null>(null);

  // Selected class for Class Timetable Modal (double-click on class column)
  const [selectedClassForModal, setSelectedClassForModal] = useState<ClassEntity | null>(null);

  // Selected teacher for Teacher Timetable Modal (right-click on teacher tile)
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState<Teacher | null>(null);

  // Selected slot for Student Selection Modal (right-click on support tile)
  const [selectedSlotForStudentPicker, setSelectedSlotForStudentPicker] = useState<TimetableSlot | null>(null);

  // Maps for fast lookups
  const teacherMap = useMemo(
    () => new Map(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  );
  const subjectMap = useMemo(
    () => new Map(data.subjects.map((s) => [s.id, s])),
    [data.subjects]
  );
  const classMap = useMemo(
    () => new Map(data.classes.map((c) => [c.id, c])),
    [data.classes]
  );

  // Handle Copy Teacher
  const handleCopyTeacher = (teacherId: string) => {
    const teacher = teacherMap.get(teacherId);
    const abbr = getTeacherAbbr(teacher);
    const name = teacher ? `${teacher.lastName} ${teacher.firstName[0]}.` : "Κενή Θέση";
    setCopiedTeacher({ id: teacherId, abbr, name });
    toast.success(`Αντιγράφηκε: [${abbr}] ${name}`, {
      description: "Κάντε δεξί κλικ σε άλλο κουτάκι για επικόλληση.",
    });
  };

  // Cancel Swap / Copy on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (swapSourceSlot) {
          setSwapSourceSlot(null);
          toast.info("Η εναλλαγή ακυρώθηκε.");
        }
        if (copiedTeacher) {
          setCopiedTeacher(null);
          toast.info("Η αντιγραφή ακυρώθηκε.");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [swapSourceSlot, copiedTeacher]);

  // Days configuration
  const days = [
    { index: 0, name: "Δευτέρα", dotColor: "bg-blue-500" },
    { index: 1, name: "Τρίτη", dotColor: "bg-emerald-500" },
    { index: 2, name: "Τετάρτη", dotColor: "bg-amber-500" },
    { index: 3, name: "Πέμπτη", dotColor: "bg-purple-500" },
    { index: 4, name: "Παρασκευή", dotColor: "bg-rose-500" },
  ];

  const morningCount = useMemo(() => {
    return data.schoolConfig?.periods?.length || 6;
  }, [data.schoolConfig]);

  const hasAllDay = useMemo(() => {
    return Boolean(
      data.schoolConfig?.hasAllDay !== undefined
        ? data.schoolConfig.hasAllDay
        : data.schoolConfig?.allDayPeriods && data.schoolConfig.allDayPeriods.length > 0
    );
  }, [data.schoolConfig]);

  const allDayCount = useMemo(() => {
    return hasAllDay ? (data.schoolConfig?.allDayPeriods?.length ?? 4) : 0;
  }, [hasAllDay, data.schoolConfig]);

  // Dynamic period columns per day derived from schoolConfig
  const allPeriods = useMemo(() => {
    const allDayList = hasAllDay
      ? data.schoolConfig?.allDayPeriods || [
          { index: 6, label: "1", startTime: "13:20", endTime: "14:00", isAllDay: true },
          { index: 7, label: "2", startTime: "14:15", endTime: "15:00", isAllDay: true },
          { index: 8, label: "3", startTime: "15:15", endTime: "16:00", isAllDay: true },
          { index: 9, label: "4", startTime: "16:10", endTime: "16:55", isAllDay: true },
        ]
      : [];

    const morning = Array.from({ length: morningCount }, (_, i) => ({
      index: i,
      label: `${i + 1}`,
      isAllDay: false,
    }));

    const allDay = allDayList.map((p, i) => ({
      index: p.index !== undefined ? p.index : 6 + i,
      label: `${i + 1}`,
      isAllDay: true,
    }));

    return [...morning, ...allDay];
  }, [morningCount, hasAllDay, data.schoolConfig]);

  // Filter periods dynamically based on showAllDay toggle
  const periods = useMemo(() => {
    if (showAllDay && allDayCount > 0) return allPeriods;
    return allPeriods.filter((p) => !p.isAllDay);
  }, [showAllDay, allDayCount, allPeriods]);

  // Classes sorted
  const sortedClasses = useMemo(() => {
    return [...data.classes].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [data.classes]);

  // Index slots by `classId_day_period`
  const slotsByCell = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const slot of data.slots) {
      const key = `${slot.classId}_${slot.day}_${slot.period}`;
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [data.slots]);

  // Left click on tile: Focus teacher & show tooltip with full name
  const handleTileClick = (e: React.MouseEvent, slot: TimetableSlot) => {
    // If in Swap Mode, click on tile executes swap!
    if (swapSourceSlot) {
      handleExecuteSwap(slot);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const teacher = teacherMap.get(slot.teacherId);
    const teacherName = teacher
      ? `${teacher.lastName} ${teacher.firstName} (${formatSpecialtyLabel(teacher.specialty)})`
      : "Χωρίς Ανάθεση";
    const studentInfo =
      slot.students && slot.students.length > 0
        ? ` • 👥 Μαθητές (${slot.students.length}): ${slot.students.join(", ")}`
        : "";

    setFocusedTile({
      slotId: slot.id,
      teacherName: `${teacherName}${studentInfo}`,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    onSelectTeacherSpotlight(slot.teacherId);
  };

  // Mouse leave on tile: restores everything back to normal
  const handleTileMouseLeave = () => {
    setFocusedTile(null);
    onSelectTeacherSpotlight(null);
  };

  // Click on empty cell: if in swap mode, move to this cell
  const handleEmptyCellClick = (classId: string, day: number, period: number) => {
    if (swapSourceSlot) {
      handleExecuteSwap(undefined, { classId, day, period });
    }
  };

  // Execute swap
  const handleExecuteSwap = async (
    targetSlot?: TimetableSlot,
    targetCell?: { classId: string; day: number; period: number }
  ) => {
    if (!swapSourceSlot) return;

    if (targetSlot && targetSlot.id === swapSourceSlot.slot.id) {
      toast.info("Επιλέξατε το ίδιο κελί.");
      setSwapSourceSlot(null);
      return;
    }

    try {
      const res = await fetch("/api/timetable/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swap: true,
          slotIdA: swapSourceSlot.slot.id,
          slotIdB: targetSlot?.id,
          targetCell,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Επιτυχής εναλλαγή θέσεων!");
        setSwapSourceSlot(null);
        onRefresh();
      } else {
        toast.error("Σφάλμα εναλλαγής", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Toggle Lock / Pin
  const handleToggleLock = async (slot: TimetableSlot) => {
    const newLockState = !slot.isLocked;
    try {
      const res = await fetch("/api/timetable/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          isLocked: newLockState,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          newLockState
            ? "Η ώρα καρφιτσώθηκε"
            : "Η ώρα ξεκαρφιτσώθηκε"
        );
        onRefresh();
      } else {
        toast.error("Σφάλμα καρφιτσώματος", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Add empty slot (Split 1 into 2, 2 into 3)
  const handleAddSplitSlot = async (
    classId: string,
    day: number,
    period: number
  ) => {
    try {
      const res = await fetch("/api/timetable/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          day,
          period,
          isEmptySlot: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Προστέθηκε νέο κουτάκι");
        onRefresh();
      } else {
        toast.error("Σφάλμα προσθήκης", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Change teacher
  const handleChangeTeacher = async (slotId: string, newTeacherId: string) => {
    try {
      const res = await fetch("/api/timetable/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, newTeacherId }),
      });
      const json = await res.json();
      if (json.success) {
        const teacher = teacherMap.get(newTeacherId);
        toast.success(
          `Ο εκπαιδευτικός άλλαξε σε: ${teacher?.lastName || newTeacherId}`
        );
        onRefresh();
      } else {
        toast.error("Σφάλμα αλλαγής εκπαιδευτικού", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Save selected students for a slot
  const handleSaveSlotStudents = async (slotId: string, students: string[]) => {
    const res = await fetch("/api/timetable/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId,
        students,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Αποτυχία αποθήκευσης μαθητών");
    }
    onRefresh();
  };

  // Delete slot
  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/timetable/slots?id=${slotId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Η ώρα διαγράφηκε επιτυχώς");
        onRefresh();
      } else {
        toast.error("Σφάλμα διαγραφής", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Assign slot to empty cell
  const handleAssignSlot = async (
    classId: string,
    day: number,
    period: number,
    teacherId: string
  ) => {
    try {
      const res = await fetch("/api/timetable/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, day, period, teacherId }),
      });
      const json = await res.json();
      if (json.success) {
        const teacher = teacherMap.get(teacherId);
        toast.success(
          `Ανατέθηκε στον εκπαιδευτικό: ${teacher?.lastName || teacherId}`
        );
        onRefresh();
      } else {
        toast.error("Σφάλμα ανάθεσης", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Helper for period display label
  const getPeriodLabel = (period: number) => {
    if (hasAllDay && period >= 6) {
      return `${period - 5}η Ολοημέρου`;
    }
    return `${period + 1}η`;
  };

  // Render individual tile wrapped in its own Context Menu
  const renderTileWithContextMenu = (
    slot: TimetableSlot,
    isSubTile: boolean,
    cls: ClassEntity,
    day: { index: number; name: string },
    effectivePeriod: number,
    totalSlotsInCell: number
  ) => {
    const teacher = teacherMap.get(slot.teacherId);
    const subject = subjectMap.get(slot.subjectId);
    const abbr = getTeacherAbbr(teacher);
    const styleClass = getTeacherStyleClass(abbr);
    const isUnassigned = slot.teacherId === "tch-unassigned";
    const periodLabel = getPeriodLabel(effectivePeriod);

    // Determine if this is a support slot (pull-out / complementary specialty)
    const isSupportSlot = Boolean(
      slot.isSupport ||
      teacher?.isSupport ||
      (subject?.allowedSpecialties && subject.allowedSpecialties.some(code => {
        const sp = getSpecialtyByCode(code) || findSpecialty(code);
        return sp?.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ";
      }))
    );

    const isSpotlighted =
      !spotlightTeacherId || slot.teacherId === spotlightTeacherId;
    const isSwapSource = swapSourceSlot?.slot.id === slot.id;

    return (
      <ContextMenu key={slot.id}>
        <ContextMenuTrigger className="w-full h-full block">
          <div
            onClick={(e) => handleTileClick(e, slot)}
            onMouseLeave={handleTileMouseLeave}
            style={isUnassigned ? undefined : getTeacherTileInlineStyle(teacher)}
            className={`relative ${
              isSubTile ? "sub-tile" : "tile-single"
            } ${styleClass} ${
              !isSpotlighted ? "opacity-20 grayscale-30" : "opacity-100"
            } ${
              isSwapSource ? "ring-2 ring-amber-500 scale-95 z-30 animate-pulse" : ""
            }`}
          >
            {abbr}

            {/* Discreet round circle badge for pinned/locked slot */}
            {slot.isLocked && (
              <span
                className={`absolute ${
                  isSubTile
                    ? "top-0.5 right-0.5 w-1 h-1"
                    : "top-0.5 right-0.5 w-1.5 h-1.5"
                } rounded-full bg-zinc-900 dark:bg-zinc-100 ring-[0.5px] ring-white/90 dark:ring-black/90 pointer-events-none z-10 shadow-xs`}
                title="Καρφιτσωμένη θέση"
              />
            )}

            {/* Discreet student count badge indicator */}
            {slot.students && slot.students.length > 0 && (
              <span
                className={`absolute ${
                  isSubTile
                    ? "bottom-0.5 right-0.5 px-0.5 text-[7px]"
                    : "bottom-0.5 right-0.5 px-1 text-[8px]"
                } rounded-full bg-purple-700 text-white font-mono font-bold leading-none pointer-events-none z-10 shadow-xs ring-[0.5px] ring-white/90`}
                title={`Μαθητές (${slot.students.length}): ${slot.students.join(", ")}`}
              >
                {slot.students.length}
              </span>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56 font-sans text-xs">
          <ContextMenuLabel className="font-semibold text-zinc-900 text-[11px] truncate">
            {cls.name} • {day.name} {periodLabel} • [{abbr}] {isUnassigned ? "Κενή Θέση" : teacher?.lastName}
          </ContextMenuLabel>
          <ContextMenuSeparator />

          {/* 0. Επιλογή Μαθητών Submenu (για συμπληρωματικές ειδικότητες / υποστήριξη) */}
          {isSupportSlot && (() => {
            const classStudents = cls.students || [];
            const otherSlots = data.slots.filter(
              (s) =>
                s.id !== slot.id &&
                s.day === slot.day &&
                s.period === slot.period &&
                s.classId === slot.classId
            );
            const occupiedStudentsMap = new Map<string, string>();
            otherSlots.forEach((os) => {
              if (os.students && Array.isArray(os.students)) {
                const tch = teacherMap.get(os.teacherId);
                const sub = subjectMap.get(os.subjectId);
                const desc = `${sub?.title || sub?.code || "Ειδικότητα"} (${tch ? tch.lastName : ""})`;
                os.students.forEach((st) => occupiedStudentsMap.set(st, desc));
              }
            });

            const currentSlotStudents = slot.students || [];
            const availableStudents = classStudents.filter((st) => !occupiedStudentsMap.has(st));

            const handleToggleStudentInSubmenu = (e: React.MouseEvent, st: string) => {
              e.preventDefault();
              e.stopPropagation();
              const next = currentSlotStudents.includes(st)
                ? currentSlotStudents.filter((s) => s !== st)
                : [...currentSlotStudents, st];
              handleSaveSlotStudents(slot.id, next);
            };

            const handleSelectAllInSubmenu = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              handleSaveSlotStudents(slot.id, availableStudents);
              toast.info(`Επιλέχθηκαν ${availableStudents.length} διαθέσιμοι μαθητές.`);
            };

            const handleClearAllInSubmenu = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              handleSaveSlotStudents(slot.id, []);
            };

            return (
              <>
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="gap-2 font-medium text-purple-700 focus:text-purple-800 focus:bg-purple-50 cursor-pointer">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      Μαθητές {currentSlotStudents.length > 0 ? `(${currentSlotStudents.length})` : ""}
                    </span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64 max-h-72 overflow-y-auto p-1 font-sans">
                    <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold text-zinc-500 border-b border-zinc-100">
                      <span>Επιλογή Μαθητών ({currentSlotStudents.length}/{classStudents.length})</span>
                      <div className="flex items-center gap-1.5">
                        {availableStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAllInSubmenu}
                            className="text-[10px] text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                          >
                            Όλοι
                          </button>
                        )}
                        {currentSlotStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllInSubmenu}
                            className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                          >
                            Καθαρισμός
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {classStudents.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-zinc-400 italic">
                          Δεν υπάρχουν μαθητές στο τμήμα
                        </div>
                      ) : (
                        classStudents.map((st) => {
                          const isOccupied = occupiedStudentsMap.has(st);
                          const isSelected = currentSlotStudents.includes(st);

                          if (isOccupied) {
                            return (
                              <div
                                key={st}
                                className="flex items-center justify-between gap-1.5 px-2 py-1 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded cursor-not-allowed select-none opacity-60"
                                title={`Απασχολημένος: ${occupiedStudentsMap.get(st)}`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Lock className="w-3 h-3 text-amber-600 flex-none" />
                                  <span className="truncate">{st}</span>
                                </div>
                                <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800 flex-none">
                                  {occupiedStudentsMap.get(st)}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={st}
                              onClick={(e) => handleToggleStudentInSubmenu(e, st)}
                              className={`flex items-center justify-between gap-1.5 px-2 py-1 text-xs rounded cursor-pointer select-none transition-colors ${
                                isSelected
                                  ? "bg-purple-100 text-purple-900 font-semibold dark:bg-purple-950 dark:text-purple-100"
                                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                    isSelected
                                      ? "bg-purple-600 border-purple-700 text-white"
                                      : "border-zinc-300 bg-white dark:bg-zinc-900"
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span className="truncate">{st}</span>
                              </div>
                              {isSelected && (
                                <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-200/60 dark:bg-purple-900/60 px-1 py-0.2 rounded flex-none">
                                  ✓
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1 border-t border-zinc-100">
                      <ContextMenuItem
                        onClick={() => setSelectedSlotForStudentPicker(slot)}
                        className="gap-1.5 text-[10.5px] text-zinc-500 hover:text-purple-700 py-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Προσθήκη / Διαχείριση Μαθητών...</span>
                      </ContextMenuItem>
                    </div>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
              </>
            );
          })()}

          {/* 1. Πρόγραμμα Εκπαιδευτικού */}
          {!isUnassigned && teacher && (
            <>
              <ContextMenuItem
                onClick={() => setSelectedTeacherForModal(teacher)}
                className="gap-2 font-medium text-indigo-700 focus:text-indigo-800 focus:bg-indigo-50"
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                <span>Πρόγραμμα: {teacher.lastName}</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          {/* 1. Αλλαγή */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <UserCheck className="w-3.5 h-3.5 text-zinc-600" />
              <span>{isUnassigned ? "Ανάθεση Εκπαιδευτικού" : "Αλλαγή"}</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 max-h-60 overflow-y-auto">
              {data.teachers
                .filter((t) => t.id !== "tch-unassigned")
                .map((t) => (
                  <ContextMenuItem
                    key={t.id}
                    onClick={() => handleChangeTeacher(slot.id, t.id)}
                    className="gap-2 font-mono text-[11px]"
                  >
                    <span
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                      style={getTeacherTileInlineStyle(t)}
                    >
                      {getTeacherAbbr(t)}
                    </span>
                    <span className="font-sans truncate">
                      {t.lastName} {t.firstName[0]}.
                    </span>
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* 2. Αντιγραφή */}
          <ContextMenuItem
            onClick={() => handleCopyTeacher(slot.teacherId)}
            className="gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-600" />
            <span>Αντιγραφή</span>
          </ContextMenuItem>

          {/* 3. Επικόλληση (αν υπάρχει αντιγραμμένος εκπαιδευτικός) */}
          {copiedTeacher && (
            <ContextMenuItem
              onClick={() => handleChangeTeacher(slot.id, copiedTeacher.id)}
              className="gap-2 text-blue-600 font-medium focus:text-blue-700"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
              <span>Επικόλληση [{copiedTeacher.abbr}]</span>
            </ContextMenuItem>
          )}

          {/* 4. Εναλλαγή (Swap) */}
          <ContextMenuItem
            onClick={() => {
              if (swapSourceSlot) {
                handleExecuteSwap(slot);
              } else {
                setSwapSourceSlot({
                  slot,
                  label: `[${abbr}] ${cls.name} • ${day.name} ${periodLabel}`,
                });
                toast.info("Λειτουργία Εναλλαγής (Swap)", {
                  description: "Κάντε κλικ σε ένα άλλο κελί για να γίνει η εναλλαγή.",
                });
              }
            }}
            className="gap-2"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
            <span>{swapSourceSlot ? "Εναλλαγή με επιλεγμένο" : "Εναλλαγή"}</span>
          </ContextMenuItem>

          {/* 3. Προσθήκη */}
          <ContextMenuItem
            onClick={() => handleAddSplitSlot(cls.id, day.index, effectivePeriod)}
            disabled={totalSlotsInCell >= 3}
            className="gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Προσθήκη ({totalSlotsInCell + 1}x)</span>
          </ContextMenuItem>

          {/* 4. Καρφίτσωμα / Ξεκαρφίτσωμα */}
          <ContextMenuItem
            onClick={() => handleToggleLock(slot)}
            className="gap-2"
          >
            {slot.isLocked ? (
              <>
                <Circle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Ξεκαρφίτσωμα</span>
              </>
            ) : (
              <>
                <CircleDot className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
                <span>Καρφίτσωμα</span>
              </>
            )}
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* 5. Διαγραφή */}
          <ContextMenuItem
            variant="destructive"
            onClick={() => handleDeleteSlot(slot.id)}
            className="gap-2 text-rose-600 focus:text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Διαγραφή</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="w-full h-full flex-1 overflow-auto bg-background text-foreground select-none relative">
      {/* Floating Tooltip when left-clicking a tile */}
      {focusedTile && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-800 text-white text-[11px] font-sans font-medium shadow-xl border border-zinc-700 -translate-x-1/2 -translate-y-full mb-1 animate-in fade-in zoom-in-95 duration-75"
          style={{ left: focusedTile.x, top: focusedTile.y - 4 }}
        >
          {focusedTile.teacherName}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
        </div>
      )}

      {/* Floating Swap Banner */}
      {swapSourceSlot && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-sans shadow-2xl border border-zinc-700 animate-in slide-in-from-bottom-4 duration-150">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400 animate-spin" />
            <span>
              <strong>Λειτουργία Εναλλαγής (Swap):</strong> Κάντε κλικ σε ένα άλλο κελί για εναλλαγή με το{" "}
              <span className="text-amber-300 font-mono font-bold">
                {swapSourceSlot.label}
              </span>
            </span>
          </span>
          <button
            onClick={() => setSwapSourceSlot(null)}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] border border-zinc-600 cursor-pointer transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Ακύρωση (Esc)</span>
          </button>
        </div>
      )}

      {/* Floating Copied Indicator Banner */}
      {copiedTeacher && (
        <div className="fixed bottom-10 right-8 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-sans shadow-2xl border border-blue-500/40 animate-in slide-in-from-bottom-3 duration-150">
          <Copy className="w-3.5 h-3.5 text-blue-400" />
          <span>
            Αντιγραφή: <strong className="text-blue-300 font-mono font-bold">[{copiedTeacher.abbr}]</strong> {copiedTeacher.name}
          </span>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
            Δεξί κλικ για επικόλληση
          </span>
          <button
            onClick={() => {
              setCopiedTeacher(null);
              toast.info("Η αντιγραφή ακυρώθηκε.");
            }}
            className="ml-1 p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
            title="Ακύρωση αντιγραφής (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <table className={`matrix-table text-center font-mono ${!showAllDay ? "matrix-morning-only" : ""}`}>
        <colgroup>
          <col className="col-class" />
          {days.map((day) => (
            <React.Fragment key={day.index}>
              <col className="col-period" span={morningCount} />
              {showAllDay && allDayCount > 0 && <col className="col-period" span={allDayCount} />}
            </React.Fragment>
          ))}
        </colgroup>

        {/* Header with Days & Hours */}
        <thead className="bg-zinc-100 dark:bg-zinc-900 select-none">
          {/* ROW 1: Days */}
          <tr className="h-[26px] text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800">
            <th className="sticky-top-left-1 bg-zinc-200 dark:bg-zinc-800 border-r-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">
              ΤΜ
            </th>
            {days.map((day, idx) => {
              const isLastDay = idx === days.length - 1;
              let dayBorder = "border-r border-zinc-200 dark:border-zinc-800";
              if (!isLastDay) {
                dayBorder = !showAllDay
                  ? "border-r-[3.5px] border-zinc-400 dark:border-zinc-500"
                  : "border-r-2 border-zinc-300 dark:border-zinc-700";
              }

              return (
                <th
                  key={day.index}
                  className={`sticky-day-head bg-zinc-100 dark:bg-zinc-900 ${dayBorder} text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800`}
                  colSpan={showAllDay && allDayCount > 0 ? morningCount + allDayCount : morningCount}
                >
                  <span className="inline-flex items-center gap-1 font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${day.dotColor}`} />
                    {day.name}
                  </span>
                </th>
              );
            })}
          </tr>

          {/* ROW 2: Hours: 1-N morning, 1-N all-day (if visible) */}
          <tr className="h-6 text-[9px] font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <th className="sticky-top-left-2 bg-zinc-200 dark:bg-zinc-800 border-r-2 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-semibold">
              ΩΡΑ
            </th>
            {days.map((day, dayIdx) =>
              periods.map((p, pIdx) => {
                const isLastPeriodOfDay = pIdx === periods.length - 1;
                const isLastMorningWhenAllDay = showAllDay && allDayCount > 0 && pIdx === morningCount - 1;
                const isLastDay = dayIdx === days.length - 1;
                const isAllDayPeriod = p.isAllDay;

                let borderClass = "border-r border-zinc-200 dark:border-zinc-800";
                if (!showAllDay) {
                  if (isLastPeriodOfDay && !isLastDay) {
                    borderClass = "border-r-[3.5px] border-zinc-400 dark:border-zinc-500";
                  }
                } else {
                  if (isLastMorningWhenAllDay || isLastPeriodOfDay) {
                    borderClass = "border-r-2 border-zinc-300 dark:border-zinc-700";
                  }
                }

                return (
                  <th
                    key={`${day.index}_${p.index}`}
                    className={`sticky-hour-head ${
                      isAllDayPeriod
                        ? "bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                    } ${borderClass}`}
                  >
                    {p.label}
                  </th>
                );
              })
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className={`divide-y ${!showAllDay ? "divide-zinc-400 dark:divide-zinc-500" : "divide-zinc-200 dark:divide-zinc-800"} text-[10px]`}>
          {sortedClasses.map((cls) => {
            const isResourceClass =
              cls.name.includes("Τ.Ε.") || cls.name.includes("ΕΝΤΑΞ");
            const isAllDayClass = Boolean(
              cls.isAllDay ||
              cls.grade === "Ολοήμερο" ||
              cls.name?.toUpperCase().includes("ΟΛΟΗΜΕΡ")
            );

            return (
              <tr key={cls.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 group">
                {/* Sticky Class Column */}
                <td
                  className={`sticky-col ${
                    isAllDayClass
                      ? "bg-amber-100/80 dark:bg-amber-950/60 group-hover:bg-amber-200/90 dark:group-hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                      : isResourceClass
                      ? "bg-purple-100 dark:bg-purple-950/60 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/80 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800"
                      : "bg-zinc-100 dark:bg-zinc-900 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                  } ${
                    !showAllDay
                      ? "border-b-2 border-zinc-400 dark:border-zinc-500 border-r-2"
                      : "border-b border-zinc-200 dark:border-zinc-800 border-r-2"
                  } font-bold text-center select-none cursor-default hover:bg-zinc-200/90 dark:hover:bg-zinc-800 transition-colors`}
                  title={`${cls.name} (Διπλό κλικ για αναλυτικό πρόγραμμα)`}
                  onDoubleClick={() => setSelectedClassForModal(cls)}
                >
                  <div className="w-full max-h-[56px] overflow-hidden flex flex-col items-center justify-center text-center px-0.5 leading-[1.1] text-[10.5px]">
                    <span className="w-full overflow-hidden text-clip break-words">
                      {cls.name}
                    </span>
                  </div>
                </td>

                {/* Period cells */}
                {days.map((day, dayIdx) =>
                  periods.map((p, pIdx) => {
                    const isLastPeriodOfDay = pIdx === periods.length - 1;
                    const isLastMorningWhenAllDay = showAllDay && allDayCount > 0 && pIdx === morningCount - 1;
                    const isLastDay = dayIdx === days.length - 1;
                    const isAllDayPeriod = p.isAllDay;

                    let borderClass = "border-r border-zinc-200 dark:border-zinc-800";
                    if (!showAllDay) {
                      if (isLastPeriodOfDay && !isLastDay) {
                        borderClass = "border-r-[3.5px] border-zinc-400 dark:border-zinc-500";
                      }
                    } else {
                      if (isLastMorningWhenAllDay || isLastPeriodOfDay) {
                        borderClass = "border-r-2 border-zinc-300 dark:border-zinc-700";
                      }
                    }

                    // Determine effective database period for this class & column:
                    // In compact view (!showAllDay):
                    //   - Morning classes: pIdx -> DB periods 0..morningCount-1
                    //   - All-Day class: pIdx (0..allDayCount-1) -> DB periods 6..6+allDayCount-1, remainder -> inactive (-)
                    // In expanded view (showAllDay):
                    //   - Morning classes: p.index (0..morningCount-1) and afternoon empty cells
                    //   - All-Day class: pIdx < morningCount -> inactive (-), afternoon -> DB periods 6..
                    let effectivePeriod = p.index;
                    let isInactiveCell = false;

                    if (!showAllDay) {
                      if (isAllDayClass) {
                        if (pIdx < allDayCount) {
                          effectivePeriod = pIdx + 6;
                        } else {
                          isInactiveCell = true;
                        }
                      } else {
                        effectivePeriod = p.index;
                      }
                    } else {
                      if (isAllDayClass && pIdx < morningCount) {
                        isInactiveCell = true;
                      } else {
                        effectivePeriod = p.index;
                      }
                    }

                    if (isInactiveCell) {
                      return (
                        <td
                          key={`${cls.id}_${day.index}_inactive_${pIdx}`}
                          className={`matrix-cell-period ${borderClass} ${
                            !showAllDay
                              ? "border-b-2 border-zinc-400 dark:border-zinc-500"
                              : "border-b border-zinc-200 dark:border-zinc-800"
                          } bg-zinc-100/60 dark:bg-zinc-900/40 text-center select-none cursor-not-allowed`}
                          title={
                            isAllDayClass
                              ? !showAllDay
                                ? `${cls.name} • Δεν υπάρχει ${pIdx + 1}η ώρα στο Ολοήμερο`
                                : `${cls.name} • Το Ολοήμερο λειτουργεί τις απογευματινές ώρες (${morningCount + 1}η-${morningCount + allDayCount}η)`
                              : undefined
                          }
                        >
                          <span className="text-zinc-300 dark:text-zinc-600 font-sans text-xs font-semibold select-none opacity-60">
                            —
                          </span>
                        </td>
                      );
                    }

                    const cellKey = `${cls.id}_${day.index}_${effectivePeriod}`;
                    const slots = slotsByCell.get(cellKey) || [];
                    const periodLabel = getPeriodLabel(effectivePeriod);

                    return (
                      <td
                        key={cellKey}
                        className={`matrix-cell-period ${borderClass} ${
                          !showAllDay
                            ? "border-b-2 border-zinc-400 dark:border-zinc-500"
                            : "border-b border-zinc-200 dark:border-zinc-800"
                        } ${
                          isAllDayPeriod || effectivePeriod >= 6
                            ? "bg-amber-50/30 dark:bg-amber-950/20"
                            : "bg-white dark:bg-zinc-950"
                        }`}
                      >
                        {slots.length === 0 ? (
                          /* Empty Cell with its own Context Menu */
                          <ContextMenu>
                            <ContextMenuTrigger className="w-full h-full block">
                              <div
                                onClick={() =>
                                  handleEmptyCellClick(cls.id, day.index, effectivePeriod)
                                }
                                className={`t-empty ${
                                  swapSourceSlot
                                    ? "hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
                                    : ""
                                }`}
                              />
                            </ContextMenuTrigger>

                            <ContextMenuContent className="w-56 font-sans text-xs">
                              <ContextMenuLabel className="font-semibold text-zinc-900 text-[11px]">
                                Τμήμα {cls.name} • {day.name} {periodLabel}
                              </ContextMenuLabel>
                              <ContextMenuSeparator />

                              {/* Επικόλληση (αν υπάρχει αντιγραμμένος εκπαιδευτικός) */}
                              {copiedTeacher && (
                                <>
                                  <ContextMenuItem
                                    onClick={() =>
                                      handleAssignSlot(
                                        cls.id,
                                        day.index,
                                        effectivePeriod,
                                        copiedTeacher.id
                                      )
                                    }
                                    className="gap-2 font-medium text-blue-600 focus:text-blue-700"
                                  >
                                    <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Επικόλληση [{copiedTeacher.abbr}] {copiedTeacher.name}</span>
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                </>
                              )}

                              {swapSourceSlot && (
                                <>
                                  <ContextMenuItem
                                    onClick={() =>
                                      handleExecuteSwap(undefined, {
                                        classId: cls.id,
                                        day: day.index,
                                        period: effectivePeriod,
                                      })
                                    }
                                    className="gap-2 font-medium text-amber-700"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Εναλλαγή (Μετακίνηση εδώ)</span>
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                </>
                              )}

                              <ContextMenuSub>
                                <ContextMenuSubTrigger className="gap-2">
                                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ανάθεση Εκπαιδευτικού</span>
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="w-56 max-h-60 overflow-y-auto">
                                  {data.teachers
                                    .filter((t) => t.id !== "tch-unassigned")
                                    .map((t) => (
                                      <ContextMenuItem
                                        key={t.id}
                                        onClick={() =>
                                          handleAssignSlot(
                                            cls.id,
                                            day.index,
                                            effectivePeriod,
                                            t.id
                                          )
                                        }
                                        className="gap-2 font-mono text-[11px]"
                                      >
                                        <span
                                          className={`px-1 py-0.2 rounded text-[10px] font-bold ${getTeacherStyleClass(
                                            getTeacherAbbr(t)
                                          )}`}
                                        >
                                          {getTeacherAbbr(t)}
                                        </span>
                                        <span className="font-sans truncate">
                                          {t.lastName} {t.firstName[0]}.
                                        </span>
                                      </ContextMenuItem>
                                    ))}
                                </ContextMenuSubContent>
                              </ContextMenuSub>
                            </ContextMenuContent>
                          </ContextMenu>
                        ) : slots.length === 1 ? (
                          /* Single Slot with its own Context Menu */
                          renderTileWithContextMenu(
                            slots[0],
                            false,
                            cls,
                            day,
                            effectivePeriod,
                            1
                          )
                        ) : slots.length === 2 ? (
                          /* 2 Slots Split Stack: each slot has its own independent Context Menu */
                          <div className="split-stack-2">
                            {slots.map((s) =>
                              renderTileWithContextMenu(
                                s,
                                true,
                                cls,
                                day,
                                effectivePeriod,
                                2
                              )
                            )}
                          </div>
                        ) : (
                          /* 3 Slots Split Stack: each slot has its own independent Context Menu */
                          <div className="split-stack-3">
                            {slots.slice(0, 3).map((s) =>
                              renderTileWithContextMenu(
                                s,
                                true,
                                cls,
                                day,
                                effectivePeriod,
                                slots.length
                              )
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Dedicated Class Timetable Modal */}
      {selectedClassForModal && (
        <ClassTimetableModal
          isOpen={Boolean(selectedClassForModal)}
          onClose={() => setSelectedClassForModal(null)}
          classData={selectedClassForModal}
          data={data}
        />
      )}

      {/* Dedicated Teacher Timetable Modal */}
      {selectedTeacherForModal && (
        <TeacherTimetableModal
          isOpen={Boolean(selectedTeacherForModal)}
          onClose={() => setSelectedTeacherForModal(null)}
          initialTeacher={selectedTeacherForModal}
          data={data}
        />
      )}

      {/* Dedicated Student Selection Modal for Support Slots */}
      {selectedSlotForStudentPicker && (
        <StudentSelectModal
          open={Boolean(selectedSlotForStudentPicker)}
          onOpenChange={(open) => {
            if (!open) setSelectedSlotForStudentPicker(null);
          }}
          slot={selectedSlotForStudentPicker}
          data={data}
          onSaveStudents={handleSaveSlotStudents}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
