"use client";

import React, { useState, useMemo } from "react";
import { TimetableData, Teacher, TeacherConstraints } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Trash2,
  Edit2,
  Copy,
  Calendar,
  Sparkles,
  Check,
  X,
  Search,
  Filter,
  UserCheck,
  Clock,
  Layers,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

interface TeachersManagerProps {
  data: TimetableData;
  onRefresh: () => void;
}

const ALL_DAYS_INDICES = [0, 1, 2, 3, 4];
const DAY_LABELS = [
  { index: 0, short: "Δ", name: "Δευτέρα" },
  { index: 1, short: "Τ", name: "Τρίτη" },
  { index: 2, short: "Τ", name: "Τετάρτη" },
  { index: 3, short: "Π", name: "Πέμπτη" },
  { index: 4, short: "Π", name: "Παρασκευή" },
];

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  data,
  onRefresh,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state - Basic
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [shortName, setShortName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [color, setColor] = useState("#3b82f6");

  // Form state - Properties & Roles
  const [isTeaching, setIsTeaching] = useState(true);
  const [isOnCall, setIsOnCall] = useState(false);
  const [isMorning, setIsMorning] = useState(true);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Form state - Hours Constraints
  const [maxWeeklyHours, setMaxWeeklyHours] = useState<number | "">(24);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number | "">(5);
  const [minHoursPerDay, setMinHoursPerDay] = useState<number | "">(2);
  const [maxConsecutiveHours, setMaxConsecutiveHours] = useState<number | "">(4);

  // Form state - Gaps Constraints
  const [maxConsecutiveGaps, setMaxConsecutiveGaps] = useState<number | "">(1);
  const [maxTotalGapsPerDay, setMaxTotalGapsPerDay] = useState<number | "">(1);
  const [maxTotalGapsPerWeek, setMaxTotalGapsPerWeek] = useState<number | "">(2);

  // Form state - Available Days
  const [availableDays, setAvailableDays] = useState<number[]>(ALL_DAYS_INDICES);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    data.teachers.forEach((t) => {
      if (t.specialty) set.add(t.specialty);
    });
    return Array.from(set).sort();
  }, [data.teachers]);

  const filteredTeachers = useMemo(() => {
    return data.teachers.filter((tch) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${tch.lastName} ${tch.firstName}`.toLowerCase();
        const sName = (tch.shortName || "").toLowerCase();
        const spec = (tch.specialty || "").toLowerCase();
        if (!fullName.includes(query) && !sName.includes(query) && !spec.includes(query)) {
          return false;
        }
      }
      // Specialty filter
      if (specialtyFilter !== "all" && tch.specialty !== specialtyFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && tch.isActive === false) return false;
      if (statusFilter === "inactive" && tch.isActive !== false) return false;

      return true;
    });
  }, [data.teachers, searchQuery, specialtyFilter, statusFilter]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setShortName("");
    setSpecialty("ΠΕ70");
    setColor("#3b82f6");
    setIsTeaching(true);
    setIsOnCall(false);
    setIsMorning(true);
    setIsAllDay(false);
    setIsSupport(false);
    setIsActive(true);
    setMaxWeeklyHours(24);
    setMaxHoursPerDay(5);
    setMinHoursPerDay(2);
    setMaxConsecutiveHours(4);
    setMaxConsecutiveGaps(1);
    setMaxTotalGapsPerDay(1);
    setMaxTotalGapsPerWeek(2);
    setAvailableDays(ALL_DAYS_INDICES);
  };

  const populateForm = (tch: Teacher) => {
    setFirstName(tch.firstName);
    setLastName(tch.lastName);
    setShortName(tch.shortName || "");
    setSpecialty(tch.specialty);
    setColor(tch.color || "#3b82f6");
    setIsTeaching(tch.isTeaching ?? true);
    setIsOnCall(tch.isOnCall ?? false);
    setIsMorning(tch.isMorning ?? true);
    setIsAllDay(tch.isAllDay ?? false);
    setIsSupport(tch.isSupport);
    setIsActive(tch.isActive ?? true);
    setMaxWeeklyHours(tch.maxWeeklyHours ?? 24);

    const c = tch.constraints;
    setMaxHoursPerDay(c?.maxHoursPerDay ?? 5);
    setMinHoursPerDay(c?.minHoursPerDay ?? 2);
    setMaxConsecutiveHours(c?.maxConsecutiveHours ?? 4);
    setMaxConsecutiveGaps(c?.maxConsecutiveGaps ?? 1);
    setMaxTotalGapsPerDay(c?.maxTotalGapsPerDay ?? 1);
    setMaxTotalGapsPerWeek(c?.maxTotalGapsPerWeek ?? 2);
    setAvailableDays(c?.availableDays && c.availableDays.length > 0 ? c.availableDays : ALL_DAYS_INDICES);
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tch?: Teacher) => {
    const target = tch || data.teachers.find((t) => t.id === selectedTeacherId);
    if (!target) {
      toast.warning("Επιλέξτε έναν εκπαιδευτικό από τον πίνακα.");
      return;
    }
    setEditingTeacher(target);
    populateForm(target);
    setIsModalOpen(true);
  };

  const handleOpenCopy = (tch?: Teacher) => {
    const target = tch || data.teachers.find((t) => t.id === selectedTeacherId);
    if (!target) {
      toast.warning("Επιλέξτε έναν εκπαιδευτικό από τον πίνακα για αντιγραφή.");
      return;
    }
    setEditingTeacher(null);
    populateForm(target);
    setFirstName(`${target.firstName} (Αντίγραφο)`);
    setShortName(target.shortName ? `${target.shortName}2` : "");
    setIsModalOpen(true);
  };

  const toggleDay = (dayIndex: number) => {
    setAvailableDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) {
          toast.info("Ο εκπαιδευτικός πρέπει να είναι διαθέσιμος τουλάχιστον 1 ημέρα.");
          return prev;
        }
        return prev.filter((d) => d !== dayIndex).sort();
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const toggleAllDays = () => {
    if (availableDays.length === 5) {
      setAvailableDays([0]);
    } else {
      setAvailableDays(ALL_DAYS_INDICES);
    }
  };

  const handleSave = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      toast.error("Συμπληρώστε Όνομα και Επώνυμο.");
      return;
    }

    const constraintsData: TeacherConstraints = {
      availableDays: availableDays.length > 0 ? availableDays : ALL_DAYS_INDICES,
      maxHoursPerDay: maxHoursPerDay === "" ? null : Number(maxHoursPerDay),
      minHoursPerDay: minHoursPerDay === "" ? null : Number(minHoursPerDay),
      maxConsecutiveHours: maxConsecutiveHours === "" ? null : Number(maxConsecutiveHours),
      maxConsecutiveGaps: maxConsecutiveGaps === "" ? null : Number(maxConsecutiveGaps),
      maxTotalGapsPerDay: maxTotalGapsPerDay === "" ? null : Number(maxTotalGapsPerDay),
      maxTotalGapsPerWeek: maxTotalGapsPerWeek === "" ? null : Number(maxTotalGapsPerWeek),
    };

    const payload = {
      id: editingTeacher ? editingTeacher.id : undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      shortName: shortName.trim().toUpperCase() || null,
      specialty: specialty.trim(),
      color,
      isTeaching,
      isOnCall,
      isMorning,
      isAllDay,
      isSupport,
      isActive,
      maxWeeklyHours: maxWeeklyHours === "" ? 24 : Number(maxWeeklyHours),
      constraints: constraintsData,
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Αποτυχία αποθήκευσης εκπαιδευτικού");
      }

      toast.success(
        editingTeacher
          ? "Τα στοιχεία του εκπαιδευτικού ενημερώθηκαν!"
          : "Ο νέος εκπαιδευτικός προστέθηκε επιτυχώς!"
      );
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (tch?: Teacher) => {
    const target = tch || data.teachers.find((t) => t.id === selectedTeacherId);
    if (!target) {
      toast.warning("Επιλέξτε έναν εκπαιδευτικό για διαγραφή.");
      return;
    }
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τον/την «${target.lastName} ${target.firstName}»;`)) {
      return;
    }
    try {
      await fetch(`/api/teachers?id=${target.id}`, { method: "DELETE" });
      toast.info("Ο εκπαιδευτικός διαγράφηκε.");
      if (selectedTeacherId === target.id) {
        setSelectedTeacherId(null);
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const palette = [
    "#3b82f6", "#10b981", "#6366f1", "#ec4899", "#f59e0b",
    "#8b5cf6", "#14b8a6", "#f97316", "#0284c7", "#71717a",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-3 p-1">
      {/* Top Header Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Filters */}
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[300px]">
          <div className="relative w-64 max-w-full">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση ονόματος, συντ., ειδικ..."
              className="pl-8.5 pr-7 h-8.5 text-xs bg-zinc-50 border-zinc-200 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              aria-label="Φιλτράρισμα ανά ειδικότητα"
              className="h-8.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2 text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="all">Όλες οι ειδικότητες</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Φιλτράρισμα ανά κατάσταση"
              className="h-8.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2 text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="all">Όλες οι καταστάσεις</option>
              <option value="active">Μόνο Ενεργοί</option>
              <option value="inactive">Μόνο Ανενεργοί</option>
            </select>
          </div>

          <Badge variant="secondary" className="text-[11px] font-normal text-zinc-600 ml-1 py-1">
            {filteredTeachers.length} / {data.teachers.length} εκπαιδευτικοί
          </Badge>
        </div>

        {/* Right: Clean Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Selected teacher action buttons */}
          <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/80">
            <Button
              onClick={() => handleOpenEdit()}
              disabled={!selectedTeacherId}
              variant="ghost"
              size="sm"
              className="h-7.5 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
              title="Επεξεργασία επιλεγμένου (ή διπλό κλικ στη γραμμή)"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
              Επεξεργασία
            </Button>
            <Button
              onClick={() => handleOpenCopy()}
              disabled={!selectedTeacherId}
              variant="ghost"
              size="sm"
              className="h-7.5 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 disabled:opacity-40"
              title="Αντιγραφή στοιχείων επιλεγμένου"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
              Αντιγραφή
            </Button>
            <Button
              onClick={() => handleDelete()}
              disabled={!selectedTeacherId}
              variant="ghost"
              size="sm"
              className="h-7.5 text-xs px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
              title="Διαγραφή επιλεγμένου"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
              Διαγραφή
            </Button>
          </div>

          <div className="h-6 w-px bg-zinc-200 mx-1" />

          {/* Add Teacher Primary Button */}
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-8.5 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-xs rounded-lg flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Νέος Εκπαιδευτικός</span>
          </Button>
        </div>
      </div>

      {/* Main Full-Width Data Table (Clean, No Row Buttons) */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Super Headers & Sub Headers */}
            <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200 text-zinc-600 shadow-2xs select-none">
              {/* Row 1: Super Headers Grouping */}
              <tr className="border-b border-zinc-200 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                <th colSpan={4} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-left">
                  ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
                </th>
                <th colSpan={6} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΙΔΙΟΤΗΤΕΣ & ΡΟΛΟΙ
                </th>
                <th colSpan={5} className="py-2 px-3 border-r border-zinc-200 bg-zinc-100/80 text-center">
                  ΗΜΕΡΕΣ & ΩΡΕΣ ΔΙΔΑΣΚΑΛΙΑΣ
                </th>
                <th colSpan={3} className="py-2 px-3 bg-zinc-100/80 text-center">
                  ΠΕΡΙΟΡΙΣΜΟΙ ΚΕΝΩΝ
                </th>
              </tr>

              {/* Row 2: Detailed Column Headers */}
              <tr className="bg-zinc-50 text-[11px] font-semibold text-zinc-700">
                {/* Basic info (4) */}
                <th className="py-2.5 px-3 w-12 text-center">Χρώμα</th>
                <th className="py-2.5 px-3 min-w-[160px]">Ονοματεπώνυμο</th>
                <th className="py-2.5 px-3 w-16 text-center">Συντ.</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-zinc-200">Ειδικότητα</th>

                {/* Properties & Roles (6) */}
                <th className="py-2.5 px-2 w-14 text-center" title="Διδάσκει στο πρόγραμμα">Διδάσκει</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Συμμετοχή σε εφημερίες">Εφημερία</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Διδάσκει στο Πρωινό Πρόγραμμα">Πρωινό</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Διδάσκει στο Ολοήμερο Πρόγραμμα">Ολοήμερο</th>
                <th className="py-2.5 px-2.5 w-24 text-center" title="Τύπος ανάθεσης">Τύπος</th>
                <th className="py-2.5 px-2.5 w-20 text-center border-r border-zinc-200" title="Κατάσταση">Κατάσταση</th>

                {/* Days & Hours (5) */}
                <th className="py-2.5 px-3 min-w-[130px] text-center" title="Ημέρες παρουσίας στο σχολείο">Ημέρες</th>
                <th className="py-2.5 px-2.5 w-16 text-center font-bold text-zinc-800" title="Εβδομαδιαίο διδακτικό ωράριο">Εβδομάδα</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Ελάχιστες ώρες ανά ημέρα">Min/ημ.</th>
                <th className="py-2.5 px-2 w-14 text-center" title="Μέγιστες ώρες ανά ημέρα">Max/ημ.</th>
                <th className="py-2.5 px-2 w-14 text-center border-r border-zinc-200" title="Μέγιστες συνεχόμενες ώρες">Συνεχ.</th>

                {/* Gaps (3) */}
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνεχόμενα κενά">Συνεχ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά ημέρα">Max/ημ.</th>
                <th className="py-2.5 px-2 w-16 text-center" title="Μέγιστα συνολικά κενά ανά εβδομάδα">Max/εβδ.</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100">
              {filteredTeachers.map((tch) => {
                const isSelected = selectedTeacherId === tch.id;
                const c = tch.constraints;
                const daysList = c?.availableDays && c.availableDays.length > 0 ? c.availableDays : ALL_DAYS_INDICES;
                const isAllDays = daysList.length === 5;

                return (
                  <tr
                    key={tch.id}
                    onClick={() => setSelectedTeacherId(tch.id)}
                    onDoubleClick={() => handleOpenEdit(tch)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-sky-50/90 hover:bg-sky-50"
                        : "hover:bg-zinc-50/80"
                    }`}
                  >
                    {/* Color */}
                    <td className="py-2.5 px-3 text-center">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 mx-auto shadow-2xs"
                        style={{ backgroundColor: tch.color || "#71717a" }}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-medium text-zinc-900">
                      <span>{tch.lastName} {tch.firstName}</span>
                    </td>

                    {/* Short Name */}
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-zinc-700">
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] border border-zinc-200/60">
                        {tch.shortName || tch.lastName.substring(0, 3).toUpperCase()}
                      </span>
                    </td>

                    {/* Specialty */}
                    <td className="py-2.5 px-3 text-zinc-600 border-r border-zinc-100">
                      {tch.specialty}
                    </td>

                    {/* Teaching */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isTeaching !== false ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* On Call */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isOnCall ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* Morning */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isMorning !== false ? (
                        <span className="inline-flex items-center justify-center text-amber-600" title="Πρωινό">
                          <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        </span>
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* All Day */}
                    <td className="py-2.5 px-2 text-center">
                      {tch.isAllDay ? (
                        <span className="inline-flex items-center justify-center text-indigo-600" title="Ολοήμερο">
                          <Check className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                        </span>
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 mx-auto" />
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-2.5 text-center">
                      {tch.isSupport ? (
                        <Badge variant="outline" className="text-[10px] font-normal border-sky-200 bg-sky-50 text-sky-700 px-1.5 py-0.5">
                          Συμπληρωματική
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0.5">
                          Βασική
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2.5 text-center border-r border-zinc-100">
                      {tch.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Ενεργός
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          Άδεια
                        </span>
                      )}
                    </td>

                    {/* Available Days */}
                    <td className="py-2.5 px-3 text-center">
                      {isAllDays ? (
                        <Badge variant="outline" className="bg-emerald-50/80 text-emerald-700 border-emerald-200 font-medium text-[10px] px-2 py-0.5">
                          Όλες (5/5)
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {DAY_LABELS.map((d) => {
                            const isAvail = daysList.includes(d.index);
                            return (
                              <span
                                key={d.index}
                                title={`${d.name}: ${isAvail ? "Διαθέσιμος" : "Μη διαθέσιμος"}`}
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isAvail
                                    ? "bg-sky-500 text-white shadow-2xs"
                                    : "bg-zinc-100 text-zinc-300 line-through"
                                }`}
                              >
                                {d.short}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Weekly Hours */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-zinc-900 bg-zinc-50/50">
                      {tch.maxWeeklyHours || 24}ω
                    </td>

                    {/* Min Hours/Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.minHoursPerDay ?? 2}ω
                    </td>

                    {/* Max Hours/Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxHoursPerDay ?? 5}ω
                    </td>

                    {/* Max Consecutive Hours */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 border-r border-zinc-100">
                      {c?.maxConsecutiveHours ?? 4}ω
                    </td>

                    {/* Max Consecutive Gaps */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700 font-medium">
                      {c?.maxConsecutiveGaps ?? 1}
                    </td>

                    {/* Max Gaps / Day */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxTotalGapsPerDay ?? c?.maxConsecutiveGaps ?? 1}
                    </td>

                    {/* Max Gaps / Week */}
                    <td className="py-2.5 px-2 text-center font-mono text-zinc-700">
                      {c?.maxTotalGapsPerWeek ?? 2}
                    </td>
                  </tr>
                );
              })}

              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium text-sm text-zinc-700">Δεν βρέθηκαν εκπαιδευτικοί</p>
                      <p className="text-xs text-zinc-400">
                        {searchQuery || specialtyFilter !== "all" || statusFilter !== "all"
                          ? "Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση."
                          : "Προσθέστε τον πρώτο εκπαιδευτικό κάνοντας κλικ στο «Νέος Εκπαιδευτικός»."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Teacher Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl bg-white border-zinc-200 text-zinc-900 max-h-[95vh] overflow-y-auto shadow-2xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <DialogTitle className="text-lg text-zinc-900 font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-zinc-700" />
              <span>
                {editingTeacher
                  ? `Επεξεργασία: ${editingTeacher.lastName} ${editingTeacher.firstName}`
                  : "Προσθήκη Νέου Εκπαιδευτικού"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-7 text-sm">
            {/* 1. Basic Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                Βασικά Στοιχεία
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 text-xs font-medium">Επώνυμο *</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="π.χ. Παπαδόπουλος"
                    className="bg-white border-zinc-200 text-zinc-900 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 text-xs font-medium">Όνομα *</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="π.χ. Νικόλαος"
                    className="bg-white border-zinc-200 text-zinc-900 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 text-xs font-medium">Σύντμηση (3-4 γράμματα)</Label>
                  <Input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="π.χ. ΠΑΠ"
                    maxLength={4}
                    className="bg-white border-zinc-200 text-zinc-900 h-9 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 text-xs font-medium">Ειδικότητα</Label>
                  <Input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="π.χ. ΠΕ70 - Δάσκαλοι"
                    className="bg-white border-zinc-200 text-zinc-900 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 text-xs font-medium">Χρώμα Επισήμανσης</Label>
                  <div className="flex items-center gap-2 pt-1">
                    {palette.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`w-6 h-6 rounded-full transition-transform shadow-xs ${
                          color === hex ? "scale-125 ring-2 ring-offset-1 ring-zinc-800" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Properties & Roles (Including Morning & All-Day) */}
            <div className="space-y-3">
              <h4 className="font-semibold text-zinc-800 text-xs uppercase tracking-wider">
                Ιδιότητες & Ρόλοι
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="flex items-start justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-zinc-800 text-xs">
                      Διδάσκει στο πρόγραμμα
                    </Label>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Απενεργοποιήστε αν είναι συνοδός / νοσηλευτής.
                    </p>
                  </div>
                  <Switch checked={isTeaching} onCheckedChange={setIsTeaching} />
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-zinc-800 text-xs">
                      Συμμετέχει σε εφημερίες
                    </Label>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Επιτήρηση μαθητών στα διαλείμματα.
                    </p>
                  </div>
                  <Switch checked={isOnCall} onCheckedChange={setIsOnCall} />
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-amber-900 text-xs flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      Πρωινό Πρόγραμμα
                    </Label>
                    <p className="text-[11px] text-amber-700/80 leading-tight">
                      Διδασκαλία στις πρωινές ώρες (1η-6η).
                    </p>
                  </div>
                  <Switch checked={isMorning} onCheckedChange={setIsMorning} />
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/60">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-indigo-900 text-xs flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      Ολοήμερο Πρόγραμμα
                    </Label>
                    <p className="text-[11px] text-indigo-700/80 leading-tight">
                      Διδασκαλία στο ολοήμερο (7η-10η).
                    </p>
                  </div>
                  <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-sky-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Συμπληρωματική Ειδικότητα
                    </Label>
                    <p className="text-[11px] text-sky-700/80 leading-tight">
                      Παράλληλη / υποστήριξη (π.χ. Λογοθεραπεία).
                    </p>
                  </div>
                  <Switch checked={isSupport} onCheckedChange={setIsSupport} />
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <div className="space-y-0.5 pr-2">
                    <Label className="font-semibold text-zinc-800 text-xs">
                      Ενεργός Εκπαιδευτικός
                    </Label>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Απενεργοποιήστε αν λείπει σε άδεια.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            {/* 3. Days Availability */}
            <div className="space-y-3 bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Ημέρες Παρουσίας στο Σχολείο
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Επιλέξτε τις ημέρες που ο εκπαιδευτικός διδάσκει στο συγκεκριμένο σχολείο.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllDays}
                  className="h-7 text-xs bg-white text-zinc-700"
                >
                  {availableDays.length === 5 ? "Αποεπιλογή Όλων" : "Όλες οι ημέρες (5/5)"}
                </Button>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {DAY_LABELS.map((d) => {
                  const isSelected = availableDays.includes(d.index);
                  return (
                    <button
                      key={d.index}
                      type="button"
                      onClick={() => toggleDay(d.index)}
                      className={`p-2.5 rounded-xl border font-medium text-xs flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-400/40"
                          : "bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100/70"
                      }`}
                    >
                      <span className="font-bold text-sm">{d.short}</span>
                      <span className="text-[10px] opacity-80">{d.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Constraints (Hours & Gaps) */}
            <div className="space-y-4">
              <h4 className="font-semibold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Περιορισμοί Ώρων & Κενών
              </h4>
              
              {/* Hours Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-200/60">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Εβδομαδιαίο Ωράριο</Label>
                  <Input
                    type="number" min={0} max={35}
                    value={maxWeeklyHours}
                    onChange={(e) => setMaxWeeklyHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Min / ημέρα</Label>
                  <Input
                    type="number" min={1} max={7}
                    value={minHoursPerDay}
                    onChange={(e) => setMinHoursPerDay(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Max / ημέρα</Label>
                  <Input
                    type="number" min={1} max={7}
                    value={maxHoursPerDay}
                    onChange={(e) => setMaxHoursPerDay(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Max συνεχόμενες</Label>
                  <Input
                    type="number" min={1} max={6}
                    value={maxConsecutiveHours}
                    onChange={(e) => setMaxConsecutiveHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Gaps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-200/60">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Max συνεχόμενα κενά</Label>
                  <Input
                    type="number" min={0} max={4}
                    value={maxConsecutiveGaps}
                    onChange={(e) => setMaxConsecutiveGaps(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-zinc-400">Συνεχόμενες ώρες κενού χωρίς μάθημα</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Max συνολικά κενά / ημέρα</Label>
                  <Input
                    type="number" min={0} max={5}
                    value={maxTotalGapsPerDay}
                    onChange={(e) => setMaxTotalGapsPerDay(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-zinc-400">Σύνολο κενών μέσα στην ίδια ημέρα</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600 font-medium">Max συνολικά κενά / εβδ.</Label>
                  <Input
                    type="number" min={0} max={15}
                    value={maxTotalGapsPerWeek}
                    onChange={(e) => setMaxTotalGapsPerWeek(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8.5 font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-zinc-400">Σύνολο κενών σε όλη την εβδομάδα</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs text-zinc-600 border-zinc-200"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs px-5 shadow-xs"
            >
              {editingTeacher ? "Αποθήκευση Αλλαγών" : "Προσθήκη Εκπαιδευτικού"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
