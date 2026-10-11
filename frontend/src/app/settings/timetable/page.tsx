"use client";

import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  RotateCcw,
  Save,
  Loader2,
  Sun,
  Moon,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Coffee,
  Sparkles,
  Layers,
  GraduationCap,
  Users,
  Search,
} from "lucide-react";
import { PeriodConfig, SchoolConfig, Teacher } from "@/types";

// Official Presets for Greek Schools
const PRESETS = {
  primary_6_4: {
    id: "primary_6_4",
    name: "Δημοτικό (6ωρο Πρωινό + 4ωρο Ολοήμερο)",
    description: "08:15 – 13:15 (6 ώρες) και 13:20 – 16:55 (4 ώρες Ολοημέρου)",
    hasAllDay: true,
    periods: [
      { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
      { index: 1, label: "2η Ώρα", startTime: "09:00", endTime: "09:40" },
      { index: 2, label: "3η Ώρα", startTime: "10:00", endTime: "10:45" },
      { index: 3, label: "4η Ώρα", startTime: "10:45", endTime: "11:30" },
      { index: 4, label: "5η Ώρα", startTime: "11:45", endTime: "12:25" },
      { index: 5, label: "6η Ώρα", startTime: "12:35", endTime: "13:15" },
    ],
    allDayPeriods: [
      { index: 6, label: "1η Ολοημέρου", startTime: "13:20", endTime: "14:00", isAllDay: true },
      { index: 7, label: "2η Ολοημέρου", startTime: "14:15", endTime: "15:00", isAllDay: true },
      { index: 8, label: "3η Ολοημέρου", startTime: "15:15", endTime: "16:00", isAllDay: true },
      { index: 9, label: "4η Ολοημέρου", startTime: "16:10", endTime: "16:55", isAllDay: true },
    ],
  },
  primary_6_3: {
    id: "primary_6_3",
    name: "Δημοτικό (6ωρο Πρωινό + 3ωρο Ολοήμερο)",
    description: "08:15 – 13:15 (6 ώρες) και 13:20 – 16:00 (3 ώρες Ολοημέρου)",
    hasAllDay: true,
    periods: [
      { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
      { index: 1, label: "2η Ώρα", startTime: "09:00", endTime: "09:40" },
      { index: 2, label: "3η Ώρα", startTime: "10:00", endTime: "10:45" },
      { index: 3, label: "4η Ώρα", startTime: "10:45", endTime: "11:30" },
      { index: 4, label: "5η Ώρα", startTime: "11:45", endTime: "12:25" },
      { index: 5, label: "6η Ώρα", startTime: "12:35", endTime: "13:15" },
    ],
    allDayPeriods: [
      { index: 6, label: "1η Ολοημέρου", startTime: "13:20", endTime: "14:00", isAllDay: true },
      { index: 7, label: "2η Ολοημέρου", startTime: "14:15", endTime: "15:00", isAllDay: true },
      { index: 8, label: "3η Ολοημέρου", startTime: "15:15", endTime: "16:00", isAllDay: true },
    ],
  },
  secondary_7: {
    id: "secondary_7",
    name: "Γυμνάσιο / ΓΕ.Λ. (7ωρο Πρωινό)",
    description: "08:15 – 14:10 (7 διδακτικές ώρες, χωρίς ολοήμερο)",
    hasAllDay: false,
    periods: [
      { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
      { index: 1, label: "2η Ώρα", startTime: "09:05", endTime: "09:50" },
      { index: 2, label: "3η Ώρα", startTime: "10:00", endTime: "10:45" },
      { index: 3, label: "4η Ώρα", startTime: "10:55", endTime: "11:40" },
      { index: 4, label: "5η Ώρα", startTime: "11:50", endTime: "12:35" },
      { index: 5, label: "6η Ώρα", startTime: "12:40", endTime: "13:25" },
      { index: 6, label: "7η Ώρα", startTime: "13:30", endTime: "14:10" },
    ],
    allDayPeriods: [],
  },
  epal_8: {
    id: "epal_8",
    name: "ΕΠΑ.Λ. / Τεχνικό Λύκειο (8ωρο)",
    description: "08:15 – 14:55 (8 διδακτικές ώρες με εργαστήρια)",
    hasAllDay: false,
    periods: [
      { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
      { index: 1, label: "2η Ώρα", startTime: "09:05", endTime: "09:50" },
      { index: 2, label: "3η Ώρα", startTime: "10:00", endTime: "10:45" },
      { index: 3, label: "4η Ώρα", startTime: "10:55", endTime: "11:40" },
      { index: 4, label: "5η Ώρα", startTime: "11:50", endTime: "12:35" },
      { index: 5, label: "6η Ώρα", startTime: "12:40", endTime: "13:25" },
      { index: 6, label: "7η Ώρα", startTime: "13:30", endTime: "14:10" },
      { index: 7, label: "8η Ώρα", startTime: "14:15", endTime: "14:55" },
    ],
    allDayPeriods: [],
  },
};

// Helper to calculate minutes between "HH:MM"
function calculateDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  return eh * 60 + em - (sh * 60 + sm);
}

// Helper to add minutes to "HH:MM" string
function addMinutes(time: string, mins: number): string {
  if (!time) return "08:15";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "08:15";
  const total = (h * 60 + m + mins) % 1440;
  const rh = Math.floor(total / 60);
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

export default function TimetableSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Full school config
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  // Dynamic Periods state
  const [morningPeriods, setMorningPeriods] = useState<PeriodConfig[]>(PRESETS.primary_6_4.periods);
  const [hasAllDay, setHasAllDay] = useState<boolean>(true);
  const [allDayPeriods, setAllDayPeriods] = useState<PeriodConfig[]>(PRESETS.primary_6_4.allDayPeriods);

  // Solver setting
  const [forceExtremeHours, setForceExtremeHours] = useState(false);

  // Simultaneous Cross-Class Sessions Setting
  const [enableSimultaneousSessions, setEnableSimultaneousSessions] = useState(false);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [selectedSimultaneousIds, setSelectedSimultaneousIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch initial settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings?keys=school_config,timetable.force_extreme_hours,timetable.allow_simultaneous_sessions");
      const data = await res.json();

      if (data.school_config) {
        const sc: SchoolConfig = data.school_config;
        setSchoolConfig(sc);

        if (sc.periods && sc.periods.length > 0) {
          setMorningPeriods(sc.periods);
        }

        const isAllDayActive = Boolean(
          sc.hasAllDay !== undefined
            ? sc.hasAllDay
            : sc.allDayPeriods && sc.allDayPeriods.length > 0
        );
        setHasAllDay(isAllDayActive);

        if (sc.allDayPeriods && sc.allDayPeriods.length > 0) {
          setAllDayPeriods(sc.allDayPeriods);
        } else {
          setAllDayPeriods(PRESETS.primary_6_4.allDayPeriods);
        }
      }

      if (data["timetable.force_extreme_hours"] !== undefined) {
        setForceExtremeHours(
          data["timetable.force_extreme_hours"] === "true" ||
            data["timetable.force_extreme_hours"] === true
        );
      }

      // Fetch teachers to initialize cross-class checklist
      try {
        const teachersRes = await fetch("/api/teachers");
        const teachersData = await teachersRes.json();
        if (teachersData.success && Array.isArray(teachersData.teachers)) {
          setTeachersList(teachersData.teachers);
          const simultaneousSet = new Set<string>();
          teachersData.teachers.forEach((t: Teacher) => {
            if (t.constraints?.allowSimultaneousSessions) {
              simultaneousSet.add(t.id);
            }
          });
          setSelectedSimultaneousIds(simultaneousSet);

          if (data["timetable.allow_simultaneous_sessions"] !== undefined) {
            setEnableSimultaneousSessions(
              data["timetable.allow_simultaneous_sessions"] === "true" ||
                data["timetable.allow_simultaneous_sessions"] === true
            );
          } else if (simultaneousSet.size > 0) {
            setEnableSimultaneousSessions(true);
          }
        }
      } catch (tErr) {
        console.error("Failed to load teachers for cross-class settings:", tErr);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Αποτυχία φόρτωσης ρυθμίσεων");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Update morning period property
  const handleMorningPeriodChange = (
    index: number,
    field: "label" | "startTime" | "endTime",
    value: string
  ) => {
    setMorningPeriods((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // Add a new morning period
  const handleAddMorningPeriod = () => {
    const nextIdx = morningPeriods.length;
    const lastPeriod = morningPeriods[morningPeriods.length - 1];
    let startTime = "13:20";
    let endTime = "14:05";

    if (lastPeriod && lastPeriod.endTime) {
      startTime = addMinutes(lastPeriod.endTime, 5);
      endTime = addMinutes(startTime, 45);
    }

    const newPeriod: PeriodConfig = {
      index: nextIdx,
      label: `${nextIdx + 1}η Ώρα`,
      startTime,
      endTime,
      isAllDay: false,
    };

    setMorningPeriods((prev) => [...prev, newPeriod]);
    toast.success(`Προστέθηκε η ${nextIdx + 1}η Ώρα`);
  };

  // Remove morning period
  const handleRemoveMorningPeriod = (index: number) => {
    if (morningPeriods.length <= 1) {
      toast.error("Πρέπει να υπάρχει τουλάχιστον 1 πρωινή ώρα.");
      return;
    }
    setMorningPeriods((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, index: i, label: `${i + 1}η Ώρα` }))
    );
    toast.info("Η ώρα αφαιρέθηκε.");
  };

  // Update all-day period property
  const handleAllDayPeriodChange = (
    index: number,
    field: "label" | "startTime" | "endTime",
    value: string
  ) => {
    setAllDayPeriods((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // Add a new all-day period
  const handleAddAllDayPeriod = () => {
    const nextIdx = allDayPeriods.length;
    const lastPeriod = allDayPeriods[allDayPeriods.length - 1];
    let startTime = "16:10";
    let endTime = "16:55";

    if (lastPeriod && lastPeriod.endTime) {
      startTime = addMinutes(lastPeriod.endTime, 10);
      endTime = addMinutes(startTime, 45);
    }

    const newPeriod: PeriodConfig = {
      index: 6 + nextIdx,
      label: `${nextIdx + 1}η Ολοημέρου`,
      startTime,
      endTime,
      isAllDay: true,
    };

    setAllDayPeriods((prev) => [...prev, newPeriod]);
    toast.success(`Προστέθηκε η ${nextIdx + 1}η Ώρα Ολοημέρου`);
  };

  // Remove all-day period
  const handleRemoveAllDayPeriod = (index: number) => {
    if (allDayPeriods.length <= 1) {
      toast.error("Πρέπει να υπάρχει τουλάχιστον 1 ώρα στο Ολοήμερο ή να απενεργοποιηθεί.");
      return;
    }
    setAllDayPeriods((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({
          ...p,
          index: 6 + i,
          label: `${i + 1}η Ολοημέρου`,
          isAllDay: true,
        }))
    );
    toast.info("Η ώρα Ολοημέρου αφαιρέθηκε.");
  };

  // Apply a preset template
  const handleApplyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    setMorningPeriods(preset.periods);
    setHasAllDay(preset.hasAllDay);
    setAllDayPeriods(preset.allDayPeriods);

    toast.info(`Εφαρμόστηκε πρότυπο: ${preset.name}`, {
      description: "Πατήστε 'Αποθήκευση Ρυθμίσεων' για οριστική εφαρμογή στο σύστημα.",
    });
  };

  // Save all settings to DB
  const handleSave = async () => {
    setSaving(true);
    try {
      const activeAllDay = hasAllDay ? allDayPeriods : [];
      const updatedSchoolConfig: SchoolConfig = {
        schoolName: schoolConfig?.schoolName || "1ο Πειραματικό Δημοτικό Σχολείο",
        schoolYear: schoolConfig?.schoolYear || "2026-2027",
        days: schoolConfig?.days || ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"],
        hasAllDay,
        periods: morningPeriods.map((p, i) => ({
          ...p,
          index: i,
          label: p.label || `${i + 1}η Ώρα`,
          isAllDay: false,
        })),
        allDayPeriodsCount: activeAllDay.length,
        allDayPeriods: activeAllDay.map((p, i) => ({
          ...p,
          index: 6 + i,
          label: p.label || `${i + 1}η Ολοημέρου`,
          isAllDay: true,
        })),
      };

      const payload = {
        school_config: updatedSchoolConfig,
        "timetable.force_extreme_hours": forceExtremeHours,
        "timetable.allow_simultaneous_sessions": enableSimultaneousSessions,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Save teachers cross-class constraints
      const teachersToEnable: string[] = [];
      const teachersToDisable: string[] = [];

      teachersList.forEach((t) => {
        const currentlyAllowed = Boolean(t.constraints?.allowSimultaneousSessions);
        const shouldBeAllowed = enableSimultaneousSessions && selectedSimultaneousIds.has(t.id);
        if (shouldBeAllowed && !currentlyAllowed) {
          teachersToEnable.push(t.id);
        } else if (!shouldBeAllowed && currentlyAllowed) {
          teachersToDisable.push(t.id);
        }
      });

      if (teachersToEnable.length > 0) {
        await fetch("/api/teachers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherIds: teachersToEnable,
            updates: { constraints: { allowSimultaneousSessions: true } },
            modifiedFields: ["allowSimultaneousSessions"],
          }),
        });
      }

      if (teachersToDisable.length > 0) {
        await fetch("/api/teachers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherIds: teachersToDisable,
            updates: { constraints: { allowSimultaneousSessions: false } },
            modifiedFields: ["allowSimultaneousSessions"],
          }),
        });
      }

      // Update local teachers list state
      setTeachersList((prev) =>
        prev.map((t) => ({
          ...t,
          constraints: {
            ...t.constraints,
            allowSimultaneousSessions: enableSimultaneousSessions && selectedSimultaneousIds.has(t.id),
          },
        }))
      );

      setSchoolConfig(updatedSchoolConfig);
      toast.success("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!", {
        description: `Ενεργές: ${morningPeriods.length} πρωινές ώρες ${
          hasAllDay ? `+ ${activeAllDay.length} ώρες ολοημέρου` : "(χωρίς ολοήμερο)"
        }.`,
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error("Αποτυχία αποθήκευσης ρυθμίσεων", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">Φόρτωση ρυθμίσεων...</span>
        </div>
      </div>
    );
  }

  const filteredTeachers = teachersList.filter((t) => {
    if (!teacherSearch.trim()) return true;
    const q = teacherSearch.toLowerCase();
    const fullName = `${t.lastName} ${t.firstName}`.toLowerCase();
    const spec = (t.specialty || "").toLowerCase();
    const short = (t.shortName || "").toLowerCase();
    return fullName.includes(q) || spec.includes(q) || short.includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Διδακτικό Ωράριο & Κουδούνια</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Πλήρης παραμετροποίηση διδακτικών ωρών για κάθε τύπο σχολείου (Δημοτικό, Γυμνάσιο, Λύκειο, ΕΠΑΛ).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 cursor-pointer shadow-xs"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Αποθήκευση Ρυθμίσεων</span>
          </Button>
        </div>
      </div>

      {/* SECTION: PRESETS / ΠΡΟΤΥΠΑ */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-zinc-50 to-indigo-50/30 dark:from-zinc-900/60 dark:to-indigo-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Έτοιμα Πρότυπα Ωραρίων (Presets)</CardTitle>
              <CardDescription className="text-xs">
                Επιλέξτε ένα επίσημο πρότυπο για άμεση συμπλήρωση των ωρών με 1 κλικ.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.values(PRESETS).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id as any)}
                className="flex flex-col text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {p.name.split("(")[0].trim()}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {p.periods.length}ω
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-snug">
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: ΠΡΩΙΝΟ ΩΡΑΡΙΟ */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Πρωινό Πρόγραμμα</CardTitle>
                <CardDescription className="text-xs">
                  Διδακτικές ώρες πρωινού ωραρίου. Μπορείτε να προσθέσετε (π.χ. 7η ώρα) ή να διαγράψετε ώρες.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[11px]">
                {morningPeriods.length} Πρωινές Ώρες
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMorningPeriod}
                className="text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-900 cursor-pointer h-7"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Προσθήκη Ώρας</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-2 px-3 text-left w-36">Ετικέτα Ώρας</th>
                  <th className="py-2 px-3 text-left w-36">Έναρξη</th>
                  <th className="py-2 px-3 text-left w-36">Λήξη</th>
                  <th className="py-2 px-3 text-center w-24">Διάρκεια</th>
                  <th className="py-2 px-3 text-left">Επόμενο Διάλειμμα</th>
                  <th className="py-2 px-3 text-center w-16">Ενέργεια</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {morningPeriods.map((period, idx) => {
                  const duration = calculateDuration(period.startTime, period.endTime);
                  const nextPeriod = morningPeriods[idx + 1];
                  const breakDuration = nextPeriod
                    ? calculateDuration(period.endTime, nextPeriod.startTime)
                    : 0;

                  return (
                    <tr
                      key={period.index ?? idx}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={period.label || `${idx + 1}η Ώρα`}
                          onChange={(e) => handleMorningPeriodChange(idx, "label", e.target.value)}
                          className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => handleMorningPeriodChange(idx, "startTime", e.target.value)}
                          className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => handleMorningPeriodChange(idx, "endTime", e.target.value)}
                          className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                            duration === 45
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : duration === 40
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {duration > 0 ? `${duration}'` : "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-500">
                        {breakDuration > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/80 dark:border-amber-900">
                            <Coffee className="w-3 h-3" />
                            Διάλειμμα {breakDuration} λεπτά
                          </span>
                        ) : idx === morningPeriods.length - 1 ? (
                          <span className="text-[11px] text-zinc-400 italic">
                            Λήξη πρωινού ωραρίου
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMorningPeriod(idx)}
                          disabled={morningPeriods.length <= 1}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                          title="Διαγραφή ώρας"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: ΟΛΟΗΜΕΡΟ / ΑΠΟΓΕΥΜΑΤΙΝΟ ΠΡΟΓΡΑΜΜΑ */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Ολοήμερο / Απογευματινό Πρόγραμμα</CardTitle>
                <CardDescription className="text-xs">
                  Ενεργοποιήστε και διαμορφώστε τις ώρες του Ολοημέρου (απενεργοποιήστε το αν πρόκειται για Γυμνάσιο/Λύκειο).
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="allday-switch" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {hasAllDay ? "Ενεργό Ολοήμερο" : "Χωρίς Ολοήμερο"}
                </Label>
                <Switch
                  id="allday-switch"
                  checked={hasAllDay}
                  onCheckedChange={setHasAllDay}
                />
              </div>

              {hasAllDay && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllDayPeriod}
                  className="text-xs gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 cursor-pointer h-7"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Προσθήκη Ώρας</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {hasAllDay ? (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left w-36">Ετικέτα Ώρας</th>
                    <th className="py-2 px-3 text-left w-36">Έναρξη</th>
                    <th className="py-2 px-3 text-left w-36">Λήξη</th>
                    <th className="py-2 px-3 text-center w-24">Διάρκεια</th>
                    <th className="py-2 px-3 text-left">Επόμενο Διάλειμμα</th>
                    <th className="py-2 px-3 text-center w-16">Ενέργεια</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {allDayPeriods.map((period, idx) => {
                    const duration = calculateDuration(period.startTime, period.endTime);
                    const nextPeriod = allDayPeriods[idx + 1];
                    const breakDuration = nextPeriod
                      ? calculateDuration(period.endTime, nextPeriod.startTime)
                      : 0;

                    return (
                      <tr
                        key={period.index ?? idx}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={period.label || `${idx + 1}η Ολοημέρου`}
                            onChange={(e) => handleAllDayPeriodChange(idx, "label", e.target.value)}
                            className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-indigo-950 dark:text-indigo-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="time"
                            value={period.startTime}
                            onChange={(e) => handleAllDayPeriodChange(idx, "startTime", e.target.value)}
                            className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="time"
                            value={period.endTime}
                            onChange={(e) => handleAllDayPeriodChange(idx, "endTime", e.target.value)}
                            className="h-8 w-28 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                              duration === 45
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                : duration === 40
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {duration > 0 ? `${duration}'` : "—"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-500">
                          {breakDuration > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/80 dark:border-amber-900">
                              <Coffee className="w-3 h-3" />
                              Διάλειμμα {breakDuration} λεπτά
                            </span>
                          ) : idx === allDayPeriods.length - 1 ? (
                            <span className="text-[11px] text-zinc-400 italic">
                              Λήξη Ολοημέρου & Αποχώρηση
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveAllDayPeriod(idx)}
                            disabled={allDayPeriods.length <= 1}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                            title="Διαγραφή ώρας Ολοημέρου"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 text-xs">
              Το Ολοήμερο πρόγραμμα είναι απενεργοποιημένο. Το σχολείο λειτουργεί αποκλειστικά σε πρωινό ωράριο.
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: ΔΙΑΤΜΗΜΑΤΙΚΕΣ / ΟΜΑΔΙΚΕΣ ΣΥΝΕΔΡΙΕΣ */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  Δυνατότητα Διατμηματικών / Ομαδικών Συνεδριών
                  {enableSimultaneousSessions && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-300">
                      {selectedSimultaneousIds.size} {selectedSimultaneousIds.size === 1 ? "εκπαιδευτικός" : "εκπαιδευτικοί"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Επιτρέπει σε επιλεγμένους εκπαιδευτικούς να πραγματοποιούν ταυτόχρονη διδασκαλία σε πολλαπλά τμήματα την ίδια ώρα (π.χ. Λογοθεραπεία, Ψυχολόγοι, Τμήμα Ένταξης).
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={enableSimultaneousSessions}
                onCheckedChange={setEnableSimultaneousSessions}
              />
            </div>
          </div>
        </CardHeader>
        {enableSimultaneousSessions && (
          <CardContent className="space-y-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 rounded-lg p-3 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5 mt-3">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Ταυτόχρονη διδασκαλία χωρίς διπλοχρέωση ωρών:
                </p>
                <p className="text-[11px] text-purple-800 dark:text-purple-300">
                  Για όσους εκπαιδευτικούς είναι επιλεγμένοι παρακάτω, οι ταυτόχρονες ώρες σε διαφορετικά τμήματα προσμετρώνται ως <strong>1 πραγματική διδακτική ώρα</strong> στο εβδομαδιαίο τους ωράριο. Για τους υπόλοιπους εκπαιδευτικούς, η ανάθεση σε δεύτερο τμήμα την ίδια ώρα παραμένει κλειδωμένη.
                </p>
              </div>
            </div>

            {/* Filter and Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Αναζήτηση εκπαιδευτικού ή ειδικότητας..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const eepIds = teachersList
                      .filter((t) => t.isSupport || t.specialty?.includes("21") || t.specialty?.includes("23") || t.specialty?.includes("29"))
                      .map((t) => t.id);
                    setSelectedSimultaneousIds((prev) => new Set([...prev, ...eepIds]));
                  }}
                  className="text-[11px] h-7 px-2.5 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Επιλογή Ειδικοτήτων ΕΕΠ/ΕΒΠ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSimultaneousIds(new Set())}
                  disabled={selectedSimultaneousIds.size === 0}
                  className="text-[11px] h-7 px-2.5 text-rose-600 hover:text-rose-700 disabled:opacity-40 cursor-pointer"
                >
                  Αποεπιλογή όλων
                </Button>
              </div>
            </div>

            {/* Teacher List */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {filteredTeachers.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  Δεν βρέθηκαν εκπαιδευτικοί.
                </div>
              ) : (
                filteredTeachers.map((tch) => {
                  const isChecked = selectedSimultaneousIds.has(tch.id);
                  return (
                    <label
                      key={tch.id}
                      className={`flex items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer select-none ${
                        isChecked ? "bg-purple-50/40 dark:bg-purple-950/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedSimultaneousIds);
                            if (e.target.checked) {
                              next.add(tch.id);
                            } else {
                              next.delete(tch.id);
                            }
                            setSelectedSimultaneousIds(next);
                          }}
                          className="w-4 h-4 rounded text-purple-600 border-zinc-300 focus:ring-purple-500 cursor-pointer"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tch.color || "#71717a" }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {tch.lastName} {tch.firstName}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {tch.specialty || "—"} {tch.shortName ? `(${tch.shortName})` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tch.isSupport && (
                          <Badge variant="outline" className="text-[9.5px] border-sky-200 text-sky-700 bg-sky-50 py-0 px-1.5">
                            Συμπληρωματική
                          </Badge>
                        )}
                        {isChecked && (
                          <Badge variant="outline" className="text-[9.5px] border-purple-300 bg-purple-100 text-purple-800 font-bold py-0 px-1.5">
                            Επιτρέπεται
                          </Badge>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 4: ΠΑΡΑΜΕΤΡΟΙ ΕΠΙΛΥΤΗ */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Παράμετροι Αυτόματου Επιλυτή (Solver)</CardTitle>
              <CardDescription className="text-xs">
                Ειδικοί κανόνες και περιορισμοί κατά την αυτόματη επίλυση του προγράμματος.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-row items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Εξαναγκασμός ακραίων ωρών σε διδασκαλία
              </Label>
              <p className="text-[11px] text-zinc-500 max-w-xl">
                Όταν ορίζεται το ωράριο διαθεσιμότητας ενός εκπαιδευτικού (π.χ. 1η έως 4η ώρα), ο
                αλγόριθμος θα απαιτεί η πρώτη και η τελευταία ώρα αυτού του εύρους να είναι
                υποχρεωτικά ώρες διδασκαλίας.
              </p>
            </div>
            <div className="ml-4">
              <Switch checked={forceExtremeHours} onCheckedChange={setForceExtremeHours} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-[11px] text-zinc-400">
          Όλες οι αλλαγές στο ωράριο εφαρμόζονται αυτόματα στον πίνακα και στις εκτυπώσεις.
        </span>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 text-xs bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-5 cursor-pointer shadow-xs"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Αποθήκευση Όλων των Ρυθμίσεων</span>
        </Button>
      </div>
    </div>
  );
}
