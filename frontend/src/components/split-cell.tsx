"use client";

import React from "react";
import { TimetableSlot, Teacher, Subject, SubGroup, ClassEntity } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, User, ArrowRightLeft } from "lucide-react";

interface SplitCellProps {
  day: number;
  period: number;
  slots: TimetableSlot[];
  teachers: Teacher[];
  subjects: Subject[];
  subGroups: SubGroup[];
  classes: ClassEntity[];
  viewMode: "class" | "teacher";
  onMoveSlot?: (slot: TimetableSlot) => void;
}

export const SplitCell: React.FC<SplitCellProps> = ({
  day,
  period,
  slots,
  teachers,
  subjects,
  subGroups,
  classes,
  viewMode,
  onMoveSlot,
}) => {
  const teacherMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const subjectMap = React.useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const subGroupMap = React.useMemo(() => new Map(subGroups.map((sg) => [sg.id, sg])), [subGroups]);
  const classMap = React.useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  // Separate Core slots vs Support overlay slots
  const coreSlots = slots.filter((s) => !s.isSupport);
  const supportSlots = slots.filter((s) => s.isSupport);

  if (coreSlots.length === 0 && supportSlots.length === 0) {
    return (
      <div className="h-28 w-full border border-dashed border-zinc-200/90 rounded-lg flex items-center justify-center p-2 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50/60 transition-all duration-150">
        <span className="text-xs font-mono text-zinc-400 select-none">Κενό</span>
      </div>
    );
  }

  const renderSlotCard = (slot: TimetableSlot, isSplit = false) => {
    const teacher = teacherMap.get(slot.teacherId);
    const subject = subjectMap.get(slot.subjectId);
    const subGroup = subGroupMap.get(slot.subGroupId);
    const cls = classMap.get(slot.classId);

    const accentColor = teacher?.color || subject?.color || "#71717a";

    return (
      <div
        key={slot.id}
        onClick={() => onMoveSlot && onMoveSlot(slot)}
        style={{
          borderLeftColor: accentColor,
        }}
        className={`group relative flex-1 flex flex-col justify-between p-2 rounded-lg bg-white hover:bg-zinc-50/90 border border-zinc-200 border-l-[3.5px] cursor-pointer transition-all duration-150 shadow-xs hover:shadow-sm ${
          isSplit ? "text-[11px]" : "text-xs"
        }`}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold text-zinc-900 flex items-center gap-1.5 truncate">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className="truncate">{subject?.title || "Μάθημα"}</span>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 border-zinc-200 bg-zinc-50 text-zinc-600 font-mono"
          >
            {subject?.code || "—"}
          </Badge>
        </div>

        <div className="mt-1 flex flex-col gap-0.5">
          {viewMode === "class" ? (
            <div className="text-zinc-600 truncate flex items-center gap-1">
              <User className="w-3 h-3 text-zinc-400" />
              <span className="truncate font-medium">
                {teacher ? `${teacher.firstName[0]}. ${teacher.lastName}` : "Εκπαιδευτικός"}
              </span>
            </div>
          ) : (
            <div className="text-zinc-600 truncate flex items-center gap-1">
              <Users className="w-3 h-3 text-zinc-400" />
              <span className="truncate font-medium">
                Τμήμα {cls?.name || slot.classId}
              </span>
            </div>
          )}

          {/* Subgroup indicator */}
          {subGroup && !subGroup.isDefault && (
            <div className="flex items-center gap-1 mt-0.5">
              <Badge className="text-[9px] px-1.5 py-0 h-3.5 bg-amber-50 text-amber-800 border-amber-200 font-medium">
                {subGroup.name}
              </Badge>
            </div>
          )}
        </div>

        <button
          title="Μετακίνηση μαθήματος"
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200"
        >
          <ArrowRightLeft className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative h-28 w-full flex flex-col gap-1.5">
      {/* If split subgroups exist */}
      {coreSlots.length > 1 ? (
        <div className="flex-1 flex gap-1.5 overflow-hidden">
          {coreSlots.map((slot) => renderSlotCard(slot, true))}
        </div>
      ) : coreSlots.length === 1 ? (
        <div className="flex-1 flex overflow-hidden">
          {renderSlotCard(coreSlots[0], false)}
        </div>
      ) : null}

      {/* Support Overlay (Layer 2 - Pull-out Therapists) */}
      {supportSlots.map((supSlot) => {
        const supTeacher = teacherMap.get(supSlot.teacherId);
        const supSubject = subjectMap.get(supSlot.subjectId);
        return (
          <div
            key={supSlot.id}
            onClick={() => onMoveSlot && onMoveSlot(supSlot)}
            className="flex items-center justify-between px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-[10px] text-sky-900 cursor-pointer hover:bg-sky-100/90 transition-colors shadow-xs"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3 h-3 text-sky-600 flex-shrink-0" />
              <span className="font-semibold truncate">
                {supSubject?.title || "Υποστήριξη"}:
              </span>
              <span className="truncate text-sky-800">
                {supTeacher ? `${supTeacher.firstName[0]}. ${supTeacher.lastName}` : ""}
              </span>
            </div>
            <Badge className="text-[8px] px-1 py-0 h-3.5 bg-sky-200/60 text-sky-900 border-none font-mono">
              Pull-out
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
