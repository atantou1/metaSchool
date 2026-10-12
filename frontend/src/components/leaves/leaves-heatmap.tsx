"use client";

import React, { useState, useMemo } from "react";
import { Leave, Teacher, LeaveTypeConfig } from "@/types";
import { formatGreekDate, getLeaveTypeName } from "@/lib/leave-documents";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeavesHeatmapProps {
  leaves: Leave[];
  teachers: Teacher[];
  leaveTypes: LeaveTypeConfig[];
  onSelectDate?: (dateStr: string) => void;
  onOpenDocument?: (leave: Leave) => void;
}

const GREEK_MONTHS = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος",
  "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος",
  "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
];

const WEEKDAY_NAMES = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

export function LeavesHeatmap({
  leaves,
  teachers,
  leaveTypes,
  onSelectDate,
  onOpenDocument,
}: LeavesHeatmapProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDayLeaves, setSelectedDayLeaves] = useState<{ dateStr: string; leaves: Leave[] } | null>(null);

  // Map every date (YYYY-MM-DD) to array of active leaves
  const leavesByDate = useMemo(() => {
    const map = new Map<string, Leave[]>();

    for (const leave of leaves) {
      if (leave.status === "rejected") continue;
      // Parse startDate and endDate
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      // Iterate through each date in the range
      const curr = new Date(start);
      while (curr <= end) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, "0");
        const dd = String(curr.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}-${mm}-${dd}`;

        const existing = map.get(dateKey) || [];
        existing.push(leave);
        map.set(dateKey, existing);

        curr.setDate(curr.getDate() + 1);
      }
    }

    return map;
  }, [leaves]);

  // Calendar grid calculation for currentMonth & currentYear
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    // Monday as 0, Sunday as 6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      leaves: Leave[];
      count: number;
      isWeekend: boolean;
      isToday: boolean;
    }[] = [];

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = currentYear;
      const mm = String(currentMonth + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayDate = new Date(currentYear, currentMonth, day);
      const weekday = (dayDate.getDay() + 6) % 7;
      const dayLeaves = leavesByDate.get(dateStr) || [];

      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        leaves: dayLeaves,
        count: dayLeaves.length,
        isWeekend: weekday >= 5,
        isToday: dateStr === todayStr,
      });
    }

    return { days, startWeekday };
  }, [currentYear, currentMonth, leavesByDate, today]);

  // Heatmap intensity background color
  const getIntensityColor = (count: number, isWeekend: boolean, isToday: boolean) => {
    if (count === 0) {
      if (isWeekend) return "bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600";
      return "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800";
    }
    if (count === 1) {
      return "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold";
    }
    if (count === 2) {
      return "bg-orange-200 dark:bg-orange-950/60 border-orange-400 dark:border-orange-700 text-orange-950 dark:text-orange-100 font-bold";
    }
    return "bg-red-300 dark:bg-red-950/80 border-red-500 dark:border-red-600 text-red-950 dark:text-red-100 font-bold shadow-xs";
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const teacherMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    for (const t of teachers) map.set(t.id, t);
    return map;
  }, [teachers]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col gap-4">
      {/* Top Header & Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Ημερολόγιο Αδειών & Heatmap
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
            (Συγκέντρωση απουσιών ανά ημέρα)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold min-w-[130px] text-center text-zinc-800 dark:text-zinc-200">
            {GREEK_MONTHS[currentMonth]} {currentYear}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Ένταση:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 inline-block" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 inline-block" />
            <span>1 άδεια</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="w-3.5 h-3.5 rounded bg-orange-200 dark:bg-orange-950/70 border border-orange-400 dark:border-orange-600 inline-block" />
            <span>2 άδειες</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="w-3.5 h-3.5 rounded bg-red-300 dark:bg-red-950/90 border border-red-500 dark:border-red-600 inline-block" />
            <span>3+ άδειες</span>
          </div>
        </div>

        <span className="text-[11px] italic">
          Κάντε κλικ σε οποιαδήποτε μέρα για λεπτομέρειες
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Weekday headers */}
        {WEEKDAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-semibold py-1.5 ${
              i >= 5 ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            {name}
          </div>
        ))}

        {/* Empty slots before month start */}
        {Array.from({ length: calendarDays.startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[64px] rounded-lg border border-transparent opacity-0" />
        ))}

        {/* Days of current month */}
        {calendarDays.days.map((item) => {
          const intensityClass = getIntensityColor(item.count, item.isWeekend, item.isToday);

          return (
            <Tooltip key={item.dateStr}>
              <TooltipTrigger
                onClick={() => {
                  if (item.count > 0) {
                    setSelectedDayLeaves({ dateStr: item.dateStr, leaves: item.leaves });
                  } else {
                    setSelectedDayLeaves(null);
                  }
                  if (onSelectDate) onSelectDate(item.dateStr);
                }}
                className={`min-h-[70px] p-2 rounded-lg border transition-all text-left flex flex-col justify-between relative cursor-pointer ${intensityClass} ${
                  item.isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-950" : ""
                } ${
                  selectedDayLeaves?.dateStr === item.dateStr ? "outline-2 outline-zinc-900 dark:outline-zinc-100 shadow-md scale-[1.02]" : ""
                }`}
              >
                {/* Day number & today marker */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-medium ${item.isToday ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}>
                    {item.dayNumber}
                  </span>
                  {item.isToday && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-blue-500 text-white">
                      Σήμερα
                    </span>
                  )}
                </div>

                {/* Leaves badges inside day slot */}
                {item.count > 0 ? (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {item.count} {item.count === 1 ? "άδεια" : "άδειες"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.leaves.slice(0, 2).map((l) => {
                        const tch = teacherMap.get(l.teacherId);
                        const tName = tch ? tch.lastName : "Εκπ/κός";
                        return (
                          <span
                            key={l.id}
                            className="text-[9px] px-1 py-0.2 rounded bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700 truncate max-w-full"
                          >
                            {tName}
                          </span>
                        );
                      })}
                      {item.count > 2 && (
                        <span className="text-[8px] font-bold text-zinc-500">+{item.count - 2}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">-</span>
                )}
              </TooltipTrigger>

              <TooltipContent className="p-2.5 max-w-xs space-y-1.5 text-xs">
                <p className="font-bold border-b border-zinc-200 dark:border-zinc-700 pb-1">
                  {formatGreekDate(item.dateStr)}
                </p>
                {item.count === 0 ? (
                  <p className="text-zinc-400 italic">Καμία άδεια καταχωρημένη</p>
                ) : (
                  <div className="space-y-1">
                    {item.leaves.map((l) => {
                      const tch = teacherMap.get(l.teacherId);
                      const lName = getLeaveTypeName(l.type, leaveTypes);
                      return (
                        <div key={l.id} className="flex justify-between items-center gap-2">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {tch ? `${tch.lastName} ${tch.firstName}` : "Εκπαιδευτικός"}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 py-0">
                            {lName}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Selected Day Inspector Panel */}
      {selectedDayLeaves && (
        <div className="mt-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Άδειες την ημέρα {formatGreekDate(selectedDayLeaves.dateStr)}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {selectedDayLeaves.leaves.length} εκπαιδευτικοί
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDayLeaves(null)}
              className="h-7 text-xs text-zinc-500 hover:text-zinc-800"
            >
              Κλείσιμο
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedDayLeaves.leaves.map((l) => {
              const tch = teacherMap.get(l.teacherId);
              const lName = getLeaveTypeName(l.type, leaveTypes);

              return (
                <div
                  key={l.id}
                  className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {tch ? `${tch.lastName} ${tch.firstName}` : "Εκπαιδευτικός"}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {lName} • {formatGreekDate(l.startDate)} έως {formatGreekDate(l.endDate)} ({l.daysCount} ημ.)
                    </p>
                    {l.reason && (
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 italic">
                        «{l.reason}»
                      </p>
                    )}
                  </div>

                  {onOpenDocument && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDocument(l)}
                      className="text-xs h-7 gap-1"
                    >
                      Έγγραφα
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
