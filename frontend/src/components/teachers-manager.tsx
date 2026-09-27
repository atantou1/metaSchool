"use client";

import React, { useState } from "react";
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
  Calendar,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface TeachersManagerProps {
  data: TimetableData;
  onRefresh: () => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  data,
  onRefresh,
}) => {
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isSupport, setIsSupport] = useState(false);
  const [color, setColor] = useState("#3b82f6");

  // Constraints state
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number | "">(5);
  const [minHoursPerDay, setMinHoursPerDay] = useState<number | "">(2);
  const [maxConsecutiveHours, setMaxConsecutiveHours] = useState<number | "">(4);
  const [maxConsecutiveGaps, setMaxConsecutiveGaps] = useState<number | "">(1);

  // Availability matrix: 5 days x 6 periods
  const [availability, setAvailability] = useState<boolean[][]>(
    Array.from({ length: 5 }, () => Array(6).fill(true))
  );

  const days = data.schoolConfig?.days || [
    "Δευτέρα",
    "Τρίτη",
    "Τετάρτη",
    "Πέμπτη",
    "Παρασκευή",
  ];

  const periods = data.schoolConfig?.periods || [
    { index: 0, label: "1η", startTime: "08:15", endTime: "09:00" },
    { index: 1, label: "2η", startTime: "09:05", endTime: "09:50" },
    { index: 2, label: "3η", startTime: "10:05", endTime: "10:50" },
    { index: 3, label: "4η", startTime: "10:55", endTime: "11:40" },
    { index: 4, label: "5η", startTime: "11:55", endTime: "12:35" },
    { index: 5, label: "6η", startTime: "12:40", endTime: "13:15" },
  ];

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFirstName("");
    setLastName("");
    setSpecialty("ΠΕ70 - Δάσκαλος");
    setIsSupport(false);
    setColor("#3b82f6");
    setMaxHoursPerDay(5);
    setMinHoursPerDay(2);
    setMaxConsecutiveHours(4);
    setMaxConsecutiveGaps(1);
    setAvailability(Array.from({ length: 5 }, () => Array(6).fill(true)));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tch: Teacher) => {
    setEditingTeacher(tch);
    setFirstName(tch.firstName);
    setLastName(tch.lastName);
    setSpecialty(tch.specialty);
    setIsSupport(tch.isSupport);
    setColor(tch.color || "#3b82f6");

    const c = tch.constraints;
    setMaxHoursPerDay(c?.maxHoursPerDay ?? "");
    setMinHoursPerDay(c?.minHoursPerDay ?? "");
    setMaxConsecutiveHours(c?.maxConsecutiveHours ?? "");
    setMaxConsecutiveGaps(c?.maxConsecutiveGaps ?? "");

    // Populate availability
    const newAvail = Array.from({ length: 5 }, (_, d) => {
      const dayList = c?.availability?.[String(d)];
      if (dayList && Array.isArray(dayList)) {
        return dayList.slice(0, 6);
      }
      return Array(6).fill(true);
    });
    setAvailability(newAvail);
    setIsModalOpen(true);
  };

  const toggleAvailabilitySlot = (dayIdx: number, periodIdx: number) => {
    setAvailability((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[dayIdx][periodIdx] = !copy[dayIdx][periodIdx];
      return copy;
    });
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !specialty.trim()) {
      toast.error("Συμπληρώστε όνομα, επώνυμο και ειδικότητα.");
      return;
    }

    const availMap: Record<string, boolean[]> = {};
    availability.forEach((dayArr, idx) => {
      availMap[String(idx)] = dayArr;
    });

    const constraints: TeacherConstraints = {
      availability: availMap,
      maxHoursPerDay: maxHoursPerDay === "" ? null : Number(maxHoursPerDay),
      minHoursPerDay: minHoursPerDay === "" ? null : Number(minHoursPerDay),
      maxConsecutiveHours:
        maxConsecutiveHours === "" ? null : Number(maxConsecutiveHours),
      maxConsecutiveGaps:
        maxConsecutiveGaps === "" ? null : Number(maxConsecutiveGaps),
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTeacher?.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          specialty: specialty.trim(),
          isSupport,
          color,
          constraints,
        }),
      });

      if (res.ok) {
        toast.success(
          editingTeacher
            ? "Τα στοιχεία εκπαιδευτικού ενημερώθηκαν!"
            : "Ο εκπαιδευτικός προστέθηκε επιτυχώς!"
        );
        setIsModalOpen(false);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε τον εκπαιδευτικό;")) {
      return;
    }
    try {
      await fetch(`/api/teachers?id=${id}`, { method: "DELETE" });
      toast.info("Ο εκπαιδευτικός διαγράφηκε.");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const palette = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#14b8a6", // Teal
    "#f97316", // Orange
    "#0284c7", // Sky
    "#71717a", // Zinc
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Κατάλογος Εκπαιδευτικών ({data.teachers.length})
          </h3>
          <p className="text-xs text-zinc-500">
            Διαχείριση διαθεσιμότητας, περιορισμών ωραρίου και υποστηρικτικών ειδικοτήτων
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Προσθήκη Εκπαιδευτικού
        </Button>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.teachers.map((tch) => {
          const tchAssignments = data.assignments.filter(
            (a) => a.teacherId === tch.id
          );
          const totalHours = tchAssignments.reduce((acc, a) => acc + a.hours, 0);

          return (
            <div
              key={tch.id}
              className="p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tch.color }}
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">
                        {tch.lastName} {tch.firstName}
                      </h4>
                      <p className="text-xs text-zinc-500">{tch.specialty}</p>
                    </div>
                  </div>

                  {tch.isSupport ? (
                    <Badge className="text-[10px] bg-sky-50 text-sky-800 border-sky-200">
                      Υποστηρικτική
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-zinc-200 bg-zinc-50 text-zinc-600">
                      Core
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 font-mono">
                  <div>
                    Ανατεθειμένες:{" "}
                    <strong className="text-zinc-900">{totalHours} ώρες</strong>
                  </div>
                  <div>
                    Max/ημέρα:{" "}
                    <strong className="text-zinc-900">
                      {tch.constraints?.maxHoursPerDay ?? "—"}
                    </strong>
                  </div>
                  <div>
                    Max κενά/ημέρα:{" "}
                    <strong className="text-zinc-900">
                      {tch.constraints?.maxConsecutiveGaps ?? "—"}
                    </strong>
                  </div>
                  <div>
                    Συνεχόμενα:{" "}
                    <strong className="text-zinc-900">
                      {tch.constraints?.maxConsecutiveHours ?? "—"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenEdit(tch)}
                  className="h-7 text-xs text-zinc-600 hover:text-zinc-900"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Επεξεργασία
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(tch.id)}
                  className="h-7 text-xs text-zinc-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Διαγραφή
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teacher Form & Availability Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-zinc-200 text-zinc-900 max-h-[90vh] overflow-y-auto shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900">
              {editingTeacher
                ? `Επεξεργασία: ${editingTeacher.lastName} ${editingTeacher.firstName}`
                : "Προσθήκη Νέου Εκπαιδευτικού"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* General Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-700">Όνομα</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="π.χ. Νικόλαος"
                  className="bg-white border-zinc-200 text-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700">Επώνυμο</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="π.χ. Παπαδόπουλος"
                  className="bg-white border-zinc-200 text-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-700">Ειδικότητα</Label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="π.χ. ΠΕ70 - Δάσκαλοι, ΠΕ86 - Πληροφορική"
                  className="bg-white border-zinc-200 text-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700">Χρώμα Επισήμανσης</Label>
                <div className="flex items-center gap-1.5 pt-1">
                  {palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === hex ? "scale-125 ring-2 ring-zinc-800" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Support specialty switch */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Υποστηρικτική Ειδικότητα (Pull-out Support)</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Ενεργοποιήστε αν πρόκειται για ειδικότητα που παίρνει μαθητές εκτός τάξης (π.χ. Λογοθεραπεία, Ψυχολόγος).
                </p>
              </div>
              <Switch checked={isSupport} onCheckedChange={setIsSupport} />
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <h4 className="font-semibold text-zinc-800 uppercase tracking-wider text-[11px]">
                Περιορισμοί Ωραρίου
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600">Max ώρες / ημέρα</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={maxHoursPerDay}
                    onChange={(e) =>
                      setMaxHoursPerDay(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Αδιάφορο"
                    className="bg-white border-zinc-200 text-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600">Min ώρες / ημέρα</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={minHoursPerDay}
                    onChange={(e) =>
                      setMinHoursPerDay(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Αδιάφορο"
                    className="bg-white border-zinc-200 text-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600">Max συνεχόμενες</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={maxConsecutiveHours}
                    onChange={(e) =>
                      setMaxConsecutiveHours(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Αδιάφορο"
                    className="bg-white border-zinc-200 text-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-600">Max κενά / ημέρα</Label>
                  <Input
                    type="number"
                    min={0}
                    max={4}
                    value={maxConsecutiveGaps}
                    onChange={(e) =>
                      setMaxConsecutiveGaps(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Αδιάφορο"
                    className="bg-white border-zinc-200 text-zinc-900"
                  />
                </div>
              </div>
            </div>

            {/* Availability Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-zinc-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Εβδομαδιαία Διαθεσιμότητα (Κάντε κλικ στα κελιά)
                </h4>
                <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                    Διαθέσιμος
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-200 border border-zinc-300 inline-block" />
                    Μη διαθέσιμος
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <table className="w-full text-center text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200">
                    <tr>
                      <th className="p-2 font-medium">Ημέρα</th>
                      {periods.map((p, idx) => (
                        <th key={idx} className="p-2 font-medium">
                          {p.label || `${idx + 1}η`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {days.map((dayName, dIdx) => (
                      <tr key={dIdx}>
                        <td className="p-2 text-left font-medium text-zinc-800 bg-zinc-50/60">
                          {dayName}
                        </td>
                        {periods.map((_, pIdx) => {
                          const isAvail = availability[dIdx]?.[pIdx] ?? true;
                          return (
                            <td key={pIdx} className="p-1">
                              <button
                                type="button"
                                onClick={() => toggleAvailabilitySlot(dIdx, pIdx)}
                                className={`w-full py-2 rounded font-mono text-[11px] transition-all flex items-center justify-center ${
                                  isAvail
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shadow-2xs"
                                    : "bg-zinc-100 text-zinc-400 border border-zinc-200 hover:bg-zinc-200/60 line-through"
                                }`}
                              >
                                {isAvail ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleSave}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
            >
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
