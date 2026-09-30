"use client";

import React, { useEffect, useState, useMemo } from "react";
import { TimetableData } from "@/types";
import { MasterMatrix } from "@/components/master-matrix";
import { ClassesManager } from "@/components/classes-manager";
import { TeachersManager } from "@/components/teachers-manager";
import { SubjectsManager } from "@/components/subjects-manager";
import { AssignmentsManager } from "@/components/assignments-manager";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CalendarDays,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [activeSheet, setActiveSheet] = useState<
    "classes" | "teachers" | "subjects" | "assignments" | null
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
        {/* Left Section: Logo icon & School badge */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center text-white text-[11px] font-bold">
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
            {data.schoolConfig?.schoolName || "1ο Πειραματικό Δημοτικό"}
          </span>
        </div>

        {/* Right Section: Drawer Triggers & Actions */}
        <div className="flex items-center gap-2 font-mono">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSheet("assignments")}
            className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <CalendarDays className="w-3 h-3 mr-1" />
            Αναθέσεις
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

      {/* Footer Bar */}
      <footer className="h-6 flex-none border-t border-zinc-200 bg-zinc-50 px-3 flex items-center justify-between text-[10px] text-zinc-600 select-none z-30" />

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
                {activeSheet === "assignments" && (
                  <>
                    <CalendarDays className="w-5 h-5 text-zinc-800" />
                    <span>Αναθέσεις</span>
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
                <button
                  type="button"
                  onClick={() => setActiveSheet("assignments")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSheet === "assignments"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Αναθέσεις</span>
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
            {activeSheet === "assignments" && (
              <AssignmentsManager data={data} onRefresh={loadData} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
