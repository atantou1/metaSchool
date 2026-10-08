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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  BookOpen,
  CalendarDays,
  ChevronDown,
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
  activeTab?: "teachers" | "classes" | "subjects" | "rules";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "rules") => void;
}

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
  students: string[];
}

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

export const ClassesManager: React.FC<ClassesManagerProps> = ({
  data,
  onRefresh,
  activeTab = "classes",
  onTabChange,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Search & Filters State (matching teachers-manager pattern)
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [studentsCountRange, setStudentsCountRange] = useState<[number, number] | null>(null);
  const [headTeacherFilter, setHeadTeacherFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("");

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

  const getClassSupportSpecialties = useMemo(() => {
    return (classId: string) => {
      const specsSet = new Set<string>();

      // 1. Complementary specialties from subjects with allocated hours for this class
      data.subjects
        .filter((subj) => {
          const classHours = subj.classHours?.[classId];
          return (
            classHours &&
            (typeof classHours === "number"
              ? classHours > 0
              : classHours[0] > 0 || classHours[1] > 0)
          );
        })
        .forEach((subj) => {
          const specs =
            subj.allowedSpecialties && subj.allowedSpecialties.length > 0
              ? subj.allowedSpecialties
              : subj.defaultSpecialty
              ? [subj.defaultSpecialty]
              : [];
          specs.forEach((code) => {
            const specObj = getSpecialtyByCode(code) || findSpecialty(code);
            if (
              specObj?.type === "ΣΥΜΠΛΗΡΩΜΑΤΙΚΗ" ||
              SUPPORT_SPECIALTIES_LIST.some((s) => s.code === code)
            ) {
              specsSet.add(code);
            }
          });
        });

      // 2. Specialties from teachers assigned to this class who are declared as support (isSupport: true)
      data.assignments.forEach((asg) => {
        const clsId = subGroupToClassMap.get(asg.subGroupId);
        if (clsId === classId) {
          const teacher = teachersMap.get(asg.teacherId);
          if (teacher && teacher.isSupport && teacher.specialty) {
            specsSet.add(teacher.specialty);
          }
        }
      });

      return Array.from(specsSet);
    };
  }, [data.subjects, data.assignments, subGroupToClassMap, teachersMap]);

  // Filter handlers
  const toggleGradeFilter = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const resetAllFilters = () => {
    setNameFilter("");
    setSelectedGrades([]);
    setStudentsCountRange(null);
    setHeadTeacherFilter("all");
    setTypeFilter("all");
    setRoomFilter("");
  };

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return data.classes.filter((cls) => {
      // 1. Name / Short Name Filter
      if (nameFilter.trim()) {
        const q = nameFilter.toLowerCase().trim();
        const name = (cls.name || "").toLowerCase();
        const sName = (cls.shortName || "").toLowerCase();
        if (!name.includes(q) && !sName.includes(q)) {
          return false;
        }
      }

      // 2. Grade Filter (Multi-select)
      if (selectedGrades.length > 0 && !selectedGrades.includes(cls.grade)) {
        return false;
      }

      // 3. Students Count Range Filter
      if (studentsCountRange !== null) {
        const count = typeof cls.studentsCount === "number" ? cls.studentsCount : 20;
        if (count < studentsCountRange[0] || count > studentsCountRange[1]) {
          return false;
        }
      }

      // 4. Head Teacher Filter
      if (headTeacherFilter !== "all") {
        if (headTeacherFilter === "none") {
          if (cls.headTeacherId) return false;
        } else {
          if (cls.headTeacherId !== headTeacherFilter) return false;
        }
      }

      // 5. Program Type (Morning / All-Day)
      if (typeFilter === "morning" && cls.isAllDay) return false;
      if (typeFilter === "allDay" && !cls.isAllDay) return false;

      // 6. Room Filter
      if (roomFilter.trim()) {
        const q = roomFilter.toLowerCase().trim();
        const room = (cls.room || "").toLowerCase();
        if (!room.includes(q)) return false;
      }

      return true;
    });
  }, [
    data.classes,
    nameFilter,
    selectedGrades,
    studentsCountRange,
    headTeacherFilter,
    typeFilter,
    roomFilter,
  ]);

  const hasActiveFilters =
    nameFilter.trim() !== "" ||
    selectedGrades.length > 0 ||
    studentsCountRange !== null ||
    headTeacherFilter !== "all" ||
    typeFilter !== "all" ||
    roomFilter.trim() !== "";

  const activeFiltersCount =
    (nameFilter.trim() !== "" ? 1 : 0) +
    (selectedGrades.length > 0 ? 1 : 0) +
    (studentsCountRange !== null ? 1 : 0) +
    (headTeacherFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (roomFilter.trim() !== "" ? 1 : 0);

  // Active tags for quick pill badges
  const activeTags = useMemo(() => {
    const list: { id: string; label: string; clear: () => void }[] = [];

    if (nameFilter.trim()) {
      list.push({
        id: "name",
        label: `Όνομα: "${nameFilter.trim()}"`,
        clear: () => setNameFilter(""),
      });
    }

    if (selectedGrades.length > 0) {
      list.push({
        id: "grade",
        label: `Τάξεις: ${selectedGrades.join(", ")}`,
        clear: () => setSelectedGrades([]),
      });
    }

    if (studentsCountRange !== null) {
      list.push({
        id: "students",
        label: `Μαθητές: ${
          studentsCountRange[0] === studentsCountRange[1]
            ? `${studentsCountRange[0]}`
            : `${studentsCountRange[0]}-${studentsCountRange[1]}`
        }`,
        clear: () => setStudentsCountRange(null),
      });
    }

    if (headTeacherFilter !== "all") {
      const tch = data.teachers.find((t) => t.id === headTeacherFilter);
      list.push({
        id: "headTeacher",
        label: `Υπεύθυνος: ${tch ? `${tch.lastName} ${tch.firstName}` : "Χωρίς ορισμό"}`,
        clear: () => setHeadTeacherFilter("all"),
      });
    }

    if (typeFilter !== "all") {
      list.push({
        id: "type",
        label: `Πρόγραμμα: ${typeFilter === "morning" ? "Πρωινό" : "Ολοήμερο"}`,
        clear: () => setTypeFilter("all"),
      });
    }

    if (roomFilter.trim()) {
      list.push({
        id: "room",
        label: `Αίθουσα: "${roomFilter.trim()}"`,
        clear: () => setRoomFilter(""),
      });
    }

    return list;
  }, [
    nameFilter,
    selectedGrades,
    studentsCountRange,
    headTeacherFilter,
    typeFilter,
    roomFilter,
    data.teachers,
  ]);

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
      students: [],
    });
    setEditingRowId("__new__");
    setSelectedClassId(null);
  };

  // Start copying from selected class into row 1 draft
  const handleStartCopy = () => {
    const target = data.classes.find((c) => c.id === selectedClassId);
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
      students: target.students || [],
    });
    setEditingRowId("__new__");
    setSelectedClassId(null);
    toast.info(`Αντιγράφηκαν οι ρυθμίσεις του τμήματος «${target.name}». Πληκτρολογήστε το νέο όνομα.`);
  };

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
      students: cls.students || [],
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
      students: inlineData.students,
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
        <td className="py-1.5 px-1.5 text-center">
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

        {/* Students Tags Popover */}
        <td className="py-1.5 px-1.5 text-center border-r border-zinc-200 relative">
          <Popover>
            <PopoverTrigger type="button" className="h-7 text-[10.5px] px-2 w-full justify-center text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 cursor-pointer shadow-2xs">
              {inlineData.students?.length ? `${inlineData.students.length} μαθητές` : "+ Προσθήκη"}
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 z-[80]" align="center">
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-zinc-800 text-[11px]">Ονόματα Μαθητών</p>
                <p className="text-[10px] text-zinc-500 mb-1 leading-tight">Διαχωρίστε τα ονόματα με <strong>κόμμα</strong>. Χρήσιμο για μαθητές που χρειάζονται π.χ. Λογοθεραπεία.</p>
                <textarea
                  className="w-full text-xs p-2 border border-zinc-300 rounded-md shadow-2xs focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-hidden resize-none"
                  rows={4}
                  placeholder="π.χ. Γιώργος Π., Μαρία Κ."
                  value={inlineData.students?.join(", ") || ""}
                  onChange={(e) => {
                    const str = e.target.value;
                    const arr = str.split(",").map(s => s.trim()).filter(Boolean);
                    setInlineData({...inlineData, students: arr});
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </PopoverContent>
          </Popover>
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

        {/* Supportive Specialties Multi-toggle Chips (Now read-only) */}
        <td className="py-1.5 px-2 text-center">
          <span className="text-zinc-400 text-[10px] italic select-none">
            (Υπολογίζεται αυτόματα από τα μαθήματα)
          </span>
        </td>
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
            {filteredClasses.length} / {data.classes.length} τμήματα
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
                    const target = data.classes.find((c) => c.id === selectedClassId);
                    if (target) startInlineEdit(target);
                    else toast.warning("Επιλέξτε ένα τμήμα από τον πίνακα.");
                  }}
                  disabled={!selectedClassId}
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
                  disabled={!selectedClassId}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40 cursor-pointer font-medium"
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
                  className="h-7 text-xs px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 cursor-pointer font-medium"
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
                className="h-8 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Προσθήκη νέου τμήματος απευθείας στην 1η σειρά του πίνακα"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Νέο Τμήμα</span>
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
                <th colSpan={6} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
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
                <th className="py-2.5 px-2 w-16 text-center" title="Αριθμός μαθητών">Αριθμός</th>
                <th className="py-2.5 px-2 w-24 text-center border-r border-zinc-200" title="Μαθητές Ειδικών Αναγκών / Στήριξης">Μαθητές (Προαιρετ.)</th>

                <th className="py-2.5 px-3 min-w-[190px]" title="Υπεύθυνος εκπαιδευτικός του τμήματος">Υπεύθυνος Τάξης</th>
                <th className="py-2.5 px-2 w-24 text-center" title="Πρόγραμμα (Πρωινό / Ολοήμερο)">Πρόγραμμα</th>
                <th className="py-2.5 px-2.5 w-32 border-r border-zinc-200" title="Αίθουσα αναφοράς">Αίθουσα</th>

                <th className="py-2.5 px-3 min-w-[200px] text-center" title="Υποστηρικτικές ειδικότητες που δικαιούται το τμήμα (Λογοθεραπεία, Εργοθεραπεία, κ.λπ.)">
                  Ειδικότητες Στήριξης
                </th>
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

                  {/* 2. Name Filter */}
                  <th className="py-1 px-1.5 min-w-[130px]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <Input
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Αναζήτηση..."
                        className="h-7 text-xs bg-white border-zinc-200 pl-7 pr-6 rounded-md shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400 placeholder:text-zinc-400"
                      />
                      {nameFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNameFilter("");
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

                  {/* 4. Grade Filter (Multi-Select Popover) */}
                  <th className="py-1 px-1 w-24 text-center">
                    <Popover>
                      <PopoverTrigger
                        type="button"
                        className={`w-full h-7 text-[11px] px-2 rounded-md shadow-2xs transition-all flex items-center justify-between border cursor-pointer ${
                          selectedGrades.length > 0
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span className="truncate">
                          {selectedGrades.length === 0
                            ? "Όλες"
                            : selectedGrades.length <= 2
                            ? selectedGrades.join(", ")
                            : `${selectedGrades.length} τάξεις`}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50 ml-1" />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-48 p-2 shadow-lg border border-zinc-200 bg-white text-xs z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
                          <span className="font-semibold text-zinc-800 text-[11px]">
                            Τάξη {selectedGrades.length > 0 && `(${selectedGrades.length})`}
                          </span>
                          {selectedGrades.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedGrades([])}
                              className="text-[10px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
                            >
                              Καθαρισμός
                            </button>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          {GRADES_LIST.map((g) => {
                            const isChecked = selectedGrades.includes(g);
                            return (
                              <div
                                key={g}
                                onClick={() => toggleGradeFilter(g)}
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
                                <span className="text-[11px]">Τάξη {g}</span>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>

                  {/* 5. Students Count Filter (Dual-Thumb Range Slider) */}
                  <th className="py-1 px-1 w-20 text-center">
                    <RangeFilterPopover
                      title="Αριθμός Μαθητών"
                      min={0}
                      max={35}
                      unit=""
                      value={studentsCountRange}
                      onChange={setStudentsCountRange}
                      presets={[
                        { label: "15-25", range: [15, 25] },
                        { label: "20", range: [20, 20] },
                        { label: "1-15", range: [1, 15] },
                        { label: "25-35", range: [25, 35] },
                      ]}
                    />
                  </th>

                  {/* 5.5. Students Names Filter (empty for now) */}
                  <th className="py-1 px-1 w-24 text-center border-r border-zinc-200">
                    <span className="text-zinc-300 text-[10px] font-mono">—</span>
                  </th>

                  {/* 6. Head Teacher Filter */}
                  <th className="py-1 px-1.5 min-w-[190px]">
                    <Select
                      value={headTeacherFilter}
                      onValueChange={(val) => setHeadTeacherFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-2 justify-between rounded-md shadow-2xs transition-all ${
                          headTeacherFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {headTeacherFilter === "all"
                            ? "Αδιαφ."
                            : headTeacherFilter === "none"
                            ? "— Χωρίς Ορισμό —"
                            : (() => {
                                const tch = data.teachers.find((t) => t.id === headTeacherFilter);
                                return tch ? `${tch.lastName} ${tch.firstName}` : "Αδιαφ.";
                              })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70] max-h-[320px]">
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="none">— Χωρίς Ορισμό —</SelectItem>
                        {data.teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.lastName} {t.firstName} ({t.shortName || t.specialty})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 7. Program Type Filter */}
                  <th className="py-1 px-1 w-24 text-center">
                    <Select
                      value={typeFilter}
                      onValueChange={(val) => setTypeFilter(val || "all")}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-7 text-[11px] px-1 justify-center rounded-md shadow-2xs transition-all ${
                          typeFilter !== "all"
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300/60"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <SelectValue>
                          {typeFilter === "all" ? "Αδιαφ." : typeFilter === "morning" ? "Πρωινό" : "Ολοήμερο"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200 text-zinc-800 z-[70]">
                        <SelectItem value="all">Αδιάφορο</SelectItem>
                        <SelectItem value="morning">Πρωινό</SelectItem>
                        <SelectItem value="allDay">Ολοήμερο</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>

                  {/* 8. Room Filter */}
                  <th className="py-1 px-1 w-32 border-r border-zinc-200">
                    <div className="relative">
                      <Input
                        value={roomFilter}
                        onChange={(e) => setRoomFilter(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Αίθουσα..."
                        className="h-7 text-xs bg-white border-zinc-200 px-2 pr-6 rounded-md shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400 placeholder:text-zinc-400"
                      />
                      {roomFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomFilter("");
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 9. Support Specialties Filter (Removed) */}
                  <th className="py-1 px-1.5 min-w-[200px] text-center">
                    <span className="text-zinc-300 text-[10px] font-mono">—</span>
                  </th>
                </tr>
              )}
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
                const specialtiesList = getClassSupportSpecialties(cls.id);

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
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {cls.studentsCount || 20}
                    </td>

                    {/* Students Names */}
                    <td className="py-2.5 px-2 text-center border-r border-zinc-100 relative">
                      {cls.students && cls.students.length > 0 ? (
                        <Popover>
                          <PopoverTrigger className="text-[10.5px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100 hover:border-indigo-300 transition-colors">
                            {cls.students.length} μαθητές
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 z-[60]" align="center">
                            <div className="text-[11px] font-semibold text-zinc-800 mb-1.5 border-b border-zinc-100 pb-1">Μαθητές Τμήματος</div>
                            <ul className="text-[11px] text-zinc-700 space-y-1 max-h-40 overflow-y-auto">
                              {cls.students.map((st, i) => (
                                <li key={i} className="flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                  <span className="truncate">{st}</span>
                                </li>
                              ))}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-zinc-300 text-[11px]">—</span>
                      )}
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
                        {hasActiveFilters
                          ? "Δοκιμάστε να αλλάξετε ή να καθαρίσετε τα φίλτρα."
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
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingClass}
              onClick={confirmDeleteClass}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs cursor-pointer"
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
    </div>
  );
};
