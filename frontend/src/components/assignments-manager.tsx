"use client";

import React, { useMemo, useState, useEffect } from "react";
import { TimetableData, LessonAssignment, Subject, Teacher } from "@/types";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  UserCheck,
  BarChart3,
  X,
  ChevronDown,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeClassHours } from "./subjects-manager";
import { getSpecialties, getSpecialtyByCode } from "@/lib/specialties";

interface AssignmentsManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: "teachers" | "classes" | "subjects" | "assignments";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "assignments") => void;
}

type CoverageStatus = "all" | "complete" | "incomplete" | "overallocated" | "unassigned";

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

  // Sync selectedClassId if sortedClasses changes and current is invalid
  useEffect(() => {
    if (sortedClasses.length > 0 && (!selectedClassId || !sortedClasses.some((c) => c.id === selectedClassId))) {
      setSelectedClassId(sortedClasses[0].id);
    }
  }, [sortedClasses, selectedClassId]);

  // Filter state
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [searchSubjectQuery, setSearchSubjectQuery] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<CoverageStatus>("all");
  const [showTeacherWorkload, setShowTeacherWorkload] = useState(false);

  // Dialog state for create / edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<LessonAssignment | null>(null);
  const [targetSubjectIdForNew, setTargetSubjectIdForNew] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subjectId: "",
    teacherId: "", // empty or "TCH-ANY" means ANY
    hours: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [assignmentToDelete, setAssignmentToDelete] = useState<LessonAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Current selected class entity
  const currentClass = useMemo(() => {
    return data.classes.find((c) => c.id === selectedClassId) || null;
  }, [data.classes, selectedClassId]);

  // Default subgroup for current class
  const currentSubGroup = useMemo(() => {
    if (!selectedClassId) return null;
    return (
      data.subGroups.find((sg) => sg.classId === selectedClassId && sg.isDefault) ||
      data.subGroups.find((sg) => sg.classId === selectedClassId) ||
      null
    );
  }, [data.subGroups, selectedClassId]);

  // All teacher teaching loads across the entire school
  const teacherLoads = useMemo(() => {
    const map = new Map<string, number>();
    data.assignments.forEach((asg) => {
      if (asg.teacherId && asg.teacherId !== "TCH-ANY") {
        map.set(asg.teacherId, (map.get(asg.teacherId) || 0) + (Number(asg.hours) || 0));
      }
    });
    return map;
  }, [data.assignments]);

  // Class assignments for the selected class
  const classSubGroupIds = useMemo(() => {
    if (!selectedClassId) return [];
    return data.subGroups.filter((sg) => sg.classId === selectedClassId).map((sg) => sg.id);
  }, [data.subGroups, selectedClassId]);

  const classAssignments = useMemo(() => {
    if (classSubGroupIds.length === 0) return [];
    return data.assignments.filter((a) => classSubGroupIds.includes(a.subGroupId));
  }, [data.assignments, classSubGroupIds]);

  // All subjects declared for the current class with target hours > 0
  const curriculumSubjects = useMemo(() => {
    if (!selectedClassId) return [];

    return data.subjects
      .map((subj) => {
        const rawHours = subj.classHours ? subj.classHours[selectedClassId] : null;
        const [minH, maxH] = normalizeClassHours(rawHours as any);
        return {
          subject: subj,
          minHours: minH,
          maxHours: maxH,
          isConfigured: maxH > 0,
        };
      })
      .filter((item) => item.isConfigured);
  }, [data.subjects, selectedClassId]);

  // Grouped assignments and status by subject for current class
  const subjectRows = useMemo(() => {
    return curriculumSubjects.map(({ subject, minHours, maxHours }) => {
      // Assignments for this subject in current class
      const assignments = classAssignments.filter((a) => a.subjectId === subject.id);
      const totalAssignedHours = assignments.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);

      // Coverage status calculation
      let status: "complete" | "incomplete" | "overallocated" | "unassigned" = "complete";
      if (totalAssignedHours === 0) {
        status = "unassigned";
      } else if (minHours === maxHours) {
        if (totalAssignedHours === minHours) {
          status = "complete";
        } else if (totalAssignedHours < minHours) {
          status = "incomplete";
        } else {
          status = "overallocated";
        }
      } else {
        // Range target [minHours, maxHours]
        if (totalAssignedHours >= minHours && totalAssignedHours <= maxHours) {
          status = "complete";
        } else if (totalAssignedHours < minHours) {
          status = "incomplete";
        } else {
          status = "overallocated";
        }
      }

      const diff = minHours === maxHours ? minHours - totalAssignedHours : maxHours - totalAssignedHours;

      return {
        subject,
        minHours,
        maxHours,
        assignments,
        totalAssignedHours,
        status,
        diff,
      };
    });
  }, [curriculumSubjects, classAssignments]);

  // Summary statistics for current class
  const classStats = useMemo(() => {
    const totalSubjectsCount = subjectRows.length;
    const fullyAssignedCount = subjectRows.filter((r) => r.status === "complete").length;
    const incompleteCount = subjectRows.filter((r) => r.status === "incomplete" || r.status === "unassigned").length;
    const overallocatedCount = subjectRows.filter((r) => r.status === "overallocated").length;

    const totalTargetHours = subjectRows.reduce((sum, r) => sum + r.maxHours, 0);
    const totalAssignedHours = subjectRows.reduce((sum, r) => sum + r.totalAssignedHours, 0);

    return {
      totalSubjectsCount,
      fullyAssignedCount,
      incompleteCount,
      overallocatedCount,
      totalTargetHours,
      totalAssignedHours,
      percent: totalTargetHours > 0 ? Math.round((totalAssignedHours / totalTargetHours) * 100) : 0,
    };
  }, [subjectRows]);

  // Overall school statistics across all classes
  const schoolStatsByClass = useMemo(() => {
    const map = new Map<string, { assigned: number; target: number; isComplete: boolean }>();
    sortedClasses.forEach((cls) => {
      const clsSubGroupIds = data.subGroups.filter((sg) => sg.classId === cls.id).map((sg) => sg.id);
      const clsAsgs = data.assignments.filter((a) => clsSubGroupIds.includes(a.subGroupId));
      const assignedH = clsAsgs.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);

      let targetH = 0;
      data.subjects.forEach((s) => {
        const rawHours = s.classHours ? s.classHours[cls.id] : null;
        const [, maxH] = normalizeClassHours(rawHours as any);
        targetH += maxH;
      });

      map.set(cls.id, {
        assigned: assignedH,
        target: targetH,
        isComplete: targetH > 0 && assignedH >= targetH,
      });
    });
    return map;
  }, [sortedClasses, data.subGroups, data.assignments, data.subjects]);

  // Filtered rows based on search & filters
  const filteredRows = useMemo(() => {
    return subjectRows.filter((row) => {
      // 1. Search Query (Title or Code)
      if (searchSubjectQuery.trim()) {
        const q = searchSubjectQuery.toLowerCase().trim();
        const titleMatch = row.subject.title.toLowerCase().includes(q);
        const codeMatch = row.subject.code.toLowerCase().includes(q);
        if (!titleMatch && !codeMatch) return false;
      }

      // 2. Filter by Specialty
      if (filterSpecialty !== "all") {
        const allowed = row.subject.allowedSpecialties || [];
        if (!allowed.includes(filterSpecialty)) return false;
      }

      // 3. Filter by Teacher
      if (filterTeacherId !== "all") {
        const hasTeacher = row.assignments.some((a) => a.teacherId === filterTeacherId);
        if (!hasTeacher) return false;
      }

      // 4. Filter by Coverage Status
      if (filterStatus !== "all") {
        if (row.status !== filterStatus) return false;
      }

      return true;
    });
  }, [subjectRows, searchSubjectQuery, filterSpecialty, filterTeacherId, filterStatus]);

  // Has active filters
  const hasActiveFilters =
    searchSubjectQuery.trim() !== "" ||
    filterTeacherId !== "all" ||
    filterSpecialty !== "all" ||
    filterStatus !== "all";

  const activeFiltersCount =
    (searchSubjectQuery.trim() !== "" ? 1 : 0) +
    (filterTeacherId !== "all" ? 1 : 0) +
    (filterSpecialty !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0);

  const resetAllFilters = () => {
    setSearchSubjectQuery("");
    setFilterTeacherId("all");
    setFilterSpecialty("all");
    setFilterStatus("all");
  };

  // Currently selected subject in the create/edit modal
  const selectedSubjectForModal = useMemo(() => {
    if (!formData.subjectId) return null;
    return data.subjects.find((s) => s.id === formData.subjectId) || null;
  }, [data.subjects, formData.subjectId]);

  // Allowed specialties of the selected subject
  const allowedSpecialtiesForModal = useMemo(() => {
    if (!selectedSubjectForModal) return [];
    if (selectedSubjectForModal.allowedSpecialties && selectedSubjectForModal.allowedSpecialties.length > 0) {
      return selectedSubjectForModal.allowedSpecialties;
    }
    if (selectedSubjectForModal.defaultSpecialty) {
      return [selectedSubjectForModal.defaultSpecialty];
    }
    return [];
  }, [selectedSubjectForModal]);

  // Filtered teachers matching the selected subject's allowed specialties
  const availableTeachersForSubject = useMemo(() => {
    if (allowedSpecialtiesForModal.length === 0) {
      return data.teachers;
    }
    return data.teachers.filter((t) => allowedSpecialtiesForModal.includes(t.specialty));
  }, [data.teachers, allowedSpecialtiesForModal]);

  // Open Create Modal for a specific subject or general
  const handleOpenCreateForSubject = (subjectId?: string) => {
    setEditingAssignment(null);
    const targetSubjId = subjectId || (curriculumSubjects.length > 0 ? curriculumSubjects[0].subject.id : "");
    setTargetSubjectIdForNew(targetSubjId);

    // Calculate default hours
    let defHours = 1;
    if (targetSubjId && selectedClassId) {
      const subj = data.subjects.find((s) => s.id === targetSubjId);
      if (subj) {
        const [minH, maxH] = normalizeClassHours(subj.classHours?.[selectedClassId] as any);
        const existingAsgs = classAssignments.filter((a) => a.subjectId === targetSubjId);
        const alreadyAssigned = existingAsgs.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
        const remaining = Math.max(1, maxH - alreadyAssigned);
        defHours = remaining;
      }
    }

    setFormData({
      subjectId: targetSubjId,
      teacherId: "",
      hours: String(defHours),
    });
    setIsDialogOpen(true);
  };

  // Open Edit Modal for an existing assignment
  const handleOpenEdit = (assignment: LessonAssignment) => {
    setEditingAssignment(assignment);
    setTargetSubjectIdForNew(assignment.subjectId);
    setFormData({
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId === "TCH-ANY" ? "" : assignment.teacherId,
      hours: String(assignment.hours),
    });
    setIsDialogOpen(true);
  };

  // Subject change inside Dialog -> adjust available teachers and pre-fill remaining hours
  const handleDialogSubjectChange = (newSubjectId: string) => {
    let defHours = 1;
    if (newSubjectId && selectedClassId) {
      const subj = data.subjects.find((s) => s.id === newSubjectId);
      if (subj) {
        const [, maxH] = normalizeClassHours(subj.classHours?.[selectedClassId] as any);
        const existingAsgs = classAssignments.filter(
          (a) => a.subjectId === newSubjectId && a.id !== editingAssignment?.id
        );
        const alreadyAssigned = existingAsgs.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
        const remaining = Math.max(1, maxH - alreadyAssigned);
        defHours = remaining;
      }
    }

    // Reset teacher if current teacher's specialty doesn't match new subject
    const newSubj = data.subjects.find((s) => s.id === newSubjectId);
    const newAllowed = newSubj?.allowedSpecialties || (newSubj?.defaultSpecialty ? [newSubj.defaultSpecialty] : []);
    let nextTeacherId = formData.teacherId;
    if (nextTeacherId && nextTeacherId !== "TCH-ANY") {
      const curTeacher = data.teachers.find((t) => t.id === nextTeacherId);
      if (curTeacher && newAllowed.length > 0 && !newAllowed.includes(curTeacher.specialty)) {
        nextTeacherId = ""; // Reset since not eligible
      }
    }

    setFormData({
      ...formData,
      subjectId: newSubjectId,
      teacherId: nextTeacherId,
      hours: String(defHours),
    });
  };

  // Save Assignment
  const handleSave = async () => {
    if (!formData.subjectId) {
      toast.error("Παρακαλώ επιλέξτε μάθημα");
      return;
    }

    const hoursNum = parseInt(formData.hours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast.error("Οι ώρες πρέπει να είναι θετικός αριθμός μεγαλύτερος του 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const subGroupId = editingAssignment?.subGroupId || currentSubGroup?.id || `sg-${selectedClassId}-default`;

      const payload = {
        id: editingAssignment?.id,
        teacherId: formData.teacherId || "TCH-ANY",
        subjectId: formData.subjectId,
        subGroupId: subGroupId,
        hours: hoursNum,
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
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Assignment
  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/timetable/assignments?id=${assignmentToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Η ανάθεση διαγράφηκε επιτυχώς");
        setAssignmentToDelete(null);
        onRefresh();
      } else {
        toast.error("Σφάλμα διαγραφής ανάθεσης");
      }
    } catch (e: any) {
      toast.error("Σφάλμα", { description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-zinc-100/60 select-none">
      {/* 1. Unified Top Header Bar */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80 shrink-0">
            <button
              type="button"
              onClick={() => onTabChange?.("teachers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "teachers"
                  ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
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
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
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
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
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
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Αναθέσεις</span>
            </button>
          </div>

          {/* Filter Row Toggle Button */}
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
            title="Εμφάνιση/απόκρυψη φίλτρων αναζήτησης"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Φίλτρα</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-bold rounded-full text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Teacher Workload Drawer Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTeacherWorkload(!showTeacherWorkload)}
            className={`h-8 text-xs gap-1.5 border-zinc-200 font-semibold cursor-pointer transition-all ${
              showTeacherWorkload
                ? "bg-indigo-900 text-white hover:bg-indigo-800 border-indigo-900 shadow-2xs"
                : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            title="Εμφάνιση ωραρίων όλων των εκπαιδευτικών"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ωράρια Εκπαιδευτικών</span>
          </Button>
        </div>

        {/* Right: Quick Stats & New Assignment Button */}
        <div className="flex items-center gap-3 pr-10">
          {/* Class Target & Coverage Progress Pill */}
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-lg">
            <span className="text-xs font-semibold text-zinc-600">Κάλυψη Τμήματος:</span>
            <span className="font-mono font-bold text-xs text-zinc-900">
              {classStats.totalAssignedHours} / {classStats.totalTargetHours}ω
            </span>
            <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  classStats.percent >= 100
                    ? "bg-emerald-500"
                    : classStats.percent > 0
                    ? "bg-amber-500"
                    : "bg-zinc-300"
                }`}
                style={{ width: `${Math.min(100, classStats.percent)}%` }}
              />
            </div>
            <span
              className={`text-[10.5px] font-bold font-mono ${
                classStats.percent >= 100
                  ? "text-emerald-700"
                  : classStats.percent > 0
                  ? "text-amber-700"
                  : "text-zinc-400"
              }`}
            >
              {classStats.percent}%
            </span>
          </div>

          <Button
            onClick={() => handleOpenCreateForSubject()}
            size="sm"
            className="h-8 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold cursor-pointer shadow-2xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Νέα Ανάθεση</span>
          </Button>
        </div>
      </div>

      {/* 2. Section / Class Selector Tabs Bar */}
      <div className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between gap-2 shrink-0 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">
            Τμήμα:
          </span>
          {sortedClasses.map((cls) => {
            const stats = schoolStatsByClass.get(cls.id);
            const isSelected = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassId(cls.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm ring-2 ring-zinc-900/20"
                    : "bg-zinc-50 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300"
                }`}
              >
                <span>{cls.name}</span>
                {stats && stats.target > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isSelected
                        ? stats.isComplete
                          ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                          : "bg-white/20 text-white"
                        : stats.isComplete
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-zinc-200/80 text-zinc-700"
                    }`}
                  >
                    {stats.assigned}/{stats.target}ω
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-zinc-500 text-xs font-medium">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>{filteredRows.length} / {curriculumSubjects.length} μαθήματα</span>
        </div>
      </div>

      {/* 3. Collapsible Filter Row */}
      {showFilterRow && (
        <div className="bg-zinc-50/95 border-b border-zinc-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Subject */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchSubjectQuery}
                onChange={(e) => setSearchSubjectQuery(e.target.value)}
                placeholder="Αναζήτηση μαθήματος..."
                className="h-8 pl-8 pr-7 text-xs bg-white border-zinc-200"
              />
              {searchSubjectQuery && (
                <button
                  type="button"
                  onClick={() => setSearchSubjectQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Specialty Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-500">Ειδικότητα:</span>
              <Select value={filterSpecialty} onValueChange={(val) => setFilterSpecialty(val || "all")}>
                <SelectTrigger className="h-8 text-xs w-36 bg-white border-zinc-200">
                  <SelectValue placeholder="Όλες" />
                </SelectTrigger>
                <SelectContent className="text-xs z-50">
                  <SelectItem value="all">Όλες οι ειδικότητες</SelectItem>
                  {getSpecialties({ level: "primary" }).map((spec) => (
                    <SelectItem key={spec.code} value={spec.code}>
                      <span className="font-mono font-bold text-indigo-700 mr-1">{spec.code}</span>
                      <span>({spec.shortCode || spec.name})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-500">Εκπαιδευτικός:</span>
              <Select value={filterTeacherId} onValueChange={(val) => setFilterTeacherId(val || "all")}>
                <SelectTrigger className="h-8 text-xs w-44 bg-white border-zinc-200">
                  <SelectValue placeholder="Όλοι" />
                </SelectTrigger>
                <SelectContent className="text-xs z-50">
                  <SelectItem value="all">Όλοι οι εκπαιδευτικοί</SelectItem>
                  {data.teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.lastName} {t.firstName} ({t.specialty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coverage Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-500">Κατάσταση:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    filterStatus === "all" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Όλα
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("complete")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatus === "complete" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Πλήρη</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("incomplete")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatus === "incomplete" ? "bg-amber-600 text-white" : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Ελλιπή</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("unassigned")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatus === "unassigned" ? "bg-zinc-700 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>Χωρίς Ανάθεση</span>
                </button>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer font-semibold"
            >
              Καθαρισμός Φίλτρων
            </Button>
          )}
        </div>
      )}

      {/* 4. Teacher Workload Overview Bar (Collapsible) */}
      {showTeacherWorkload && (
        <div className="bg-indigo-950 text-white px-4 py-3 border-b border-indigo-900 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-200">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Συγκεντρωτικό Εβδομαδιαίο Ωράριο Εκπαιδευτικών (Σχολείο)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTeacherWorkload(false)}
              className="text-indigo-400 hover:text-white cursor-pointer text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-1">
            {data.teachers.map((t) => {
              const assigned = teacherLoads.get(t.id) || 0;
              const max = t.maxWeeklyHours || 24;
              const isOver = assigned > max;
              const isFull = assigned === max;
              return (
                <div
                  key={t.id}
                  className={`p-2 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                    isOver
                      ? "bg-red-950/80 border-red-500/60 text-red-100"
                      : isFull
                      ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-100"
                      : "bg-indigo-900/60 border-indigo-700/60 text-indigo-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold truncate text-[11.5px]">
                      {t.lastName} {t.firstName[0]}.
                    </span>
                    <Badge variant="outline" className="text-[9.5px] px-1 py-0 border-indigo-400/40 text-indigo-200">
                      {t.specialty}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-indigo-300">Ώρες:</span>
                    <span
                      className={`font-bold ${
                        isOver ? "text-red-400" : isFull ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {assigned} / {max}ω
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Main Master Table */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto flex-1">
            <Table className="w-full text-xs">
              <TableHeader className="bg-zinc-50/90 backdrop-blur-sm sticky top-0 z-10 border-b border-zinc-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[240px] font-bold text-zinc-800 h-9">Μάθημα</TableHead>
                  <TableHead className="w-[140px] font-bold text-zinc-800 h-9 text-center">Ειδικότητες</TableHead>
                  <TableHead className="w-[130px] font-bold text-zinc-800 h-9 text-center">
                    Στόχος Μαθήματος
                  </TableHead>
                  <TableHead className="min-w-[300px] font-bold text-zinc-800 h-9">
                    Ανατεθειμένοι Εκπαιδευτικοί & Ώρες
                  </TableHead>
                  <TableHead className="w-[170px] font-bold text-zinc-800 h-9 text-center">
                    Κατάσταση Κάλυψης
                  </TableHead>
                  <TableHead className="w-[100px] font-bold text-zinc-800 h-9 text-right pr-4">
                    Ενέργειες
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {curriculumSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <BookOpen className="w-8 h-8 text-zinc-300 stroke-1" />
                        <span className="font-semibold text-zinc-800 text-sm">
                          Δεν έχουν οριστεί ώρες μαθημάτων για το {currentClass?.name || "τμήμα"}
                        </span>
                        <p className="text-xs text-zinc-400">
                          Μεταβείτε στην καρτέλα <span className="font-bold text-indigo-600">«Μαθήματα»</span> για να
                          ορίσετε ποιες ώρες διδάσκεται κάθε μάθημα στο συγκεκριμένο τμήμα.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTabChange?.("subjects")}
                          className="mt-2 text-xs font-semibold cursor-pointer"
                        >
                          Μετάβαση στα Μαθήματα
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Search className="w-5 h-5 text-zinc-300" />
                        <span className="font-medium text-xs text-zinc-600">
                          Δεν βρέθηκαν μαθήματα με τα τρέχοντα φίλτρα
                        </span>
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="text-xs text-indigo-600 underline font-semibold cursor-pointer mt-1"
                        >
                          Επαναφορά φίλτρων
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isRange = row.minHours !== row.maxHours;
                    const allowed = row.subject.allowedSpecialties || (row.subject.defaultSpecialty ? [row.subject.defaultSpecialty] : []);

                    return (
                      <TableRow
                        key={row.subject.id}
                        className="group border-b border-zinc-100 hover:bg-zinc-50/70 transition-colors"
                      >
                        {/* 1. Μάθημα */}
                        <TableCell className="font-medium text-zinc-900 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
                              style={{ backgroundColor: row.subject.color || "#6366f1" }}
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-900 text-xs">{row.subject.title}</span>
                              <span className="font-mono text-[10.5px] text-zinc-400 font-semibold">
                                {row.subject.code}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Ειδικότητες */}
                        <TableCell className="text-center py-2.5">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {allowed.length === 0 ? (
                              <span className="text-[10.5px] text-zinc-400 italic">Όλες</span>
                            ) : (
                              allowed.map((specCode) => (
                                <Badge
                                  key={specCode}
                                  variant="outline"
                                  className="text-[10px] font-mono font-bold px-1.5 py-0 bg-indigo-50/80 border-indigo-200 text-indigo-900"
                                >
                                  {specCode}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* 3. Στόχος Μαθήματος */}
                        <TableCell className="text-center py-2.5">
                          <div className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
                            {isRange ? (
                              <span>
                                {row.minHours} - {row.maxHours}ω
                              </span>
                            ) : (
                              <span>{row.maxHours}ω</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Ανατεθειμένοι Εκπαιδευτικοί & Ώρες */}
                        <TableCell className="py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {row.assignments.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCreateForSubject(row.subject.id)}
                                className="text-[11px] font-semibold text-zinc-500 hover:text-indigo-600 bg-zinc-50 hover:bg-indigo-50 border border-dashed border-zinc-300 hover:border-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Προσθήκη Εκπαιδευτικού</span>
                              </button>
                            ) : (
                              <>
                                {row.assignments.map((asg) => {
                                  const teacher = data.teachers.find((t) => t.id === asg.teacherId);
                                  const isAny = asg.teacherId === "TCH-ANY" || !teacher;
                                  return (
                                    <div
                                      key={asg.id}
                                      className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2 py-1 shadow-2xs text-xs font-medium group/chip hover:border-zinc-300 transition-all"
                                    >
                                      {/* Teacher Color or Generic icon */}
                                      {isAny ? (
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                                      ) : (
                                        <div
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: teacher.color || "#6366f1" }}
                                        />
                                      )}

                                      {/* Name */}
                                      <span className="font-semibold text-zinc-800">
                                        {isAny ? "Οποιοσδήποτε (Ελεύθερο)" : `${teacher.lastName} ${teacher.firstName}`}
                                      </span>

                                      {/* Specialty Tag */}
                                      {!isAny && (
                                        <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-100 px-1 py-0.2 rounded">
                                          {teacher.specialty}
                                        </span>
                                      )}

                                      {/* Hours Badge */}
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[11px]">
                                        {asg.hours}ω
                                      </span>

                                      {/* Mini Actions for this chip */}
                                      <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-zinc-200 opacity-60 group-hover/chip:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEdit(asg)}
                                          className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded cursor-pointer"
                                          title="Επεξεργασία ανάθεσης"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAssignmentToDelete(asg)}
                                          className="p-0.5 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                                          title="Διαγραφή ανάθεσης"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add split/additional teacher button if hours still remain */}
                                {row.totalAssignedHours < row.maxHours && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateForSubject(row.subject.id)}
                                    className="text-[10.5px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Προσθήκη επιπλέον εκπαιδευτικού για διαμοιρασμό ωρών"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+ Συν-διδασκαλία</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Κατάσταση Κάλυψης */}
                        <TableCell className="text-center py-2.5">
                          {row.status === "complete" ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{row.totalAssignedHours} / {row.maxHours}ω (Πλήρες)</span>
                            </div>
                          ) : row.status === "incomplete" ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {row.totalAssignedHours} / {row.maxHours}ω (Υπολείπονται {row.diff}ω)
                              </span>
                            </div>
                          ) : row.status === "overallocated" ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-300 text-red-950 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>
                                {row.totalAssignedHours} / {row.maxHours}ω (+{Math.abs(row.diff)}ω)
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 border border-zinc-300 text-zinc-600">
                              <span>0 / {row.maxHours}ω (Εκκρεμεί)</span>
                            </div>
                          )}
                        </TableCell>

                        {/* 6. Ενέργειες */}
                        <TableCell className="text-right py-2.5 pr-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateForSubject(row.subject.id)}
                            className="h-7 text-xs font-semibold gap-1 bg-white hover:bg-zinc-50 border-zinc-200 cursor-pointer text-zinc-700 hover:text-zinc-900"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ανάθεση</span>
                          </Button>
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

      {/* 6. Create / Edit Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 rounded-xl">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>{editingAssignment ? "Επεξεργασία Ανάθεσης" : "Νέα Ανάθεση Μαθήματος"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Τμήμα: <span className="font-bold text-zinc-800">{currentClass?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700">Μάθημα *</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(val) => val && handleDialogSubjectChange(val)}
                disabled={Boolean(editingAssignment)}
              >
                <SelectTrigger className="h-9 text-xs bg-zinc-50/80 border-zinc-300">
                  <SelectValue placeholder="Επιλέξτε μάθημα..." />
                </SelectTrigger>
                <SelectContent className="text-xs z-[90]">
                  {curriculumSubjects.map(({ subject, minHours, maxHours }) => {
                    const asgs = classAssignments.filter(
                      (a) => a.subjectId === subject.id && a.id !== editingAssignment?.id
                    );
                    const assigned = asgs.reduce((s, a) => s + (Number(a.hours) || 0), 0);
                    const remaining = maxHours - assigned;
                    return (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: subject.color || "#6366f1" }}
                          />
                          <span className="font-bold">{subject.title}</span>
                          <span className="text-zinc-400 font-mono text-[11px]">({subject.code})</span>
                          <span className="text-indigo-600 font-mono text-[11px] ml-auto">
                            [Στόχος: {minHours === maxHours ? `${maxHours}ω` : `${minHours}-${maxHours}ω`}
                            {remaining > 0 ? ` • Υπολείπονται ${remaining}ω` : " • Καλύφθηκε"}]
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Selector with Specialty Constraints */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-700">Εκπαιδευτικός</Label>
                {allowedSpecialtiesForModal.length > 0 && (
                  <div className="flex items-center gap-1 text-[10.5px]">
                    <span className="text-zinc-400 font-medium">Επιτρεπόμενες ειδικότητες:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {allowedSpecialtiesForModal.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <Select
                value={formData.teacherId}
                onValueChange={(val) => setFormData({ ...formData, teacherId: val || "" })}
              >
                <SelectTrigger className="h-9 text-xs bg-zinc-50/80 border-zinc-300">
                  <SelectValue placeholder="Οποιοσδήποτε (Ελεύθερο)" />
                </SelectTrigger>
                <SelectContent className="text-xs z-[90] max-h-60">
                  <SelectItem value="">
                    <span className="font-semibold text-zinc-600">Οποιοσδήποτε (Ελεύθερη επιλογή από Solver)</span>
                  </SelectItem>

                  {availableTeachersForSubject.length === 0 ? (
                    <div className="p-2 text-center text-xs text-amber-700 italic bg-amber-50">
                      Δεν βρέθηκαν εκπαιδευτικοί με ειδικότητα {allowedSpecialtiesForModal.join(", ")}
                    </div>
                  ) : (
                    availableTeachersForSubject.map((t) => {
                      const load = teacherLoads.get(t.id) || 0;
                      const max = t.maxWeeklyHours || 24;
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: t.color || "#6366f1" }}
                            />
                            <span className="font-semibold text-zinc-900">
                              {t.lastName} {t.firstName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono px-1.5 py-0 border-indigo-200 text-indigo-900"
                            >
                              {t.specialty}
                            </Badge>
                            <span className="text-zinc-400 font-mono text-[11px] ml-auto">
                              (Φόρτος: {load}/{max}ω)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Hours Stepper & Direct Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700">Ώρες Ανάθεσης (ανά εβδομάδα) *</Label>
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-300 rounded-lg p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const val = Math.max(1, (parseInt(formData.hours, 10) || 1) - 1);
                    setFormData({ ...formData, hours: String(val) });
                  }}
                  disabled={(parseInt(formData.hours, 10) || 1) <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-bold shadow-2xs"
                >
                  -
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-20 h-7 text-center font-mono font-bold text-sm bg-white border-zinc-300"
                  />
                  <span className="font-mono text-xs text-zinc-500 font-bold">ώρες</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const val = (parseInt(formData.hours, 10) || 0) + 1;
                    setFormData({ ...formData, hours: String(val) });
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer text-sm font-bold shadow-2xs"
                >
                  +
                </button>
              </div>
              <p className="text-[10.5px] text-zinc-500 flex items-start gap-1 pt-0.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Εάν το μάθημα διδάσκεται από 2 εκπαιδευτικούς (διαμοιρασμός ωρών), ορίστε π.χ. 1 ώρα για τον πρώτο και
                  στη συνέχεια δημιουργήστε δεύτερη ανάθεση για τον άλλο εκπαιδευτικό.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs cursor-pointer"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold cursor-pointer shadow-2xs"
            >
              {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Delete Confirmation Dialog */}
      <Dialog open={Boolean(assignmentToDelete)} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <DialogContent className="sm:max-w-[380px] p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Διαγραφή Ανάθεσης</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 pt-1">
              Είστε σίγουροι ότι θέλετε να διαγράψετε την ανάθεση για το μάθημα{" "}
              <span className="font-bold text-zinc-900">
                {data.subjects.find((s) => s.id === assignmentToDelete?.subjectId)?.title}
              </span>
              ; Οι ώρες θα επιστρέψουν στις μη-ανατεθειμένες.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignmentToDelete(null)}
              className="text-xs cursor-pointer"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer shadow-2xs"
            >
              {isDeleting ? "Διαγραφή..." : "Διαγραφή"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
