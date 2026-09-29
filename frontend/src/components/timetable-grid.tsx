"use client";

import React, { useState } from "react";
import {
  TimetableData,
  TimetableSlot,
} from "@/types";
import { SplitCell } from "./split-cell";
import { MoveSlotModal } from "./move-slot-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Trash2,
  Cpu,
  Clock,
  CheckCircle2,
  Layers,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatSpecialtyLabel } from "@/lib/specialties";

interface TimetableGridProps {
  data: TimetableData;
  onRefresh: () => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  data,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>(
    data.classes[0]?.id || ""
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    data.teachers[0]?.id || ""
  );
  const [isSolving, setIsSolving] = useState(false);
  const [solveStats, setSolveStats] = useState<{
    status: string;
    time: number;
    slotsCount: number;
  } | null>(null);

  const [activeSlotToMove, setActiveSlotToMove] = useState<TimetableSlot | null>(
    null
  );

  React.useEffect(() => {
    if (!selectedClassId && data.classes.length > 0) {
      setSelectedClassId(data.classes[0].id);
    }
    if (!selectedTeacherId && data.teachers.length > 0) {
      setSelectedTeacherId(data.teachers[0].id);
    }
  }, [data.classes, data.teachers, selectedClassId, selectedTeacherId]);

  const days = data.schoolConfig?.days || [
    "Δευτέρα",
    "Τρίτη",
    "Τετάρτη",
    "Πέμπτη",
    "Παρασκευή",
  ];

  const periods = data.schoolConfig?.periods || [
    { index: 0, label: "1η Ώρα", startTime: "08:15", endTime: "09:00" },
    { index: 1, label: "2η Ώρα", startTime: "09:05", endTime: "09:50" },
    { index: 2, label: "3η Ώρα", startTime: "10:05", endTime: "10:50" },
    { index: 3, label: "4η Ώρα", startTime: "10:55", endTime: "11:40" },
    { index: 4, label: "5η Ώρα", startTime: "11:55", endTime: "12:35" },
    { index: 5, label: "6η Ώρα", startTime: "12:40", endTime: "13:15" },
  ];

  const handleSolve = async () => {
    setIsSolving(true);
    setSolveStats(null);
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
        setSolveStats({
          status: resData.status,
          time: resData.solveTimeSeconds,
          slotsCount: resData.slotsCount,
        });
        toast.success("Επιτυχής Επίλυση Προγράμματος!", {
          description: `Το πρόγραμμα υπολογίστηκε σε ${resData.solveTimeSeconds}s (${resData.slotsCount} ώρες).`,
        });
        onRefresh();
      }
    } catch (err: any) {
      toast.error("Σφάλμα σύνδεσης με τον Solver", {
        description: err.message,
      });
    } finally {
      setIsSolving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να εκκαθαρίσετε το παραχθέν πρόγραμμα;")) {
      return;
    }
    try {
      await fetch("/api/timetable/slots", { method: "DELETE" });
      toast.info("Το πρόγραμμα εκκαθαρίστηκε.");
      setSolveStats(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredSlots = React.useMemo(() => {
    if (viewMode === "class") {
      return data.slots.filter((s) => s.classId === selectedClassId);
    } else {
      return data.slots.filter((s) => s.teacherId === selectedTeacherId);
    }
  }, [data.slots, viewMode, selectedClassId, selectedTeacherId]);

  const selectedClass = data.classes.find((c) => c.id === selectedClassId);
  const selectedTeacher = data.teachers.find((t) => t.id === selectedTeacherId);

  const currentAssignedHours = filteredSlots.filter((s) => !s.isSupport).length;
  const currentSupportHours = filteredSlots.filter((s) => s.isSupport).length;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switch */}
          <div className="flex items-center rounded-lg bg-zinc-100 p-1 border border-zinc-200 text-xs">
            <button
              onClick={() => setViewMode("class")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "class"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Ανά Τμήμα</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode("teacher")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "teacher"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ανά Εκπαιδευτικό</span>
              </div>
            </button>
          </div>

          {/* Selector */}
          {viewMode === "class" ? (
            <Select
              value={selectedClassId}
              onValueChange={(val) => setSelectedClassId(val || "")}
            >
              <SelectTrigger className="w-[190px] bg-white border-zinc-200 text-zinc-800 text-xs shadow-xs">
                <SelectValue placeholder="Επιλογή Τμήματος" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                {data.classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    Τμήμα {cls.name} (Τάξη {cls.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={selectedTeacherId}
              onValueChange={(val) => setSelectedTeacherId(val || "")}
            >
              <SelectTrigger className="w-[250px] bg-white border-zinc-200 text-zinc-800 text-xs shadow-xs">
                <SelectValue placeholder="Επιλογή Εκπαιδευτικού" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                {data.teachers.map((tch) => (
                  <SelectItem key={tch.id} value={tch.id}>
                    {tch.lastName} {tch.firstName} ({formatSpecialtyLabel(tch.specialty)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quick info badges */}
          {viewMode === "class" && selectedClass && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-zinc-200 bg-zinc-50 text-zinc-700 font-mono">
                {currentAssignedHours} / 30 Ώρες
              </Badge>
              {selectedClass.supportHoursMin > 0 && (
                <Badge className="text-xs bg-sky-50 text-sky-800 border-sky-200 font-mono">
                  Υποστήριξη: {currentSupportHours} (Στόχος: {selectedClass.supportHoursMin}-{selectedClass.supportHoursMax}ω)
                </Badge>
              )}
            </div>
          )}

          {viewMode === "teacher" && selectedTeacher && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-zinc-200 bg-zinc-50 text-zinc-700 font-mono">
                {currentAssignedHours + currentSupportHours} Ώρες / Εβδομάδα
              </Badge>
              {selectedTeacher.isSupport && (
                <Badge className="text-xs bg-sky-50 text-sky-800 border-sky-200 font-mono">
                  Υποστηρικτική Ειδικότητα
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="border-zinc-200 text-zinc-600 hover:text-red-600 hover:bg-zinc-50 text-xs shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Εκκαθάριση
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Ανανέωση
          </Button>

          {/* Solver CTA */}
          <Button
            onClick={handleSolve}
            disabled={isSolving}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
          >
            {isSolving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Επίλυση με OR-Tools...
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 mr-1.5" />
                Επίλυση Προγράμματος
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Solver status banner if solved */}
      {solveStats && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Κατάσταση:</strong> {solveStats.status === "OPTIMAL" ? "Βέλτιστη Λύση (Optimal)" : "Έγκυρη Λύση (Feasible)"}
            </span>
            <span className="text-emerald-400">•</span>
            <span>
              Χρόνος: <strong>{solveStats.time}s</strong>
            </span>
            <span className="text-emerald-400">•</span>
            <span>
              Ανατέθηκαν <strong>{solveStats.slotsCount}</strong> διδακτικές ώρες
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-800 font-mono text-[11px] font-semibold">Layer 1 + Layer 2 Solver</span>
          </div>
        </div>
      )}

      {/* Timetable Master Grid Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="w-36 p-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Ώρα / Περίοδος
                </th>
                {days.map((dayName, idx) => (
                  <th
                    key={idx}
                    className="p-3 text-left text-xs font-semibold text-zinc-800 uppercase tracking-wider border-l border-zinc-200 min-w-[190px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>{dayName}</span>
                      <span className="text-[10px] font-mono text-zinc-400 font-normal">
                        Ημέρα {idx + 1}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {periods.map((period, periodIdx) => (
                <tr
                  key={periodIdx}
                  className="hover:bg-zinc-50/60 transition-colors"
                >
                  {/* Period column header */}
                  <td className="p-3 align-top bg-zinc-50/60 border-r border-zinc-200">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-900">
                        {period.label || `${periodIdx + 1}η Ώρα`}
                      </span>
                      <div className="mt-1 flex items-center text-[10px] text-zinc-500 font-mono">
                        <Clock className="w-2.5 h-2.5 mr-1 inline" />
                        {period.startTime} - {period.endTime}
                      </div>
                    </div>
                  </td>

                  {/* Day Columns */}
                  {days.map((_, dayIdx) => {
                    const cellSlots = filteredSlots.filter(
                      (s) => s.day === dayIdx && s.period === periodIdx
                    );

                    return (
                      <td
                        key={dayIdx}
                        className="p-2 align-top border-l border-zinc-200"
                      >
                        <SplitCell
                          day={dayIdx}
                          period={periodIdx}
                          slots={cellSlots}
                          teachers={data.teachers}
                          subjects={data.subjects}
                          subGroups={data.subGroups}
                          classes={data.classes}
                          viewMode={viewMode}
                          onMoveSlot={(slot) => setActiveSlotToMove(slot)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Move slot modal */}
      <MoveSlotModal
        slot={activeSlotToMove}
        schoolConfig={data.schoolConfig}
        isOpen={Boolean(activeSlotToMove)}
        onClose={() => setActiveSlotToMove(null)}
        onSlotMoved={onRefresh}
      />
    </div>
  );
};
