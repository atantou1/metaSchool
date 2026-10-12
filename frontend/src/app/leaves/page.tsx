"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Leave,
  Teacher,
  SchoolProfile,
  LeaveTypeConfig,
} from "@/types";
import {
  formatGreekDate,
  getLeaveTypeName,
  getEmploymentTypeLabel,
} from "@/lib/leave-documents";
import { LeavesHeatmap } from "@/components/leaves/leaves-heatmap";
import { LeaveDocumentModal } from "@/components/leaves/leave-document-modal";
import { LeaveFormModal } from "@/components/leaves/leave-form-modal";
import { SchoolProfileModal } from "@/components/leaves/school-profile-modal";
import {
  Umbrella,
  Plus,
  Building,
  Calendar,
  Users,
  Search,
  Filter,
  FileCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowUpDown,
  FileText,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Tabs
  const [activeView, setActiveView] = useState<"heatmap" | "list" | "balances">("heatmap");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocLeave, setSelectedDocLeave] = useState<Leave | null>(null);

  const [isSchoolProfileOpen, setIsSchoolProfileOpen] = useState(false);

  // Load all necessary data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch teachers
      const tRes = await fetch("/api/teachers");
      const tJson = await tRes.json();
      if (tJson.success) {
        setTeachers(tJson.teachers || []);
      }

      // 2. Fetch config (school profile & leave types)
      const cRes = await fetch("/api/leaves/config");
      const cJson = await cRes.json();
      if (cJson.success) {
        if (cJson.schoolProfile) setSchoolProfile(cJson.schoolProfile);
        if (cJson.leaveTypes) setLeaveTypes(cJson.leaveTypes);
      }

      // 3. Fetch leaves
      const lRes = await fetch("/api/leaves");
      const lJson = await lRes.json();
      if (lJson.success) {
        setLeaves(lJson.leaves || []);
      }
    } catch (e: any) {
      toast.error("Σφάλμα φόρτωσης δεδομένων αδειών", { description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Stats
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const stats = useMemo(() => {
    // Teachers on leave TODAY
    const onLeaveToday = leaves.filter((l) => {
      return l.status !== "rejected" && l.startDate <= todayStr && l.endDate >= todayStr;
    });

    // Upcoming leaves in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    const upcoming = leaves.filter((l) => {
      return l.status !== "rejected" && l.startDate > todayStr && l.startDate <= nextWeekStr;
    });

    // Total days taken in school year
    const totalDaysTaken = leaves
      .filter((l) => l.status !== "rejected")
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);

    return {
      todayCount: onLeaveToday.length,
      todayLeaves: onLeaveToday,
      upcomingCount: upcoming.length,
      totalDays: totalDaysTaken,
    };
  }, [leaves, todayStr]);

  // Filtered leaves for list view
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const teacher = teachers.find((t) => t.id === l.teacherId);
      const fullName = teacher ? `${teacher.lastName} ${teacher.firstName}`.toLowerCase() : "";
      const matchesSearch =
        searchQuery === "" ||
        fullName.includes(searchQuery.toLowerCase()) ||
        (l.protocolNumber && l.protocolNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedTypeFilter === "all" || l.type === selectedTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [leaves, teachers, searchQuery, selectedTypeFilter]);

  // Handle open document modal
  const handleOpenDocuments = (leave: Leave) => {
    setSelectedDocLeave(leave);
    setIsDocModalOpen(true);
  };

  // Handle delete leave
  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την άδεια;")) return;

    try {
      const res = await fetch(`/api/leaves?id=${leaveId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Η άδεια διαγράφηκε");
        setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      } else {
        toast.error("Αποτυχία διαγραφής");
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    }
  };

  // Find teacher for document modal
  const selectedDocTeacher = useMemo(() => {
    if (!selectedDocLeave) return null;
    return teachers.find((t) => t.id === selectedDocLeave.teacherId) || null;
  }, [selectedDocLeave, teachers]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-foreground font-sans text-xs">
      {/* Top Application Header */}
      <SiteHeader
        schoolName={schoolProfile?.schoolName || "metaSchool Άδειες"}
        rightActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSchoolProfileOpen(true)}
              className="h-7 text-xs gap-1.5"
            >
              <Building className="w-3.5 h-3.5 text-zinc-500" />
              Στοιχεία Σχολείου & Σφραγίδα
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingLeave(null);
                setIsFormOpen(true);
              }}
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Νέα Άδεια
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Σε Άδεια Σήμερα
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Umbrella className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.todayCount}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {stats.todayCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {stats.todayLeaves.map((l) => {
                      const t = teachers.find((tch) => tch.id === l.teacherId);
                      return t ? `${t.lastName}` : "";
                    }).join(", ")}
                  </span>
                ) : (
                  "Όλοι οι εκπαιδευτικοί παρόντες"
                )}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Upcoming */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Προσεχείς (7 Ημέρες)
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.upcomingCount}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Προγραμματισμένες άδειες
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Total Days */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Σύνολο Ημερών Σχ. Έτους
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.totalDays} <span className="text-sm font-normal text-zinc-500">ημ.</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Συνολική απουσία διδακτικών ημερών
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Teachers Total */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xs bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Δύναμη Εκπαιδευτικών
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {teachers.length}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Εγγεγραμμένοι στο σχολείο
              </p>
            </CardContent>
          </Card>
        </div>

        {/* View Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveView("heatmap")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeView === "heatmap"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Ημερολόγιο Heatmap
            </button>

            <button
              onClick={() => setActiveView("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeView === "list"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Πίνακας Αδειών ({leaves.length})
            </button>

            <button
              onClick={() => setActiveView("balances")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeView === "balances"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Υπόλοιπα Εκπαιδευτικών
            </button>
          </div>

          {/* Quick Action Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingLeave(null);
              setIsFormOpen(true);
            }}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Καταχώριση Άδειας
          </Button>
        </div>

        {/* ── VIEW 1: HEATMAP ── */}
        {activeView === "heatmap" && (
          <LeavesHeatmap
            leaves={leaves}
            teachers={teachers}
            leaveTypes={leaveTypes}
            onOpenDocument={handleOpenDocuments}
          />
        )}

        {/* ── VIEW 2: LIST TABLE ── */}
        {activeView === "list" && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Αναζήτηση εκπαιδευτικού, πρωτοκόλλου..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-zinc-500 whitespace-nowrap">Είδος:</span>
                <Select value={selectedTypeFilter} onValueChange={(val) => val && setSelectedTypeFilter(val)}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="Όλα τα είδη" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλα τα είδη αδειών</SelectItem>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Leaves Table */}
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <th className="py-2.5 px-3 font-semibold">Εκπαιδευτικός</th>
                    <th className="py-2.5 px-3 font-semibold">Είδος Άδειας</th>
                    <th className="py-2.5 px-3 font-semibold">Διάρκεια (Από - Έως)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Ημέρες</th>
                    <th className="py-2.5 px-3 font-semibold">Αρ. Πρωτοκόλλου</th>
                    <th className="py-2.5 px-3 font-semibold">Αιτιολογία</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-400 italic">
                        Δεν βρέθηκαν καταχωρημένες άδειες.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((leave) => {
                      const teacher = teachers.find((t) => t.id === leave.teacherId);
                      const leaveName = getLeaveTypeName(leave.type, leaveTypes);
                      const isCurrentlyActive =
                        leave.startDate <= todayStr && leave.endDate >= todayStr;

                      return (
                        <tr
                          key={leave.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {teacher ? `${teacher.lastName} ${teacher.firstName}` : "Εκπαιδευτικός"}
                              </span>
                              {teacher && (
                                <span className="text-[10px] text-zinc-400">
                                  ({teacher.specialty})
                                </span>
                              )}
                              {isCurrentlyActive && (
                                <Badge className="text-[9px] py-0 px-1 bg-amber-500 text-white">
                                  Ενεργή
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {leaveName}
                            </Badge>
                          </td>

                          <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                            {formatGreekDate(leave.startDate)} – {formatGreekDate(leave.endDate)}
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold">
                            {leave.daysCount}
                          </td>

                          <td className="py-2.5 px-3 text-zinc-500 font-mono">
                            {leave.protocolNumber || "-"}
                          </td>

                          <td className="py-2.5 px-3 text-zinc-500 italic max-w-xs truncate">
                            {leave.reason || "-"}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDocuments(leave)}
                                className="h-7 text-xs gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                Έγγραφα
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLeave(leave);
                                  setIsFormOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLeave(leave.id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VIEW 3: TEACHER BALANCES ── */}
        {activeView === "balances" && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Υπόλοιπα Αδειών ανά Εκπαιδευτικό
              </h3>
              <p className="text-xs text-zinc-500">
                Παρακολούθηση ληφθέντων ημερών και υπολοίπων βάσει σχέσης εργασίας (Μόνιμος vs Αναπληρωτής).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {teachers.map((teacher) => {
                const isDeputy = (teacher.employmentType || "").startsWith("deputy");
                const teacherLeaves = leaves.filter(
                  (l) => l.teacherId === teacher.id && l.status !== "rejected"
                );

                return (
                  <div
                    key={teacher.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {teacher.lastName} {teacher.firstName}
                        </h4>
                        <p className="text-[11px] text-zinc-500">
                          {teacher.specialty} • {getEmploymentTypeLabel(teacher.employmentType)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLeave(null);
                          setIsFormOpen(true);
                        }}
                        className="h-6 text-[11px] px-2"
                      >
                        + Άδεια
                      </Button>
                    </div>

                    {/* Breakdown per leave type */}
                    <div className="space-y-1.5 pt-1 text-xs border-t border-zinc-200 dark:border-zinc-800">
                      {leaveTypes.slice(0, 4).map((lt) => {
                        const limit = isDeputy ? lt.deputyDaysLimit : lt.permanentDaysLimit;
                        const used = teacherLeaves
                          .filter((l) => l.type === lt.id)
                          .reduce((sum, l) => sum + (l.daysCount || 0), 0);
                        const remaining = Math.max(0, limit - used);

                        return (
                          <div
                            key={lt.id}
                            className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                          >
                            <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                              {lt.name}:
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-zinc-500">{used} / {limit} ημ.</span>
                              <span className="text-zinc-400">•</span>
                              <span className={`font-semibold ${remaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
                                Υπόλοιπο: {remaining}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}
      {/* 1. Document Preview & Export Modal */}
      <LeaveDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        leave={selectedDocLeave}
        teacher={selectedDocTeacher}
        schoolProfile={schoolProfile}
        leaveTypes={leaveTypes}
      />

      {/* 2. Form Registration Modal */}
      <LeaveFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaveSuccess={(leaveId, openDocs) => {
          setIsFormOpen(false);
          loadData();
          if (openDocs) {
            // Find saved leave and open documents
            fetch(`/api/leaves`)
              .then((r) => r.json())
              .then((j) => {
                if (j.success && j.leaves) {
                  const saved = j.leaves.find((l: Leave) => l.id === leaveId);
                  if (saved) handleOpenDocuments(saved);
                }
              });
          }
        }}
        teachers={teachers}
        leaveTypes={leaveTypes}
        initialLeave={editingLeave}
        allLeaves={leaves}
      />

      {/* 3. School Profile & Stamp Modal */}
      <SchoolProfileModal
        isOpen={isSchoolProfileOpen}
        onClose={() => setIsSchoolProfileOpen(false)}
        initialProfile={schoolProfile}
        onSaved={(updated) => {
          setSchoolProfile(updated);
        }}
      />
    </div>
  );
}
