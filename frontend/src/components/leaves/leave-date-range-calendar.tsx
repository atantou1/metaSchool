"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatGreekDate } from "@/lib/leave-documents";

const GREEK_MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const GREEK_WEEKDAYS = [
  { short: "Δευ", full: "Δευτέρα", isWeekend: false },
  { short: "Τρί", full: "Τρίτη", isWeekend: false },
  { short: "Τετ", full: "Τετάρτη", isWeekend: false },
  { short: "Πέμ", full: "Πέμπτη", isWeekend: false },
  { short: "Παρ", full: "Παρασκευή", isWeekend: false },
  { short: "Σάβ", full: "Σάββατο", isWeekend: true },
  { short: "Κυρ", full: "Κυριακή", isWeekend: true },
];

export interface LeaveDateRangeCalendarProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  isMedicalLeave: boolean;
  daysCount: number;
  onDaysCountChange: (count: number) => void;
}

// Convert YYYY-MM-DD to Date object in local time
function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Format Date object to YYYY-MM-DD
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format Greek day with weekday name (π.χ. "Παρασκευή, 16/10/2026")
function formatGreekDateWithWeekday(str: string): string {
  const d = parseLocalDate(str);
  if (!d) return str || "-";
  const dayIdx = (d.getDay() + 6) % 7;
  const weekdayName = GREEK_WEEKDAYS[dayIdx]?.full || "";
  return `${weekdayName}, ${formatGreekDate(str)}`;
}

export function LeaveDateRangeCalendar({
  startDate,
  endDate,
  onChange,
  isMedicalLeave,
  daysCount,
  onDaysCountChange,
}: LeaveDateRangeCalendarProps) {
  // Currently displayed month & year in the calendar
  const initialDate = parseLocalDate(startDate) || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  // Hover state when user has picked a start date and is moving cursor to choose end date
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState<boolean>(false);

  // Synchronize view month with startDate when it changes externally
  useEffect(() => {
    const s = parseLocalDate(startDate);
    if (s && (s.getFullYear() !== viewYear || s.getMonth() !== viewMonth)) {
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth());
    }
  }, [startDate]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleJumpToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Build calendar matrix (6 rows x 7 cols = 42 cells)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // In Greek calendar, Monday is first day (offset: 0 = Mon, ..., 6 = Sun)
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = formatLocalDate(new Date());

    // 1. Filler days from previous month
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const dateStr = formatLocalDate(prevDate);
      const isWeekend = prevDate.getDay() === 0 || prevDate.getDay() === 6;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend,
        isToday: dateStr === todayStr,
      });
    }

    // 2. Days of current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      const dateStr = formatLocalDate(curDate);
      const isWeekend = curDate.getDay() === 0 || curDate.getDay() === 6;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend,
        isToday: dateStr === todayStr,
      });
    }

    // 3. Filler days for next month to complete 42 cells (or 35 if 5 rows fit)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - cells.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const dateStr = formatLocalDate(nextDate);
      const isWeekend = nextDate.getDay() === 0 || nextDate.getDay() === 6;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Determine active selection or hover range
  const activeRange = useMemo(() => {
    if (!startDate) return { start: null, end: null };
    if (isSelectingRange && hoverDate) {
      if (hoverDate >= startDate) {
        return { start: startDate, end: hoverDate };
      } else {
        return { start: hoverDate, end: startDate };
      }
    }
    return { start: startDate, end: endDate || startDate };
  }, [startDate, endDate, hoverDate, isSelectingRange]);

  // Calculate detailed days breakdown
  const stats = useMemo(() => {
    if (!startDate || !endDate) {
      return { totalDays: 1, calendarDays: 1, workingDays: 1, weekendDays: 0 };
    }
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (!s || !e || e < s) {
      return { totalDays: 1, calendarDays: 1, workingDays: 1, weekendDays: 0 };
    }

    let calendarDays = 0;
    let workingDays = 0;
    let weekendDays = 0;

    const cur = new Date(s);
    while (cur <= e) {
      calendarDays++;
      const dow = cur.getDay(); // 0 = Sun, 6 = Sat
      if (dow === 0 || dow === 6) {
        weekendDays++;
      } else {
        workingDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const calculatedDays = isMedicalLeave ? calendarDays : Math.max(1, workingDays);
    return {
      totalDays: calculatedDays,
      calendarDays,
      workingDays,
      weekendDays,
    };
  }, [startDate, endDate, isMedicalLeave]);

  // Click on a calendar day
  const handleCellClick = (cellDateStr: string) => {
    if (!isSelectingRange) {
      // First click: select start date (sets both start and end to this date)
      onChange(cellDateStr, cellDateStr);
      setIsSelectingRange(true);
      setHoverDate(null);
    } else {
      // Second click:
      if (cellDateStr === startDate) {
        // Clicked same day: confirm single day leave
        onChange(cellDateStr, cellDateStr);
        setIsSelectingRange(false);
        setHoverDate(null);
      } else if (cellDateStr > startDate) {
        // Clicked forward day: finalize range
        onChange(startDate, cellDateStr);
        setIsSelectingRange(false);
        setHoverDate(null);
      } else {
        // Clicked a prior day: set new start date
        onChange(cellDateStr, cellDateStr);
        setIsSelectingRange(true);
        setHoverDate(null);
      }
    }
  };

  // Quick Preset actions
  const setSingleDayToday = () => {
    const todayStr = formatLocalDate(new Date());
    onChange(todayStr, todayStr);
    setIsSelectingRange(false);
    setHoverDate(null);
  };

  const setSingleDayTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);
    onChange(tomorrowStr, tomorrowStr);
    setIsSelectingRange(false);
    setHoverDate(null);
  };

  const setMakeSingleDay = () => {
    if (startDate) {
      onChange(startDate, startDate);
      setIsSelectingRange(false);
      setHoverDate(null);
    }
  };

  const isSingleDay = startDate && endDate && startDate === endDate;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-xs overflow-hidden">
      {/* 1. Header Bar: Month Navigation & Quick Presets */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {GREEK_MONTHS[viewMonth]} {viewYear}
          </span>
          <div className="flex items-center gap-0.5 ml-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="h-7 w-7 p-0 rounded-md"
              title="Προηγούμενος μήνας"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-7 w-7 p-0 rounded-md"
              title="Επόμενος μήνας"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 text-[11px]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleJumpToday}
            className="h-6 px-2 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
          >
            Τρέχων μήνας
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setSingleDayToday}
            className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
          >
            Σήμερα
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setSingleDayTomorrow}
            className="h-6 px-2 text-[11px]"
          >
            Αύριο
          </Button>
          {!isSingleDay && startDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={setMakeSingleDay}
              className="h-6 px-2 text-[11px] text-zinc-600 dark:text-zinc-400"
              title="Ορισμός έναρξης και λήξης στην ίδια ημέρα"
            >
              Μονοήμερη
            </Button>
          )}
        </div>
      </div>

      {/* 2. Interactive Calendar Matrix */}
      <div className="p-3">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
          {GREEK_WEEKDAYS.map((wd) => (
            <div
              key={wd.short}
              className={`text-xs font-semibold py-1.5 rounded ${
                wd.isWeekend
                  ? "text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
              title={wd.isWeekend ? `${wd.full} (Σαββατοκύριακο)` : wd.full}
            >
              {wd.short}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const isStart = activeRange.start === cell.dateStr;
            const isEnd = activeRange.end === cell.dateStr;
            const inRange =
              activeRange.start &&
              activeRange.end &&
              cell.dateStr >= activeRange.start &&
              cell.dateStr <= activeRange.end;

            // Highlight styling
            let cellStyle = "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800";
            if (!cell.isCurrentMonth) {
              cellStyle = "text-zinc-300 dark:text-zinc-600 opacity-40 hover:opacity-80";
            } else if (cell.isWeekend) {
              cellStyle = "text-amber-700 dark:text-amber-300/80 bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-100/50";
            }

            if (isStart && isEnd) {
              // Single day selected
              cellStyle = "bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700 rounded-md";
            } else if (isStart) {
              cellStyle = "bg-blue-600 text-white font-bold rounded-l-md rounded-r-none hover:bg-blue-700";
            } else if (isEnd) {
              cellStyle = "bg-blue-600 text-white font-bold rounded-r-md rounded-l-none hover:bg-blue-700";
            } else if (inRange) {
              cellStyle = "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100 rounded-none hover:bg-blue-200/80";
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleCellClick(cell.dateStr)}
                onMouseEnter={() => isSelectingRange && setHoverDate(cell.dateStr)}
                className={`h-10 sm:h-11 text-xs sm:text-sm font-medium transition-all relative flex flex-col items-center justify-center select-none ${cellStyle}`}
              >
                <span>{cell.dayNumber}</span>

                {/* Today indicator dot */}
                {cell.isToday && !inRange && (
                  <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 absolute bottom-1" />
                )}

                {/* Weekend in-range indicator tag */}
                {inRange && cell.isWeekend && !isStart && !isEnd && (
                  <span
                    className={`text-[8px] leading-none px-0.5 rounded font-mono scale-90 ${
                      isMedicalLeave
                        ? "text-blue-700 dark:text-blue-300 font-bold"
                        : "text-zinc-400 line-through opacity-80"
                    }`}
                    title={
                      isMedicalLeave
                        ? "Προσμετράται στην αναρρωτική άδεια"
                        : "Σ/Κ: Δεν προσμετράται στην κανονική άδεια"
                    }
                  >
                    {isMedicalLeave ? "+1" : "Σ/Κ"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive Selection Guide Hint */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-500 shrink-0" />
            {isSelectingRange
              ? "Κάντε κλικ στην ημερομηνία λήξης (ή στην ίδια μέρα για μονοήμερη άδεια)."
              : "Κάντε κλικ σε μια ημερομηνία για να ορίσετε έναρξη/λήξη."}
          </span>
          {isSelectingRange && (
            <button
              type="button"
              onClick={() => {
                setIsSelectingRange(false);
                setHoverDate(null);
              }}
              className="text-blue-600 hover:underline text-[11px]"
            >
              Ακύρωση επιλογής
            </button>
          )}
        </div>
      </div>

      {/* 3. Date Summary & Business Rule Explanation Banner */}
      <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selected Range Details */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Διάστημα:
            </span>
            {isSingleDay ? (
              <Badge variant="outline" className="text-xs font-semibold bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                {formatGreekDateWithWeekday(startDate)} (1 ημέρα)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-semibold bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                {formatGreekDateWithWeekday(startDate)} ➔ {formatGreekDateWithWeekday(endDate)}
              </Badge>
            )}
          </div>

          {/* Business rule explanation tag */}
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            {isMedicalLeave ? (
              <span className="text-purple-700 dark:text-purple-300 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                Αναρρωτική άδεια: Προσμετρώνται όλα τα Σαββατοκύριακα ({stats.calendarDays} ημερολογιακές ημ.)
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Κανονική / ειδική άδεια: Εξαιρούνται τα Σαββατοκύριακα ({stats.workingDays} εργάσιμες ημ.
                {stats.weekendDays > 0 ? ` • ${stats.weekendDays} ημ. Σ/Κ δεν υπολογίστηκαν` : ""})
              </span>
            )}
          </div>
        </div>

        {/* Days Count Input */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="space-y-0.5">
            <Label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Αριθμός Ημερών
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                value={daysCount}
                onChange={(e) => onDaysCountChange(Number(e.target.value))}
                className="w-18 h-7 text-xs font-bold text-center bg-white dark:bg-zinc-800"
              />
              <span className="text-xs text-zinc-500 font-medium">ημ.</span>
            </div>
          </div>

          {daysCount !== stats.totalDays && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDaysCountChange(stats.totalDays)}
              className="h-7 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              title={`Επαναφορά υπολογισμένων ημερών (${stats.totalDays} ημ.)`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{stats.totalDays} ημ.</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
