"use client";

import React, { useState, useEffect } from "react";
import { TimetableData, ConflictDiagnosticItem } from "@/types";
import { MasterMatrix } from "@/components/master-matrix";
import { ClassesManager } from "@/components/classes-manager";
import { TeachersManager } from "@/components/teachers-manager";
import { SubjectsManager } from "@/components/subjects-manager";
import { RulesManager } from "@/components/rules-manager";
import { DiagnosticsModal } from "@/components/diagnostics-modal";
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
  Menu,
  ClipboardList,
  Umbrella,
  Settings,
  User,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      {/* Minimal Top Bar (Header) */}
      <header className="h-9 flex-none border-b border-zinc-200 bg-white px-3 flex items-center justify-between z-50">
        {/* Left Section: Menu, Logo icon & School badge */}
        <div className="flex items-center gap-2">
          {/* Main Menu Trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(true)}
            className="h-7 w-7 p-0 text-zinc-600 hover:bg-zinc-100 rounded-md -ml-1 mr-1"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center text-white text-[11px] font-bold">
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 hidden sm:inline-block">
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
            onClick={() => setActiveSheet("rules")}
            className="h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <CalendarDays className="w-3 h-3 mr-1" />
            Κανόνες
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

      {/* Main Navigation Menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-white border-r border-zinc-200">
          <div className="h-14 flex items-center px-4 border-b border-zinc-100 flex-none">
            <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center text-white mr-2">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-zinc-800">metaSchool</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-zinc-100 text-zinc-900"
            >
              <CalendarDays className="w-4 h-4 text-zinc-700" />
              Πρόγραμμα
            </button>
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-zinc-400" />
              Εφημερίες
            </button>
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <Umbrella className="w-4 h-4 text-zinc-400" />
              Άδειες
            </button>
          </div>

          <div className="border-t border-zinc-100 p-3 flex flex-col gap-1 flex-none">
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              Ρυθμίσεις
            </button>
            <div className="h-px bg-zinc-100 my-1 mx-2" />
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <User className="w-4 h-4 text-zinc-400" />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none">Είσοδος</span>
                <span className="text-[10px] text-zinc-400 mt-1 font-normal">Δεν έχετε συνδεθεί</span>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
