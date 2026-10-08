"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TimetableSlot, TimetableData } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Check,
  Lock,
  Search,
  UserPlus,
  AlertCircle,
  Sparkles,
  Calendar,
  Clock,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface StudentSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimetableSlot | null;
  data: TimetableData;
  onSaveStudents: (slotId: string, students: string[]) => Promise<void>;
  onRefresh?: () => void;
}

export const StudentSelectModal: React.FC<StudentSelectModalProps> = ({
  open,
  onOpenChange,
  slot,
  data,
  onSaveStudents,
  onRefresh,
}) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Sync selected students when slot changes
  useEffect(() => {
    if (slot) {
      setSelectedStudents(slot.students ? [...slot.students] : []);
      setSearchQuery("");
      setNewStudentName("");
    }
  }, [slot]);

  // Associated entities for the current slot
  const currentClass = useMemo(() => {
    if (!slot) return null;
    return data.classes.find((c) => c.id === slot.classId) || null;
  }, [slot, data.classes]);

  const currentTeacher = useMemo(() => {
    if (!slot) return null;
    return data.teachers.find((t) => t.id === slot.teacherId) || null;
  }, [slot, data.teachers]);

  const currentSubject = useMemo(() => {
    if (!slot) return null;
    return data.subjects.find((s) => s.id === slot.subjectId) || null;
  }, [slot, data.subjects]);

  const dayLabel = useMemo(() => {
    if (!slot) return "";
    const days = data.schoolConfig?.days || [
      "Δευτέρα",
      "Τρίτη",
      "Τετάρτη",
      "Πέμπτη",
      "Παρασκευή",
    ];
    return days[slot.day] || `Ημέρα ${slot.day + 1}`;
  }, [slot, data.schoolConfig]);

  const periodLabel = useMemo(() => {
    if (!slot) return "";
    return `${slot.period + 1}η Ώρα`;
  }, [slot]);

  // Find other slots for the SAME class, SAME day and SAME period
  const otherConcurrentSlots = useMemo(() => {
    if (!slot) return [];
    return data.slots.filter(
      (s) =>
        s.id !== slot.id &&
        s.day === slot.day &&
        s.period === slot.period &&
        s.classId === slot.classId
    );
  }, [slot, data.slots]);

  // Map of occupied students -> slot info
  const occupiedStudentsMap = useMemo(() => {
    const map = new Map<
      string,
      { teacherName: string; subjectTitle: string; slotId: string }
    >();

    otherConcurrentSlots.forEach((s) => {
      if (s.students && Array.isArray(s.students)) {
        const tch = data.teachers.find((t) => t.id === s.teacherId);
        const subj = data.subjects.find((sub) => sub.id === s.subjectId);
        const teacherName = tch ? `${tch.lastName} ${tch.firstName[0]}.` : "Εκπαιδευτικός";
        const subjectTitle = subj?.title || subj?.code || "Συμπλ. Ειδικότητα";

        s.students.forEach((st) => {
          map.set(st, {
            teacherName,
            subjectTitle,
            slotId: s.id,
          });
        });
      }
    });

    return map;
  }, [otherConcurrentSlots, data.teachers, data.subjects]);

  // List of all students in current class
  const classStudents = useMemo(() => {
    return currentClass?.students || [];
  }, [currentClass]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase().trim();
    return classStudents.filter((st) => st.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  // Toggle single student selection
  const toggleStudent = (student: string) => {
    if (occupiedStudentsMap.has(student)) {
      toast.warning(
        `Ο/Η μαθητής/τρια «${student}» παρακολουθεί ήδη ${occupiedStudentsMap.get(student)?.subjectTitle} (${occupiedStudentsMap.get(student)?.teacherName}) την ίδια ώρα.`
      );
      return;
    }

    setSelectedStudents((prev) =>
      prev.includes(student)
        ? prev.filter((s) => s !== student)
        : [...prev, student]
    );
  };

  // Select all available students
  const handleSelectAllAvailable = () => {
    const available = classStudents.filter((st) => !occupiedStudentsMap.has(st));
    setSelectedStudents(available);
    toast.info(`Επιλέχθηκαν ${available.length} διαθέσιμοι μαθητές.`);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedStudents([]);
  };

  // Quick add student to class
  const handleQuickAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !currentClass) return;

    const trimmed = newStudentName.trim();
    if (classStudents.includes(trimmed)) {
      toast.warning("Ο μαθητής υπάρχει ήδη στη λίστα του τμήματος.");
      return;
    }

    setIsAddingStudent(true);
    try {
      const updatedStudents = [...classStudents, trimmed];
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentClass,
          students: updatedStudents,
        }),
      });

      if (!res.ok) throw new Error("Αποτυχία προσθήκης μαθητή");

      toast.success(`Ο μαθητής «${trimmed}» προστέθηκε στο τμήμα ${currentClass.name}!`);
      // Auto-select this newly added student for this slot
      setSelectedStudents((prev) => [...prev, trimmed]);
      setNewStudentName("");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Σφάλμα κατά την προσθήκη");
    } finally {
      setIsAddingStudent(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!slot) return;
    setIsSaving(true);
    try {
      await onSaveStudents(slot.id, selectedStudents);
      toast.success(
        selectedStudents.length > 0
          ? `Αποθηκεύτηκαν ${selectedStudents.length} μαθητές για τη συγκεκριμένη ώρα!`
          : "Η λίστα μαθητών εκκαθαρίστηκε για τη συγκεκριμένη ώρα."
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Σφάλμα αποθήκευσης");
    } finally {
      setIsSaving(false);
    }
  };

  if (!slot || !currentClass) return null;

  const totalClassCount = classStudents.length;
  const occupiedCount = classStudents.filter((st) => occupiedStudentsMap.has(st)).length;
  const availableCount = totalClassCount - occupiedCount;
  const selectedCount = selectedStudents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden font-sans border-zinc-200">
        {/* Header with detailed context */}
        <DialogHeader className="p-4 pb-3 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border-b border-zinc-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs text-white shadow-2xs"
                style={{ backgroundColor: currentClass.color || "#3b82f6" }}
              >
                {currentClass.name}
              </span>
              <DialogTitle className="text-base font-bold text-zinc-900">
                Επιλογή Μαθητών
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[10.5px] font-semibold border-purple-200 bg-purple-100 text-purple-800"
            >
              Συμπληρωματική Ειδικότητα
            </Badge>
          </div>

          {/* Context Sub-bar */}
          <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap pt-0.5">
            <div className="flex items-center gap-1 font-semibold text-zinc-900">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>{currentSubject?.title || currentSubject?.code || "Μάθημα"}</span>
            </div>
            <span className="text-zinc-300">•</span>
            <div className="flex items-center gap-1 text-zinc-700">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              <span>{currentTeacher ? `${currentTeacher.lastName} ${currentTeacher.firstName}` : "—"}</span>
            </div>
            <span className="text-zinc-300">•</span>
            <div className="flex items-center gap-1 text-zinc-700 font-mono">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{dayLabel}</span>
              <Clock className="w-3.5 h-3.5 text-zinc-500 ml-1" />
              <span>{periodLabel}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-zinc-50 p-2 rounded-lg border border-zinc-200/80">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 font-medium">Επιλεγμένοι</span>
              <span className="text-sm font-bold font-mono text-purple-700">
                {selectedCount} <span className="text-[10px] font-normal text-zinc-400">/ {totalClassCount}</span>
              </span>
            </div>
            <div className="flex flex-col items-center border-x border-zinc-200">
              <span className="text-[10px] text-zinc-500 font-medium">Διαθέσιμοι</span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                {availableCount}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 font-medium">Σε άλλη ειδικότητα</span>
              <span className="text-sm font-bold font-mono text-amber-700">
                {occupiedCount}
              </span>
            </div>
          </div>

          {/* Search + Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Αναζήτηση μαθητή..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllAvailable}
              disabled={availableCount === 0}
              className="h-8 px-2.5 text-[11px] text-zinc-700 hover:text-zinc-900 border-zinc-300"
            >
              Όλοι οι διαθέσιμοι
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectedCount === 0}
              className="h-8 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Καθαρισμός
            </Button>
          </div>

          {/* Student List */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100 bg-white">
            {classStudents.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-zinc-800">
                  Δεν έχουν καταχωρηθεί μαθητές στο τμήμα {currentClass.name}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Προσθέστε μαθητές χρησιμοποιώντας το παρακάτω πεδίο ή από την καρτέλα «Τμήματα».
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                Δεν βρέθηκε μαθητής με «{searchQuery}»
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudents.includes(student);
                const occupiedInfo = occupiedStudentsMap.get(student);
                const isOccupied = Boolean(occupiedInfo);

                return (
                  <div
                    key={student}
                    onClick={() => {
                      if (!isOccupied) toggleStudent(student);
                    }}
                    className={`flex items-center justify-between p-2.5 text-xs transition-colors select-none ${
                      isOccupied
                        ? "bg-zinc-50/80 cursor-not-allowed opacity-75"
                        : isSelected
                        ? "bg-purple-50/80 hover:bg-purple-100/70 cursor-pointer text-purple-950 font-medium"
                        : "hover:bg-zinc-50 cursor-pointer text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox box */}
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                          isOccupied
                            ? "bg-zinc-200 border border-zinc-300 text-zinc-400"
                            : isSelected
                            ? "bg-purple-600 text-white border border-purple-700 shadow-2xs"
                            : "border border-zinc-300 bg-white hover:border-purple-400"
                        }`}
                      >
                        {isOccupied ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : isSelected ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : null}
                      </div>

                      <span className="truncate">{student}</span>
                    </div>

                    {/* Status badge */}
                    {isOccupied ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1 shrink-0"
                        title={`Απασχολημένος σε άλλη ειδικότητα: ${occupiedInfo?.subjectTitle} (${occupiedInfo?.teacherName})`}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>{occupiedInfo?.subjectTitle} ({occupiedInfo?.teacherName})</span>
                      </Badge>
                    ) : isSelected ? (
                      <Badge className="text-[10px] bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 shadow-none shrink-0 font-medium">
                        Επιλεγμένος
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono">Διαθέσιμος</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Student Form */}
          <form
            onSubmit={handleQuickAddStudent}
            className="pt-2 border-t border-zinc-100 flex items-center gap-2"
          >
            <Input
              type="text"
              placeholder="+ Προσθήκη νέου μαθητή στο τμήμα..."
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="h-8 text-xs bg-zinc-50 border-zinc-200 focus:bg-white flex-1"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!newStudentName.trim() || isAddingStudent}
              className="h-8 px-2.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              <span>Προσθήκη</span>
            </Button>
          </form>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center sm:justify-between">
          <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>
              {selectedCount > 0
                ? `${selectedCount} μαθητές έχουν επιλεγεί`
                : "Δεν έχει επιλεγεί κανένας μαθητής"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-xs cursor-pointer"
            >
              {isSaving ? "Αποθήκευση..." : "Αποθήκευση Μαθητών"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
