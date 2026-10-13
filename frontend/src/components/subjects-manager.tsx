"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { TimetableData, Subject, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UnifiedAssignmentPopover } from "@/components/UnifiedAssignmentPopover";
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
  BookOpen,
  Users,
  GraduationCap,
  CalendarDays,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeGreekUpper } from "./teachers-manager";
import { getSpecialties, getSpecialtyByCode, findSpecialty } from "@/lib/specialties";
import { ClassColorPicker } from "@/components/class-color-picker";
import { CLASS_15_PALETTE } from "@/lib/palette";

export function normalizeAssignedTeachers(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") return val.trim() ? [val.trim()] : [];
  return [];
}

interface SubjectsManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: "teachers" | "classes" | "subjects" | "rules";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "rules") => void;
  onClose?: () => void;
}

// Dynamic class usage instead of GRADE_KEYS

// Helper to normalize any grade hours value to [min, max] tuple
export function normalizeClassHours(val: [number, number] | number | undefined | null): [number, number] {
  if (val === undefined || val === null) return [0, 0];
  if (Array.isArray(val)) {
    const min = typeof val[0] === "number" ? val[0] : 0;
    const max = typeof val[1] === "number" ? val[1] : min;
    return [Math.min(min, max), Math.max(min, max)];
  }
  if (typeof val === "number") {
    return [val, val];
  }
  return [0, 0];
}

export function isLanguageSubject(title?: string | null, code?: string | null): boolean {
  if (!title && !code) return false;
  const t = (title || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip Greek accents
  const c = (code || "")
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    t.includes("γλωσσ") ||
    t === "γλωσσα" ||
    c === "ΓΛΩ" ||
    c === "ΓΛΩΣ" ||
    c === "ΓΛΩΣΣΑ" ||
    c === "ΓΛΩΣΣ"
  );
}

interface InlineSubjectEditState {
  id?: string;
  title: string;
  code: string;
  color: string;
  allowedSpecialties: string[];
  classHours: Record<string, [number, number]>;
  classTeachers: Record<string, string[]>;
  classAssignments: Record<string, any[]>;
  maxPerDay: number | null;
}

/* ========================================================================== */
/* DUAL-THUMB RANGE SLIDER POPOVER FOR GRADE HOURS IN EDIT ROW               */
/* ========================================================================== */
/* ========================================================================== */
/* DUAL-THUMB RANGE SLIDER POPOVER FOR CLASS/SECTION HOURS IN EDIT ROW        */
/* ========================================================================== */
interface ClassHoursSliderPopoverProps {
  classNameLabel: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onApplyToAll?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

const ClassHoursSliderPopover: React.FC<ClassHoursSliderPopoverProps> = ({
  classNameLabel,
  value,
  onChange,
  onApplyToAll,
  min = 0,
  max = 10,
  step = 1,
  unit = "ω",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const low = value ? value[0] : 0;
  const high = value ? value[1] : 0;

  const [localLow, setLocalLow] = useState(low);
  const [localHigh, setLocalHigh] = useState(high);
  const [activeDrag, setActiveDrag] = useState<"low" | "high" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalLow(value[0]);
    setLocalHigh(value[1]);
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
    if (low === 0 && high === 0) return "0ω";
    if (low === high) return `${low}${unit}`;
    return `${low}-${high}${unit}`;
  }, [low, high, unit]);

  const isRange = low !== high;
  const isZero = low === 0 && high === 0;

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        className={`h-7 px-1.5 min-w-[50px] text-xs font-mono font-bold rounded-md border flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
          isRange
            ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300/60 font-black"
            : !isZero
            ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400"
            : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        } ${className}`}
        title={`Ώρες τμήματος ${classNameLabel}: ${displayText} (Κλικ για επεξεργασία)`}
      >
        <span>{displayText}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-76 p-3 shadow-xl border border-zinc-200 bg-white text-xs z-[80] rounded-xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-zinc-900 text-xs">Τμήμα {classNameLabel}</span>
            <span className="text-[10.5px] text-zinc-400 font-medium">— Ώρες</span>
          </div>
          {!isZero && (
            <button
              type="button"
              onClick={() => commitRange(0, 0)}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-semibold cursor-pointer underline underline-offset-2"
            >
              Μηδενισμός (0ω)
            </button>
          )}
        </div>

        {/* Current Active Range Tag Badge */}
        <div className="flex items-center justify-center mb-2.5">
          <div
            className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold shadow-2xs flex items-center gap-1.5 ${
              isRange
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : !isZero
                ? "bg-indigo-50 border-indigo-200 text-indigo-950"
                : "bg-zinc-50 border-zinc-200 text-zinc-500"
            }`}
          >
            {isZero ? (
              <span className="text-zinc-500 font-sans font-medium text-[11px]">
                0 ώρες (Δεν διδάσκεται)
              </span>
            ) : localLow === localHigh ? (
              <span>
                {localLow}
                {unit}{" "}
                <span className="text-[10px] font-sans font-normal text-indigo-600">
                  (σταθερή τιμή)
                </span>
              </span>
            ) : (
              <span>
                {localLow}
                {unit} — {localHigh}
                {unit}{" "}
                <span className="text-[10px] font-sans font-normal text-amber-700">
                  (εύρος)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Dual Thumb Slider Bar */}
        <div className="px-2 py-2.5 select-none mb-1">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative h-6 flex items-center cursor-pointer touch-none"
          >
            {/* Background Track */}
            <div className="absolute w-full h-2 bg-zinc-200 rounded-full pointer-events-none" />

            {/* Active Range Fill */}
            <div
              className={`absolute h-2 rounded-full transition-all duration-75 pointer-events-none ${
                isRange ? "bg-amber-500" : "bg-indigo-600"
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(0, rightPercent - leftPercent)}%`,
              }}
            />

            {/* Left Thumb */}
            <div
              tabIndex={0}
              role="slider"
              aria-label={`Τμήμα ${classNameLabel} από`}
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
              className={`absolute w-5 h-5 bg-white border-2 ${
                isRange ? "border-amber-500" : "border-indigo-600"
              } rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
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
              aria-label={`Τμήμα ${classNameLabel} έως`}
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
              className={`absolute w-5 h-5 bg-white border-2 ${
                isRange ? "border-amber-500" : "border-indigo-600"
              } rounded-full shadow-md -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-115 focus:scale-115 focus:outline-hidden ring-2 transition-transform ${
                activeDrag === "high"
                  ? "ring-indigo-400 scale-120 z-20"
                  : "ring-indigo-100 hover:ring-indigo-300 z-10"
              }`}
              style={{ left: `${rightPercent}%` }}
            />
          </div>

          {/* Endpoint labels */}
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1 select-none pointer-events-none">
            <span>
              {min}
              {unit}
            </span>
            <span>
              {max}
              {unit}
            </span>
          </div>
        </div>

        {/* 1. Σταθερή Τιμή (Ορισμός ίδιας τιμής και για τα δύο άκρα) */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-indigo-950">Σταθερή Τιμή:</span>
            {localLow === localHigh && !isZero ? (
              <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded">
                {localLow}{unit} Σταθερό
              </span>
            ) : isRange ? (
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
                value={localLow === localHigh ? localLow : ""}
                placeholder={localLow === localHigh ? "" : `${localLow}-${localHigh}`}
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
              <span className="text-zinc-500 font-mono text-xs font-semibold">{unit}</span>
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

        {/* 2. Εύρος Ωρών (Από — Έως) */}
        <div className="bg-zinc-50/80 border border-zinc-200 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-zinc-700">Εύρος Ωρών (Από — Έως):</span>
            {isRange && (
              <span className="text-[9.5px] text-amber-800 font-bold bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded">
                Ενεργό
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Low bound */}
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
                <span className="font-mono font-bold text-xs text-zinc-900 w-5 text-center">
                  {localLow}
                </span>
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

            {/* High bound */}
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
                <span className="font-mono font-bold text-xs text-zinc-900 w-5 text-center">
                  {localHigh}
                </span>
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

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between items-center">
          {onApplyToAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onApplyToAll([localLow, localHigh]);
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10.5px] border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-none cursor-pointer"
              title="Εφαρμογή αυτών των ωρών σε όλα τα τμήματα (πλην Ολοήμερου)"
            >
              Εφαρμογή σε όλα
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 px-3 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-white font-semibold cursor-pointer shadow-2xs"
          >
            Έτοιμο
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ========================================================================== */
/* MULTI-TEACHER ASSIGNMENT POPOVER FOR INLINE EDIT ROW                       */
/* ========================================================================== */
interface ClassTeacherMultiSelectPopoverProps {
  smartDefaultIds?: string[];
  classNameLabel: string;
  selectedTeacherIds: string[];
  eligibleTeachers: Teacher[];
  onChange: (teacherIds: string[]) => void;
  onApplyToAll?: (teacherIds: string[]) => void;
}

const getSmartDefaultIds = (c: any, eligible: Teacher[]): string[] => {
  if (c.headTeacherId && eligible.some((t) => t.id === c.headTeacherId)) return [c.headTeacherId];
  if (eligible.length === 1) return [eligible[0].id];
  return ["all"];
};

const ClassTeacherMultiSelectPopover: React.FC<ClassTeacherMultiSelectPopoverProps> = ({
  classNameLabel,
  selectedTeacherIds,
  smartDefaultIds,
  eligibleTeachers,
  onChange,
  onApplyToAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleTeacher = (id: string) => {
    let current = selectedTeacherIds.filter(v => v !== "all");
    if (current.includes(id)) {
      onChange(current.filter((tId) => tId !== id));
    } else {
      onChange([...current, id]);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return eligibleTeachers;
    const q = searchQuery.toLowerCase().trim();
    return eligibleTeachers.filter((t) => {
      const full = `${t.lastName} ${t.firstName} ${t.specialty}`.toLowerCase();
      return full.includes(q);
    });
  }, [eligibleTeachers, searchQuery]);

  // Determine trigger label
  const isUsingSmartDefault = selectedTeacherIds.length === 0 && smartDefaultIds && smartDefaultIds.length > 0 && smartDefaultIds[0] !== "all";
  const displayIds = selectedTeacherIds.length > 0 ? selectedTeacherIds : (smartDefaultIds || []);

  let triggerText = "ΟΛΟΙ";
  let triggerTitle = "Ανάθεση: Όλοι οι επιλέξιμοι εκπαιδευτικοί";
  let isCustom = false;
  let isSmart = isUsingSmartDefault;

  if (selectedTeacherIds.includes("all") || (displayIds.length === 0)) {
     triggerText = "ΟΛΟΙ";
     triggerTitle = "Ανάθεση: ΟΛΟΙ";
     isCustom = selectedTeacherIds.includes("all");
     isSmart = false;
  } else if (displayIds.length === 1) {
    const t = eligibleTeachers.find((t) => t.id === selectedTeacherIds[0]);
    if (t) {
      const rawName = t.shortName || t.lastName || t.firstName || "";
      triggerText = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 4);
      triggerTitle = `Ανάθεση: ${t.lastName} ${t.firstName}`;
      isCustom = true;
    }
  } else if (selectedTeacherIds.length === 2) {
    const names = selectedTeacherIds.map((id) => {
      const t = eligibleTeachers.find((t) => t.id === id);
      const raw = t?.shortName || t?.lastName || t?.firstName || "";
      return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 4);
    });
    triggerText = names.join("/");
    triggerTitle = `Ανάθεση (2): ${selectedTeacherIds.map(id => eligibleTeachers.find(t => t.id === id)?.lastName).filter(Boolean).join(", ")}`;
    isCustom = true;
  } else if (selectedTeacherIds.length > 2) {
    triggerText = `${selectedTeacherIds.length} εκπ.`;
    triggerTitle = `Ανάθεση (${selectedTeacherIds.length} εκπαιδευτικοί)`;
    isCustom = true;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        title={triggerTitle}
        className={`h-5 w-[44px] px-1 rounded flex items-center justify-between gap-0.5 text-[9px] font-mono font-semibold transition-all cursor-pointer shadow-2xs border ${
          isSmart
            ? "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/90"
            : isCustom
              ? displayIds.length > 1
                ? "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200/90"
                : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 border-zinc-300"
              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border-zinc-200/80"
        }`}
      >
        <span className="truncate tracking-tight">{triggerText}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-64 p-2.5 shadow-xl border border-zinc-200 bg-white text-xs z-50 rounded-xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-600" />
            <span className="font-bold text-zinc-800 text-xs">
              Ανάθεση: {classNameLabel}
            </span>
          </div>
          {selectedTeacherIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Επαναφορά
            </button>
          )}
        </div>

        <p className="text-[10px] text-zinc-500 mb-2 leading-tight">
          Επιλέξτε έναν ή περισσότερους εκπαιδευτικούς που μπορούν να διδάξουν στο {classNameLabel}.
        </p>

        {/* Option: ΟΛΟΙ (Χωρίς περιορισμό) */}
        <div
          onClick={() => onChange(["all"])}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors mb-1.5 border ${
            selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)
              ? "bg-zinc-100 border-zinc-300 font-medium text-zinc-900"
              : "hover:bg-zinc-50 border-transparent text-zinc-600"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
              selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "border-zinc-300 bg-white"
            }`}
          >
            {(selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold">ΟΛΟΙ (Χωρίς περιορισμό)</span>
            <span className="text-[9.5px] text-zinc-400">Οποιοσδήποτε επιλέξιμος εκπαιδευτικός</span>
          </div>
        </div>

        {/* Search if more than 5 teachers */}
        {eligibleTeachers.length > 5 && (
          <div className="relative mb-2">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση εκπαιδευτικού..."
              className="h-6 text-[11px] pl-6 pr-5 py-0 bg-zinc-50 border-zinc-200 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Teachers List */}
        <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
          {filteredTeachers.length === 0 ? (
            <p className="text-zinc-400 italic text-[11px] py-2 text-center">
              Δεν βρέθηκαν εκπαιδευτικοί
            </p>
          ) : (
            filteredTeachers.map((t) => {
              const isChecked = displayIds.includes(t.id);
              const rawName = t.shortName || t.lastName || t.firstName || "";
              const label = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 4);

              return (
                <div
                  key={t.id}
                  onClick={() => toggleTeacher(t.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors border select-none ${
                    isChecked
                      ? isSmart ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 font-medium" : "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-medium"
                      : "hover:bg-zinc-50 border-transparent text-zinc-700"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all border ${
                      isChecked
                        ? (isSmart ? "bg-emerald-500 border-emerald-500 text-white" : "bg-indigo-600 border-indigo-600 text-white")
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color || "#71717a" }}
                  />
                  <span className="font-mono font-bold text-[11px] shrink-0 text-zinc-800">
                    {label}
                  </span>
                  <span className="text-[11px] text-zinc-700 truncate">
                    {t.lastName} {t.firstName}
                  </span>
                  <span className="text-[9.5px] font-mono text-zinc-400 shrink-0 ml-auto">
                    {t.specialty}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between items-center">
          {onApplyToAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onApplyToAll(selectedTeacherIds);
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10.5px] border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-none cursor-pointer"
              title="Εφαρμογή αυτής της ανάθεσης σε όλα τα τμήματα (πλην Ολοήμερου)"
            >
              Εφαρμογή σε όλα
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 px-3 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-white font-semibold cursor-pointer shadow-2xs"
          >
            Έτοιμο
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ========================================================================== */
/* MULTI-SPECIALTY SELECT POPOVER FOR INLINE EDIT ROW                         */
/* ========================================================================== */
interface SpecialtyMultiSelectPopoverProps {
  selectedSpecialties: string[];
  onChange: (specialties: string[]) => void;
  allSpecialties: ReturnType<typeof getSpecialties>;
  isNewDraft?: boolean;
}

const SpecialtyMultiSelectPopover: React.FC<SpecialtyMultiSelectPopoverProps> = ({
  selectedSpecialties,
  onChange,
  allSpecialties,
  isNewDraft = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSpecialty = (code: string) => {
    if (selectedSpecialties.includes(code)) {
      onChange(selectedSpecialties.filter((c) => c !== code));
    } else {
      onChange([...selectedSpecialties, code]);
    }
  };

  const filteredSpecialties = useMemo(() => {
    if (!searchQuery.trim()) return allSpecialties;
    const q = searchQuery.toLowerCase().trim();
    return allSpecialties.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [allSpecialties, searchQuery]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        className={`h-7 text-xs bg-white rounded-md border ${
          isNewDraft ? "border-emerald-400" : "border-sky-300"
        } w-full text-zinc-800 font-medium px-2 py-0 flex items-center justify-between min-w-[170px] shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer text-left`}
        title="Κάντε κλικ για επιλογή μίας ή περισσότερων ειδικοτήτων"
      >
        <div className="flex items-center gap-1 overflow-hidden truncate">
          {selectedSpecialties.length === 0 ? (
            <span className="text-zinc-400 italic text-[11px]">+ Επιλογή ειδικοτήτων...</span>
          ) : selectedSpecialties.length === 1 ? (
            <span className="font-mono font-bold text-indigo-700 text-xs">
              {selectedSpecialties[0]}
              <span className="font-sans font-normal text-zinc-600 ml-1 text-[11px]">
                ({getSpecialtyByCode(selectedSpecialties[0])?.name || selectedSpecialties[0]})
              </span>
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-bold text-indigo-900 text-xs bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                {selectedSpecialties.length} ειδικότητες
              </span>
              <span className="font-mono text-zinc-600 text-[11px]">
                ({selectedSpecialties.join(", ")})
              </span>
            </div>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 ml-1 text-zinc-600" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 p-2.5 shadow-xl border border-zinc-200 bg-white text-xs z-[80] rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
          <span className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
            <span>Ειδικότητες Διδασκαλίας</span>
            {selectedSpecialties.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                {selectedSpecialties.length}
              </span>
            )}
          </span>
          {selectedSpecialties.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-semibold cursor-pointer underline underline-offset-2"
            >
              Καθαρισμός
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση κωδικού ή ειδικότητας..."
            className="h-6 text-[11px] pl-6 pr-5 py-0 bg-zinc-50 border-zinc-200 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* List of Specialties */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
          {filteredSpecialties.map((spec) => {
            const isChecked = selectedSpecialties.includes(spec.code);
            return (
              <div
                key={spec.code}
                onClick={() => toggleSpecialty(spec.code)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-indigo-50/90 text-indigo-950 font-semibold"
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
                <span className="font-mono font-bold text-xs shrink-0 text-indigo-700">
                  {spec.code}
                </span>
                <span className="text-[11px] text-zinc-600 truncate">{spec.name}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">
            {selectedSpecialties.length} επιλεγμένες
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 px-2.5 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer"
          >
            Έτοιμο
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ========================================================================== */
/* MAIN SUBJECTS MANAGER COMPONENT                                            */
/* ========================================================================== */
export const SubjectsManager: React.FC<SubjectsManagerProps> = ({
  data,
  onRefresh,
  activeTab = "subjects",
  onTabChange,
  onClose,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Search & Filter state
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [titleFilter, setTitleFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");

  // Inline row edit state ("__new__" for new draft row, or existing subject.id)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<InlineSubjectEditState | null>(null);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Delete modal state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  // Ref to focus on first input (title)
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Primary school teaching specialties
  const allSpecialties = useMemo(() => {
    return getSpecialties({ level: "primary" });
  }, []);

  const sortedClasses = useMemo(() => {
    return [...data.classes].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [data.classes]);

  // Calculate assignments count per subject
  const subjectAssignmentsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    data.assignments.forEach((asg) => {
      map.set(asg.subjectId, (map.get(asg.subjectId) || 0) + 1);
    });
    return map;
  }, [data.assignments]);

  const toggleSpecialtyFilter = (code: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const resetAllFilters = () => {
    setTitleFilter("");
    setCodeFilter("");
    setSelectedSpecialties([]);
  };

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return data.subjects.filter((subj) => {
      // 1. Title Filter
      if (titleFilter.trim()) {
        const q = titleFilter.toLowerCase().trim();
        const title = (subj.title || "").toLowerCase();
        if (!title.includes(q)) return false;
      }

      // 2. Code Filter
      if (codeFilter.trim()) {
        const q = codeFilter.toLowerCase().trim();
        const code = (subj.code || "").toLowerCase();
        if (!code.includes(q)) return false;
      }

      // 3. Specialty Filter (Multi-select)
      if (selectedSpecialties.length > 0) {
        const subjSpecs =
          subj.allowedSpecialties && subj.allowedSpecialties.length > 0
            ? subj.allowedSpecialties
            : subj.defaultSpecialty
            ? [subj.defaultSpecialty]
            : [];
        const hasOverlap = subjSpecs.some((s) => selectedSpecialties.includes(s));
        if (!hasOverlap) return false;
      }

      return true;
    });
  }, [data.subjects, titleFilter, codeFilter, selectedSpecialties]);

  const hasActiveFilters =
    titleFilter.trim() !== "" ||
    codeFilter.trim() !== "" ||
    selectedSpecialties.length > 0;

  const activeFiltersCount =
    (titleFilter.trim() !== "" ? 1 : 0) +
    (codeFilter.trim() !== "" ? 1 : 0) +
    (selectedSpecialties.length > 0 ? 1 : 0);

  // Active tags for pill badges
  const activeTags = useMemo(() => {
    const list: { id: string; label: string; clear: () => void }[] = [];

    if (titleFilter.trim()) {
      list.push({
        id: "title",
        label: `Μάθημα: "${titleFilter.trim()}"`,
        clear: () => setTitleFilter(""),
      });
    }

    if (codeFilter.trim()) {
      list.push({
        id: "code",
        label: `Κωδικός: "${codeFilter.trim()}"`,
        clear: () => setCodeFilter(""),
      });
    }

    if (selectedSpecialties.length > 0) {
      list.push({
        id: "specialties",
        label: `Ειδικότητες: ${selectedSpecialties.join(", ")}`,
        clear: () => setSelectedSpecialties([]),
      });
    }

    return list;
  }, [titleFilter, codeFilter, selectedSpecialties]);

  // Auto focus input when editingRowId changes
  useEffect(() => {
    if (editingRowId) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [editingRowId]);

  // Start creating new subject draft in row 1
  const handleStartNew = () => {
    const usedColors = data.subjects.map((s) => s.color?.toLowerCase()).filter(Boolean);
    const nextColor =
      CLASS_15_PALETTE.find((c) => !usedColors.includes(c.hex.toLowerCase()))?.hex ||
      CLASS_15_PALETTE[data.subjects.length % CLASS_15_PALETTE.length].hex;

    const initialHours: Record<string, [number, number]> = {};
    const initialTeachers: Record<string, string[]> = {};
    const initialAssignments: Record<string, any[]> = {};
    sortedClasses.forEach((c) => {
      initialHours[c.id] = [0, 0];
      initialTeachers[c.id] = [];
      initialAssignments[c.id] = [];
    });

    setInlineData({
      title: "",
      code: "",
      color: nextColor,
      allowedSpecialties: ["ΠΕ70"],
      classHours: initialHours,
      classTeachers: initialTeachers,
      classAssignments: initialAssignments,
      maxPerDay: null,
    });
    setEditingRowId("__new__");
    setSelectedSubjectId(null);
  };

  // Start copying from selected subject into row 1 draft
  const handleStartCopy = () => {
    const target = data.subjects.find((s) => s.id === selectedSubjectId);
    if (!target) {
      toast.warning("Επιλέξτε ένα μάθημα από τον πίνακα για αντιγραφή.");
      return;
    }

    const targetHours: Record<string, [number, number]> = {};
    const targetTeachers: Record<string, string[]> = {};
    const targetAssignments: Record<string, any[]> = {};
    sortedClasses.forEach((c) => {
      targetHours[c.id] = normalizeClassHours(target.classHours?.[c.id]);
      targetTeachers[c.id] = normalizeAssignedTeachers(target.classTeachers?.[c.id]);
      targetAssignments[c.id] = target.classAssignments?.[c.id]
        ? JSON.parse(JSON.stringify(target.classAssignments[c.id]))
        : [];
    });

    const targetSpecs =
      target.allowedSpecialties && target.allowedSpecialties.length > 0
        ? [...target.allowedSpecialties]
        : target.defaultSpecialty
        ? [target.defaultSpecialty]
        : ["ΠΕ70"];

    setInlineData({
      title: `${target.title} (Αντίγραφο)`,
      code: `${target.code}2`,
      color: target.color || "#3b82f6",
      allowedSpecialties: targetSpecs,
      classHours: targetHours,
      classTeachers: targetTeachers,
      classAssignments: targetAssignments,
      maxPerDay: target.maxPerDay || null,
    });
    setEditingRowId("__new__");
    setSelectedSubjectId(null);
    toast.info(`Αντιγράφηκαν οι ρυθμίσεις του μαθήματος «${target.title}».`);
  };

  // Start editing existing subject row
  const startInlineEdit = (subj: Subject) => {
    const hours: Record<string, [number, number]> = {};
    const teachers: Record<string, string[]> = {};
    const assignments: Record<string, any[]> = {};
    sortedClasses.forEach((c) => {
      hours[c.id] = normalizeClassHours(subj.classHours?.[c.id]);
      teachers[c.id] = normalizeAssignedTeachers(subj.classTeachers?.[c.id]);
      assignments[c.id] = subj.classAssignments?.[c.id]
        ? JSON.parse(JSON.stringify(subj.classAssignments[c.id]))
        : [];
    });

    const specs =
      subj.allowedSpecialties && subj.allowedSpecialties.length > 0
        ? [...subj.allowedSpecialties]
        : subj.defaultSpecialty
        ? [subj.defaultSpecialty]
        : ["ΠΕ70"];

    setInlineData({
      id: subj.id,
      title: subj.title,
      code: subj.code,
      color: subj.color || "#3b82f6",
      allowedSpecialties: specs,
      classHours: hours,
      classTeachers: teachers,
      classAssignments: assignments,
      maxPerDay: subj.maxPerDay || null,
    });
    setEditingRowId(subj.id);
    setSelectedSubjectId(subj.id);
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineData(null);
  };

  // Save inline edit
  const saveInlineEdit = async () => {
    if (!inlineData) return;
    if (!inlineData.title.trim() || !inlineData.code.trim()) {
      toast.error("Συμπληρώστε τον τίτλο και τον κωδικό του μαθήματος.");
      return;
    }

    setIsSavingInline(true);
    const finalCode = normalizeGreekUpper(inlineData.code.trim());

    const cleanHours: Record<string, [number, number]> = {};
    const cleanTeachers: Record<string, string[] | null> = {};
    const cleanAssignments: Record<string, any[]> = {};
    sortedClasses.forEach((c) => {
      cleanHours[c.id] = inlineData.classHours[c.id] || [0, 0];
      const asgs = inlineData.classAssignments?.[c.id] || [];
      cleanAssignments[c.id] = asgs;
      if (asgs.length > 0) {
        cleanTeachers[c.id] = asgs.map((a) => a.teacherId);
      } else {
        const tList = inlineData.classTeachers[c.id];
        cleanTeachers[c.id] = tList && tList.length > 0 ? tList : null;
      }
    });

    const payload = {
      id: inlineData.id || undefined,
      title: inlineData.title.trim(),
      code: finalCode,
      color: inlineData.color,
      allowedSpecialties: inlineData.allowedSpecialties,
      defaultSpecialty: inlineData.allowedSpecialties[0] || "ΠΕ70",
      classHours: cleanHours,
      classTeachers: cleanTeachers,
      classAssignments: cleanAssignments,
      maxPerDay: inlineData.maxPerDay,
    };

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Αποτυχία αποθήκευσης μαθήματος");

      toast.success(
        inlineData.id
          ? `Το μάθημα «${inlineData.title}» ενημερώθηκε επιτυχώς!`
          : `Το νέο μάθημα «${inlineData.title}» δημιουργήθηκε επιτυχώς!`
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

  // Keyboard shortcut: Enter to save, Escape to cancel
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
          // If popover is open, don't trigger save
          if (target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content-wrapper]')) {
            return;
          }
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

  // Prompt delete modal
  const promptDeleteSubject = () => {
    const target = data.subjects.find((s) => s.id === selectedSubjectId);
    if (!target) {
      toast.warning("Επιλέξτε ένα μάθημα για διαγραφή.");
      return;
    }
    setSubjectToDelete(target);
  };

  // Perform actual deletion
  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setIsDeletingSubject(true);
    try {
      const res = await fetch(`/api/subjects?id=${subjectToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Αποτυχία διαγραφής μαθήματος");
      toast.info(`Το μάθημα «${subjectToDelete.title}» διαγράφηκε.`);
      if (selectedSubjectId === subjectToDelete.id) setSelectedSubjectId(null);
      if (editingRowId === subjectToDelete.id) cancelInlineEdit();
      setSubjectToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingSubject(false);
    }
  };

  // Render an editable row (both for __new__ and existing subject)
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
            usedColors={data.subjects
              .filter((s) => s.id !== inlineData.id)
              .map((s) => s.color)
              .filter(Boolean) as string[]}
          />
        </td>

        {/* Title Input */}
        <td className="py-1.5 px-2">
          <Input
            ref={titleInputRef}
            value={inlineData.title}
            onChange={(e) => {
              const val = e.target.value;
              const updated = { ...inlineData, title: val };
              if (isNewDraft && (!inlineData.code || inlineData.code.length <= 3)) {
                updated.code = normalizeGreekUpper(val.slice(0, 4));
              }
              setInlineData(updated);
            }}
            placeholder="π.χ. Πληροφορική (ΤΠΕ) *"
            className={`h-7 text-xs bg-white ${
              isNewDraft ? "border-emerald-400" : "border-sky-300"
            } font-semibold px-2 w-full`}
          />
        </td>

        {/* Code Input */}
        <td className="py-1.5 px-1.5 text-center">
          <Input
            value={inlineData.code}
            onChange={(e) =>
              setInlineData({
                ...inlineData,
                code: normalizeGreekUpper(e.target.value),
              })
            }
            maxLength={6}
            placeholder="ΤΠΕ"
            className={`h-7 text-xs w-20 bg-white ${
              isNewDraft ? "border-emerald-400" : "border-sky-300"
            } font-mono font-bold text-center px-1 mx-auto`}
          />
        </td>

        <td className="py-1.5 px-2 border-r border-zinc-200">
          <SpecialtyMultiSelectPopover
            selectedSpecialties={inlineData.allowedSpecialties}
            onChange={(specs) => setInlineData({ ...inlineData, allowedSpecialties: specs })}
            allSpecialties={allSpecialties}
            isNewDraft={isNewDraft}
          />
        </td>

        {/* Max Per Day Dropdown */}
        <td className="py-1.5 px-2 border-r border-zinc-200">
          <select
            value={inlineData.maxPerDay || ""}
            onChange={(e) => setInlineData({ ...inlineData, maxPerDay: e.target.value ? parseInt(e.target.value, 10) : null })}
            className={`h-7 text-xs w-full bg-white rounded border ${
              isNewDraft ? "border-emerald-400" : "border-sky-300"
            } px-1 outline-none focus:ring-1 focus:ring-sky-400`}
          >
            <option value="">Αδιάφορο</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </td>

        {/* Class Hours Range Sliders */}
        {sortedClasses.map((c) => {
          const isAllDay = Boolean(c.isAllDay || c.grade === "Ολοήμερο" || c.name?.toLowerCase().includes("ολοήμερ"));
          const maxAllowed = isAllDay ? 50 : 35;
          
          // Find eligible teachers for this subject
          const eligibleTeachers = data.teachers.filter(
            (t) => t.isActive && inlineData.allowedSpecialties.includes(t.specialty)
          );

          return (
            <td key={c.id} className="py-1.5 px-1 text-center align-top">
              <div className="flex flex-col items-center justify-center gap-1">
                <UnifiedAssignmentPopover
                  classNameLabel={c.name}
                  classHours={inlineData.classHours[c.id] || [0, 0]}
                  assignments={inlineData.classAssignments?.[c.id] || []}
                  eligibleTeachers={eligibleTeachers}
                  smartDefaultIds={getSmartDefaultIds(c, eligibleTeachers)}
                  maxAllowedHours={maxAllowed}
                  onChangeHours={(range) => {
                    setInlineData((prev) =>
                      prev
                        ? {
                            ...prev,
                            classHours: { ...prev.classHours, [c.id]: range },
                          }
                        : null
                    );
                  }}
                  onApplyHoursToAll={(range) => {
                    setInlineData((prev) => {
                      if (!prev) return null;
                      const newClassHours = { ...prev.classHours };
                      sortedClasses.forEach((sc) => {
                        const isAllDay = Boolean(
                          sc.isAllDay ||
                            sc.grade === "Ολοήμερο" ||
                            sc.name?.toLowerCase().includes("ολοήμερ")
                        );
                        if (!isAllDay) newClassHours[sc.id] = range;
                      });
                      return { ...prev, classHours: newClassHours };
                    });
                    toast.success(
                      `Οι ώρες εφαρμόστηκαν σε όλα τα τμήματα πλην Ολοήμερου.`
                    );
                  }}
                  onChangeAssignments={(assignments) => {
                    setInlineData((prev) =>
                      prev
                        ? {
                            ...prev,
                            classAssignments: {
                              ...prev.classAssignments,
                              [c.id]: assignments,
                            },
                          }
                        : null
                    );
                  }}
                />
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-100/60">
      {/* Unified Top Header Bar */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Modern Tabs Switcher + Inline Filter Toggle + Count */}
        <div className="flex items-center gap-3">
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

          {/* Inline Filter Row Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterRow(!showFilterRow)}
            className={`h-8 text-xs gap-1.5 border-zinc-200 font-semibold cursor-pointer transition-all ${
              showFilterRow
                ? "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900 shadow-2xs"
                : hasActiveFilters
                ? "bg-indigo-50 border-indigo-300 text-indigo-900 hover:bg-indigo-100"
                : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            title="Εμφάνιση/απόκρυψη γραμμής φίλτρων στηλών"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Φίλτρα</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-bold rounded-full text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Record Count Badge */}
          <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
            {filteredSubjects.length} / {data.subjects.length} μαθήματα
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {editingRowId && inlineData ? (
            /* Active Inline Editing Controls */
            <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-300 px-3 py-1 rounded-lg animate-in fade-in">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                {editingRowId === "__new__" ? (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Νέο Μάθημα στη γραμμή</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Επεξεργασία: {inlineData.title}</span>
                  </>
                )}
              </span>
              <div className="h-4 w-px bg-emerald-200 mx-1" />
              <Button
                onClick={saveInlineEdit}
                disabled={isSavingInline}
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 shadow-2xs gap-1 cursor-pointer"
                title="Αποθήκευση αλλαγών (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
                Αποθήκευση
              </Button>
              <Button
                onClick={cancelInlineEdit}
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600 hover:text-zinc-900 px-2 cursor-pointer"
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
                    const target = data.subjects.find((s) => s.id === selectedSubjectId);
                    if (target) startInlineEdit(target);
                    else toast.warning("Επιλέξτε ένα μάθημα από τον πίνακα.");
                  }}
                  disabled={!selectedSubjectId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40 cursor-pointer font-medium"
                  title="Επεξεργασία στη γραμμή (ή διπλό κλικ)"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                  Επεξεργασία
                </Button>
                <Button
                  onClick={handleStartCopy}
                  disabled={!selectedSubjectId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40 cursor-pointer font-medium"
                  title="Αντιγραφή ρυθμίσεων σε νέα γραμμή"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                  Αντιγραφή
                </Button>
                <Button
                  onClick={promptDeleteSubject}
                  disabled={!selectedSubjectId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 cursor-pointer font-medium"
                  title="Διαγραφή επιλεγμένου μαθήματος"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                  Διαγραφή
                </Button>
              </div>

              <div className="h-5 w-px bg-zinc-200" />

              {/* Add Subject Primary Button */}
              <Button
                onClick={handleStartNew}
                size="sm"
                className="h-8 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Προσθήκη νέου μαθήματος απευθείας στην 1η σειρά του πίνακα"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Νέο Μάθημα</span>
              </Button>
            </div>
          )}

          {onClose && (
            <>
              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                title="Κλείσιμο (Esc)"
                aria-label="Κλείσιμο"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Tags Strip */}
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
                className="hover:text-red-600 rounded-sm p-0.5 transition-colors cursor-pointer"
                title="Αφαίρεση φίλτρου"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium ml-2 underline underline-offset-2 cursor-pointer"
          >
            Καθαρισμός όλων
          </button>
        </div>
      )}

      {/* Main Content Area (Wraps tightly to last record, clean background below) */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            {/* Super Headers & Sub Headers */}
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 shadow-2xs select-none">
              {/* Row 1: Super Headers Grouping */}
              <tr className="border-b border-zinc-200 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                <th colSpan={5} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
                  ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ ΜΑΘΗΜΑΤΟΣ
                </th>
                <th colSpan={sortedClasses.length || 1} className="py-2 px-3 bg-zinc-100/80 text-center">
                  ΕΒΔΟΜΑΔΙΑΙΕΣ ΩΡΕΣ ΑΝΑ ΤΜΗΜΑ
                </th>
              </tr>

              {/* Row 2: Detailed Column Headers */}
              <tr className="bg-zinc-50 text-[11px] font-semibold text-zinc-700">
                <th className="py-2.5 px-3 w-12 text-center" title="Χρώμα μαθήματος">Χρώμα</th>
                <th className="py-2.5 px-3 min-w-[180px]" title="Πλήρης τίτλος μαθήματος">Τίτλος Μαθήματος</th>
                <th className="py-2.5 px-2 w-20 text-center" title="Σύντομος κωδικός (π.χ. ΤΠΕ)">Κωδικός</th>
                <th className="py-2.5 px-3 min-w-[180px] text-center" title="Ειδικότητες εκπαιδευτικών που μπορούν να το διδάξουν">
                  Ειδικότητες Διδασκαλίας
                </th>
                <th className="py-2.5 px-3 w-20 text-center border-r border-zinc-200" title="Μέγιστες φορές ανά ημέρα για το ίδιο τμήμα">
                  Μέγ./Ημέρα
                </th>
                {sortedClasses.map((c) => (
                  <th key={c.id} className="py-2.5 px-1.5 min-w-[56px] text-center" title={`Ώρες διδασκαλίας: ${c.name}`}>
                    {c.name}
                  </th>
                ))}
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

                  {/* 2. Title Filter */}
                  <th className="py-1 px-1.5 min-w-[180px]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <Input
                        value={titleFilter}
                        onChange={(e) => setTitleFilter(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Αναζήτηση μαθήματος..."
                        className="h-7 text-xs bg-white border-zinc-200 pl-7 pr-6 rounded-md shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400 placeholder:text-zinc-400"
                      />
                      {titleFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTitleFilter("");
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 3. Code Filter */}
                  <th className="py-1 px-1 w-20 text-center">
                    <div className="relative">
                      <Input
                        value={codeFilter}
                        onChange={(e) => setCodeFilter(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Κωδ..."
                        className="h-7 text-xs bg-white border-zinc-200 px-1 pr-5 text-center font-mono rounded-md shadow-2xs focus-visible:ring-1"
                      />
                      {codeFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCodeFilter("");
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 4. Specialty Multi-Select Popover */}
                  <th className="py-1 px-1.5 min-w-[180px] border-r border-zinc-200">
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
                        className="w-64 p-2 shadow-lg border border-zinc-200 bg-white text-xs z-50 rounded-xl"
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

                  <th className="py-1 px-1.5 text-center text-zinc-400 text-[10px] font-mono border-r border-zinc-200">
                    —
                  </th>

                  <th colSpan={sortedClasses.length || 1} className="py-1 px-2 text-center text-zinc-400 text-[10px] font-mono">
                    —
                  </th>
                </tr>
              )}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100">
              {/* If creating a brand new subject inline, render it as 1st row */}
              {editingRowId === "__new__" && renderEditRow(true)}

              {filteredSubjects.map((subj) => {
                const isSelected = selectedSubjectId === subj.id;
                const isEditing = editingRowId === subj.id && inlineData !== null;

                const specs =
                  subj.allowedSpecialties && subj.allowedSpecialties.length > 0
                    ? subj.allowedSpecialties
                    : subj.defaultSpecialty
                    ? [subj.defaultSpecialty]
                    : [];

                /* 1. ROW IN EDIT MODE */
                if (isEditing) {
                  return renderEditRow(false);
                }

                /* 2. NORMAL DISPLAY ROW */
                return (
                  <tr
                    key={subj.id}
                    onClick={() => {
                      if (!editingRowId) setSelectedSubjectId(subj.id);
                    }}
                    onDoubleClick={() => startInlineEdit(subj)}
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
                        style={{ backgroundColor: subj.color || "#3b82f6" }}
                        title={`Χρώμα: ${subj.color}`}
                      />
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3 font-semibold text-zinc-900">
                      <span>{subj.title}</span>
                    </td>

                    {/* Code */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-zinc-700">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-[11px] border border-zinc-200/80">
                        {subj.code}
                      </span>
                    </td>

                    {/* Allowed Specialties */}
                    <td className="py-2.5 px-3 text-center border-r border-zinc-100">
                      {specs.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center items-center">
                          {specs.map((specCode) => {
                            const specInfo =
                              getSpecialtyByCode(specCode) || findSpecialty(specCode);
                            return (
                              <span
                                key={specCode}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-900 font-medium text-[11px] shadow-2xs"
                                title={specInfo?.name || specCode}
                              >
                                <span className="font-mono font-bold">{specCode}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Max Per Day */}
                    <td className="py-2.5 px-3 text-center border-r border-zinc-100 font-mono text-[11px] font-bold text-zinc-700">
                      {subj.maxPerDay ? (
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded shadow-2xs">
                          {subj.maxPerDay}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic font-sans text-[11px]">—</span>
                      )}
                    </td>

                    {/* Assignments Per Class */}
                    {sortedClasses.map((c) => {
                      const range = normalizeClassHours(subj.classHours?.[c.id]);
                      let [low, high] = range;

                      const assignments = subj.classAssignments?.[c.id] || [];
                      const isUsingSmartDefault = assignments.length === 0;

                      if (low === 0 && high === 0 && assignments.length > 0) {
                        const withHours = assignments.filter(
                          (a: any) => a.hours && a.teacherId !== "all"
                        );
                        if (withHours.length > 0) {
                          low = withHours.reduce(
                            (sum: number, a: any) =>
                              sum + (a.hours ? a.hours[0] : 0),
                            0
                          );
                          high = withHours.reduce(
                            (sum: number, a: any) =>
                              sum + (a.hours ? a.hours[1] : 0),
                            0
                          );
                        }
                      }

                      const isZero = low === 0 && high === 0;
                      const isRange = low !== high;

                      let teacherLabel: string | null = null;
                      let teacherTooltip: string | null = null;

                      const eligibleTeachers = data.teachers.filter(
                        (t) =>
                          !subj.allowedSpecialties?.length ||
                          subj.allowedSpecialties.includes(t.specialty)
                      );
                      const smartDefaults = getSmartDefaultIds(c, eligibleTeachers);

                      const displayedIds = isUsingSmartDefault
                        ? smartDefaults
                        : assignments.map((a) => a.teacherId);

                      const tooltipParts: string[] = [];
                      if (displayedIds.length === 1) {
                        const tId = displayedIds[0];
                        if (tId === "all") {
                          teacherLabel = "ΟΛΟΙ";
                          tooltipParts.push("ΟΛΟΙ (Οποιοσδήποτε)");
                        } else {
                          const t = data.teachers.find((t) => t.id === tId);
                          const asg = assignments.find((a: any) => a.teacherId === tId);
                          const hStr = asg?.hours
                            ? ` (${asg.hours[0]}${
                                asg.hours[1] !== asg.hours[0]
                                  ? "-" + asg.hours[1]
                                  : ""
                              }ω)`
                            : "";
                          if (t) {
                            const rawName =
                              t.shortName || t.lastName || t.firstName || "";
                            teacherLabel = rawName
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .toUpperCase()
                              .substring(0, 4);
                            tooltipParts.push(`${t.lastName} ${t.firstName}${hStr}`);
                          }
                        }
                      } else if (displayedIds.length === 2) {
                        const names = displayedIds.map((id) => {
                          if (id === "all") {
                            tooltipParts.push("ΟΛΟΙ");
                            return "ΟΛΟ";
                          }
                          const t = data.teachers.find((t) => t.id === id);
                          const asg = assignments.find((a: any) => a.teacherId === id);
                          const hStr = asg?.hours
                            ? ` (${asg.hours[0]}${
                                asg.hours[1] !== asg.hours[0]
                                  ? "-" + asg.hours[1]
                                  : ""
                              }ω)`
                            : "";
                          const raw =
                            t?.shortName || t?.lastName || t?.firstName || "";
                          if (t) {
                            tooltipParts.push(`${t.lastName} ${t.firstName}${hStr}`);
                          }
                          return raw
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toUpperCase()
                            .substring(0, 4);
                        });
                        teacherLabel = names.join("/");
                      } else if (displayedIds.length > 2) {
                        teacherLabel = `${displayedIds.length} εκπ.`;
                        displayedIds.forEach((id) => {
                          if (id === "all") {
                            tooltipParts.push("ΟΛΟΙ");
                          } else {
                            const t = data.teachers.find((t) => t.id === id);
                            const asg = assignments.find((a: any) => a.teacherId === id);
                            const hStr = asg?.hours
                              ? ` (${asg.hours[0]}${
                                  asg.hours[1] !== asg.hours[0]
                                    ? "-" + asg.hours[1]
                                    : ""
                                }ω)`
                              : "";
                            if (t) {
                              tooltipParts.push(`${t.lastName} ${t.firstName}${hStr}`);
                            }
                          }
                        });
                      }

                      if (tooltipParts.length > 0) {
                        teacherTooltip = isUsingSmartDefault
                          ? `Προεπιλογή: ${tooltipParts.join(", ")}`
                          : `Ανάθεση: ${tooltipParts.join(", ")}`;
                      }

                      return (
                        <td
                          key={c.id}
                          className="py-2 px-1 text-center align-middle"
                        >
                          {isZero ? (
                            <span className="text-zinc-300">—</span>
                          ) : (
                            <div className="flex justify-center">
                              {teacherLabel ? (
                                <div
                                  className={`inline-flex flex-col items-center justify-center rounded px-1.5 py-0.5 border shadow-2xs leading-none min-w-[36px] ${
                                    isUsingSmartDefault && smartDefaults[0] !== "all"
                                      ? "bg-emerald-50 border-emerald-200"
                                      : "bg-zinc-100 border-zinc-200/80"
                                  }`}
                                  title={teacherTooltip || undefined}
                                >
                                  <span
                                    className={`font-bold font-mono text-[11px] ${
                                      isUsingSmartDefault && smartDefaults[0] !== "all"
                                        ? "text-emerald-800"
                                        : "text-zinc-800"
                                    }`}
                                  >
                                    {isRange ? `${low}-${high}ω` : `${low}ω`}
                                  </span>
                                  <span
                                    className={`font-semibold font-mono text-[9px] tracking-tight mt-0.5 ${
                                      isUsingSmartDefault && smartDefaults[0] !== "all"
                                        ? "text-emerald-600"
                                        : "text-zinc-600"
                                    }`}
                                  >
                                    {teacherLabel}
                                  </span>
                                </div>
                              ) : isRange ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200/80 text-zinc-800 font-bold font-mono text-[11px] shadow-2xs">
                                  {low}-{high}ω
                                </span>
                              ) : (
                                <span className="font-bold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/80 font-mono text-[11px] shadow-2xs">
                                  {low}ω
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredSubjects.length === 0 && editingRowId !== "__new__" && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium text-sm text-zinc-700">Δεν βρέθηκαν μαθήματα</p>
                      <p className="text-xs text-zinc-400">
                        {hasActiveFilters
                          ? "Δοκιμάστε να αλλάξετε ή να καθαρίσετε τα φίλτρα."
                          : "Προσθέστε το πρώτο μάθημα κάνοντας κλικ στο «+ Νέο Μάθημα»."}
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
        open={Boolean(subjectToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingSubject) setSubjectToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-zinc-200 z-[90]">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100/80 flex items-center justify-center shrink-0 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-bold text-zinc-900">
                  Διαγραφή Μαθήματος
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                  Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά το μάθημα{" "}
                  <span className="font-semibold text-zinc-900">
                    «{subjectToDelete?.title}» ({subjectToDelete?.code})
                  </span>
                  ;
                </DialogDescription>
              </div>
            </div>

            {subjectToDelete && (subjectAssignmentsCountMap.get(subjectToDelete.id) || 0) > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Ενεργές Αναθέσεις:</span> Το μάθημα χρησιμοποιείται σε{" "}
                  <strong>{subjectAssignmentsCountMap.get(subjectToDelete.id)}</strong> ενεργές αναθέσεις.
                  Η διαγραφή του θα αφαιρέσει και τις σχετικές αναθέσεις.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingSubject}
              onClick={() => setSubjectToDelete(null)}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingSubject}
              onClick={confirmDeleteSubject}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs cursor-pointer"
            >
              {isDeletingSubject ? (
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

