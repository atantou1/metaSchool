"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, History, ChevronDown, Loader2, Trash2, Calendar, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  saveScheduleAction, 
  getSchedulesAction, 
  loadScheduleToActiveAction,
  deleteScheduleAction 
} from "@/app/actions/schedule-actions";

export function ScheduleActionsBar({ 
  currentSlots,
  onScheduleLoaded 
}: { 
  currentSlots: any[];
  onScheduleLoaded?: () => void 
}) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  
  // Deletion state
  const [scheduleToDelete, setScheduleToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load schedules for the dropdown
  const loadSchedules = async () => {
    setIsLoadingSchedules(true);
    const res = await getSchedulesAction();
    if (res.success) {
      setSchedules(res.schedules || []);
    }
    setIsLoadingSchedules(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Παρακαλώ εισάγετε όνομα προγράμματος.");
      return;
    }

    setIsSaving(true);
    const res = await saveScheduleAction(name, description, currentSlots);
    setIsSaving(false);

    if (res.success) {
      toast.success("Το πρόγραμμα αποθηκεύτηκε επιτυχώς!");
      setSaveModalOpen(false);
      setName("");
      setDescription("");
      loadSchedules();
    } else {
      toast.error("Σφάλμα αποθήκευσης", { description: res.error });
    }
  };

  const handleLoad = async (id: string, schedName: string) => {
    const res = await loadScheduleToActiveAction(id);
    if (res.success) {
      toast.success(`Το πρόγραμμα «${schedName}» φορτώθηκε επιτυχώς!`);
      if (onScheduleLoaded) onScheduleLoaded();
    } else {
      toast.error("Σφάλμα φόρτωσης", { description: res.error });
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    const res = await deleteScheduleAction(scheduleToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      toast.success(`Το πρόγραμμα «${scheduleToDelete.name}» διαγράφηκε επιτυχώς.`);
      setSchedules((prev) => prev.filter((item) => item.id !== scheduleToDelete.id));
      setScheduleToDelete(null);
    } else {
      toast.error("Σφάλμα διαγραφής", { description: res.error });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 ml-1 mr-2 border-r border-zinc-200 dark:border-zinc-800 pr-3">
        {/* Load Schedule Dropdown */}
        <DropdownMenu onOpenChange={(open) => { if (open) loadSchedules(); }}>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-6 px-2 text-[10px] font-sans border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <History className="w-3 h-3 mr-1" />
            Ιστορικό
            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 font-sans text-xs p-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mb-1">
              Αποθηκευμένα Προγράμματα
            </div>
            {isLoadingSchedules ? (
              <div className="p-3 flex items-center justify-center text-zinc-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Φόρτωση...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-3 text-center text-zinc-500 text-xs">
                Δεν υπάρχουν αποθηκευμένα προγράμματα.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {schedules.map((s) => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded group transition-colors select-none"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(s.id, s.name)}
                      className="flex flex-col items-start text-left flex-1 min-w-0 pr-2 cursor-pointer focus:outline-none"
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate w-full text-xs">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate w-full">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(s.createdAt)}
                        </span>
                        {s.description && (
                          <span className="truncate text-zinc-500 dark:text-zinc-400">
                            • {s.description}
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      title="Διαγραφή προγράμματος"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScheduleToDelete(s);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Schedule Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveModalOpen(true)}
          className="h-6 px-2 text-[10px] font-sans border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Save className="w-3 h-3 mr-1" />
          Αποθήκευση
        </Button>
      </div>

      {/* Save Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-[425px] font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Αποθήκευση Προγράμματος</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Αποθηκεύστε το τρέχον πρόγραμμα ως νέα έκδοση στη βάση δεδομένων.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">Όνομα / Έκδοση</Label>
              <Input
                id="name"
                placeholder="π.χ. Πρόγραμμα Σεπτεμβρίου (Οριστικό)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">Σημειώσεις (Προαιρετικό)</Label>
              <Input
                id="description"
                placeholder="π.χ. Περιλαμβάνει τις νέες άδειες"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setSaveModalOpen(false)}
              className="h-8 text-xs"
            >
              Ακύρωση
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-8 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog 
        open={Boolean(scheduleToDelete)} 
        onOpenChange={(open) => { 
          if (!open && !isDeleting) setScheduleToDelete(null); 
        }}
      >
        <DialogContent className="sm:max-w-[400px] font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-rose-600 dark:text-rose-500 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Διαγραφή Προγράμματος
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά το αποθηκευμένο πρόγραμμα{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">«{scheduleToDelete?.name}»</span>;
              <br />
              Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="outline"
              onClick={() => setScheduleToDelete(null)}
              disabled={isDeleting}
              className="h-8 text-xs"
            >
              Ακύρωση
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
              Διαγραφή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
