"use client";

import Link from "next/link";

import React, { useState, useEffect } from "react";
import { TimetableData, ConflictDiagnosticItem } from "@/types";
import { MasterMatrix } from "@/components/master-matrix";
import { ClassesManager } from "@/components/classes-manager";
import { TeachersManager } from "@/components/teachers-manager";
import { SubjectsManager } from "@/components/subjects-manager";
import { RulesManager } from "@/components/rules-manager";
import { DiagnosticsModal } from "@/components/diagnostics-modal";
import { SiteHeader } from "@/components/site-header";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<
    "classes" | "teachers" | "subjects" | "rules" | null
  >(null);
  const [spotlightTeacherId, setSpotlightTeacherId] = useState<string | null>(
    null
  );
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [diagnosticItems, setDiagnosticItems] = useState<ConflictDiagnosticItem[]>([]);
  const [diagnosticConflicts, setDiagnosticConflicts] = useState<string[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/timetable");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        const msg = json.error || "Αποτυχία ανάγνωσης δεδομένων";
        setLoadError(msg);
        toast.error("Σφάλμα φόρτωσης δεδομένων", { description: msg });
      }
    } catch (e: any) {
      const msg = e.message || "Σφάλμα σύνδεσης";
      setLoadError(msg);
      toast.error("Σφάλμα σύνδεσης με τη βάση", { description: msg });
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
        if (resData.status === "INFEASIBLE") {
          setDiagnosticItems(resData.diagnosticItems || []);
          setDiagnosticConflicts(resData.conflicts || []);
          setDiagnosticsModalOpen(true);
          toast.error("Αδυναμία Επίλυσης", {
            description: "Εντοπίστηκαν συγκρουόμενοι περιορισμοί. Ανοίγει το παράθυρο διάγνωσης.",
          });
        } else {
          toast.error("Σφάλμα Επίλυσης", {
            description:
              resData.error ||
              resData.conflicts?.join(" ") ||
              "Ο αλγόριθμος δεν μπόρεσε να βρει λύση.",
          });
        }
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


  if (loadError && !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 text-zinc-800">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-900">Σφάλμα Σύνδεσης</h3>
            <p className="text-xs text-zinc-500 mt-1">{loadError}</p>
          </div>
          <Button onClick={loadData} size="sm" className="h-8 text-xs bg-zinc-900 text-white hover:bg-zinc-800">
            Δοκιμάστε ξανά
          </Button>
        </div>
      </div>
    );
  }

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
      <SiteHeader
        schoolName={data.schoolConfig?.schoolName}
        rightActions={
          <>
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
              onClick={() => setActiveSheet("rules")}
              className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <CalendarDays className="w-3 h-3 mr-1" />
              Κανόνες
            </Button>

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
          </>
        }
      />

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
          className="!w-screen sm:!w-screen !max-w-none inset-0 rounded-none overflow-hidden p-0 flex flex-col bg-zinc-100/60 border-none"
        >
          {activeSheet === "classes" && (
            <ClassesManager
              data={data}
              onRefresh={loadData}
              activeTab={activeSheet}
              onTabChange={setActiveSheet}
            />
          )}
          {activeSheet === "teachers" && (
            <TeachersManager
              data={data}
              onRefresh={loadData}
              activeTab={activeSheet}
              onTabChange={setActiveSheet}
            />
          )}
          {activeSheet === "subjects" && (
            <SubjectsManager
              data={data}
              onRefresh={loadData}
              activeTab={activeSheet}
              onTabChange={setActiveSheet}
            />
          )}
          {activeSheet === "rules" && (
            <RulesManager
              data={data}
              onRefresh={loadData}
              activeTab={activeSheet}
              onTabChange={setActiveSheet}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Diagnostics Modal for Infeasibility / Conflict Analysis */}
      <DiagnosticsModal
        isOpen={diagnosticsModalOpen}
        onClose={() => setDiagnosticsModalOpen(false)}
        diagnosticItems={diagnosticItems}
        conflicts={diagnosticConflicts}
        onNavigateToTab={(tab, targetId) => {
          setActiveSheet(tab);
          if (tab === "teachers" && targetId) {
            setSpotlightTeacherId(targetId);
          }
        }}
        onRetrySolve={handleSolve}
      />
    </div>
  );
}
