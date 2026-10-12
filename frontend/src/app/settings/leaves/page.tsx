"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SchoolProfile, LeaveTypeConfig } from "@/types";
import { SchoolProfileModal } from "@/components/leaves/school-profile-modal";
import {
  Umbrella,
  Building,
  ArrowRight,
  Save,
  CheckCircle2,
  Info,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsLeavesPage() {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/leaves/config");
      const json = await res.json();
      if (json.success) {
        if (json.schoolProfile) setSchoolProfile(json.schoolProfile);
        if (json.leaveTypes) setLeaveTypes(json.leaveTypes);
      }
    } catch (e: any) {
      toast.error("Σφάλμα φόρτωσης ρυθμίσεων");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleUpdateLeaveType = (
    index: number,
    field: keyof LeaveTypeConfig,
    value: any
  ) => {
    setLeaveTypes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveLeaveTypes = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/leaves/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveTypes }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Τα όρια των αδειών αποθηκεύτηκαν επιτυχώς!");
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Umbrella className="w-5 h-5 text-blue-600" />
            Ρυθμίσεις Αδειών Εκπαιδευτικών
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Διαμόρφωση επίσημων στοιχείων σχολείου, σφραγίδων και επιτρεπόμενων ορίων ανά είδος άδειας.
          </p>
        </div>

        <Link href="/leaves">
          <Button variant="default" size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
            Μετάβαση στις Άδειες
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* School Profile Card */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-zinc-500" />
              Στοιχεία Σχολείου, Σφραγίδα & Υπογραφή
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {schoolProfile?.schoolName || "1ο Πειραματικό Δημοτικό"} • Διευθυντής: {schoolProfile?.principalName || "Ορισμός..."}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProfileModalOpen(true)}
            className="text-xs gap-1.5"
          >
            Επεξεργασία & Σφραγίδα
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded bg-muted/40">
              <span className="text-[11px] text-muted-foreground block">Σφραγίδα:</span>
              <span className="font-medium">
                {schoolProfile?.schoolStamp ? "✓ Καταχωρημένη" : "Χωρίς εικόνα"}
              </span>
            </div>
            <div className="p-2.5 rounded bg-muted/40">
              <span className="text-[11px] text-muted-foreground block">Υπογραφή Δ/ντή:</span>
              <span className="font-medium">
                {schoolProfile?.principalSignature ? "✓ Καταχωρημένη" : "Χωρίς εικόνα"}
              </span>
            </div>
            <div className="p-2.5 rounded bg-muted/40">
              <span className="text-[11px] text-muted-foreground block">Διεύθυνση Εκπ/σης:</span>
              <span className="font-medium truncate block">
                {schoolProfile?.directorate || "-"}
              </span>
            </div>
            <div className="p-2.5 rounded bg-muted/40">
              <span className="text-[11px] text-muted-foreground block">Τηλέφωνο:</span>
              <span className="font-medium">
                {schoolProfile?.phone || "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Types Limits Configuration */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Όρια Ημερών ανά Είδος Άδειας
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Καθορίστε τα επιτρεπόμενα όρια ανά σχολικό έτος για Μόνιμους και Αναπληρωτές εκπαιδευτικούς.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSaveLeaveTypes}
            disabled={isSaving}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Αποθήκευση..." : "Αποθήκευση Ορίων"}
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Είδος Άδειας</th>
                  <th className="py-2.5 px-3 text-center w-36">Όριο Μονίμων (ημ.)</th>
                  <th className="py-2.5 px-3 text-center w-36">Όριο Αναπληρωτών (ημ.)</th>
                  <th className="py-2.5 px-3">Περιγραφή</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaveTypes.map((lt, idx) => (
                  <tr key={lt.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-medium">
                      <Input
                        value={lt.name}
                        onChange={(e) => handleUpdateLeaveType(idx, "name", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        value={lt.permanentDaysLimit}
                        onChange={(e) =>
                          handleUpdateLeaveType(idx, "permanentDaysLimit", Number(e.target.value))
                        }
                        className="h-7 text-xs text-center font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        value={lt.deputyDaysLimit}
                        onChange={(e) =>
                          handleUpdateLeaveType(idx, "deputyDaysLimit", Number(e.target.value))
                        }
                        className="h-7 text-xs text-center font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      <Input
                        value={lt.description || ""}
                        onChange={(e) =>
                          handleUpdateLeaveType(idx, "description", e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* School Profile Modal */}
      <SchoolProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialProfile={schoolProfile}
        onSaved={(updated) => setSchoolProfile(updated)}
      />
    </div>
  );
}
