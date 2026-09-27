"use client";

import React, { useState } from "react";
import {
  TimetableData,
  ClassEntity,
  SubGroup,
  LessonAssignment,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Users,
  BookOpen,
  Sparkles,
  Link2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface ClassesManagerProps {
  data: TimetableData;
  onRefresh: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({
  data,
  onRefresh,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    data.classes[0]?.id || ""
  );

  // Assignment Modal
  const [isAddAsgOpen, setIsAddAsgOpen] = useState(false);
  const [asgTeacherId, setAsgTeacherId] = useState("");
  const [asgSubjectId, setAsgSubjectId] = useState("");
  const [asgSubGroupId, setAsgSubGroupId] = useState("");
  const [asgHours, setAsgHours] = useState(2);
  const [asgConcurrentId, setAsgConcurrentId] = useState("");

  // Subgroup Modal
  const [isAddSgOpen, setIsAddSgOpen] = useState(false);
  const [sgName, setSgName] = useState("");

  // Edit Support Hours
  const [supportMin, setSupportMin] = useState(0);
  const [supportMax, setSupportMax] = useState(0);

  const selectedClass = data.classes.find((c) => c.id === selectedClassId);

  // Sync state when selected class changes
  React.useEffect(() => {
    if (selectedClass) {
      setSupportMin(selectedClass.supportHoursMin);
      setSupportMax(selectedClass.supportHoursMax);
    }
  }, [selectedClass]);

  const classSubGroups = data.subGroups.filter(
    (sg) => sg.classId === selectedClassId
  );
  const defaultSubGroup = classSubGroups.find((sg) => sg.isDefault);

  const classAssignments = data.assignments.filter((asg) =>
    classSubGroups.some((sg) => sg.id === asg.subGroupId)
  );

  const coreHours = classAssignments
    .filter((a) => {
      const tch = data.teachers.find((t) => t.id === a.teacherId);
      return tch && !tch.isSupport;
    })
    .reduce((sum, a) => sum + a.hours, 0);

  // Save support hours changes
  const handleSaveSupportHours = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedClass,
          supportHoursMin: Number(supportMin),
          supportHoursMax: Number(supportMax),
        }),
      });

      if (res.ok) {
        toast.success("Οι ώρες υποστήριξης ενημερώθηκαν!");
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Add Assignment
  const handleCreateAssignment = async () => {
    if (!asgTeacherId || !asgSubjectId || !asgSubGroupId) {
      toast.error("Συμπληρώστε όλα τα απαιτούμενα πεδία.");
      return;
    }

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: asgTeacherId,
          subjectId: asgSubjectId,
          subGroupId: asgSubGroupId,
          hours: Number(asgHours),
          concurrentGroupId: asgConcurrentId.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Η ανάθεση προστέθηκε!");
        setIsAddAsgOpen(false);
        setAsgConcurrentId("");
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    try {
      await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
      toast.info("Η ανάθεση διαγράφηκε.");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Add Subgroup
  const handleCreateSubGroup = async () => {
    if (!sgName.trim() || !selectedClassId) return;
    try {
      const res = await fetch("/api/subgroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          name: sgName.trim(),
          isDefault: false,
        }),
      });

      if (res.ok) {
        toast.success("Η υπο-ομάδα δημιουργήθηκε!");
        setIsAddSgOpen(false);
        setSgName("");
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Delete Subgroup
  const handleDeleteSubGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/subgroups?id=${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        toast.error(resData.error || "Αδύνατη η διαγραφή.");
      } else {
        toast.info("Η υπο-ομάδα διαγράφηκε.");
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Classes Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-200">
        {data.classes.map((cls) => {
          const isSelected = cls.id === selectedClassId;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                isSelected
                  ? "bg-zinc-900 text-white font-semibold shadow-xs"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200 shadow-xs"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Τμήμα {cls.name}</span>
            </button>
          );
        })}
      </div>

      {selectedClass && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Subgroups & Support Settings */}
          <div className="space-y-6">
            {/* Class Details Card */}
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Τμήμα {selectedClass.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Τάξη {selectedClass.grade} • Βασικό 30ωρο
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-zinc-200 bg-zinc-50 text-zinc-700"
                >
                  {coreHours} / 30 Ώρες
                </Badge>
              </div>

              {/* Flexible Support Hours Settings */}
              <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-sky-800">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Ευέλικτες Ώρες Υποστήριξης</span>
                  </div>
                  <Badge className="text-[10px] bg-sky-100 text-sky-800 border-sky-200">
                    Pull-out
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Καθορίστε το εύρος ωρών (π.χ. 2-4 ώρες) που δικαιούται το τμήμα για ειδικότητες όπως Λογοθεραπεία / Ψυχολόγος.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[11px] text-zinc-600">Ελάχιστες (Min)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={supportMin}
                      onChange={(e) => setSupportMin(Number(e.target.value))}
                      className="h-8 text-xs bg-white border-zinc-200 text-zinc-900 mt-1 shadow-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-zinc-600">Μέγιστες (Max)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={supportMax}
                      onChange={(e) => setSupportMax(Number(e.target.value))}
                      className="h-8 text-xs bg-white border-zinc-200 text-zinc-900 mt-1 shadow-xs"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handleSaveSupportHours}
                  className="w-full h-7 text-xs bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs"
                >
                  Αποθήκευση Εύρους
                </Button>
              </div>
            </div>

            {/* Sub-groups Card */}
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                    Υπο-ομάδες Τμήματος
                  </h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddSgOpen(true)}
                  className="h-7 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Νέα Ομάδα
                </Button>
              </div>

              <div className="space-y-2">
                {classSubGroups.map((sg) => (
                  <div
                    key={sg.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-800">{sg.name}</span>
                      {sg.isDefault ? (
                        <Badge variant="outline" className="text-[10px] border-zinc-200 bg-white text-zinc-600">
                          Ολομέλεια (Προεπιλογή)
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                          Σπάσιμο (Split)
                        </Badge>
                      )}
                    </div>

                    {!sg.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSubGroup(sg.id)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Lesson Assignments */}
          <div className="lg:col-span-2 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-500" />
                <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                  Αναθέσεις Μαθημάτων Τμήματος
                </h4>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setAsgSubGroupId(defaultSubGroup?.id || "");
                  setIsAddAsgOpen(true);
                }}
                className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Νέα Ανάθεση
              </Button>
            </div>

            {/* Assignments Table */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase">
                  <tr>
                    <th className="p-3 font-semibold">Μάθημα</th>
                    <th className="p-3 font-semibold">Εκπαιδευτικός</th>
                    <th className="p-3 font-semibold">Ομάδα</th>
                    <th className="p-3 font-semibold">Ώρες</th>
                    <th className="p-3 font-semibold">Συγχρονισμός</th>
                    <th className="p-3 font-semibold text-right">Ενέργεια</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {classAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400">
                        Δεν υπάρχουν ακόμη αναθέσεις για το τμήμα.
                      </td>
                    </tr>
                  ) : (
                    classAssignments.map((asg) => {
                      const tch = data.teachers.find((t) => t.id === asg.teacherId);
                      const subj = data.subjects.find((s) => s.id === asg.subjectId);
                      const sg = classSubGroups.find((g) => g.id === asg.subGroupId);

                      return (
                        <tr key={asg.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="p-3 font-medium text-zinc-900">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: subj?.color || "#71717a" }}
                              />
                              <span>{subj?.title || asg.subjectId}</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-700">
                            {tch ? `${tch.lastName} ${tch.firstName}` : asg.teacherId}
                            {tch?.isSupport && (
                              <Badge className="ml-1.5 text-[9px] px-1.5 py-0 bg-sky-50 text-sky-800 border-sky-200">
                                Support
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-zinc-600">
                            {sg?.isDefault ? (
                              <span className="text-zinc-500">Ολομέλεια</span>
                            ) : (
                              <Badge className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                                {sg?.name}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono font-semibold text-zinc-900">
                            {asg.hours} ώρες
                          </td>
                          <td className="p-3">
                            {asg.concurrentGroupId ? (
                              <Badge className="text-[10px] bg-zinc-100 text-zinc-700 border-zinc-200 flex items-center gap-1 w-fit font-mono">
                                <Link2 className="w-2.5 h-2.5" />
                                {asg.concurrentGroupId}
                              </Badge>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAssignment(asg.id)}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Subgroup Modal */}
      <Dialog open={isAddSgOpen} onOpenChange={setIsAddSgOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              Δημιουργία Υπο-ομάδας (Split Group)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-600">Όνομα Υπο-ομάδας</Label>
              <Input
                placeholder="π.χ. Ομάδα Α (Πληροφορική)"
                value={sgName}
                onChange={(e) => setSgName(e.target.value)}
                className="bg-white border-zinc-200 text-zinc-900"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddSgOpen(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleCreateSubGroup}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
            >
              Δημιουργία
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Assignment Modal */}
      <Dialog open={isAddAsgOpen} onOpenChange={setIsAddAsgOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              Νέα Ανάθεση Μαθήματος στο Τμήμα {selectedClass?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-zinc-600">Μάθημα</Label>
              <Select
                value={asgSubjectId}
                onValueChange={(val) => setAsgSubjectId(val || "")}
              >
                <SelectTrigger className="bg-white border-zinc-200 text-zinc-800">
                  <SelectValue placeholder="Επιλέξτε μάθημα" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                  {data.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-600">Εκπαιδευτικός</Label>
              <Select
                value={asgTeacherId}
                onValueChange={(val) => setAsgTeacherId(val || "")}
              >
                <SelectTrigger className="bg-white border-zinc-200 text-zinc-800">
                  <SelectValue placeholder="Επιλέξτε εκπαιδευτικό" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                  {data.teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.lastName} {t.firstName} ({t.specialty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-600">Υπο-ομάδα</Label>
              <Select
                value={asgSubGroupId}
                onValueChange={(val) => setAsgSubGroupId(val || "")}
              >
                <SelectTrigger className="bg-white border-zinc-200 text-zinc-800">
                  <SelectValue placeholder="Επιλέξτε ομάδα" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                  {classSubGroups.map((sg) => (
                    <SelectItem key={sg.id} value={sg.id}>
                      {sg.name} {sg.isDefault ? "(Ολομέλεια)" : "(Υπο-ομάδα)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-600">Ώρες / Εβδομάδα</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={asgHours}
                  onChange={(e) => setAsgHours(Number(e.target.value))}
                  className="bg-white border-zinc-200 text-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-600">ID Συγχρονισμού (Προαιρετικό)</Label>
                <Input
                  placeholder="π.χ. split-tpe-lang-1"
                  value={asgConcurrentId}
                  onChange={(e) => setAsgConcurrentId(e.target.value)}
                  className="bg-white border-zinc-200 text-zinc-900 font-mono text-[11px]"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              * Αν δύο αναθέσεις έχουν το ίδιο ID Συγχρονισμού, ο αλγόριθμος θα τις τοποθετήσει υποχρεωτικά την ίδια ώρα (ταυτόχρονη διδασκαλία).
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddAsgOpen(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleCreateAssignment}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
            >
              Προσθήκη Ανάθεσης
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
