"use client";

import React, { useState } from "react";
import { TimetableSlot, SchoolConfig } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

interface MoveSlotModalProps {
  slot: TimetableSlot | null;
  schoolConfig: SchoolConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSlotMoved: () => void;
}

export const MoveSlotModal: React.FC<MoveSlotModalProps> = ({
  slot,
  schoolConfig,
  isOpen,
  onClose,
  onSlotMoved,
}) => {
  const [targetDay, setTargetDay] = useState<number>(0);
  const [targetPeriod, setTargetPeriod] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (slot) {
      setTargetDay(slot.day);
      setTargetPeriod(slot.period);
      setErrorMsg(null);
    }
  }, [slot]);

  if (!slot) return null;

  const days = schoolConfig?.days || ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];
  const periods = schoolConfig?.periods || [
    { index: 0, label: "1η Ώρα (08:15-09:00)" },
    { index: 1, label: "2η Ώρα (09:05-09:50)" },
    { index: 2, label: "3η Ώρα (10:05-10:50)" },
    { index: 3, label: "4η Ώρα (10:55-11:40)" },
    { index: 4, label: "5η Ώρα (11:55-12:35)" },
    { index: 5, label: "6η Ώρα (12:40-13:15)" },
  ];

  const handleMove = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/timetable/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          targetDay,
          targetPeriod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.validationError || data.error || "Αδύνατη η μετακίνηση.");
        toast.error("Σφάλμα επικύρωσης μετακίνησης", {
          description: data.validationError || data.error,
        });
      } else {
        toast.success("Το μάθημα μετακινήθηκε επιτυχώς!");
        onSlotMoved();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Σφάλμα δικτύου.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-zinc-900">
            <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
            Μετακίνηση Μαθήματος
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
            <div>
              Τρέχουσα ώρα:{" "}
              <span className="font-semibold text-zinc-900">
                {days[slot.day]}, {periods[slot.period]?.label || `${slot.period + 1}η Ώρα`}
              </span>
            </div>
            <div>
              Τύπος:{" "}
              <span className="font-semibold text-zinc-900">
                {slot.isSupport ? "Υποστηρικτική Ειδικότητα (Pull-out)" : "Βασικό Πρόγραμμα (Core)"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-600">Νέα Ημέρα</Label>
              <Select
                value={String(targetDay)}
                onValueChange={(val) => setTargetDay(Number(val))}
              >
                <SelectTrigger className="bg-white border-zinc-200 text-zinc-800">
                  <SelectValue placeholder="Επιλέξτε ημέρα" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                  {days.map((dayName, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {dayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-600">Νέα Διδακτική Ώρα</Label>
              <Select
                value={String(targetPeriod)}
                onValueChange={(val) => setTargetPeriod(Number(val))}
              >
                <SelectTrigger className="bg-white border-zinc-200 text-zinc-800">
                  <SelectValue placeholder="Επιλέξτε ώρα" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                  {periods.map((p, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {p.label || `${idx + 1}η Ώρα`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          >
            Ακύρωση
          </Button>
          <Button
            onClick={handleMove}
            disabled={isSubmitting}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
          >
            {isSubmitting ? "Έλεγχος..." : "Αποθήκευση Μετακίνησης"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
