"use client";

import React, { useState } from "react";
import { TimetableData, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, BookOpen, Users, GraduationCap, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface SubjectsManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: "teachers" | "classes" | "subjects" | "assignments";
  onTabChange?: (tab: "teachers" | "classes" | "subjects" | "assignments") => void;
}

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({
  data,
  onRefresh,
  activeTab = "subjects",
  onTabChange,
}) => {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#3b82f6");

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

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setTitle("");
    setCode("");
    setColor("#3b82f6");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject(s);
    setTitle(s.title);
    setCode(s.code);
    setColor(s.color || "#3b82f6");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !code.trim()) {
      toast.error("Συμπληρώστε τίτλο και κωδικό μαθήματος.");
      return;
    }

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSubject?.id,
          title: title.trim(),
          code: code.trim().toUpperCase(),
          color,
        }),
      });

      if (res.ok) {
        toast.success(
          editingSubject
            ? "Το μάθημα ενημερώθηκε!"
            : "Το μάθημα προστέθηκε επιτυχώς!"
        );
        setIsModalOpen(false);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/subjects?id=${subjectToDelete.id}`, { method: "DELETE" });
      toast.info(`Το μάθημα «${subjectToDelete.title}» διαγράφηκε.`);
      setSubjectToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
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

        {/* Middle: Title & Count */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-800">
            Κατάλογος Μαθημάτων
          </span>
          <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            {data.subjects.length} μαθήματα
          </span>
        </div>

        {/* Right: Add Action */}
        <div className="flex items-center gap-2 pr-10">
          <Button
            onClick={handleOpenAdd}
            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Προσθήκη Μαθήματος
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.subjects.map((subj) => (
          <div
            key={subj.id}
            className="p-3.5 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 shadow-xs hover:shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: subj.color }}
              />
              <div>
                <h4 className="text-xs font-semibold text-zinc-900">{subj.title}</h4>
                <span className="text-[10px] font-mono text-zinc-500">{subj.code}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenEdit(subj)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSubjectToDelete(subj)}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600"
                title="Διαγραφή μαθήματος"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              {editingSubject ? "Επεξεργασία Μαθήματος" : "Προσθήκη Νέου Μαθήματος"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Τίτλος Μαθήματος</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="π.χ. Μαθηματικά"
                className="bg-white border-zinc-200 text-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700">Κωδικός Μαθήματος (Συντομογραφία)</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="π.χ. ΜΑΘ"
                className="bg-white border-zinc-200 text-zinc-900 font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700">Χρώμα Επισήμανσης</Label>
              <div className="flex items-center gap-2 pt-1">
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

      {/* Delete Subject Dialog */}
      <Dialog
        open={Boolean(subjectToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setSubjectToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-zinc-200 z-[60]">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100/80 flex items-center justify-center shrink-0 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-bold text-zinc-900">
                  Διαγραφή Μαθήματος
                </DialogTitle>
                <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                  Είστε βέβαιοι ότι θέλετε να διαγράψετε το μάθημα{" "}
                  <span className="font-semibold text-zinc-900">
                    «{subjectToDelete?.title}» ({subjectToDelete?.code})
                  </span>
                  ;
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setSubjectToDelete(null)}
              className="h-8 text-xs font-medium"
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Διαγραφή..." : "Οριστική Διαγραφή"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
