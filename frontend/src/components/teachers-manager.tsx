"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { TimetableData, Teacher, TeacherConstraints, DayAvailabilityConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Lock,
  ChevronDown,
  Clock,
  Sun,
  Moon,
  CopyCheck,
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  activeTab?: "teachers" | "classes" | "subjects" | "rules";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "rules") => void;
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
  dayHours: Record<string, DayAvailabilityConfig>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS FOR DAY AVAILABILITY & HOURS
// ─────────────────────────────────────────────────────────────────────────────

export function extractDayHours(
  c?: TeacherConstraints | null,
  isAllDayTeacher = false,
  numMorning = 6,
  numAllDay = 4,
  isMorningTeacher = true
): Record<string, DayAvailabilityConfig> {
  const res: Record<string, DayAvailabilityConfig> = {};

  ALL_DAYS_INDICES.forEach((d) => {
    const key = String(d);
    if (c?.dayHours && c.dayHours[key]) {
      res[key] = {
        morningActive: c.dayHours[key].morningActive !== undefined ? Boolean(c.dayHours[key].morningActive) : true,
        start: c.dayHours[key].start ?? 1,
        end: c.dayHours[key].end ?? numMorning,
        allDayActive: c.dayHours[key].allDayActive ?? false,
        allDayStart: c.dayHours[key].allDayStart ?? 1,
        allDayEnd: c.dayHours[key].allDayEnd ?? numAllDay,
      };
    } else if (c?.availability && c.availability[key]) {
      const arr = c.availability[key];
      const morningArr = arr.slice(0, numMorning);
      const allDayArr = arr.slice(numMorning, numMorning + numAllDay);

      const firstTrueM = morningArr.indexOf(true);
      const lastTrueM = morningArr.lastIndexOf(true);

      const firstTrueA = allDayArr.indexOf(true);
      const lastTrueA = allDayArr.lastIndexOf(true);

      res[key] = {
        morningActive: firstTrueM !== -1,
        start: firstTrueM !== -1 ? firstTrueM + 1 : 1,
        end: lastTrueM !== -1 ? lastTrueM + 1 : numMorning,
        allDayActive: firstTrueA !== -1,
        allDayStart: firstTrueA !== -1 ? firstTrueA + 1 : 1,
        allDayEnd: lastTrueA !== -1 ? lastTrueA + 1 : numAllDay,
      };
    } else {
      res[key] = {
        morningActive: isMorningTeacher,
        start: 1,
        end: numMorning,
        allDayActive: isAllDayTeacher,
        allDayStart: 1,
        allDayEnd: numAllDay,
      };
    }
  });

  return res;
}

export function computeAvailabilityGrid(
  availableDays: number[],
  dayHours: Record<string, DayAvailabilityConfig> | undefined,
  isTeacherAllDay = false,
  numMorning = 6,
  numAllDay = 4
): Record<string, boolean[]> {
  const availabilityGrid: Record<string, boolean[]> = {};

  ALL_DAYS_INDICES.forEach((d) => {
    const dayKey = String(d);
    const isDayEnabled = (availableDays || []).includes(d);
    const cfg = dayHours?.[dayKey] || {
      morningActive: true,
      start: 1,
      end: numMorning,
      allDayActive: isTeacherAllDay,
      allDayStart: 1,
      allDayEnd: numAllDay,
    };

    const isMorningActive = cfg.morningActive !== undefined ? Boolean(cfg.morningActive) : true;
    const isAllDayActive = Boolean(cfg.allDayActive);

    const slots: boolean[] = [];
    // Morning periods (1 .. numMorning)
    for (let m = 1; m <= numMorning; m++) {
      slots.push(isDayEnabled && isMorningActive && m >= (cfg.start ?? 1) && m <= (cfg.end ?? numMorning));
    }
    // All-day periods (1 .. numAllDay)
    for (let a = 1; a <= numAllDay; a++) {
      slots.push(
        isDayEnabled &&
          isAllDayActive &&
          a >= (cfg.allDayStart ?? 1) &&
          a <= (cfg.allDayEnd ?? numAllDay)
      );
    }
    availabilityGrid[dayKey] = slots;
  });

  return availabilityGrid;
}

export function isDayCustom(
  cfg: DayAvailabilityConfig | undefined,
  numMorning = 6
): boolean {
  if (!cfg) return false;
  if (cfg.morningActive === false) return true;
  if (cfg.start > 1 || cfg.end < numMorning) return true;
  if (cfg.allDayActive) return true;
  return false;
}

export function getDaySummaryText(
  dayIndex: number,
  isAvailable: boolean,
  cfg: DayAvailabilityConfig | undefined,
  numMorning = 6,
  numAllDay = 4
): string {
  const dayName = DAY_LABELS[dayIndex]?.name || `Ημέρα ${dayIndex + 1}`;
  if (!isAvailable) return `${dayName}: Μη διαθέσιμος`;
  if (!cfg) return `${dayName}: Πλήρες ωράριο (1η–${numMorning}η)`;

  const isMorningActive = cfg.morningActive !== undefined ? Boolean(cfg.morningActive) : true;
  const isAllDayActive = Boolean(cfg.allDayActive);

  if (!isMorningActive && !isAllDayActive) {
    return `${dayName}: 0 ώρες (Ανενεργό ωράριο)`;
  }

  if (!isMorningActive && isAllDayActive) {
    return `${dayName}: Μόνο Ολοήμερο (${cfg.allDayStart ?? 1}η–${cfg.allDayEnd ?? numAllDay}η)`;
  }

  const hasCustomMorning = cfg.start > 1 || cfg.end < numMorning;
  const morningText = hasCustomMorning
    ? `${cfg.start}η–${cfg.end}η ώρα`
    : `1η–${numMorning}η (Πλήρες)`;

  if (isAllDayActive) {
    const allDayText = `Ολοήμερο: ${cfg.allDayStart ?? 1}η–${cfg.allDayEnd ?? numAllDay}η`;
    return `${dayName}: ${morningText} + ${allDayText}`;
  }

  return `${dayName}: ${morningText}`;
}

export function getDayBackgroundStyle(
  isAvailable: boolean,
  dayCfg: DayAvailabilityConfig | undefined,
  numMorning = 6,
  numAllDay = 4
): React.CSSProperties {
  if (!isAvailable) {
    return {};
  }

  const isMorningActive = dayCfg?.morningActive !== undefined ? Boolean(dayCfg?.morningActive) : true;
  const start = dayCfg?.start ?? 1;
  const end = dayCfg?.end ?? numMorning;
  const allDayActive = Boolean(dayCfg?.allDayActive);
  const allDayStart = dayCfg?.allDayStart ?? 1;
  const allDayEnd = dayCfg?.allDayEnd ?? numAllDay;

  const hourActive: boolean[] = [];

  for (let h = 1; h <= numMorning; h++) {
    hourActive.push(isMorningActive && h >= start && h <= end);
  }

  if (allDayActive) {
    for (let h = 1; h <= numAllDay; h++) {
      hourActive.push(h >= allDayStart && h <= allDayEnd);
    }
  }

  const allActive = hourActive.every(Boolean);
  if (allActive) {
    return {
      backgroundColor: "#0284c7", // solid sky blue
    };
  }

  const noneActive = hourActive.every((a) => !a);
  if (noneActive) {
    return {
      backgroundColor: "#bae6fd", // light sky blue
    };
  }

  const activeColor = "#0284c7"; // solid blue
  const inactiveColor = "#bae6fd"; // light blue

  const stops: string[] = [];
  const N = hourActive.length;

  for (let i = 0; i < N; i++) {
    const p1 = ((i / N) * 100).toFixed(2);
    const p2 = (((i + 1) / N) * 100).toFixed(2);
    const color = hourActive[i] ? activeColor : inactiveColor;
    stops.push(`${color} ${p1}%`, `${color} ${p2}%`);
  }

  return {
    background: `linear-gradient(to right, ${stops.join(", ")})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DUAL RANGE SLIDER (Smooth pointer-drag & track clicks for hour intervals)
// ─────────────────────────────────────────────────────────────────────────────

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  colorScheme?: "sky" | "violet" | "amber";
  unit?: string;
  labels?: string[];
  disabled?: boolean;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  colorScheme = "sky",
  unit = "η",
  labels,
  disabled = false,
}) => {
  const low = Math.max(min, Math.min(value[0], max));
  const high = Math.max(min, Math.min(value[1], max));
  const [localLow, setLocalLow] = useState(low);
  const [localHigh, setLocalHigh] = useState(high);
  const [activeDrag, setActiveDrag] = useState<"low" | "high" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalLow(Math.max(min, Math.min(value[0], max)));
    setLocalHigh(Math.max(min, Math.min(value[1], max)));
  }, [value, min, max]);

  const commitRange = (newLow: number, newHigh: number) => {
    const clLow = Math.max(min, Math.min(newLow, max));
    const clHigh = Math.max(min, Math.min(newHigh, max));
    const finalLow = Math.min(clLow, clHigh);
    const finalHigh = Math.max(clLow, clHigh);
    setLocalLow(finalLow);
    setLocalHigh(finalHigh);
    onChange([finalLow, finalHigh]);
  };

  const span = Math.max(1, max - min);
  const leftPercent = ((localLow - min) / span) * 100;
  const rightPercent = ((localHigh - min) / span) * 100;

  const getValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return min;
    const pos = (clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    const rawVal = min + clampedPos * span;
    const steppedVal = Math.round(rawVal);
    return Math.max(min, Math.min(max, steppedVal));
  };

  const startDrag = (type: "low" | "high", e: React.PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag(type);

    let curLow = localLow;
    let curHigh = localHigh;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const val = getValueFromPointer(moveEvent.clientX);
      if (type === "low") {
        const nextLow = Math.min(val, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(val, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    const val = getValueFromPointer(e.clientX);
    const distLow = Math.abs(val - localLow);
    const distHigh = Math.abs(val - localHigh);
    const chosenType: "low" | "high" = distLow <= distHigh ? "low" : "high";

    setActiveDrag(chosenType);

    if (chosenType === "low") {
      commitRange(Math.min(val, localHigh), localHigh);
    } else {
      commitRange(localLow, Math.max(val, localLow));
    }

    let curLow = chosenType === "low" ? Math.min(val, localHigh) : localLow;
    let curHigh = chosenType === "high" ? Math.max(val, localLow) : localHigh;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveVal = getValueFromPointer(moveEvent.clientX);
      if (chosenType === "low") {
        const nextLow = Math.min(moveVal, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(moveVal, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const totalSteps = max - min + 1;
  const barColors = {
    sky: "from-sky-500 to-indigo-600",
    violet: "from-violet-500 to-purple-600",
    amber: "from-amber-500 to-orange-600",
  };
  const thumbBorderColors = {
    sky: "border-sky-600 ring-sky-300",
    violet: "border-violet-600 ring-violet-300",
    amber: "border-amber-600 ring-amber-300",
  };

  return (
    <div className="space-y-1.5 select-none py-1">
      {/* Track & Thumbs Container */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className={`relative h-6 flex items-center cursor-pointer touch-none ${disabled ? "opacity-40 pointer-events-none" : ""}`}
      >
        {/* Background Track */}
        <div className="absolute left-0 right-0 h-2 bg-zinc-200 rounded-full" />

        {/* Selected Range Fill */}
        <div
          className={`absolute h-2 bg-linear-to-r ${barColors[colorScheme]} rounded-full transition-all duration-75`}
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(0, rightPercent - leftPercent)}%`,
          }}
        />

        {/* Left Thumb */}
        <div
          onPointerDown={(e) => startDrag("low", e)}
          style={{ left: `${leftPercent}%` }}
          className={`absolute -translate-x-1/2 w-4.5 h-4.5 bg-white border-2 rounded-full shadow-md cursor-grab active:cursor-grabbing z-10 transition-transform hover:scale-115 active:scale-125 flex items-center justify-center ${thumbBorderColors[colorScheme]} ${activeDrag === "low" ? "scale-125 ring-2" : ""}`}
          title={`Από: ${localLow}${unit}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        </div>

        {/* Right Thumb */}
        <div
          onPointerDown={(e) => startDrag("high", e)}
          style={{ left: `${rightPercent}%` }}
          className={`absolute -translate-x-1/2 w-4.5 h-4.5 bg-white border-2 rounded-full shadow-md cursor-grab active:cursor-grabbing z-10 transition-transform hover:scale-115 active:scale-125 flex items-center justify-center ${thumbBorderColors[colorScheme]} ${activeDrag === "high" ? "scale-125 ring-2" : ""}`}
          title={`Έως: ${localHigh}${unit}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        </div>
      </div>

      {/* Step Numbers / Clickable ticks */}
      <div className="flex justify-between items-center text-[10px] font-medium text-zinc-500 px-0.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepVal = min + i;
          const isSelected = stepVal >= localLow && stepVal <= localHigh;
          const label = labels && labels[i] ? labels[i] : `${stepVal}${unit}`;
          return (
            <button
              key={stepVal}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                if (stepVal < localLow) commitRange(stepVal, localHigh);
                else if (stepVal > localHigh) commitRange(localLow, stepVal);
                else {
                  const dL = Math.abs(stepVal - localLow);
                  const dH = Math.abs(stepVal - localHigh);
                  if (dL <= dH) commitRange(stepVal, localHigh);
                  else commitRange(localLow, stepVal);
                }
              }}
              className={`px-1 py-0.5 rounded text-[9.5px] transition-colors ${
                isSelected
                  ? "font-bold text-zinc-900 bg-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DAY AVAILABILITY POPOVER (Interactive Popover with Sliders & Presets)
// ─────────────────────────────────────────────────────────────────────────────

interface DayAvailabilityPopoverProps {
  dayIndex: number;
  dayLabel: { index: number; short: string; name: string };
  isDayActive: boolean;
  dayConfig: DayAvailabilityConfig;
  numMorningPeriods: number;
  numAllDayPeriods: number;
  onToggleDay: (active: boolean) => void;
  onChangeConfig: (newConfig: DayAvailabilityConfig) => void;
  onApplyToAllDays?: (currentConfig: DayAvailabilityConfig) => void;
  triggerTitle?: string;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  triggerContent?: React.ReactNode;
}

const DayAvailabilityPopover: React.FC<DayAvailabilityPopoverProps> = ({
  dayIndex,
  dayLabel,
  isDayActive,
  dayConfig,
  numMorningPeriods,
  numAllDayPeriods,
  onToggleDay,
  onChangeConfig,
  onApplyToAllDays,
  triggerTitle,
  triggerClassName,
  triggerStyle,
  triggerContent,
}) => {
  const [open, setOpen] = useState(false);

  const morningStart = dayConfig.start || 1;
  const morningEnd = Math.min(numMorningPeriods, dayConfig.end || numMorningPeriods);
  const allDayStart = dayConfig.allDayStart || 1;
  const allDayEnd = Math.min(numAllDayPeriods, dayConfig.allDayEnd || numAllDayPeriods);
  const isMorningActive = dayConfig.morningActive !== undefined ? Boolean(dayConfig.morningActive) : true;
  const isAllDayActive = Boolean(dayConfig.allDayActive);

  const morningSpan = isMorningActive ? morningEnd - morningStart + 1 : 0;
  const allDaySpan = isAllDayActive ? allDayEnd - allDayStart + 1 : 0;

  // Morning Presets
  const morningPresets = [
    { label: `Όλες (1-${numMorningPeriods})`, range: [1, numMorningPeriods] as [number, number] },
    { label: "1η-4η", range: [1, Math.min(4, numMorningPeriods)] as [number, number] },
    { label: `3η-${numMorningPeriods}η`, range: [3, numMorningPeriods] as [number, number] },
    { label: `4η-${numMorningPeriods}η`, range: [4, numMorningPeriods] as [number, number] },
  ];

  // All-Day Presets
  const allDayPresets = [
    { label: `Όλες (1-${numAllDayPeriods})`, range: [1, numAllDayPeriods] as [number, number] },
    { label: "1η-2η", range: [1, Math.min(2, numAllDayPeriods)] as [number, number] },
    { label: `2η-${numAllDayPeriods}η`, range: [2, numAllDayPeriods] as [number, number] },
    { label: `3η-${numAllDayPeriods}η`, range: [3, numAllDayPeriods] as [number, number] },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        title={triggerTitle}
        className={triggerClassName}
        style={triggerStyle}
      >
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-80 p-3.5 shadow-2xl border border-zinc-200 bg-white text-xs z-50 rounded-xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Day Title & Active Toggle Switch */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[11px]">
              {dayLabel.short}
            </span>
            <div>
              <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                {dayLabel.name}
                {isDayActive ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 font-medium">
                    Ενεργή
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-500 border-zinc-200 text-[9px] px-1 py-0 font-medium">
                    Ανενεργή
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Switch
              size="sm"
              checked={isDayActive}
              onCheckedChange={(checked) => onToggleDay(checked)}
              title="Ενεργοποίηση / Απενεργοποίηση ημέρας"
            />
          </div>
        </div>

        {!isDayActive ? (
          /* Inactive state display */
          <div className="py-4 px-2 text-center space-y-2.5 bg-zinc-50/80 rounded-lg border border-zinc-100">
            <p className="text-zinc-500 text-[11px]">
              Ο εκπαιδευτικός <strong className="text-zinc-700 font-semibold">δεν είναι διαθέσιμος</strong> τη {dayLabel.name}.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onToggleDay(true)}
              className="h-7 text-xs font-semibold bg-white border-sky-300 text-sky-700 hover:bg-sky-50 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 mr-1 text-sky-600" />
              Ενεργοποίηση Ημέρας
            </Button>
          </div>
        ) : (
          /* Active State: Sliders for Morning and All-Day */
          <div className="space-y-3.5">
            {/* Section 1: Morning Hours */}
            <div className={`border rounded-lg p-2.5 space-y-2 transition-all ${
              isMorningActive
                ? "bg-sky-50/50 border-sky-100"
                : "bg-zinc-50/60 border-zinc-200/70"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-950">
                  <Sun className={`w-3.5 h-3.5 ${isMorningActive ? "text-amber-500" : "text-zinc-400"}`} />
                  Πρωινό Πρόγραμμα
                </div>
                <div className="flex items-center gap-1.5">
                  {isMorningActive && (
                    <span className="font-mono text-[10.5px] font-bold bg-white text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 shadow-2xs">
                      {morningStart}η — {morningEnd}η ώρα <span className="font-sans font-normal text-zinc-500">({morningSpan}ω)</span>
                    </span>
                  )}
                  <Switch
                    size="sm"
                    checked={isMorningActive}
                    onCheckedChange={(checked) => {
                      onChangeConfig({
                        ...dayConfig,
                        morningActive: checked,
                        start: dayConfig.start || 1,
                        end: dayConfig.end || numMorningPeriods,
                      });
                    }}
                    title="Συμμετοχή στο Πρωινό Πρόγραμμα"
                  />
                </div>
              </div>

              {isMorningActive ? (
                <>
                  {/* Morning Dual Slider */}
                  <DualRangeSlider
                    min={1}
                    max={numMorningPeriods}
                    value={[morningStart, morningEnd]}
                    colorScheme="sky"
                    unit="η"
                    onChange={(val) => {
                      onChangeConfig({
                        ...dayConfig,
                        morningActive: true,
                        start: val[0],
                        end: val[1],
                      });
                    }}
                  />

                  {/* Quick Presets for Morning */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[9.5px] text-zinc-400 font-medium mr-0.5">Επιλογές:</span>
                    {morningPresets.map((pr) => {
                      const isActive = morningStart === pr.range[0] && morningEnd === pr.range[1];
                      return (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            onChangeConfig({
                              ...dayConfig,
                              morningActive: true,
                              start: pr.range[0],
                              end: pr.range[1],
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
                            isActive
                              ? "bg-sky-600 text-white border-sky-600 shadow-2xs font-bold"
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-sky-300 hover:bg-sky-50/50"
                          }`}
                        >
                          {pr.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-[10.5px] text-zinc-400 italic">
                  Απενεργοποιημένο για τη συγκεκριμένη ημέρα (0 ώρες στο πρωινό).
                </p>
              )}
            </div>

            {/* Section 2: All-Day Hours */}
            <div className={`border rounded-lg p-2.5 space-y-2 transition-all ${
              isAllDayActive
                ? "bg-violet-50/50 border-violet-200/80"
                : "bg-zinc-50/60 border-zinc-200/70"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-800">
                  <Moon className={`w-3.5 h-3.5 ${isAllDayActive ? "text-violet-600" : "text-zinc-400"}`} />
                  Ολοήμερο Πρόγραμμα
                </div>
                <div className="flex items-center gap-1.5">
                  {isAllDayActive && (
                    <span className="font-mono text-[10.5px] font-bold bg-white text-violet-700 px-1.5 py-0.5 rounded border border-violet-200 shadow-2xs">
                      {allDayStart}η — {allDayEnd}η ώρα <span className="font-sans font-normal text-zinc-500">({allDaySpan}ω)</span>
                    </span>
                  )}
                  <Switch
                    size="sm"
                    checked={isAllDayActive}
                    onCheckedChange={(checked) => {
                      onChangeConfig({
                        ...dayConfig,
                        allDayActive: checked,
                        allDayStart: dayConfig.allDayStart || 1,
                        allDayEnd: dayConfig.allDayEnd || numAllDayPeriods,
                      });
                    }}
                    title="Συμμετοχή στο Ολοήμερο"
                  />
                </div>
              </div>

              {isAllDayActive ? (
                <>
                  {/* All-Day Dual Slider */}
                  <DualRangeSlider
                    min={1}
                    max={numAllDayPeriods}
                    value={[allDayStart, allDayEnd]}
                    colorScheme="violet"
                    unit="η"
                    labels={Array.from({ length: numAllDayPeriods }, (_, i) => `${i + 1}η Ολ.`)}
                    onChange={(val) => {
                      onChangeConfig({
                        ...dayConfig,
                        allDayActive: true,
                        allDayStart: val[0],
                        allDayEnd: val[1],
                      });
                    }}
                  />

                  {/* Quick Presets for All-Day */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[9.5px] text-zinc-400 font-medium mr-0.5">Επιλογές:</span>
                    {allDayPresets.map((pr) => {
                      const isActive = allDayStart === pr.range[0] && allDayEnd === pr.range[1];
                      return (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            onChangeConfig({
                              ...dayConfig,
                              allDayActive: true,
                              allDayStart: pr.range[0],
                              allDayEnd: pr.range[1],
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
                            isActive
                              ? "bg-violet-600 text-white border-violet-600 shadow-2xs font-bold"
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-violet-300 hover:bg-violet-50/50"
                          }`}
                        >
                          {pr.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-[10.5px] text-zinc-400 italic">
                  Ενεργοποιήστε τον διακόπτη αν ο εκπαιδευτικός διδάσκει και στο ολοήμερο τη {dayLabel.name}.
                </p>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              {onApplyToAllDays && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onApplyToAllDays(dayConfig)}
                  className="h-6 px-2 text-[10px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium cursor-pointer"
                  title="Αντιγραφή αυτών των ωρών σε όλες τις ημέρες του εκπαιδευτικού"
                >
                  <CopyCheck className="w-3 h-3 mr-1" />
                  Εφαρμογή σε όλες τις ημέρες
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-6.5 px-3 text-[11px] font-semibold bg-zinc-900 text-white hover:bg-zinc-800 ml-auto shadow-2xs cursor-pointer"
              >
                Έγινε
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface RangeFilterPopoverProps {
  title: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  value: [number, number] | null;
  onChange: (value: [number, number] | null) => void;
  presets?: { label: string; range: [number, number] }[];
  className?: string;
}

const RangeFilterPopover: React.FC<RangeFilterPopoverProps> = ({
  title,
  min,
  max,
  step = 1,
  unit = "",
  value,
  onChange,
  presets,
  className = "",
}) => {
  const isCustomActive = value !== null && !(value[0] === min && value[1] === max);
  const low = value ? value[0] : min;
  const high = value ? value[1] : max;

  const [localLow, setLocalLow] = useState(low);
  const [localHigh, setLocalHigh] = useState(high);
  const [activeDrag, setActiveDrag] = useState<"low" | "high" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalLow(value ? value[0] : min);
    setLocalHigh(value ? value[1] : max);
  }, [value, min, max]);

  const commitRange = (newLow: number, newHigh: number) => {
    const clLow = Math.max(min, Math.min(newLow, max));
    const clHigh = Math.max(min, Math.min(newHigh, max));
    const finalLow = Math.min(clLow, clHigh);
    const finalHigh = Math.max(clLow, clHigh);
    setLocalLow(finalLow);
    setLocalHigh(finalHigh);
    if (finalLow === min && finalHigh === max) {
      onChange(null);
    } else {
      onChange([finalLow, finalHigh]);
    }
  };

  const displayText = useMemo(() => {
    if (!isCustomActive) return "Αδιαφ.";
    if (low === high) return `${low}${unit}`;
    return `${low}-${high}${unit}`;
  }, [isCustomActive, low, high, unit]);

  const leftPercent = ((localLow - min) / (max - min)) * 100;
  const rightPercent = ((localHigh - min) / (max - min)) * 100;

  // Convert clientX to stepped value
  const getValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return min;
    const pos = (clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    const rawVal = min + clampedPos * (max - min);
    const steppedVal = Math.round((rawVal - min) / step) * step + min;
    return Math.max(min, Math.min(max, steppedVal));
  };

  // Drag thumb
  const startDrag = (type: "low" | "high", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag(type);

    let curLow = localLow;
    let curHigh = localHigh;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const val = getValueFromPointer(moveEvent.clientX);
      if (type === "low") {
        const nextLow = Math.min(val, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(val, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Track click & drag
  const handleTrackPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const val = getValueFromPointer(e.clientX);
    const distLow = Math.abs(val - localLow);
    const distHigh = Math.abs(val - localHigh);
    const chosenType: "low" | "high" = distLow <= distHigh ? "low" : "high";

    setActiveDrag(chosenType);
    let curLow = localLow;
    let curHigh = localHigh;

    if (chosenType === "low") {
      const nextLow = Math.min(val, curHigh);
      curLow = nextLow;
      commitRange(nextLow, curHigh);
    } else {
      const nextHigh = Math.max(val, curLow);
      curHigh = nextHigh;
      commitRange(curLow, nextHigh);
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveVal = getValueFromPointer(moveEvent.clientX);
      if (chosenType === "low") {
        const nextLow = Math.min(moveVal, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(moveVal, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all flex items-center border cursor-pointer ${
          isCustomActive
            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        } ${className}`}
        title={`Φίλτρο: ${title} (${displayText})`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-40 ml-0.5" />
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-64 p-3 shadow-xl border border-zinc-200 bg-white text-xs z-50 rounded-xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <span className="font-bold text-zinc-800 text-[11px] truncate">{title}</span>
          {isCustomActive ? (
            <button
              type="button"
              onClick={() => {
                setLocalLow(min);
                setLocalHigh(max);
                onChange(null);
              }}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-semibold cursor-pointer underline underline-offset-2"
            >
              Καθαρισμός
            </button>
          ) : (
            <span className="text-[10px] text-zinc-400 font-medium">Αδιάφορο</span>
          )}
        </div>

        {/* Current Active Range Tag Badge */}
        <div className="flex items-center justify-center mb-3">
          <div className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-xs font-bold shadow-2xs flex items-center gap-1.5">
            {localLow === localHigh ? (
              <span>{localLow}{unit} <span className="text-[10px] font-sans font-normal text-indigo-600">(ακριβώς)</span></span>
            ) : localLow === min && localHigh === max ? (
              <span className="text-zinc-500 font-sans font-medium text-[11px]">Όλες οι τιμές ({min} - {max}{unit})</span>
            ) : (
              <span>{localLow}{unit} — {localHigh}{unit}</span>
            )}
          </div>
        </div>

        {/* Dual Thumb Slider Bar */}
        <div className="px-2 py-3 select-none">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative h-6 flex items-center cursor-pointer touch-none"
          >
            {/* Background Track */}
            <div className="absolute w-full h-1.5 bg-zinc-200 rounded-full pointer-events-none" />

            {/* Active Range Fill */}
            <div
              className="absolute h-1.5 bg-indigo-600 rounded-full transition-all duration-75 pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(0, rightPercent - leftPercent)}%`,
              }}
            />

            {/* Left Thumb */}
            <div
              tabIndex={0}
              role="slider"
              aria-label={`${title} από`}
              aria-valuemin={min}
              aria-valuemax={localHigh}
              aria-valuenow={localLow}
              onPointerDown={(e) => startDrag("low", e)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  commitRange(localLow - step, localHigh);
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  commitRange(localLow + step, localHigh);
                }
              }}
              className={`absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
                activeDrag === "low"
                  ? "ring-indigo-400 scale-120 z-20"
                  : "ring-indigo-100 hover:ring-indigo-300 z-10"
              }`}
              style={{ left: `${leftPercent}%` }}
            />

            {/* Right Thumb */}
            <div
              tabIndex={0}
              role="slider"
              aria-label={`${title} έως`}
              aria-valuemin={localLow}
              aria-valuemax={max}
              aria-valuenow={localHigh}
              onPointerDown={(e) => startDrag("high", e)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  commitRange(localLow, localHigh - step);
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  commitRange(localLow, localHigh + step);
                }
              }}
              className={`absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
                activeDrag === "high"
                  ? "ring-indigo-400 scale-120 z-20"
                  : "ring-indigo-100 hover:ring-indigo-300 z-10"
              }`}
              style={{ left: `${rightPercent}%` }}
            />
          </div>

          {/* Endpoint labels */}
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1 select-none pointer-events-none">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>

        {/* 1. Σταθερή Τιμή (Ορισμός ίδιας τιμής και για τα δύο άκρα) */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2 mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-indigo-950">Σταθερή Τιμή:</span>
            {localLow === localHigh && isCustomActive ? (
              <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded">
                {localLow}{unit} Σταθερό
              </span>
            ) : isCustomActive && localLow !== localHigh ? (
              <span className="text-[9.5px] text-amber-800 font-medium bg-amber-100/70 border border-amber-200 px-1.5 py-0.2 rounded">
                (Κλικ για ενοποίηση)
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-1.5 bg-white border border-indigo-200/80 rounded-md p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                const base = localLow === localHigh ? localLow : localLow;
                const next = Math.max(min, base - step);
                commitRange(next, next);
              }}
              disabled={localLow <= min && localHigh <= min}
              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold transition-colors"
              title="Μείωση σταθερής τιμής"
            >
              -
            </button>
            <div className="flex items-center justify-center gap-1 flex-1">
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={localLow === localHigh && isCustomActive ? localLow : ""}
                placeholder={localLow === localHigh && isCustomActive ? "" : `${localLow}-${localHigh}`}
                onChange={(e) => {
                  const valStr = e.target.value;
                  if (valStr === "") return;
                  const parsed = parseInt(valStr, 10);
                  if (!isNaN(parsed)) {
                    const clamped = Math.max(min, Math.min(max, parsed));
                    commitRange(clamped, clamped);
                  }
                }}
                className="w-16 h-6 text-center font-mono font-bold text-xs bg-zinc-50 border border-zinc-200 rounded text-zinc-900 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
              />
              {unit && <span className="text-zinc-500 font-mono text-xs font-semibold">{unit}</span>}
            </div>
            <button
              type="button"
              onClick={() => {
                const base = localLow === localHigh ? localLow : localHigh;
                const next = Math.min(max, base + step);
                commitRange(next, next);
              }}
              disabled={localLow >= max && localHigh >= max}
              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold transition-colors"
              title="Αύξηση σταθερής τιμής"
            >
              +
            </button>
          </div>
        </div>

        {/* 2. Εύρος Τιμών (Από — Έως) */}
        <div className="bg-zinc-50/80 border border-zinc-200 rounded-lg p-2 mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-zinc-700">Εύρος Τιμών (Από — Έως):</span>
            {localLow !== localHigh && (
              <span className="text-[9.5px] text-amber-800 font-bold bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded">
                Ενεργό
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-md p-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-zinc-500 pl-1">Από:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => commitRange(localLow - step, localHigh)}
                  disabled={localLow <= min}
                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-zinc-900 w-5 text-center">{localLow}</span>
                <button
                  type="button"
                  onClick={() => commitRange(localLow + step, localHigh)}
                  disabled={localLow >= localHigh}
                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-md p-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-zinc-500 pl-1">Έως:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => commitRange(localLow, localHigh - step)}
                  disabled={localHigh <= localLow}
                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-zinc-900 w-5 text-center">{localHigh}</span>
                <button
                  type="button"
                  onClick={() => commitRange(localLow, localHigh + step)}
                  disabled={localHigh >= max}
                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Presets */}
        {presets && presets.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => commitRange(p.range[0], p.range[1])}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  localLow === p.range[0] && localHigh === p.range[1]
                    ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                    : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface DailyHoursSliderPopoverProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  isBulkModified?: boolean;
}

const DailyHoursSliderPopover: React.FC<DailyHoursSliderPopoverProps> = ({
  value,
  onChange,
  min = 1,
  max = 7,
  step = 1,
  unit = "ω",
  className = "",
  isBulkModified = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const low = typeof value?.[0] === "number" ? value[0] : 2;
  const high = typeof value?.[1] === "number" ? value[1] : 5;

  const [localLow, setLocalLow] = useState(low);
  const [localHigh, setLocalHigh] = useState(high);
  const [activeDrag, setActiveDrag] = useState<"low" | "high" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && typeof value[0] === "number" && typeof value[1] === "number") {
      setLocalLow(value[0]);
      setLocalHigh(value[1]);
    }
  }, [value]);

  const commitRange = (newLow: number, newHigh: number) => {
    const clLow = Math.max(min, Math.min(newLow, max));
    const clHigh = Math.max(min, Math.min(newHigh, max));
    const finalLow = Math.min(clLow, clHigh);
    const finalHigh = Math.max(clLow, clHigh);
    setLocalLow(finalLow);
    setLocalHigh(finalHigh);
    onChange([finalLow, finalHigh]);
  };

  const displayText = useMemo(() => {
    if (low === high) return `${low}${unit}`;
    return `${low}-${high}${unit}`;
  }, [low, high, unit]);

  const leftPercent = ((localLow - min) / (max - min)) * 100;
  const rightPercent = ((localHigh - min) / (max - min)) * 100;

  const getValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return min;
    const pos = (clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    const rawVal = min + clampedPos * (max - min);
    const steppedVal = Math.round((rawVal - min) / step) * step + min;
    return Math.max(min, Math.min(max, steppedVal));
  };

  const startDrag = (type: "low" | "high", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag(type);

    let curLow = localLow;
    let curHigh = localHigh;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const val = getValueFromPointer(moveEvent.clientX);
      if (type === "low") {
        const nextLow = Math.min(val, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(val, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const val = getValueFromPointer(e.clientX);
    const distLow = Math.abs(val - localLow);
    const distHigh = Math.abs(val - localHigh);
    const chosenType: "low" | "high" = distLow <= distHigh ? "low" : "high";

    setActiveDrag(chosenType);
    let curLow = localLow;
    let curHigh = localHigh;

    if (chosenType === "low") {
      const nextLow = Math.min(val, curHigh);
      curLow = nextLow;
      commitRange(nextLow, curHigh);
    } else {
      const nextHigh = Math.max(val, curLow);
      curHigh = nextHigh;
      commitRange(curLow, nextHigh);
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveVal = getValueFromPointer(moveEvent.clientX);
      if (chosenType === "low") {
        const nextLow = Math.min(moveVal, curHigh);
        curLow = nextLow;
        commitRange(nextLow, curHigh);
      } else {
        const nextHigh = Math.max(moveVal, curLow);
        curHigh = nextHigh;
        commitRange(curLow, nextHigh);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        className={`h-7 px-2 text-xs font-mono font-medium rounded-md shadow-2xs transition-all flex items-center justify-center gap-1 border cursor-pointer ${
          isBulkModified
            ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300 font-bold text-amber-900"
            : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
        } ${className}`}
        title="Εύρος ωρών ανά ημέρα (Ελάχιστες - Μέγιστες)"
      >
        <span>{displayText}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-40" />
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-64 p-3 shadow-xl border border-zinc-200 bg-white text-xs z-50 rounded-xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <span className="font-bold text-zinc-800 text-[11px]">Ώρες ανά Ημέρα</span>
          <div className="flex items-center gap-1">
            {[
              { label: "1-6ω", range: [1, 6] },
              { label: "1-5ω", range: [1, 5] },
              { label: "1-4ω", range: [1, 4] },
              { label: "2-6ω", range: [2, 6] },
              { label: "3-6ω", range: [3, 6] },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => commitRange(p.range[0], p.range[1])}
                className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-mono text-zinc-700 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center mb-3">
          <div className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-xs font-bold shadow-2xs flex items-center gap-1.5">
            {localLow === localHigh ? (
              <span>{localLow}{unit} <span className="text-[10px] font-sans font-normal text-indigo-600">(ακριβώς)</span></span>
            ) : (
              <span>{localLow}{unit} — {localHigh}{unit}</span>
            )}
          </div>
        </div>

        <div className="px-2 py-3 select-none">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative h-6 flex items-center cursor-pointer touch-none"
          >
            <div className="absolute w-full h-1.5 bg-zinc-200 rounded-full pointer-events-none" />

            <div
              className="absolute h-1.5 bg-indigo-600 rounded-full transition-all duration-75 pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(0, rightPercent - leftPercent)}%`,
              }}
            />

            <div
              tabIndex={0}
              role="slider"
              aria-label="Ελάχιστες ώρες από"
              aria-valuemin={min}
              aria-valuemax={localHigh}
              aria-valuenow={localLow}
              onPointerDown={(e) => startDrag("low", e)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  commitRange(localLow - step, localHigh);
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  commitRange(localLow + step, localHigh);
                }
              }}
              className={`absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
                activeDrag === "low"
                  ? "ring-indigo-400 scale-120 z-20"
                  : "ring-indigo-100 hover:ring-indigo-300 z-10"
              }`}
              style={{ left: `${leftPercent}%` }}
            />

            <div
              tabIndex={0}
              role="slider"
              aria-label="Μέγιστες ώρες έως"
              aria-valuemin={localLow}
              aria-valuemax={max}
              aria-valuenow={localHigh}
              onPointerDown={(e) => startDrag("high", e)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  commitRange(localLow, localHigh - step);
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  commitRange(localLow, localHigh + step);
                }
              }}
              className={`absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
                activeDrag === "high"
                  ? "ring-indigo-400 scale-120 z-20"
                  : "ring-indigo-100 hover:ring-indigo-300 z-10"
              }`}
              style={{ left: `${rightPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1 select-none pointer-events-none">
            <span>{min}{unit} (min)</span>
            <span>{max}{unit} (max)</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  data,
  onRefresh,
  activeTab = "teachers",
  onTabChange,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const numMorningPeriods = data.schoolConfig?.periods?.length || 6;
  const numAllDayPeriods = data.schoolConfig?.allDayPeriods?.length || 4;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [teachingFilter, setTeachingFilter] = useState("all");
  const [onCallFilter, setOnCallFilter] = useState("all");
  const [morningFilter, setMorningFilter] = useState("all");
  const [allDayFilter, setAllDayFilter] = useState("all");
  const [supportFilter, setSupportFilter] = useState("all");
  const [selectedFilterDays, setSelectedFilterDays] = useState<number[]>([]);
  const [weeklyHoursRange, setWeeklyHoursRange] = useState<[number, number] | null>(null);
  const [dailyHoursRange, setDailyHoursRange] = useState<[number, number] | null>(null);
  const [consecutiveHoursRange, setConsecutiveHoursRange] = useState<[number, number] | null>(null);
  const [consecutiveGapsRange, setConsecutiveGapsRange] = useState<[number, number] | null>(null);
  const [dailyGapsRange, setDailyGapsRange] = useState<[number, number] | null>(null);
  const [weeklyGapsRange, setWeeklyGapsRange] = useState<[number, number] | null>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");

  const toggleFilterDay = (dayIdx: number) => {
    setSelectedFilterDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  const toggleSpecialtyFilter = (code: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Inline row edit state ("__new__" for new record, "__bulk__" for bulk edit, or existing teacher.id)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<InlineEditState | null>(null);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Bulk Edit state
  const [modifiedBulkFields, setModifiedBulkFields] = useState<Set<string>>(new Set());
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

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

  // Calculate total assigned hours per teacher
  const teacherAssignedHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    (data.assignments || []).forEach((a) => {
      if (a.teacherId) {
        map.set(a.teacherId, (map.get(a.teacherId) || 0) + (a.hours || 0));
      }
    });
    return map;
  }, [data.assignments]);

  const filteredTeachers = useMemo(() => {
    return data.teachers.filter((tch) => {
      // 1. Search Query
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

      // 2. Specialty Filter (Multi-select)
      if (selectedSpecialties.length > 0) {
        const tchCode = formatSpecialtyCode(tch.specialty);
        const matches = selectedSpecialties.some((code) => {
          const formatted = formatSpecialtyCode(code);
          return tchCode === formatted || tch.specialty === code;
        });
        if (!matches) return false;
      }

      // 3. Teaching Filter
      const isTeaching = tch.isTeaching ?? true;
      if (teachingFilter === "yes" && !isTeaching) return false;
      if (teachingFilter === "no" && isTeaching) return false;

      // 4. On-Call Filter
      const isOnCall = tch.isOnCall ?? false;
      if (onCallFilter === "yes" && !isOnCall) return false;
      if (onCallFilter === "no" && isOnCall) return false;

      // 5. Morning Filter
      const isMorning = tch.isMorning ?? true;
      if (morningFilter === "yes" && !isMorning) return false;
      if (morningFilter === "no" && isMorning) return false;

      // 6. All-Day Filter
      const isAllDay = tch.isAllDay ?? false;
      if (allDayFilter === "yes" && !isAllDay) return false;
      if (allDayFilter === "no" && isAllDay) return false;

      // 7. Support / Type Filter
      const isSupport = tch.isSupport ?? false;
      if (supportFilter === "general" && isSupport) return false;
      if (supportFilter === "support" && !isSupport) return false;

      // 8. Status Filter
      const isActive = tch.isActive !== false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;

      // 9. Days Filter (Presence required on all selected days)
      if (selectedFilterDays.length > 0) {
        const days = tch.constraints?.availableDays && tch.constraints.availableDays.length > 0
          ? tch.constraints.availableDays
          : ALL_DAYS_INDICES;
        const hasAllSelectedDays = selectedFilterDays.every((d) => days.includes(d));
        if (!hasAllSelectedDays) return false;
      }

      // 10. Weekly Hours
      const maxWeekly = tch.maxWeeklyHours ?? 24;
      if (weeklyHoursRange !== null && (maxWeekly < weeklyHoursRange[0] || maxWeekly > weeklyHoursRange[1])) {
        return false;
      }

      // 11. Daily Hours Range
      const c = tch.constraints;
      const minH = c?.minHoursPerDay ?? 2;
      const maxH = c?.maxHoursPerDay ?? 5;
      if (dailyHoursRange !== null && (minH < dailyHoursRange[0] || maxH > dailyHoursRange[1])) {
        return false;
      }

      // 13. Max Consecutive Hours
      const maxConsecH = c?.maxConsecutiveHours ?? 4;
      if (consecutiveHoursRange !== null && (maxConsecH < consecutiveHoursRange[0] || maxConsecH > consecutiveHoursRange[1])) {
        return false;
      }

      // 14. Max Consecutive Gaps
      const maxConsecGaps = c?.maxConsecutiveGaps ?? 1;
      if (consecutiveGapsRange !== null && (maxConsecGaps < consecutiveGapsRange[0] || maxConsecGaps > consecutiveGapsRange[1])) {
        return false;
      }

      // 15. Max Total Gaps Per Day
      const maxDailyGaps = c?.maxTotalGapsPerDay ?? c?.maxConsecutiveGaps ?? 1;
      if (dailyGapsRange !== null && (maxDailyGaps < dailyGapsRange[0] || maxDailyGaps > dailyGapsRange[1])) {
        return false;
      }

      // 16. Max Total Gaps Per Week
      const maxWeeklyGaps = c?.maxTotalGapsPerWeek ?? 2;
      if (weeklyGapsRange !== null && (maxWeeklyGaps < weeklyGapsRange[0] || maxWeeklyGaps > weeklyGapsRange[1])) {
        return false;
      }

      return true;
    });
  }, [
    data.teachers,
    searchQuery,
    selectedSpecialties,
    teachingFilter,
    onCallFilter,
    morningFilter,
    allDayFilter,
    supportFilter,
    statusFilter,
    selectedFilterDays,
    weeklyHoursRange,
    dailyHoursRange,
    consecutiveHoursRange,
    consecutiveGapsRange,
    dailyGapsRange,
    weeklyGapsRange,
    teacherAssignedHoursMap,
  ]);

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedSpecialties([]);
    setStatusFilter("all");
    setTeachingFilter("all");
    setOnCallFilter("all");
    setMorningFilter("all");
    setAllDayFilter("all");
    setSupportFilter("all");
    setSelectedFilterDays([]);
    setWeeklyHoursRange(null);
    setDailyHoursRange(null);
    setConsecutiveHoursRange(null);
    setConsecutiveGapsRange(null);
    setDailyGapsRange(null);
    setWeeklyGapsRange(null);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSpecialties.length > 0 ||
    statusFilter !== "all" ||
    teachingFilter !== "all" ||
    onCallFilter !== "all" ||
    morningFilter !== "all" ||
    allDayFilter !== "all" ||
    supportFilter !== "all" ||
    selectedFilterDays.length > 0 ||
    weeklyHoursRange !== null ||
    dailyHoursRange !== null ||
    consecutiveHoursRange !== null ||
    consecutiveGapsRange !== null ||
    dailyGapsRange !== null ||
    weeklyGapsRange !== null;

  const activeFiltersCount =
    (searchQuery.trim() !== "" ? 1 : 0) +
    (selectedSpecialties.length > 0 ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (teachingFilter !== "all" ? 1 : 0) +
    (onCallFilter !== "all" ? 1 : 0) +
    (morningFilter !== "all" ? 1 : 0) +
    (allDayFilter !== "all" ? 1 : 0) +
    (supportFilter !== "all" ? 1 : 0) +
    (selectedFilterDays.length > 0 ? 1 : 0) +
    (weeklyHoursRange !== null ? 1 : 0) +
    (dailyHoursRange !== null ? 1 : 0) +
    (consecutiveHoursRange !== null ? 1 : 0) +
    (consecutiveGapsRange !== null ? 1 : 0) +
    (dailyGapsRange !== null ? 1 : 0) +
    (weeklyGapsRange !== null ? 1 : 0);

  const activeTags = useMemo(() => {
    const list: { id: string; label: string; clear: () => void }[] = [];

    if (searchQuery.trim()) {
      list.push({
        id: "search",
        label: `Αναζήτηση: "${searchQuery.trim()}"`,
        clear: () => setSearchQuery(""),
      });
    }

    if (selectedSpecialties.length > 0) {
      list.push({
        id: "spec",
        label: `Ειδικότητες: ${selectedSpecialties.join(", ")}`,
        clear: () => setSelectedSpecialties([]),
      });
    }

    if (teachingFilter !== "all") {
      list.push({
        id: "teaching",
        label: `Διδάσκει: ${teachingFilter === "yes" ? "Ναι" : "Όχι"}`,
        clear: () => setTeachingFilter("all"),
      });
    }

    if (onCallFilter !== "all") {
      list.push({
        id: "oncall",
        label: `Εφημερία: ${onCallFilter === "yes" ? "Ναι" : "Όχι"}`,
        clear: () => setOnCallFilter("all"),
      });
    }

    if (morningFilter !== "all") {
      list.push({
        id: "morning",
        label: `Πρωινό: ${morningFilter === "yes" ? "Ναι" : "Όχι"}`,
        clear: () => setMorningFilter("all"),
      });
    }

    if (allDayFilter !== "all") {
      list.push({
        id: "allday",
        label: `Ολοήμερο: ${allDayFilter === "yes" ? "Ναι" : "Όχι"}`,
        clear: () => setAllDayFilter("all"),
      });
    }

    if (supportFilter !== "all") {
      list.push({
        id: "support",
        label: `Τύπος: ${supportFilter === "support" ? "Παράλληλη/Τ.Ε." : "Γενική"}`,
        clear: () => setSupportFilter("all"),
      });
    }

    if (statusFilter !== "all") {
      list.push({
        id: "status",
        label: statusFilter === "active" ? "Μόνο Ενεργοί" : "Μόνο Ανενεργοί",
        clear: () => setStatusFilter("all"),
      });
    }

    if (selectedFilterDays.length > 0) {
      list.push({
        id: "days",
        label: `Ημέρες: ${selectedFilterDays.map((d) => DAY_LABELS[d]?.short).join(",")}`,
        clear: () => setSelectedFilterDays([]),
      });
    }

    if (weeklyHoursRange !== null) {
      list.push({
        id: "weeklyHours",
        label: `Ωράριο: ${weeklyHoursRange[0] === weeklyHoursRange[1] ? `${weeklyHoursRange[0]}ω` : `${weeklyHoursRange[0]}-${weeklyHoursRange[1]}ω`}`,
        clear: () => setWeeklyHoursRange(null),
      });
    }

    if (dailyHoursRange !== null) {
      list.push({
        id: "dailyHours",
        label: `Ώρες/ημ: ${dailyHoursRange[0] === dailyHoursRange[1] ? `${dailyHoursRange[0]}ω` : `${dailyHoursRange[0]}-${dailyHoursRange[1]}ω`}`,
        clear: () => setDailyHoursRange(null),
      });
    }

    if (consecutiveHoursRange !== null) {
      list.push({
        id: "consecHours",
        label: `Συνεχόμενες: ${consecutiveHoursRange[0] === consecutiveHoursRange[1] ? `${consecutiveHoursRange[0]}ω` : `${consecutiveHoursRange[0]}-${consecutiveHoursRange[1]}ω`}`,
        clear: () => setConsecutiveHoursRange(null),
      });
    }

    if (consecutiveGapsRange !== null) {
      list.push({
        id: "consecGaps",
        label: `Max συνεχ. κενά: ${consecutiveGapsRange[0] === consecutiveGapsRange[1] ? `${consecutiveGapsRange[0]}` : `${consecutiveGapsRange[0]}-${consecutiveGapsRange[1]}`}`,
        clear: () => setConsecutiveGapsRange(null),
      });
    }

    if (dailyGapsRange !== null) {
      list.push({
        id: "dailyGaps",
        label: `Max κενά/ημ: ${dailyGapsRange[0] === dailyGapsRange[1] ? `${dailyGapsRange[0]}` : `${dailyGapsRange[0]}-${dailyGapsRange[1]}`}`,
        clear: () => setDailyGapsRange(null),
      });
    }

    if (weeklyGapsRange !== null) {
      list.push({
        id: "weeklyGaps",
        label: `Max κενά/εβδ: ${weeklyGapsRange[0] === weeklyGapsRange[1] ? `${weeklyGapsRange[0]}` : `${weeklyGapsRange[0]}-${weeklyGapsRange[1]}`}`,
        clear: () => setWeeklyGapsRange(null),
      });
    }

    return list;
  }, [
    searchQuery,
    selectedSpecialties,
    teachingFilter,
    onCallFilter,
    morningFilter,
    allDayFilter,
    supportFilter,
    statusFilter,
    selectedFilterDays,
    weeklyHoursRange,
    dailyHoursRange,
    consecutiveHoursRange,
    consecutiveGapsRange,
    dailyGapsRange,
    weeklyGapsRange,
  ]);

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
      dayHours: extractDayHours(null, false, numMorningPeriods, numAllDayPeriods),
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
      dayHours: extractDayHours(c, target.isAllDay ?? false, numMorningPeriods, numAllDayPeriods),
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
      dayHours: extractDayHours(c, tch.isAllDay ?? false, numMorningPeriods, numAllDayPeriods),
    });
    setEditingRowId(tch.id);
    setSelectedTeacherId(tch.id);
  };

  // Start bulk editing (applies to all currently filtered/visible teachers)
  const startBulkEdit = () => {
    if (filteredTeachers.length === 0) {
      toast.warning("Δεν υπάρχουν εκπαιδευτικοί για μαζική επεξεργασία.");
      return;
    }
    setInlineData({
      firstName: "",
      lastName: "",
      shortName: "",
      specialty: "ΠΕ70",
      color: "#6366f1",
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
      dayHours: extractDayHours(null, false, numMorningPeriods, numAllDayPeriods),
    });
    setModifiedBulkFields(new Set());
    setEditingRowId("__bulk__");
    setSelectedTeacherId("__header__");
    toast.info(
      `✨ Μαζική Επεξεργασία: Τροποποιήστε μόνο τα πεδία που θέλετε να αλλάξουν σε ${filteredTeachers.length} εκπαιδευτικούς.`
    );
  };

  const markBulkField = (fieldName: string) => {
    if (editingRowId === "__bulk__") {
      setModifiedBulkFields((prev) => {
        const next = new Set(prev);
        next.add(fieldName);
        return next;
      });
    }
  };

  const updateInlineDayConfig = (dayIndex: number, newConfig: DayAvailabilityConfig) => {
    if (!inlineData) return;
    markBulkField("availableDays");
    markBulkField("dayHours");
    setInlineData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dayHours: {
          ...prev.dayHours,
          [String(dayIndex)]: newConfig,
        },
      };
    });
  };

  const applyDayToAllDays = (sourceDayIndex: number, config: DayAvailabilityConfig) => {
    if (!inlineData) return;
    markBulkField("availableDays");
    markBulkField("dayHours");
    setInlineData((prev) => {
      if (!prev) return prev;
      const nextDayHours = { ...prev.dayHours };
      ALL_DAYS_INDICES.forEach((d) => {
        nextDayHours[String(d)] = { ...config };
      });
      return {
        ...prev,
        dayHours: nextDayHours,
      };
    });
    toast.success(`Οι ρυθμίσεις ωραρίου της ${DAY_LABELS[sourceDayIndex].name} εφαρμόστηκαν σε όλες τις ημέρες!`);
  };

  const promptSaveBulk = () => {
    if (!inlineData) return;
    if (modifiedBulkFields.size === 0) {
      toast.warning("Δεν τροποποιήσατε κάποιο πεδίο για μαζική εφαρμογή.");
      return;
    }
    setIsBulkConfirmOpen(true);
  };

  const confirmSaveBulk = async () => {
    if (!inlineData || modifiedBulkFields.size === 0) return;
    setIsSavingBulk(true);

    const constraintsData: Partial<TeacherConstraints> = {};
    if (modifiedBulkFields.has("availableDays") || modifiedBulkFields.has("dayHours")) {
      constraintsData.availableDays = inlineData.availableDays.length > 0 ? inlineData.availableDays : ALL_DAYS_INDICES;
      constraintsData.dayHours = inlineData.dayHours;
      constraintsData.availability = computeAvailabilityGrid(
        inlineData.availableDays,
        inlineData.dayHours,
        inlineData.isAllDay,
        numMorningPeriods,
        numAllDayPeriods
      );
    }
    if (modifiedBulkFields.has("maxHoursPerDay")) {
      constraintsData.maxHoursPerDay = inlineData.maxHoursPerDay === "" ? null : Number(inlineData.maxHoursPerDay);
    }
    if (modifiedBulkFields.has("minHoursPerDay")) {
      constraintsData.minHoursPerDay = inlineData.minHoursPerDay === "" ? null : Number(inlineData.minHoursPerDay);
    }
    if (modifiedBulkFields.has("maxConsecutiveHours")) {
      constraintsData.maxConsecutiveHours = inlineData.maxConsecutiveHours === "" ? null : Number(inlineData.maxConsecutiveHours);
    }
    if (modifiedBulkFields.has("maxConsecutiveGaps")) {
      constraintsData.maxConsecutiveGaps = inlineData.maxConsecutiveGaps === "" ? null : Number(inlineData.maxConsecutiveGaps);
    }
    if (modifiedBulkFields.has("maxTotalGapsPerDay")) {
      constraintsData.maxTotalGapsPerDay = inlineData.maxTotalGapsPerDay === "" ? null : Number(inlineData.maxTotalGapsPerDay);
    }
    if (modifiedBulkFields.has("maxTotalGapsPerWeek")) {
      constraintsData.maxTotalGapsPerWeek = inlineData.maxTotalGapsPerWeek === "" ? null : Number(inlineData.maxTotalGapsPerWeek);
    }

    const updates: Record<string, any> = {
      constraints: constraintsData,
    };

    if (modifiedBulkFields.has("isSupport")) updates.isSupport = inlineData.isSupport;
    if (modifiedBulkFields.has("isTeaching")) updates.isTeaching = inlineData.isTeaching;
    if (modifiedBulkFields.has("isOnCall")) updates.isOnCall = inlineData.isOnCall;
    if (modifiedBulkFields.has("isMorning")) updates.isMorning = inlineData.isMorning;
    if (modifiedBulkFields.has("isAllDay")) updates.isAllDay = inlineData.isAllDay;
    if (modifiedBulkFields.has("isActive")) updates.isActive = inlineData.isActive;
    if (modifiedBulkFields.has("maxWeeklyHours")) {
      updates.maxWeeklyHours = inlineData.maxWeeklyHours === "" ? null : Number(inlineData.maxWeeklyHours);
    }

    const payload = {
      teacherIds: filteredTeachers.map((t) => t.id),
      updates,
      modifiedFields: Array.from(modifiedBulkFields),
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Αποτυχία μαζικής ενημέρωσης εκπαιδευτικών");

      const json = await res.json();
      toast.success(`✨ Ενημερώθηκαν επιτυχώς ${json.count || filteredTeachers.length} εκπαιδευτικοί!`);
      setIsBulkConfirmOpen(false);
      setEditingRowId(null);
      setInlineData(null);
      setModifiedBulkFields(new Set());
      setSelectedTeacherId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const modifiedFieldsSummary = useMemo(() => {
    if (!inlineData || modifiedBulkFields.size === 0) return [];
    const list: { key: string; label: string; value: string }[] = [];

    if (modifiedBulkFields.has("isTeaching")) {
      list.push({ key: "isTeaching", label: "Διδάσκει", value: inlineData.isTeaching ? "ΝΑΙ (Διδάσκων)" : "ΟΧΙ (Μη Διδάσκων/Διοίκηση)" });
    }
    if (modifiedBulkFields.has("isOnCall")) {
      list.push({ key: "isOnCall", label: "Εφημερία", value: inlineData.isOnCall ? "ΝΑΙ (Συμμετοχή σε Εφημερίες)" : "ΟΧΙ" });
    }
    if (modifiedBulkFields.has("isMorning")) {
      list.push({ key: "isMorning", label: "Πρωινό Πρόγραμμα", value: inlineData.isMorning ? "ΝΑΙ" : "ΟΧΙ" });
    }
    if (modifiedBulkFields.has("isAllDay")) {
      list.push({ key: "isAllDay", label: "Ολοήμερο Πρόγραμμα", value: inlineData.isAllDay ? "ΝΑΙ" : "ΟΧΙ" });
    }
    if (modifiedBulkFields.has("isSupport")) {
      list.push({ key: "isSupport", label: "Τύπος Ανάθεσης", value: inlineData.isSupport ? "Συμπληρωματική (Παράλληλη/Τ.Ε.)" : "Βασική" });
    }
    if (modifiedBulkFields.has("isActive")) {
      list.push({ key: "isActive", label: "Κατάσταση", value: inlineData.isActive ? "Ενεργός" : "Σε Άδεια/Ανενεργός" });
    }
    if (modifiedBulkFields.has("availableDays") || modifiedBulkFields.has("dayHours")) {
      const daySummaries = inlineData.availableDays
        .map((idx) => {
          const dName = DAY_LABELS.find((d) => d.index === idx)?.name || "";
          const cfg = inlineData.dayHours?.[String(idx)];
          const isCustom = isDayCustom(cfg, numMorningPeriods);
          if (isCustom && cfg) {
            return `${dName} (${cfg.start}η-${cfg.end}η${cfg.allDayActive ? ` + Ολοήμ. ${cfg.allDayStart}-${cfg.allDayEnd}` : ""})`;
          }
          return dName;
        })
        .join(", ");
      list.push({ key: "availableDays", label: "Ημέρες & Ώρες Παρουσίας", value: daySummaries || "Καμία" });
    }
    if (modifiedBulkFields.has("maxWeeklyHours")) {
      list.push({ key: "maxWeeklyHours", label: "Εβδομαδιαίες Ώρες", value: `${inlineData.maxWeeklyHours} ώρες` });
    }
    if (modifiedBulkFields.has("minHoursPerDay")) {
      list.push({ key: "minHoursPerDay", label: "Min Ώρες / Ημέρα", value: `${inlineData.minHoursPerDay} ώρες` });
    }
    if (modifiedBulkFields.has("maxHoursPerDay")) {
      list.push({ key: "maxHoursPerDay", label: "Max Ώρες / Ημέρα", value: `${inlineData.maxHoursPerDay} ώρες` });
    }
    if (modifiedBulkFields.has("maxConsecutiveHours")) {
      list.push({ key: "maxConsecutiveHours", label: "Max Συνεχόμενες Ώρες", value: `${inlineData.maxConsecutiveHours} ώρες` });
    }
    if (modifiedBulkFields.has("maxConsecutiveGaps")) {
      list.push({ key: "maxConsecutiveGaps", label: "Max Συνεχόμενα Κενά", value: `${inlineData.maxConsecutiveGaps}` });
    }
    if (modifiedBulkFields.has("maxTotalGapsPerDay")) {
      list.push({ key: "maxTotalGapsPerDay", label: "Max Συνολικά Κενά / Ημέρα", value: `${inlineData.maxTotalGapsPerDay}` });
    }
    if (modifiedBulkFields.has("maxTotalGapsPerWeek")) {
      list.push({ key: "maxTotalGapsPerWeek", label: "Max Συνολικά Κενά / Εβδομάδα", value: `${inlineData.maxTotalGapsPerWeek}` });
    }

    return list;
  }, [inlineData, modifiedBulkFields, numMorningPeriods]);

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineData(null);
    setModifiedBulkFields(new Set());
    if (selectedTeacherId === "__header__") setSelectedTeacherId(null);
  };

  const saveInlineEdit = async () => {
    if (!inlineData) return;

    if (editingRowId === "__bulk__") {
      promptSaveBulk();
      return;
    }

    if (!inlineData.lastName.trim() || !inlineData.firstName.trim()) {
      toast.error("Συμπληρώστε Όνομα και Επώνυμο.");
      return;
    }

    setIsSavingInline(true);
    const finalShortName = normalizeGreekUpper(inlineData.shortName || generateDefaultShortName(inlineData.lastName));

    const constraintsData: TeacherConstraints = {
      availableDays: inlineData.availableDays.length > 0 ? inlineData.availableDays : ALL_DAYS_INDICES,
      dayHours: inlineData.dayHours,
      availability: computeAvailabilityGrid(
        inlineData.availableDays,
        inlineData.dayHours,
        inlineData.isAllDay,
        numMorningPeriods,
        numAllDayPeriods
      ),
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

  // Render an editable row (used for New Draft, Existing Single Edit, and Bulk Edit)
  const renderEditRow = (isNewDraft: boolean) => {
    if (!inlineData) return null;
    const isBulkMode = editingRowId === "__bulk__";

    const getRowBg = () => {
      if (isBulkMode) return "bg-indigo-50/90 border-y-2 border-indigo-500 ring-2 ring-indigo-400/50";
      if (isNewDraft) return "bg-emerald-50/60 border-y-2 border-emerald-500 ring-2 ring-emerald-400/40";
      return "bg-sky-50/70 border-y-2 border-sky-400 ring-2 ring-sky-400/50";
    };

    const getBorderClass = (fieldName: string) => {
      if (isBulkMode) {
        return modifiedBulkFields.has(fieldName)
          ? "border-indigo-500 ring-1 ring-indigo-400 bg-indigo-50/60 font-bold text-indigo-950"
          : "border-zinc-300 bg-white text-zinc-700";
      }
      return isNewDraft ? "border-emerald-400 bg-white" : "border-sky-300 bg-white";
    };

    return (
      <tr
        key={isBulkMode ? "__bulk__" : isNewDraft ? "__new__" : inlineData.id}
        className={`${getRowBg()} transition-colors select-none`}
      >
        {/* Color Picker (Locked in Bulk Edit) */}
        <td className="py-1.5 px-2 text-center">
          {isBulkMode ? (
            <div className="text-zinc-400 font-mono text-[11px] text-center" title="Κλειδωμένο στη μαζική επεξεργασία">—</div>
          ) : (
            <ColorSwatchPicker
              value={inlineData.color}
              onChange={(hex) => setInlineData({ ...inlineData, color: hex })}
              usedColors={data.teachers
                .filter((t) => t.id !== inlineData.id)
                .map((t) => t.color)}
            />
          )}
        </td>

        {/* Name Inputs (Locked in Bulk Edit) */}
        <td className="py-1.5 px-2">
          {isBulkMode ? (
            <div className="flex items-center gap-1.5 bg-indigo-100/70 border border-indigo-300/80 rounded-md px-2 py-1 text-xs text-indigo-950 font-semibold w-full">
              <Lock className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate">Όλοι οι επιλεγμένοι ({filteredTeachers.length} εκπ.)</span>
            </div>
          ) : (
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
          )}
        </td>

        {/* Short Name Input (Locked in Bulk Edit) */}
        <td className="py-1.5 px-1.5 text-center">
          {isBulkMode ? (
            <div className="text-zinc-400 font-mono text-[11px] text-center">—</div>
          ) : (
            <Input
              value={inlineData.shortName}
              onChange={(e) => setInlineData({ ...inlineData, shortName: normalizeGreekUpper(e.target.value) })}
              maxLength={4}
              placeholder="ΣΥΝΤ"
              className={`h-7 text-xs w-16 bg-white ${isNewDraft ? "border-emerald-400" : "border-sky-300"} font-mono font-bold text-center px-1 mx-auto`}
            />
          )}
        </td>

        {/* Specialty Select Dropdown (Locked in Bulk Edit) */}
        <td className="py-1.5 px-2 border-r border-zinc-200">
          {isBulkMode ? (
            <div className="text-zinc-400 text-[11px] text-center font-medium">— (Αμετάβλητη)</div>
          ) : (
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
          )}
        </td>

        {/* Teaching Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => {
              markBulkField("isTeaching");
              setInlineData({ ...inlineData, isTeaching: !inlineData.isTeaching });
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isTeaching
                ? "bg-emerald-500 border-emerald-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            } ${isBulkMode && modifiedBulkFields.has("isTeaching") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή (Διδάσκει στο πρόγραμμα)"
          >
            {inlineData.isTeaching ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* On-Call Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => {
              markBulkField("isOnCall");
              setInlineData({ ...inlineData, isOnCall: !inlineData.isOnCall });
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isOnCall
                ? "bg-emerald-500 border-emerald-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            } ${isBulkMode && modifiedBulkFields.has("isOnCall") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή (Συμμετοχή σε εφημερία)"
          >
            {inlineData.isOnCall ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* Morning Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => {
              markBulkField("isMorning");
              setInlineData({ ...inlineData, isMorning: !inlineData.isMorning });
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isMorning
                ? "bg-amber-500 border-amber-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            } ${isBulkMode && modifiedBulkFields.has("isMorning") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή (Πρωινό πρόγραμμα)"
          >
            {inlineData.isMorning ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* All-Day Toggle */}
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => {
              markBulkField("isAllDay");
              setInlineData({ ...inlineData, isAllDay: !inlineData.isAllDay });
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto border transition-all ${
              inlineData.isAllDay
                ? "bg-indigo-500 border-indigo-600 text-white shadow-2xs"
                : "bg-white border-zinc-300 text-zinc-300 hover:border-zinc-400"
            } ${isBulkMode && modifiedBulkFields.has("isAllDay") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή (Ολοήμερο πρόγραμμα)"
          >
            {inlineData.isAllDay ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </td>

        {/* Type Toggle */}
        <td className="py-2 px-1.5 text-center">
          <button
            type="button"
            onClick={() => {
              markBulkField("isSupport");
              setInlineData({ ...inlineData, isSupport: !inlineData.isSupport });
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
              inlineData.isSupport
                ? "bg-sky-100 border-sky-300 text-sky-800"
                : "bg-emerald-100 border-emerald-300 text-emerald-800"
            } ${isBulkMode && modifiedBulkFields.has("isSupport") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή τύπου (Βασική / Συμπληρωματική)"
          >
            {inlineData.isSupport ? "Συμπλ." : "Βασική"}
          </button>
        </td>

        {/* Status Toggle */}
        <td className="py-2 px-1.5 text-center border-r border-zinc-200">
          <button
            type="button"
            onClick={() => {
              markBulkField("isActive");
              setInlineData({ ...inlineData, isActive: !inlineData.isActive });
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
              inlineData.isActive
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-red-50 border-red-300 text-red-700"
            } ${isBulkMode && modifiedBulkFields.has("isActive") ? "ring-2 ring-indigo-500" : ""}`}
            title="Κλικ για αλλαγή κατάστασης (Ενεργός / Άδεια)"
          >
            {inlineData.isActive ? "Ενεργός" : "Άδεια"}
          </button>
        </td>

        {/* Available Days & Hours - Interactive Popover Chips */}
        <td className="py-2 px-1 text-center">
          <div className={`flex items-center justify-center gap-0.5 ${isBulkMode && (modifiedBulkFields.has("availableDays") || modifiedBulkFields.has("dayHours")) ? "p-0.5 rounded bg-indigo-100 ring-1 ring-indigo-400" : ""}`}>
            {DAY_LABELS.map((d) => {
              const isAvail = inlineData.availableDays.includes(d.index);
              const dayCfg = inlineData.dayHours?.[String(d.index)] || {
                morningActive: inlineData.isMorning ?? true,
                start: 1,
                end: numMorningPeriods,
                allDayActive: inlineData.isAllDay ?? false,
                allDayStart: 1,
                allDayEnd: numAllDayPeriods,
              };
              const bgStyle = getDayBackgroundStyle(isAvail, dayCfg, numMorningPeriods, numAllDayPeriods);

              return (
                <DayAvailabilityPopover
                  key={d.index}
                  dayIndex={d.index}
                  dayLabel={d}
                  isDayActive={isAvail}
                  dayConfig={dayCfg}
                  numMorningPeriods={numMorningPeriods}
                  numAllDayPeriods={numAllDayPeriods}
                  triggerTitle={getDaySummaryText(d.index, isAvail, dayCfg, numMorningPeriods, numAllDayPeriods)}
                  triggerStyle={bgStyle}
                  triggerClassName={`w-4.5 h-4.5 rounded-sm flex items-center justify-center text-[9px] font-bold border transition-all cursor-pointer shadow-2xs ${
                    isAvail
                      ? "border-sky-600/50 text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)] hover:brightness-110"
                      : "bg-white border-zinc-200 text-zinc-300 hover:border-zinc-400 line-through"
                  }`}
                  triggerContent={<span>{d.short}</span>}
                  onToggleDay={(active) => {
                    markBulkField("availableDays");
                    if (active && !isAvail) {
                      setInlineData((prev) => prev ? ({ ...prev, availableDays: [...prev.availableDays, d.index].sort() }) : prev);
                    } else if (!active && isAvail) {
                      if (inlineData.availableDays.length === 1) {
                        toast.info("Πρέπει να επιλεγεί τουλάχιστον 1 ημέρα.");
                        return;
                      }
                      setInlineData((prev) => prev ? ({ ...prev, availableDays: prev.availableDays.filter((idx) => idx !== d.index) }) : prev);
                    }
                  }}
                  onChangeConfig={(newCfg) => {
                    updateInlineDayConfig(d.index, newCfg);
                  }}
                  onApplyToAllDays={(cfg) => {
                    applyDayToAllDays(d.index, cfg);
                  }}
                />
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
            onChange={(e) => {
              markBulkField("maxWeeklyHours");
              setInlineData({
                ...inlineData,
                maxWeeklyHours: e.target.value === "" ? "" : Number(e.target.value),
              });
            }}
            className={`h-7 text-xs w-16 font-mono font-bold text-center px-1 mx-auto ${getBorderClass("maxWeeklyHours")}`}
          />
        </td>

        {/* Daily Hours Range (Min - Max) */}
        <td className="py-1.5 px-1 text-center">
          <div className="flex justify-center">
            <DailyHoursSliderPopover
              value={[
                typeof inlineData.minHoursPerDay === "number" ? inlineData.minHoursPerDay : 2,
                typeof inlineData.maxHoursPerDay === "number" ? inlineData.maxHoursPerDay : 5,
              ]}
              onChange={(range) => {
                markBulkField("minHoursPerDay");
                markBulkField("maxHoursPerDay");
                setInlineData({
                  ...inlineData,
                  minHoursPerDay: range[0],
                  maxHoursPerDay: range[1],
                });
              }}
              isBulkModified={
                isBulkMode &&
                (modifiedBulkFields.has("minHoursPerDay") || modifiedBulkFields.has("maxHoursPerDay"))
              }
            />
          </div>
        </td>

        {/* Max Consecutive Hours */}
        <td className="py-1.5 px-1 text-center border-r border-zinc-200">
          <Input
            type="number"
            min={1}
            max={6}
            value={inlineData.maxConsecutiveHours}
            onChange={(e) => {
              markBulkField("maxConsecutiveHours");
              setInlineData({
                ...inlineData,
                maxConsecutiveHours: e.target.value === "" ? "" : Number(e.target.value),
              });
            }}
            className={`h-7 text-xs w-12 font-mono text-center px-1 mx-auto ${getBorderClass("maxConsecutiveHours")}`}
          />
        </td>

        {/* Max Consecutive Gaps */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={4}
            value={inlineData.maxConsecutiveGaps}
            onChange={(e) => {
              markBulkField("maxConsecutiveGaps");
              setInlineData({
                ...inlineData,
                maxConsecutiveGaps: e.target.value === "" ? "" : Number(e.target.value),
              });
            }}
            className={`h-7 text-xs w-12 font-mono text-center px-1 mx-auto ${getBorderClass("maxConsecutiveGaps")}`}
          />
        </td>

        {/* Max Gaps / Day */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={5}
            value={inlineData.maxTotalGapsPerDay}
            onChange={(e) => {
              markBulkField("maxTotalGapsPerDay");
              setInlineData({
                ...inlineData,
                maxTotalGapsPerDay: e.target.value === "" ? "" : Number(e.target.value),
              });
            }}
            className={`h-7 text-xs w-12 font-mono text-center px-1 mx-auto ${getBorderClass("maxTotalGapsPerDay")}`}
          />
        </td>

        {/* Max Gaps / Week */}
        <td className="py-1.5 px-1 text-center">
          <Input
            type="number"
            min={0}
            max={15}
            value={inlineData.maxTotalGapsPerWeek}
            onChange={(e) => {
              markBulkField("maxTotalGapsPerWeek");
              setInlineData({
                ...inlineData,
                maxTotalGapsPerWeek: e.target.value === "" ? "" : Number(e.target.value),
              });
            }}
            className={`h-7 text-xs w-12 font-mono text-center px-1 mx-auto ${getBorderClass("maxTotalGapsPerWeek")}`}
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-100/60">
      {/* Unified Top Header Bar */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Modern Tabs Switcher + Filters Button & Records Counter */}
        <div className="flex items-center gap-3 shrink-0">
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
              onClick={() => onTabChange?.("rules")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "rules"
                  ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Κανόνες</span>
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-200" />

          {/* Filters Toggle Button & Teacher Count */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterRow((prev) => !prev)}
              className={`h-8 text-xs gap-1.5 border-zinc-200 font-medium cursor-pointer transition-all ${
                showFilterRow || hasActiveFilters
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900 shadow-2xs font-semibold"
                  : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
              title="Εμφάνιση / Απόκρυψη γραμμής φίλτρων στηλών"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Φίλτρα</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white font-bold rounded-full text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              {filteredTeachers.length} / {data.teachers.length}
            </span>
          </div>
        </div>

        {/* Right: Actions (Inline Save/Cancel or Standard Tools) */}
        <div className="flex items-center gap-2 shrink-0 pr-10">
          {editingRowId && inlineData ? (
            /* Active Inline Editing Controls */
            editingRowId === "__bulk__" ? (
              <div className="flex items-center gap-2 bg-indigo-50/95 border border-indigo-300 px-3 py-1 rounded-lg animate-in fade-in shadow-2xs">
                <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Μαζική Επεξεργασία ({filteredTeachers.length} εκπ. • {modifiedBulkFields.size} αλλαγές)</span>
                </span>
                <div className="h-4 w-px bg-indigo-200 mx-1" />
                <Button
                  onClick={promptSaveBulk}
                  disabled={modifiedBulkFields.size === 0 || isSavingBulk}
                  size="sm"
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 shadow-2xs gap-1 disabled:opacity-40 cursor-pointer"
                  title="Εφαρμογή μαζικών αλλαγών (Enter)"
                >
                  <Check className="w-3.5 h-3.5" />
                  Εφαρμογή ({modifiedBulkFields.size})
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
              <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-300 px-3 py-1 rounded-lg animate-in fade-in">
                <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                  {editingRowId === "__new__" ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Νέος στη γραμμή</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>Επεξεργασία: {inlineData.lastName}</span>
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
            )
          ) : (
            /* Standard Action Buttons */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/80">
                {selectedTeacherId === "__header__" ? (
                  <Button
                    onClick={startBulkEdit}
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-2xs gap-1"
                    title="Μαζική επεξεργασία για όλους τους ορατούς εκπαιδευτικούς"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    <span>Μαζική ({filteredTeachers.length})</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const target = data.teachers.find((t) => t.id === selectedTeacherId);
                      if (target) startInlineEdit(target);
                      else toast.warning("Επιλέξτε έναν εκπαιδευτικό από τον πίνακα.");
                    }}
                    disabled={!selectedTeacherId}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 font-medium cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Επεξεργασία
                  </Button>
                )}

                <Button
                  onClick={handleStartCopy}
                  disabled={!selectedTeacherId || selectedTeacherId === "__header__"}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Αντιγραφή
                </Button>

                <Button
                  onClick={promptDeleteTeacher}
                  disabled={!selectedTeacherId || selectedTeacherId === "__header__"}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Διαγραφή
                </Button>
              </div>

              {/* Primary New Teacher Button */}
              <Button
                onClick={handleStartNew}
                size="sm"
                className="h-9 px-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Νέος Εκπαιδευτικός</span>
              </Button>
            </div>
          )}
        </div>
      </div>



      {/* Active Filter Tags Strip (Shown when any filter is active and Filter Row is closed) */}
      {hasActiveFilters && !showFilterRow && (
        <div className="bg-zinc-50/90 border-b border-zinc-200 px-4 py-1.5 flex items-center gap-1.5 flex-wrap text-xs shrink-0 animate-in fade-in">
          <span className="text-[11px] font-semibold text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-400" />
            Ενεργά Φίλτρα ({activeFiltersCount}):
          </span>
          {activeTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-zinc-300 text-zinc-800 text-[11px] shadow-2xs font-medium"
            >
              <span>{tag.label}</span>
              <button
                type="button"
                onClick={tag.clear}
                className="hover:text-red-600 rounded-sm p-0.5 transition-colors"
                title="Αφαίρεση φίλτρου"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium ml-2 underline underline-offset-2"
          >
            Καθαρισμός όλων
          </button>
        </div>
      )}

      {/* Main Full-Width Data Table (Pure 100% Inline Data Grid) */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
            {/* Super Headers & Sub Headers */}
            <thead
              onClick={() => {
                if (!editingRowId) {
                  setSelectedTeacherId(selectedTeacherId === "__header__" ? null : "__header__");
                }
              }}
              onDoubleClick={() => {
                if (!editingRowId) {
                  startBulkEdit();
                }
              }}
              className={`sticky top-0 z-20 border-b transition-all select-none cursor-pointer ${
                selectedTeacherId === "__header__"
                  ? "bg-indigo-50/95 border-indigo-400 text-indigo-950 ring-2 ring-indigo-400/80 shadow-xs"
                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100/80 shadow-2xs"
              }`}
              title={
                selectedTeacherId === "__header__"
                  ? "Επιλέχθηκε η επικεφαλίδα για Μαζική Επεξεργασία. Πατήστε «Μαζική» ή διπλό κλικ."
                  : "Κλικ για επιλογή, διπλό κλικ για Μαζική Επεξεργασία όλων των ορατών εκπαιδευτικών"
              }
            >
              {/* Row 1: Super Headers Grouping */}
              <tr className="border-b border-zinc-200 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                <th colSpan={4} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
                  ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
                </th>
                <th colSpan={6} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΙΔΙΟΤΗΤΕΣ & ΡΟΛΟΙ
                </th>
                <th colSpan={4} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
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
                <th className="py-2.5 px-2 w-20 text-center" title="Εύρος ωρών ανά ημέρα (Ελάχιστες - Μέγιστες)">Ώρες/ημ.</th>
                <th className="py-2.5 px-2 w-14 text-center border-r border-zinc-200" title="Μέγιστες συνεχόμενες ώρες">Συνεχ.</th>

                {/* Gaps (3) */}
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνεχόμενα κενά">Max συνεχ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά ημέρα">Max/ημ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά εβδομάδα">Max/εβδ.</th>
              </tr>

              {/* Row 3: Dedicated Inline Column Filters Row */}
              {showFilterRow && (
                <tr
                  onClick={(e) => e.stopPropagation()}
                  className="bg-zinc-100/90 border-b-2 border-zinc-300 text-zinc-800 animate-in fade-in select-none"
                >
                  {/* 1. Color / Reset Column */}
                  <th className="py-1 px-1 text-center">
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetAllFilters();
                        }}
                        className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center mx-auto transition-colors cursor-pointer shadow-2xs"
                        title="Καθαρισμός όλων των φίλτρων"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center mx-auto text-zinc-300">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </th>

                  {/* 2. Name Search Filter */}
                  <th className="py-1 px-1.5 min-w-[160px]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Αναζήτηση..."
                        className="h-7 text-xs bg-white border-zinc-200 pl-7 pr-6 rounded-md shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400 placeholder:text-zinc-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery("");
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 3. Short Name Filter */}
                  <th className="py-1 px-1 w-16 text-center">
                    <span className="text-zinc-300 text-[10px] font-mono">—</span>
                  </th>

                  {/* 4. Specialty Filter Dropdown with Multi-Select Popover */}
                  <th className="py-1 px-1.5 min-w-[140px] border-r border-zinc-200">
                    <Popover>
                      <PopoverTrigger
                        type="button"
                        className={`w-full h-7 text-[11px] px-2 rounded-md shadow-2xs transition-all flex items-center justify-between border cursor-pointer ${
                          selectedSpecialties.length > 0
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span className="truncate">
                          {selectedSpecialties.length === 0
                            ? "Όλες"
                            : selectedSpecialties.length <= 2
                            ? selectedSpecialties.join(", ")
                            : `${selectedSpecialties.length} ειδικότητες`}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 ml-1" />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-64 p-2 shadow-lg border border-zinc-200 bg-white text-xs z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
                          <span className="font-semibold text-zinc-800 text-[11px]">
                            Ειδικότητες {selectedSpecialties.length > 0 && `(${selectedSpecialties.length})`}
                          </span>
                          {selectedSpecialties.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedSpecialties([])}
                              className="text-[10px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
                            >
                              Καθαρισμός
                            </button>
                          )}
                        </div>

                        <div className="relative mb-2">
                          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          <Input
                            value={specialtySearchQuery}
                            onChange={(e) => setSpecialtySearchQuery(e.target.value)}
                            placeholder="Αναζήτηση..."
                            className="h-6 text-[11px] pl-6 pr-5 py-0 bg-zinc-50 border-zinc-200 focus-visible:ring-1"
                          />
                          {specialtySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setSpecialtySearchQuery("")}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                          {allSpecialties
                            .filter((s) => {
                              if (!specialtySearchQuery.trim()) return true;
                              const q = specialtySearchQuery.toLowerCase().trim();
                              return (
                                s.code.toLowerCase().includes(q) ||
                                s.name.toLowerCase().includes(q)
                              );
                            })
                            .map((spec) => {
                              const isChecked = selectedSpecialties.includes(spec.code);
                              return (
                                <div
                                  key={spec.code}
                                  onClick={() => toggleSpecialtyFilter(spec.code)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                    isChecked
                                      ? "bg-indigo-50/80 text-indigo-950 font-medium"
                                      : "hover:bg-zinc-100 text-zinc-700"
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      isChecked
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-zinc-300 bg-white"
                                    }`}
                                  >
                                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="font-mono font-bold text-[11px] shrink-0">
                                    {spec.code}
                                  </span>
                                  <span className="text-[11px] text-zinc-600 truncate">
                                    {spec.name}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>

                  {/* 5. Teaching Filter */}
                  <th className="py-1 px-0.5 w-14 text-center">
                    <Select
                      value={teachingFilter}
                      onValueChange={(val) => setTeachingFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all ${
                          teachingFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {teachingFilter === "all" ? "Αδιαφ." : teachingFilter === "yes" ? "✓ Ναι" : "✗ Όχι"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="yes">✓ Ναι</SelectItem>
                        <SelectItem value="no">✗ Όχι</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 6. On-Call Filter */}
                  <th className="py-1 px-0.5 w-14 text-center">
                    <Select
                      value={onCallFilter}
                      onValueChange={(val) => setOnCallFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all ${
                          onCallFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {onCallFilter === "all" ? "Αδιαφ." : onCallFilter === "yes" ? "✓ Ναι" : "✗ Όχι"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="yes">✓ Ναι</SelectItem>
                        <SelectItem value="no">✗ Όχι</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 7. Morning Filter */}
                  <th className="py-1 px-0.5 w-14 text-center">
                    <Select
                      value={morningFilter}
                      onValueChange={(val) => setMorningFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all ${
                          morningFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {morningFilter === "all" ? "Αδιαφ." : morningFilter === "yes" ? "✓ Ναι" : "✗ Όχι"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="yes">✓ Ναι</SelectItem>
                        <SelectItem value="no">✗ Όχι</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 8. All-Day Filter */}
                  <th className="py-1 px-0.5 w-16 text-center">
                    <Select
                      value={allDayFilter}
                      onValueChange={(val) => setAllDayFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all ${
                          allDayFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {allDayFilter === "all" ? "Αδιαφ." : allDayFilter === "yes" ? "✓ Ναι" : "✗ Όχι"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="yes">✓ Ναι</SelectItem>
                        <SelectItem value="no">✗ Όχι</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 9. Type Filter */}
                  <th className="py-1 px-1 w-24 text-center">
                    <Select
                      value={supportFilter}
                      onValueChange={(val) => setSupportFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1.5 rounded-md shadow-2xs transition-all ${
                          supportFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {supportFilter === "all" ? "Αδιαφ." : supportFilter === "general" ? "Γενική" : "Παράλληλη"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="general">Γενική</SelectItem>
                        <SelectItem value="support">Παράλληλη/Τ.Ε.</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 10. Status Filter */}
                  <th className="py-1 px-1 w-20 text-center border-r border-zinc-200">
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => setStatusFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1.5 rounded-md shadow-2xs transition-all ${
                          statusFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {statusFilter === "all" ? "Αδιαφ." : statusFilter === "active" ? "Ενεργοί" : "Ανενεργοί"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="active">Ενεργοί</SelectItem>
                        <SelectItem value="inactive">Ανενεργοί</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 11. Days Filter (5 Interactive Day Badges) */}
                  <th className="py-1 px-1 w-[115px] text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {DAY_LABELS.map((d) => {
                        const isSelected = selectedFilterDays.includes(d.index);
                        return (
                          <button
                            key={d.index}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFilterDay(d.index);
                            }}
                            className={`w-5 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-zinc-900 text-white shadow-2xs ring-1 ring-zinc-900"
                                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
                            }`}
                            title={`Φίλτρο παρουσίας: ${d.name} (${isSelected ? "Ενεργό" : "Ανενεργό"})`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                      {selectedFilterDays.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFilterDays([]);
                          }}
                          className="w-4 h-6 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Καθαρισμός ημερών"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 12. Weekly Hours Filter (0 - 25) */}
                  <th className="py-1 px-0.5 w-16 text-center">
                    <RangeFilterPopover
                      title="Ώρες Εβδομάδας"
                      min={0}
                      max={25}
                      unit="ω"
                      value={weeklyHoursRange}
                      onChange={setWeeklyHoursRange}
                      presets={[
                        { label: "24ω", range: [24, 24] },
                        { label: "20-24ω", range: [20, 24] },
                        { label: "10-19ω", range: [10, 19] },
                        { label: "0-9ω", range: [0, 9] },
                      ]}
                    />
                  </th>

                  {/* 13. Daily Hours Range Filter (1 - 7) */}
                  <th className="py-1 px-0.5 w-20 text-center">
                    <RangeFilterPopover
                      title="Ώρες / Ημέρα"
                      min={1}
                      max={7}
                      unit="ω"
                      value={dailyHoursRange}
                      onChange={setDailyHoursRange}
                      presets={[
                        { label: "1-6ω", range: [1, 6] },
                        { label: "1-5ω", range: [1, 5] },
                        { label: "1-4ω", range: [1, 4] },
                        { label: "2-6ω", range: [2, 6] },
                        { label: "3-6ω", range: [3, 6] },
                      ]}
                    />
                  </th>

                  {/* 15. Consecutive Hours Filter (1 - 6) */}
                  <th className="py-1 px-0.5 w-14 text-center border-r border-zinc-200">
                    <RangeFilterPopover
                      title="Max Συνεχόμενες Ώρες"
                      min={1}
                      max={6}
                      unit="ω"
                      value={consecutiveHoursRange}
                      onChange={setConsecutiveHoursRange}
                      presets={[
                        { label: "4ω", range: [4, 4] },
                        { label: "3ω", range: [3, 3] },
                        { label: "2ω", range: [2, 2] },
                      ]}
                    />
                  </th>

                  {/* 16. Consecutive Gaps Filter (1 - 3, bounds 0 - 3) */}
                  <th className="py-1 px-0.5 w-16 text-center">
                    <RangeFilterPopover
                      title="Max Συνεχόμενα Κενά"
                      min={0}
                      max={3}
                      unit=""
                      value={consecutiveGapsRange}
                      onChange={setConsecutiveGapsRange}
                      presets={[
                        { label: "0 (Χωρίς)", range: [0, 0] },
                        { label: "1", range: [1, 1] },
                        { label: "2-3", range: [2, 3] },
                      ]}
                    />
                  </th>

                  {/* 17. Daily Gaps Filter (0 - 3) */}
                  <th className="py-1 px-0.5 w-16 text-center">
                    <RangeFilterPopover
                      title="Max Κενά / Ημέρα"
                      min={0}
                      max={3}
                      unit=""
                      value={dailyGapsRange}
                      onChange={setDailyGapsRange}
                      presets={[
                        { label: "0 (Χωρίς)", range: [0, 0] },
                        { label: "1", range: [1, 1] },
                        { label: "2-3", range: [2, 3] },
                      ]}
                    />
                  </th>

                  {/* 18. Weekly Gaps Filter (0 - 10) */}
                  <th className="py-1 px-0.5 w-16 text-center">
                    <RangeFilterPopover
                      title="Max Κενά / Εβδομάδα"
                      min={0}
                      max={10}
                      unit=""
                      value={weeklyGapsRange}
                      onChange={setWeeklyGapsRange}
                      presets={[
                        { label: "0 (Κανένα)", range: [0, 0] },
                        { label: "1-2", range: [1, 2] },
                        { label: "3-5", range: [3, 5] },
                      ]}
                    />
                  </th>
                </tr>
              )}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100">
              {/* If in Bulk Edit mode, render bulk row at the top */}
              {editingRowId === "__bulk__" && renderEditRow(false)}

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

                    {/* Available Days & Hours - Compact Slim View */}
                    <td className="py-2.5 px-2 text-center">
                      {(() => {
                        const tchDayHours = extractDayHours(c, tch.isAllDay, numMorningPeriods, numAllDayPeriods, tch.isMorning);

                        return (
                          <div className="flex items-center justify-center gap-0.5">
                            {DAY_LABELS.map((d) => {
                              const isAvail = daysList.includes(d.index);
                              const dayCfg = tchDayHours[String(d.index)];
                              const summary = getDaySummaryText(d.index, isAvail, dayCfg, numMorningPeriods, numAllDayPeriods);
                              const bgStyle = getDayBackgroundStyle(isAvail, dayCfg, numMorningPeriods, numAllDayPeriods);

                              return (
                                <span
                                  key={d.index}
                                  title={summary}
                                  style={bgStyle}
                                  className={`w-4 h-4.5 rounded-sm flex items-center justify-center text-[9px] font-bold transition-all shadow-2xs ${
                                    isAvail
                                      ? "border border-sky-600/50 text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
                                      : "bg-zinc-100 border border-zinc-200/60 text-zinc-300 line-through"
                                  }`}
                                >
                                  {d.short}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Weekly Hours */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-zinc-900 bg-zinc-50/50">
                      {tch.maxWeeklyHours || 24}ω
                    </td>

                    {/* Daily Hours Range */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 font-medium">
                      {(c?.minHoursPerDay ?? 2) === (c?.maxHoursPerDay ?? 5)
                        ? `${c?.minHoursPerDay ?? 2}ω`
                        : `${c?.minHoursPerDay ?? 2}-${c?.maxHoursPerDay ?? 5}ω`}
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
                  <td colSpan={17} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium text-sm text-zinc-700">Δεν βρέθηκαν εκπαιδευτικοί</p>
                      <p className="text-xs text-zinc-400">
                        {hasActiveFilters
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

      {/* Bulk Edit Confirmation Dialog */}
      <Dialog
        open={isBulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isSavingBulk) setIsBulkConfirmOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-zinc-200 z-[90] bg-white text-zinc-900 shadow-2xl">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100/90 flex items-center justify-center shrink-0 text-indigo-600 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-bold text-zinc-900">
                  Επιβεβαίωση Μαζικής Επεξεργασίας
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-zinc-600">
                  Πρόκειται να εφαρμοστούν μαζικές αλλαγές σε{" "}
                  <strong className="text-indigo-900 font-semibold">{filteredTeachers.length}</strong> εκπαιδευτικούς.
                </DialogDescription>
              </div>
            </div>

            {/* List of modified fields */}
            <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 text-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Πεδία προς ενημέρωση ({modifiedFieldsSummary.length}):
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {modifiedFieldsSummary.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-1 px-2.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-zinc-700">{item.label}</span>
                    <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 text-[11px]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-zinc-400 italic pt-1">
                *Όλα τα υπόλοιπα στοιχεία κάθε εκπαιδευτικού παραμένουν ανέπαφα.
              </p>
            </div>
          </div>

          <DialogFooter className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingBulk}
              onClick={() => setIsBulkConfirmOpen(false)}
              className="h-8 text-xs text-zinc-700"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSavingBulk}
              onClick={confirmSaveBulk}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-xs"
            >
              {isSavingBulk ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Εφαρμογή...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Εφαρμογή σε {filteredTeachers.length} εκπ.</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
