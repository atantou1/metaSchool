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
import { formatSpecialtyLabel } from "@/lib/specialties";
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
} from "lucide-react";
import { toast } from "sonner";

interface MasterMatrixProps {
  data: TimetableData;
  onRefresh: () => void;
  spotlightTeacherId: string | null;
  onSelectTeacherSpotlight: (teacherId: string | null) => void;
}

export const MasterMatrix: React.FC<MasterMatrixProps> = ({
  data,
  onRefresh,
  spotlightTeacherId,
  onSelectTeacherSpotlight,
}) => {
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

  // 10 period columns per day: 6 morning (0-5) and 4 all-day (6-9)
  const periods = [
    { index: 0, label: "1", isAllDay: false },
    { index: 1, label: "2", isAllDay: false },
    { index: 2, label: "3", isAllDay: false },
    { index: 3, label: "4", isAllDay: false },
    { index: 4, label: "5", isAllDay: false },
    { index: 5, label: "6", isAllDay: false },
    { index: 6, label: "1", isAllDay: true },
    { index: 7, label: "2", isAllDay: true },
    { index: 8, label: "3", isAllDay: true },
    { index: 9, label: "4", isAllDay: true },
  ];

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

    setFocusedTile({
      slotId: slot.id,
      teacherName,
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

  // Render individual tile wrapped in its own Context Menu
  const renderTileWithContextMenu = (
    slot: TimetableSlot,
    isSubTile: boolean,
    cls: ClassEntity,
    day: { index: number; name: string },
    p: { index: number },
    totalSlotsInCell: number
  ) => {
    const teacher = teacherMap.get(slot.teacherId);
    const abbr = getTeacherAbbr(teacher);
    const styleClass = getTeacherStyleClass(abbr);
    const isUnassigned = slot.teacherId === "tch-unassigned";

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

            {/* Discreet round circle badge for pinned/locked slot (super small so it never covers letters) */}
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
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56 font-sans text-xs">
          <ContextMenuLabel className="font-semibold text-zinc-900 text-[11px] truncate">
            {cls.name} • {day.name} {p.index + 1}η • [{abbr}] {isUnassigned ? "Κενή Θέση" : teacher?.lastName}
          </ContextMenuLabel>
          <ContextMenuSeparator />

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
                  label: `[${abbr}] ${cls.name} • ${day.name} ${p.index + 1}η`,
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
            onClick={() => handleAddSplitSlot(cls.id, day.index, p.index)}
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
    <div className="w-full h-full flex-1 overflow-auto bg-white select-none relative">
      {/* Floating Tooltip when left-clicking a tile */}
      {focusedTile && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1 rounded bg-zinc-900 text-white text-[11px] font-sans font-medium shadow-xl border border-zinc-700 -translate-x-1/2 -translate-y-full mb-1 animate-in fade-in zoom-in-95 duration-75"
          style={{ left: focusedTile.x, top: focusedTile.y - 4 }}
        >
          {focusedTile.teacherName}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
        </div>
      )}

      {/* Floating Swap Banner */}
      {swapSourceSlot && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-sans shadow-2xl border border-zinc-700 animate-in slide-in-from-bottom-4 duration-150">
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
        <div className="fixed bottom-10 right-8 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-sans shadow-2xl border border-blue-500/40 animate-in slide-in-from-bottom-3 duration-150">
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

      <table className="matrix-table text-center font-mono">
        <colgroup>
          <col className="col-class" />
          {/* 5 days x 10 period columns */}
          <col className="col-period" span={6} />
          <col className="col-period" span={4} />
          <col className="col-period" span={6} />
          <col className="col-period" span={4} />
          <col className="col-period" span={6} />
          <col className="col-period" span={4} />
          <col className="col-period" span={6} />
          <col className="col-period" span={4} />
          <col className="col-period" span={6} />
          <col className="col-period" span={4} />
        </colgroup>

        {/* Header with Days & Hours */}
        <thead className="bg-zinc-100 select-none">
          {/* ROW 1: Days */}
          <tr className="h-[26px] text-[11px] font-semibold text-zinc-800 border-b border-zinc-200">
            <th className="sticky-top-left-1 bg-zinc-200 border-r-2 border-zinc-300 text-zinc-700 font-mono text-[10px]">
              ΤΜ
            </th>
            {days.map((day, idx) => (
              <th
                key={day.index}
                className={`sticky-day-head bg-zinc-100 ${
                  idx === 4 ? "border-r border-zinc-200" : "border-r-2 border-zinc-300"
                } text-zinc-900 border-b border-zinc-200`}
                colSpan={10}
              >
                <span className="inline-flex items-center gap-1 font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${day.dotColor}`} />
                  {day.name}
                </span>
              </th>
            ))}
          </tr>

          {/* ROW 2: Hours: 1-6 morning, 1-4 all-day */}
          <tr className="h-6 text-[9px] font-mono text-zinc-600 bg-white border-b border-zinc-200">
            <th className="sticky-top-left-2 bg-zinc-200 border-r-2 border-zinc-300 text-zinc-600 font-semibold">
              ΩΡΑ
            </th>
            {days.map((day) =>
              periods.map((p, pIdx) => {
                const isLastMorning = pIdx === 5;
                const isLastAllDay = pIdx === 9;
                const isAllDay = p.isAllDay;

                return (
                  <th
                    key={`${day.index}_${p.index}`}
                    className={`sticky-hour-head ${
                      isAllDay
                        ? "bg-amber-50/70 text-amber-800 font-bold"
                        : "bg-white text-zinc-700"
                    } ${
                      isLastMorning || isLastAllDay
                        ? "border-r-2 border-zinc-300 font-bold"
                        : "border-r border-zinc-200"
                    }`}
                  >
                    {p.label}
                  </th>
                );
              })
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-zinc-200 text-[10px]">
          {sortedClasses.map((cls) => {
            const isResourceClass =
              cls.name.includes("Τ.Ε.") || cls.name.includes("ΕΝΤΑΞ");

            return (
              <tr key={cls.id} className="hover:bg-zinc-50 group">
                {/* Sticky Class Column */}
                <td
                  className={`sticky-col ${
                    isResourceClass
                      ? "bg-purple-100 group-hover:bg-purple-200 text-purple-900 border-purple-300"
                      : "bg-zinc-100 group-hover:bg-zinc-200 text-zinc-900 border-zinc-300"
                  } border-r-2 font-bold text-center select-none`}
                  title={cls.name}
                >
                  <div className="w-full max-h-[56px] overflow-hidden flex flex-col items-center justify-center text-center px-0.5 leading-[1.1] text-[10.5px]">
                    <span className="w-full overflow-hidden text-clip break-words">
                      {cls.name}
                    </span>
                  </div>
                </td>

                {/* 50 period cells */}
                {days.map((day) =>
                  periods.map((p, pIdx) => {
                    const isLastMorning = pIdx === 5;
                    const isLastAllDay = pIdx === 9;
                    const isAllDay = p.isAllDay;
                    const cellKey = `${cls.id}_${day.index}_${p.index}`;
                    const slots = slotsByCell.get(cellKey) || [];

                    return (
                      <td
                        key={cellKey}
                        className={`${
                          isLastMorning || isLastAllDay
                            ? "border-r-2 border-zinc-300"
                            : "border-r border-zinc-200"
                        } ${
                          isAllDay ? "bg-amber-50/30" : "bg-white"
                        } border-b border-zinc-200`}
                      >
                        {slots.length === 0 ? (
                          /* Empty Cell with its own Context Menu */
                          <ContextMenu>
                            <ContextMenuTrigger className="w-full h-full block">
                              <div
                                onClick={() =>
                                  handleEmptyCellClick(cls.id, day.index, p.index)
                                }
                                className={`t-empty ${
                                  swapSourceSlot
                                    ? "cursor-pointer hover:bg-amber-100/60"
                                    : ""
                                }`}
                              />
                            </ContextMenuTrigger>

                            <ContextMenuContent className="w-56 font-sans text-xs">
                              <ContextMenuLabel className="font-semibold text-zinc-900 text-[11px]">
                                Τμήμα {cls.name} • {day.name} {p.index + 1}η
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
                                        p.index,
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
                                        period: p.index,
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
                                            p.index,
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
                            p,
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
                                p,
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
                                p,
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
    </div>
  );
};
