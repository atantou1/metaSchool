"use client";

import React, { useMemo, useState } from "react";
import { TimetableData, LessonAssignment } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Pencil, Trash2, Users, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface AssignmentsManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: "teachers" | "classes" | "subjects" | "assignments";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "assignments") => void;
}

export const AssignmentsManager: React.FC<AssignmentsManagerProps> = ({
  data,
  onRefresh,
  activeTab = "assignments",
  onTabChange,
}) => {
  // Sort classes by orderIndex
  const sortedClasses = useMemo(() => {
    return [...data.classes].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [data.classes]);

  // Selected class state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    sortedClasses.length > 0 ? sortedClasses[0].id : null
  );

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<LessonAssignment | null>(null);
  const [formData, setFormData] = useState({
    subjectId: "",
    teacherId: "", // empty means ANY
    hours: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter assignments for the selected class and sort by subject
  const currentAssignments = useMemo(() => {
    if (!selectedClassId) return [];
    
    const classSubGroupIds = data.subGroups
      .filter((sg) => sg.classId === selectedClassId)
      .map((sg) => sg.id);

    return data.assignments
      .filter((a) => classSubGroupIds.includes(a.subGroupId))
      .sort((a, b) => {
        const subjA = data.subjects.find((s) => s.id === a.subjectId)?.title || "";
        const subjB = data.subjects.find((s) => s.id === b.subjectId)?.title || "";
        return subjA.localeCompare(subjB);
      });
  }, [data.assignments, data.subGroups, data.subjects, selectedClassId]);

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setFormData({ subjectId: "", teacherId: "", hours: "1" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (assignment: LessonAssignment) => {
    setEditingAssignment(assignment);
    setFormData({
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId === "TCH-ANY" ? "" : assignment.teacherId,
      hours: assignment.hours.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ανάθεση;")) return;
    
    try {
      const res = await fetch(`/api/timetable/assignments?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Η ανάθεση διαγράφηκε.");
        onRefresh();
      } else {
        toast.error("Σφάλμα διαγραφής");
      }
    } catch (e: any) {
      toast.error("Σφάλμα", { description: e.message });
    }
  };

  const handleSave = async () => {
    if (!formData.subjectId) {
      toast.error("Παρακαλώ επιλέξτε μάθημα");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the default subgroup for the selected class
      const defaultSubGroup = data.subGroups.find(
        (sg) => sg.classId === selectedClassId && sg.isDefault
      );

      const payload = {
        id: editingAssignment?.id,
        teacherId: formData.teacherId || null,
        subjectId: formData.subjectId,
        subGroupId: editingAssignment?.subGroupId || defaultSubGroup?.id,
        hours: parseInt(formData.hours) || 1,
      };

      const res = await fetch("/api/timetable/assignments", {
        method: editingAssignment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingAssignment ? "Η ανάθεση ενημερώθηκε!" : "Η ανάθεση δημιουργήθηκε!");
        setIsDialogOpen(false);
        onRefresh();
      } else {
        const json = await res.json();
        toast.error("Σφάλμα αποθήκευσης", { description: json.error });
      }
    } catch (e: any) {
      toast.error("Σφάλμα", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-100/60">
      {/* Unified Top Header Bar */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Modern Tabs Switcher */}
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
            onClick={() => onTabChange?.("assignments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "assignments"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Αναθέσεις</span>
          </button>
        </div>

        {/* Middle: Class Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-xl px-2">
          {sortedClasses.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedClassId === cls.id
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        {/* Right: New Assignment */}
        <div className="flex items-center gap-2 pr-10">
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Νέα Ανάθεση
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
        <div className="overflow-y-auto flex-1">
          <Table className="w-full text-xs">
            <TableHeader className="bg-zinc-50/80 backdrop-blur-sm sticky top-0 z-10">
              <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                <TableHead className="w-[300px] font-semibold text-zinc-700 h-9">Μάθημα</TableHead>
                <TableHead className="w-[300px] font-semibold text-zinc-700 h-9">Εκπαιδευτικός</TableHead>
                <TableHead className="w-[100px] font-semibold text-zinc-700 h-9 text-center">Ώρες</TableHead>
                <TableHead className="w-[80px] font-semibold text-zinc-700 h-9 text-right">Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                    Δεν υπάρχουν αναθέσεις για αυτό το τμήμα.
                  </TableCell>
                </TableRow>
              ) : (
                currentAssignments.map((assignment) => {
                  const teacher = data.teachers.find((t) => t.id === assignment.teacherId);
                  const subject = data.subjects.find((s) => s.id === assignment.subjectId);

                  return (
                    <TableRow
                      key={assignment.id}
                      className="group border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors"
                    >
                      {/* Μάθημα */}
                      <TableCell className="font-medium text-zinc-800">
                        {subject ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-md" 
                              style={{ backgroundColor: subject.color }} 
                            />
                            <span>{subject.title}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Άγνωστο</span>
                        )}
                      </TableCell>

                      {/* Εκπαιδευτικός */}
                      <TableCell>
                        {teacher ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: teacher.color }} 
                            />
                            <span>{teacher.lastName} {teacher.firstName}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-semibold bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            Οποιοσδήποτε
                          </span>
                        )}
                      </TableCell>

                      {/* Ώρες */}
                      <TableCell className="text-center font-semibold text-zinc-900">
                        {assignment.hours}
                      </TableCell>

                      {/* Ενέργειες */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleOpenEdit(assignment)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingAssignment ? "Επεξεργασία Ανάθεσης" : "Νέα Ανάθεση"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Μάθημα</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(val) => setFormData({ ...formData, subjectId: val || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε Μάθημα" />
                </SelectTrigger>
                <SelectContent>
                  {data.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Εκπαιδευτικός</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(val) => setFormData({ ...formData, teacherId: val || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Οποιοσδήποτε (Ελεύθερο)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Οποιοσδήποτε (Βάσει Κενού)</SelectItem>
                  {data.teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.lastName} {t.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">
                Αν επιλέξετε "Οποιοσδήποτε", ο αλγόριθμος θα τοποθετήσει οποιονδήποτε διαθέσιμο εκπαιδευτικό της αντίστοιχης ειδικότητας.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Ώρες ανά Εβδομάδα</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              />
              <p className="text-[10px] text-zinc-500">
                *Η λειτουργία εύρους (Range) / "Αδιάφορο" θα ενεργοποιηθεί στην επόμενη αναβάθμιση της βάσης δεδομένων. Προς το παρόν δηλώστε τον σταθερό στόχο.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
