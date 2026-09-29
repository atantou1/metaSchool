"use client";

import React, { useEffect, useState, useMemo } from "react";
import { TimetableData } from "@/types";
import { MasterMatrix } from "@/components/master-matrix";
import { ClassesManager } from "@/components/classes-manager";
import { TeachersManager } from "@/components/teachers-manager";
import { SubjectsManager } from "@/components/subjects-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  GraduationCap,
  Users,
  BookOpen,
  RotateCcw,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import { getTeacherAbbr, getTeacherStyleClass, getTeacherTileInlineStyle } from "@/lib/teacher-utils";
import { formatSpecialtyLabel } from "@/lib/specialties";
import { toast } from "sonner";

export default function Home() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [activeSheet, setActiveSheet] = useState<
    "classes" | "teachers" | "subjects" | null
  >(null);
  const [spotlightTeacherId, setSpotlightTeacherId] = useState<string | null>(
    null
  );

  const loadData = async () => {
    try {
      const res = await fetch("/api/timetable");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error("Σφάλμα φόρτωσης δεδομένων", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης με τη βάση", { description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetDemo = async () => {
    if (!confirm("Θέλετε να επαναφέρετε τα δοκιμαστικά δεδομένα του σχολείου;")) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/reset-demo", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Τα δοκιμαστικά δεδομένα επαναφέρθηκαν!");
        await loadData();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      const res = await fetch("/api/timetable/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        toast.error("Σφάλμα Επίλυσης", {
          description:
            resData.error ||
            resData.conflicts?.join(" ") ||
            "Ο αλγόριθμος δεν μπόρεσε να βρει λύση.",
        });
      } else {
        toast.success("Επιτυχής Επίλυση Προγράμματος!", {
          description: `Υπολογίστηκε σε ${resData.solveTimeSeconds}s (${resData.slotsCount} ώρες).`,
        });
        await loadData();
      }
    } catch (err: any) {
      toast.error("Σφάλμα σύνδεσης με τον Solver", {
        description: err.message,
      });
    } finally {
      setIsSolving(false);
    }
  };

  const totalClasses = data?.classes.length || 0;
  const totalSlots = data?.slots.length || 0;

  // Unique teachers sorted for the legend
  const teachersList = useMemo(() => {
    if (!data) return [];
    return [...data.teachers].sort((a, b) =>
      a.lastName.localeCompare(b.lastName, "el")
    );
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 text-zinc-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-mono tracking-wide">
            Φόρτωση συστήματος metaSchool...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white font-sans text-xs selection:bg-zinc-800 selection:text-white">
      {/* Minimal Top Bar (Header) */}
      <header className="h-9 flex-none border-b border-zinc-200 bg-white px-3 flex items-center justify-between z-50">
        {/* Left Section: Branding & View title */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center text-white text-[11px] font-bold">
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-zinc-900 text-xs">metaSchool</span>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-600 font-medium text-xs hidden sm:inline">
            Κεντρικός Πίνακας Ωρολογίου Προγράμματος
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 hidden md:inline">
            {data.schoolConfig?.schoolName || "1ο Πειραματικό Δημοτικό"}
          </span>
        </div>

        {/* Center / Right Section: Actions & Spotlight */}
        <div className="flex items-center gap-2 font-mono">
          {/* Spotlight filter */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <Select
              value={spotlightTeacherId || "all"}
              onValueChange={(val) =>
                setSpotlightTeacherId(val === "all" ? null : val)
              }
            >
              <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-zinc-200 bg-zinc-50 text-zinc-700 min-w-[130px] font-mono">
                <SelectValue placeholder="Όλοι οι Εκπαιδευτικοί" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλοι οι Εκπαιδευτικοί</SelectItem>
                {data.teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    [{getTeacherAbbr(t)}] {t.lastName} {t.firstName[0]}.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {spotlightTeacherId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSpotlightTeacherId(null)}
                title="Καθαρισμός φίλτρου"
                className="h-6 w-6 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5" />

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              {totalClasses} Τμήματα • 50 Στήλες ({totalSlots} ώρες)
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5 hidden lg:block" />

          {/* Drawer Triggers */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSheet("classes")}
            className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <GraduationCap className="w-3 h-3 mr-1" />
            Τμήματα
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSheet("teachers")}
            className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <Users className="w-3 h-3 mr-1" />
            Εκπαιδευτικοί
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSheet("subjects")}
            className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Μαθήματα
          </Button>

          {/* Solver Button */}
          <Button
            size="sm"
            onClick={handleSolve}
            disabled={isSolving}
            className="h-6 px-2.5 text-[10px] font-sans bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <Sparkles
              className={`w-3 h-3 mr-1 ${
                isSolving ? "animate-spin text-amber-300" : "text-amber-400"
              }`}
            />
            {isSolving ? "Επίλυση..." : "Επίλυση"}
          </Button>

          {/* Reset Demo Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetDemo}
            title="Επαναφορά δοκιμαστικών δεδομένων"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-900"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </header>

      {/* Full-Screen Master Matrix Table */}
      <main className="flex-1 overflow-auto bg-white relative">
        <MasterMatrix
          data={data}
          onRefresh={loadData}
          spotlightTeacherId={spotlightTeacherId}
          onSelectTeacherSpotlight={setSpotlightTeacherId}
        />
      </main>

      {/* Legend Footer Bar */}
      <footer className="h-7 flex-none border-t border-zinc-200 bg-zinc-50 px-3 flex items-center justify-between text-[10px] text-zinc-600 select-none z-30">
        {/* Teachers chips legend */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="font-semibold text-zinc-800 flex-shrink-0">
            Εκπαιδευτικοί:
          </span>
          <div className="flex items-center gap-1 font-mono text-[9px] flex-shrink-0">
            {teachersList.map((tch) => {
              const abbr = getTeacherAbbr(tch);
              const isSelected = spotlightTeacherId === tch.id;

              return (
                <button
                  key={tch.id}
                  onClick={() =>
                    setSpotlightTeacherId(isSelected ? null : tch.id)
                  }
                  title={`${tch.lastName} ${tch.firstName} (${formatSpecialtyLabel(tch.specialty)})`}
                  style={getTeacherTileInlineStyle(tch)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border font-bold cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-zinc-900 scale-105 shadow-xs"
                      : spotlightTeacherId
                      ? "opacity-30"
                      : "hover:opacity-85 hover:scale-105"
                  }`}
                >
                  {abbr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-600 flex-shrink-0 pl-2">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded bg-amber-50 border border-amber-300"></span>
            <span>1-4: Ζώνη Ολοημέρου</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 border-l border-zinc-200 pl-2">
            <span className="font-semibold text-zinc-700">Συνδιδασκαλία:</span>
            <span className="text-zinc-500">
              2 Εκπαιδευτικοί (50/50) • 3 (33/33/33)
            </span>
          </div>
        </div>
      </footer>

      {/* Slide-over Sheets for Managers */}
      <Sheet
        open={Boolean(activeSheet)}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      >
        <SheetContent
          side="right"
          className="!w-screen sm:!w-screen !max-w-none inset-0 rounded-none overflow-y-auto p-6"
        >
          <SheetHeader className="pb-3 border-b border-zinc-200">
            <div className="flex items-center justify-between pr-8">
              {/* Left: Active Section Title */}
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                {activeSheet === "teachers" && (
                  <>
                    <Users className="w-5 h-5 text-zinc-800" />
                    <span>Εκπαιδευτικοί</span>
                  </>
                )}
                {activeSheet === "classes" && (
                  <>
                    <GraduationCap className="w-5 h-5 text-zinc-800" />
                    <span>Τμήματα</span>
                  </>
                )}
                {activeSheet === "subjects" && (
                  <>
                    <BookOpen className="w-5 h-5 text-zinc-800" />
                    <span>Μαθήματα</span>
                  </>
                )}
              </SheetTitle>

              {/* Right: Modern Tabs Switcher */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80">
                <button
                  type="button"
                  onClick={() => setActiveSheet("teachers")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSheet === "teachers"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Εκπαιδευτικοί</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheet("classes")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSheet === "classes"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Τμήματα</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheet("subjects")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSheet === "subjects"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Μαθήματα</span>
                </button>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4">
            {activeSheet === "classes" && (
              <ClassesManager data={data} onRefresh={loadData} />
            )}
            {activeSheet === "teachers" && (
              <TeachersManager data={data} onRefresh={loadData} />
            )}
            {activeSheet === "subjects" && (
              <SubjectsManager data={data} onRefresh={loadData} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
