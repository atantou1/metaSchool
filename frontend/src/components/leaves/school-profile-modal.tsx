"use client";

import React, { useState, useRef } from "react";
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
import { SchoolProfile } from "@/types";
import { Building, Stamp, PenTool, Upload, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: SchoolProfile | null;
  onSaved: (updatedProfile: SchoolProfile) => void;
}

export function SchoolProfileModal({
  isOpen,
  onClose,
  initialProfile,
  onSaved,
}: SchoolProfileModalProps) {
  const [profile, setProfile] = useState<SchoolProfile>(() => {
    return (
      initialProfile || {
        schoolName: "1ο Πειραματικό Δημοτικό Σχολείο",
        schoolYear: "2026-2027",
        ministry: "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ",
        regionalDirectorate: "ΠΕΡΙΦΕΡΕΙΑΚΗ Δ/ΝΣΗ Π.Ε. & Δ.Ε. ΑΤΤΙΚΗΣ",
        directorate: "ΔΙΕΥΘΥΝΣΗ Π.Ε. ΑΝΑΤΟΛΙΚΗΣ ΑΤΤΙΚΗΣ",
        postalAddress: "Σχολική Οδός 1, Τ.Κ. 15344",
        phone: "210 1234567",
        email: "mail@sch.gr",
        principalName: "Ιωάννης Παπαδόπουλος",
        principalTitle: "Ο Διευθυντής του Σχολείου",
        principalSignature: "",
        schoolStamp: "",
      }
    );
  });

  const [isSaving, setIsSaving] = useState(false);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "schoolStamp" | "principalSignature"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Παρακαλώ επιλέξτε αρχείο εικόνας (PNG, JPG, SVG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProfile((prev) => ({
        ...prev,
        [field]: dataUrl,
      }));
      toast.success("Η εικόνα φορτώθηκε επιτυχώς!");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/leaves/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolProfile: profile }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Τα στοιχεία του σχολείου αποθηκεύτηκαν!");
        onSaved(profile);
        onClose();
      } else {
        toast.error("Αποτυχία αποθήκευσης");
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Στοιχεία Σχολείου, Σφραγίδα & Υπογραφή Διευθυντή
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Αυτά τα στοιχεία τοποθετούνται αυτόματα στις Αποφάσεις και στα έντυπα αδειών.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-semibold">Επωνυμία Σχολικής Μονάδας</Label>
              <Input
                value={profile.schoolName}
                onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                placeholder="π.χ. 1ο Δημοτικό Σχολείο..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Υπουργείο</Label>
              <Input
                value={profile.ministry}
                onChange={(e) => setProfile({ ...profile, ministry: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Περιφερειακή Διεύθυνση</Label>
              <Input
                value={profile.regionalDirectorate}
                onChange={(e) => setProfile({ ...profile, regionalDirectorate: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Διεύθυνση Εκπαίδευσης</Label>
              <Input
                value={profile.directorate}
                onChange={(e) => setProfile({ ...profile, directorate: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ταχυδρομική Διεύθυνση</Label>
              <Input
                value={profile.postalAddress}
                onChange={(e) => setProfile({ ...profile, postalAddress: e.target.value })}
                placeholder="Οδός, Αριθμός, Τ.Κ., Πόλη"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Τηλέφωνο Σχολείου</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email Σχολείου</Label>
              <Input
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ονοματεπώνυμο Διευθυντή/ντριας</Label>
              <Input
                value={profile.principalName}
                onChange={(e) => setProfile({ ...profile, principalName: e.target.value })}
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Τίτλος Υπογράφοντος</Label>
              <Input
                value={profile.principalTitle}
                onChange={(e) => setProfile({ ...profile, principalTitle: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Stamp & Signature Uploaders */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Stamp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Ψηφιακή Σφραγίδα & Υπογραφή (Προαιρετικό - για αυτόματη εμφάνιση στα PDF)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stamp box */}
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-between gap-2">
                <span className="font-medium text-xs">Στρογγυλή Σφραγίδα Σχολείου (PNG)</span>
                <div className="h-24 w-24 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden bg-white dark:bg-zinc-950">
                  {profile.schoolStamp ? (
                    <img
                      src={profile.schoolStamp}
                      alt="Σφραγίδα"
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400 text-center px-2">
                      Χωρίς εικόνα
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={stampInputRef}
                  onChange={(e) => handleImageUpload(e, "schoolStamp")}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => stampInputRef.current?.click()}
                    className="h-7 text-xs gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Επιλογή
                  </Button>
                  {profile.schoolStamp && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfile({ ...profile, schoolStamp: "" })}
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Signature box */}
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-between gap-2">
                <span className="font-medium text-xs">Υπογραφή Διευθυντή (PNG)</span>
                <div className="h-24 w-36 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden bg-white dark:bg-zinc-950">
                  {profile.principalSignature ? (
                    <img
                      src={profile.principalSignature}
                      alt="Υπογραφή"
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400 text-center px-2">
                      Χωρίς εικόνα
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={(e) => handleImageUpload(e, "principalSignature")}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                    className="h-7 text-xs gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Επιλογή
                  </Button>
                  {profile.principalSignature && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfile({ ...profile, principalSignature: "" })}
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Ακύρωση
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {isSaving ? "Αποθήκευση..." : "Αποθήκευση Ρυθμίσεων"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
