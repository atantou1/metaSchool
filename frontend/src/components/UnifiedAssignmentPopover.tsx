"use client";

import React, { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Teacher, SubjectAssignment } from "@/types";
import { ChevronDown, Plus, X, Settings2, RotateCcw } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";

interface UnifiedAssignmentPopoverProps {
  classNameLabel: string;
  classHours: [number, number]; // [min, max]
  assignments: SubjectAssignment[];
  eligibleTeachers: Teacher[];
  smartDefaultIds: string[];
  maxAllowedHours: number;

  // Callbacks
  onChangeHours: (range: [number, number]) => void;
  onApplyHoursToAll?: (range: [number, number]) => void;
  onChangeAssignments: (assignments: SubjectAssignment[]) => void;
}

export const UnifiedAssignmentPopover: React.FC<UnifiedAssignmentPopoverProps> = ({
  classNameLabel,
  classHours,
  assignments,
  eligibleTeachers,
  smartDefaultIds,
  maxAllowedHours,
  onChangeHours,
  onApplyHoursToAll,
  onChangeAssignments,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Effective assignments list: If assignments is empty, fallback to smart default teacher with initial classHours
  const effectiveAssignments = useMemo(() => {
    if (assignments && assignments.length > 0) {
      return assignments;
    }
    const defaultIds =
      smartDefaultIds && smartDefaultIds.length > 0 ? smartDefaultIds : ["all"];
    return defaultIds.map((id) => ({
      teacherId: id,
      hours: (classHours && (classHours[0] > 0 || classHours[1] > 0)
        ? classHours
        : [0, 0]) as [number, number],
    }));
  }, [assignments, smartDefaultIds, classHours]);

  const isUsingSmartDefault = assignments.length === 0;

  // Helper to commit assignments and auto-update total classHours
  const commitAssignments = (newAssig: SubjectAssignment[]) => {
    onChangeAssignments(newAssig);

    // Compute total sum of hours
    if (newAssig.length === 0) {
      onChangeHours([0, 0]);
      return;
    }

    const minSum = newAssig.reduce(
      (sum, a) => sum + (a.hours ? a.hours[0] : 0),
      0
    );
    const maxSum = newAssig.reduce(
      (sum, a) => sum + (a.hours ? a.hours[1] : 0),
      0
    );
    onChangeHours([minSum, maxSum]);
  };

  // Update a single teacher's hours
  const updateTeacherHours = (tId: string, hours: [number, number]) => {
    const list = effectiveAssignments.map((a) =>
      a.teacherId === tId ? { ...a, hours } : a
    );
    commitAssignments(list);
  };

  // Add teacher to assignments
  const addTeacher = (tId: string) => {
    if (tId === "all") {
      commitAssignments([{ teacherId: "all", hours: [0, maxAllowedHours] }]);
      setIsAdding(false);
      return;
    }

    const current = effectiveAssignments.filter((a) => a.teacherId !== "all");
    const exists = current.some((a) => a.teacherId === tId);
    if (!exists) {
      commitAssignments([...current, { teacherId: tId, hours: [0, 0] }]);
    }
    setIsAdding(false);
  };

  // Remove teacher from assignments
  const removeTeacher = (tId: string) => {
    const remaining = effectiveAssignments.filter((a) => a.teacherId !== tId);
    if (remaining.length === 0) {
      onChangeAssignments([]);
      onChangeHours([0, 0]);
    } else {
      commitAssignments(remaining);
    }
  };

  // Reset to default
  const handleReset = () => {
    onChangeAssignments([]);
    onChangeHours([0, 0]);
  };

  // Total hours calculated from effective assignments
  const totalMin = effectiveAssignments.reduce(
    (sum, a) => sum + (a.hours ? a.hours[0] : 0),
    0
  );
  const totalMax = effectiveAssignments.reduce(
    (sum, a) => sum + (a.hours ? a.hours[1] : 0),
    0
  );

  // Trigger button labels
  let hoursText =
    totalMin === 0 && totalMax === 0
      ? "-"
      : `${totalMin}${totalMax !== totalMin ? "-" + totalMax : ""}ω`;

  let teacherText = "ΟΛΟΙ";
  if (
    effectiveAssignments.length === 1 &&
    effectiveAssignments[0].teacherId !== "all"
  ) {
    const t = eligibleTeachers.find(
      (t) => t.id === effectiveAssignments[0].teacherId
    );
    if (t) {
      const rawName = t.shortName || t.lastName || t.firstName || "";
      teacherText = rawName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .substring(0, 4);
    }
  } else if (effectiveAssignments.length === 2) {
    const names = effectiveAssignments.map((a) => {
      if (a.teacherId === "all") return "ΟΛΟ";
      const t = eligibleTeachers.find((t) => t.id === a.teacherId);
      const raw = t?.shortName || t?.lastName || t?.firstName || "";
      return raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .substring(0, 4);
    });
    teacherText = names.join("/");
  } else if (effectiveAssignments.length > 2) {
    teacherText = `${effectiveAssignments.length} εκπ.`;
  }

  const triggerColor = isUsingSmartDefault
    ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
    : "bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        className={`h-7 w-[56px] px-1 rounded flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-semibold transition-all cursor-pointer shadow-sm border ${triggerColor}`}
      >
        <div className="flex items-center gap-0.5">
          <span>{hoursText}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </div>
        <div className="truncate w-full text-center tracking-tight text-[8px] opacity-90">
          {teacherText}
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-80 p-3.5 shadow-xl border border-zinc-200 bg-white text-xs z-50 rounded-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-100">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-zinc-600" />
            <span className="font-bold text-zinc-800 text-sm">
              Ανάθεση: {classNameLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-600 font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Επαναφορά
          </button>
        </div>

        {/* Total hours summary badge */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200 mb-3">
          <span className="text-[11px] font-medium text-zinc-600">
            Σύνολο Ωρών Τμήματος:
          </span>
          <span className="font-mono font-bold text-xs text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-2xs">
            {totalMin === 0 && totalMax === 0
              ? "0ω"
              : `${totalMin}${totalMax !== totalMin ? "-" + totalMax : ""}ω`}
          </span>
        </div>

        {/* Teachers List with ALWAYS VISIBLE Slider */}
        <div className="space-y-2.5 mb-3">
          {effectiveAssignments.map((a, idx) => {
            const isAll = a.teacherId === "all";
            const t = eligibleTeachers.find((t) => t.id === a.teacherId);
            const teacherHours = a.hours || [0, 0];
            const isSmart = isUsingSmartDefault && idx === 0;

            return (
              <div
                key={a.teacherId || idx}
                className={`p-2.5 rounded-lg border transition-all ${
                  isSmart
                    ? "bg-emerald-50/40 border-emerald-200"
                    : "bg-white border-zinc-200 shadow-2xs"
                }`}
              >
                {/* Teacher Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-[11px] text-zinc-800 truncate">
                      {isAll
                        ? "ΟΛΟΙ (Οποιοσδήποτε)"
                        : t
                        ? `${t.lastName} ${t.firstName}`
                        : "Άγνωστος"}
                    </span>
                    {isSmart ? (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-semibold rounded">
                        Προεπιλογή
                      </span>
                    ) : t?.specialty ? (
                      <span className="shrink-0 text-[9px] px-1 py-0.2 bg-zinc-100 text-zinc-600 font-mono rounded">
                        {t.specialty}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Hours badge */}
                    <span className="font-mono font-bold text-[10px] bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200">
                      {teacherHours[0]}
                      {teacherHours[1] !== teacherHours[0]
                        ? "-" + teacherHours[1]
                        : ""}
                      ω
                    </span>

                    {/* Remove button (if more than 1 or not smart default) */}
                    {(!isSmart || effectiveAssignments.length > 1) && (
                      <button
                        type="button"
                        onClick={() => removeTeacher(a.teacherId)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-0.5"
                        title="Αφαίρεση"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Always-visible Dual-thumb Slider */}
                <div className="pt-1">
                  <SliderPrimitive.Root
                    className="relative flex items-center select-none touch-none w-full h-4"
                    value={teacherHours}
                    max={maxAllowedHours}
                    step={1}
                    minStepsBetweenThumbs={0}
                    onValueChange={(val) =>
                      updateTeacherHours(a.teacherId, val as [number, number])
                    }
                  >
                    <SliderPrimitive.Track className="bg-zinc-200 relative grow rounded-full h-1.5">
                      <SliderPrimitive.Range className="absolute bg-indigo-600 rounded-full h-full" />
                    </SliderPrimitive.Track>
                    <SliderPrimitive.Thumb className="block w-3.5 h-3.5 bg-white border-2 border-indigo-600 shadow-sm rounded-full focus:outline-none cursor-grab active:cursor-grabbing" />
                    <SliderPrimitive.Thumb className="block w-3.5 h-3.5 bg-white border-2 border-indigo-600 shadow-sm rounded-full focus:outline-none cursor-grab active:cursor-grabbing" />
                  </SliderPrimitive.Root>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Teacher Dropdown */}
        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-zinc-300 rounded-lg text-zinc-600 text-[10px] font-semibold hover:bg-indigo-50/50 hover:border-indigo-300 hover:text-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Προσθήκη Εκπαιδευτικού
          </button>
        ) : (
          <div className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-lg mt-2">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-zinc-200">
              <span className="text-[10px] font-bold text-zinc-700">
                Επιλογή Εκπαιδευτικού:
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
              <div
                onClick={() => addTeacher("all")}
                className="px-2 py-1.5 bg-white border border-zinc-200 rounded cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-between"
              >
                <span className="text-[11px] font-bold text-zinc-800">
                  ΟΛΟΙ (Οποιοσδήποτε)
                </span>
                <span className="text-[9px] text-zinc-400">Χωρίς περιορισμό</span>
              </div>
              {eligibleTeachers.map((t) => {
                const isAdded = effectiveAssignments.some(
                  (a) => a.teacherId === t.id
                );
                if (isAdded) return null;
                return (
                  <div
                    key={t.id}
                    onClick={() => addTeacher(t.id)}
                    className="px-2 py-1.5 bg-white border border-zinc-200 rounded cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex justify-between items-center"
                  >
                    <span className="text-[11px] text-zinc-700 font-medium">
                      {t.lastName} {t.firstName}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {t.specialty}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
