"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  LeaveTypeConfig,
} from "@/types";
import {
  getEmploymentTypeLabel,
  isMedicalLeaveType,
  calculateLeaveDays,
} from "@/lib/leave-documents";
import { LeaveDateRangeCalendar } from "@/components/leaves/leave-date-range-calendar";
import { SignaturePadModal } from "@/components/leaves/signature-pad-modal";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  FileCheck,
  FileText,
  Info,
  PenTool,
  Plus,
  Sparkles,
  User,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (leaveId: string, openDocs?: boolean) => void;
  teachers: Teacher[];
  leaveTypes: LeaveTypeConfig[];
  initialLeave?: Leave | null;
  allLeaves: Leave[];
}

export function LeaveFormModal({
  isOpen,
  onClose,
  onSaveSuccess,
  teachers,
  leaveTypes,
  initialLeave,
  allLeaves,
}: LeaveFormModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("regular");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(1);
  const [protocolNumber, setProtocolNumber] = useState<string>("");
  const [protocolDate, setProtocolDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Quick Teacher Profile fields (editable right here if missing)
  const [editAfm, setEditAfm] = useState<string>("");
  const [editAdt, setEditAdt] = useState<string>("");
  const [editAm, setEditAm] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editCity, setEditCity] = useState<string>("");
  const [editPostalCode, setEditPostalCode] = useState<string>("");
  const [editFatherName, setEditFatherName] = useState<string>("");
  const [editMotherName, setEditMotherName] = useState<string>("");
  const [editEmploymentType, setEditEmploymentType] = useState<string>("permanent");
  const [editSignature, setEditSignature] = useState<string>("" );
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState<boolean>(false);
  const signatureInputRef = React.useRef<HTMLInputElement>(null);

  const [showTeacherDetails, setShowTeacherDetails] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize form state
  useEffect(() => {
    if (initialLeave) {
      setSelectedTeacherId(initialLeave.teacherId);
      setLeaveType(initialLeave.type);
      setStartDate(initialLeave.startDate);
      setEndDate(initialLeave.endDate);
      setDaysCount(initialLeave.daysCount);
      setProtocolNumber(initialLeave.protocolNumber || "");
      setProtocolDate(initialLeave.protocolDate || "");
      setReason(initialLeave.reason || (initialLeave.type === "regular" ? "για οικογενειακούς λόγους" : ""));
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      setSelectedTeacherId(teachers.length > 0 ? teachers[0].id : "");
      setLeaveType(leaveTypes.length > 0 ? leaveTypes[0].id : "regular");
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDaysCount(1);
      setProtocolNumber("");
      setProtocolDate(todayStr);
      setReason("για οικογενειακούς λόγους");
    }
  }, [initialLeave, isOpen, teachers, leaveTypes]);

  // Selected teacher object
  const currentTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Update teacher fields when teacher changes
  useEffect(() => {
    if (currentTeacher) {
      setEditAfm(currentTeacher.afm || "");
      setEditAdt(currentTeacher.adt || "");
      setEditAm(currentTeacher.am || "");
      setEditPhone(currentTeacher.phone || "");
      setEditAddress(currentTeacher.address || "");
      setEditCity(currentTeacher.city || "");
      setEditPostalCode(currentTeacher.postalCode || "");
      setEditFatherName(currentTeacher.fatherName || "");
      setEditMotherName(currentTeacher.motherName || "");
      setEditEmploymentType(currentTeacher.employmentType || "permanent");
      setEditSignature(currentTeacher.signature || "");

      // Auto-open details if crucial data is missing
      if (!currentTeacher.afm || !currentTeacher.phone) {
        setShowTeacherDetails(true);
      }
    }
  }, [currentTeacher]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Παρακαλώ επιλέξτε αρχείο εικόνας (PNG, JPG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditSignature(dataUrl);
      toast.success("Η υπογραφή φορτώθηκε!");
    };
    reader.readAsDataURL(file);
  };

  // Check if current leave type is medical / sick leave
  const isMedical = useMemo(() => {
    return isMedicalLeaveType(leaveType, leaveTypes);
  }, [leaveType, leaveTypes]);

  // Auto-calculate days between startDate & endDate with Greek weekend rules:
  // In medical leave: Saturday and Sunday are counted.
  // In all other leaves: Saturday and Sunday are excluded.
  useEffect(() => {
    if (startDate && endDate) {
      const res = calculateLeaveDays(startDate, endDate, isMedical);
      setDaysCount(res.totalDays);
    }
  }, [startDate, endDate, isMedical]);

  // Selected leave type configuration
  const currentLeaveTypeConfig = useMemo(() => {
    return leaveTypes.find((lt) => lt.id === leaveType) || null;
  }, [leaveTypes, leaveType]);

  // Calculate used days for this teacher and leave type in the current school year
  const stats = useMemo(() => {
    if (!selectedTeacherId || !currentLeaveTypeConfig) return { used: 0, limit: 10, remaining: 10 };

    const isDeputy = editEmploymentType.startsWith("deputy");
    const limit = isDeputy
      ? currentLeaveTypeConfig.deputyDaysLimit
      : currentLeaveTypeConfig.permanentDaysLimit;

    // Filter existing leaves for this teacher & type (excluding current one if editing)
    const existing = allLeaves.filter(
      (l) =>
        l.teacherId === selectedTeacherId &&
        l.type === leaveType &&
        l.status !== "rejected" &&
        (!initialLeave || l.id !== initialLeave.id)
    );

    const used = existing.reduce((sum, l) => sum + (l.daysCount || 0), 0);
    const remaining = Math.max(0, limit - used);

    return { used, limit, remaining };
  }, [selectedTeacherId, currentLeaveTypeConfig, editEmploymentType, allLeaves, leaveType, initialLeave]);

  const isExceedingLimit = stats.limit > 0 && daysCount > stats.remaining;

  const handleSave = async (openDocsAfter: boolean = false) => {
    if (!selectedTeacherId) {
      toast.error("Παρακαλώ επιλέξτε εκπαιδευτικό");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Παρακαλώ ορίστε ημερομηνίες έναρξης και λήξης");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: initialLeave ? initialLeave.id : undefined,
        teacherId: selectedTeacherId,
        type: leaveType,
        startDate,
        endDate,
        daysCount: Number(daysCount),
        protocolNumber: protocolNumber.trim() || null,
        protocolDate: protocolDate.trim() || null,
        reason: reason.trim() || null,
        status: "approved",
        teacherUpdate: {
          afm: editAfm.trim() || null,
          adt: editAdt.trim() || null,
          am: editAm.trim() || null,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          city: editCity.trim() || null,
          postalCode: editPostalCode.trim() || null,
          fatherName: editFatherName.trim() || null,
          motherName: editMotherName.trim() || null,
          employmentType: editEmploymentType,
          signature: editSignature || null,
        },
      };

      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(initialLeave ? "Η άδεια ενημερώθηκε!" : "Η άδεια καταχωρήθηκε επιτυχώς!");
        onSaveSuccess(json.leaveId, openDocsAfter);
      } else {
        toast.error(`Σφάλμα: ${json.error || "Αποτυχία αποθήκευσης"}`);
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-none w-screen h-screen p-0 flex flex-col overflow-hidden bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border-0 shadow-none rounded-none z-[120] !translate-x-0 !translate-y-0 !top-0 !left-0">
        <DialogHeader className="p-3.5 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                {initialLeave ? "Επεξεργασία Άδειας" : "Καταχώριση Νέας Άδειας"}
                {currentTeacher && (
                  <Badge variant="outline" className="text-xs font-normal bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                    {currentTeacher.lastName} {currentTeacher.firstName} ({currentTeacher.specialty})
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Συμπληρώστε τα στοιχεία της άδειας. Τα επίσημα έγγραφα (Αίτηση & Απόφαση) θα παραχθούν αυτόματα.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100/50 dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (5 cols): Teacher Profile, Leave Type, Protocol, Reason */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card 1: Teacher Selection & Quick Profile */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    1. Εκπαιδευτικός *
                  </Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={(val) => val && setSelectedTeacherId(val)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Επιλέξτε εκπαιδευτικό...">
                        {(val) => {
                          const t = teachers.find((tc) => tc.id === val);
                          return t ? `${t.lastName} ${t.firstName} (${t.specialty})` : (val || "Επιλέξτε εκπαιδευτικό...");
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.lastName} {t.firstName} ({t.specialty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Teacher Profile Inspector / Missing Details Banner */}
                {currentTeacher && (
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          Στοιχεία Εκπαιδευτικού για τα Έγγραφα:
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {getEmploymentTypeLabel(editEmploymentType)}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTeacherDetails(!showTeacherDetails)}
                        className="h-6 text-[11px] text-blue-600 dark:text-blue-400"
                      >
                        {showTeacherDetails ? "Απόκρυψη πεδίων" : "Επεξεργασία πεδίων"}
                      </Button>
                    </div>

                    {(!editAfm || !editPhone) && !showTeacherDetails && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Λείπουν στοιχεία (π.χ. ΑΦΜ, Τηλέφωνο). Πατήστε «Επεξεργασία πεδίων» για να τα συμπληρώσετε.
                      </p>
                    )}

                    {/* Expanded Editable Fields for Teacher */}
                    {showTeacherDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs animate-in fade-in">
                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Σχέση Εργασίας</Label>
                          <Select
                            value={editEmploymentType}
                            onValueChange={(val) => val && setEditEmploymentType(val)}
                          >
                            <SelectTrigger className="h-7 text-xs mt-0.5">
                              <SelectValue>
                                {(val) => {
                                  switch (val) {
                                    case "permanent":
                                      return "Μόνιμος";
                                    case "deputy_regular":
                                      return "Αναπληρωτής Τακτικού";
                                    case "deputy_espa":
                                      return "Αναπληρωτής ΕΣΠΑ";
                                    case "hourly":
                                      return "Ωρομίσθιος";
                                    default:
                                      return val || "Μόνιμος";
                                  }
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="permanent">Μόνιμος</SelectItem>
                              <SelectItem value="deputy_regular">Αναπληρωτής Τακτικού</SelectItem>
                              <SelectItem value="deputy_espa">Αναπληρωτής ΕΣΠΑ</SelectItem>
                              <SelectItem value="hourly">Ωρομίσθιος</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Α.Φ.Μ.</Label>
                          <Input
                            value={editAfm}
                            onChange={(e) => setEditAfm(e.target.value)}
                            placeholder="π.χ. 123456789"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Α.Δ.Τ.</Label>
                          <Input
                            value={editAdt}
                            onChange={(e) => setEditAdt(e.target.value)}
                            placeholder="π.χ. ΑΒ123456"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Α.Μ. (Μητρώο)</Label>
                          <Input
                            value={editAm}
                            onChange={(e) => setEditAm(e.target.value)}
                            placeholder="π.χ. 701234"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Τηλέφωνο</Label>
                          <Input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="π.χ. 6900000000"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Όνομα Πατέρα</Label>
                          <Input
                            value={editFatherName}
                            onChange={(e) => setEditFatherName(e.target.value)}
                            placeholder="π.χ. Γεώργιος"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Διεύθυνση (Οδός & Αριθμός)</Label>
                          <Input
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="π.χ. Σωκράτους 12"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Τ.Κ.</Label>
                          <Input
                            value={editPostalCode}
                            onChange={(e) => setEditPostalCode(e.target.value)}
                            placeholder="π.χ. 15344"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">Πόλη</Label>
                          <Input
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            placeholder="π.χ. Γέρακας"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div className="col-span-2 md:col-span-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                            <PenTool className="w-3.5 h-3.5 text-blue-600" />
                            Ψηφιακή Υπογραφή Εκπαιδευτικού (PNG/JPG)
                          </Label>
                          <div className="flex items-center justify-between gap-3 mt-1.5 p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                            <div className="h-12 w-28 border border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center overflow-hidden">
                              {editSignature ? (
                                <img
                                  src={editSignature}
                                  alt="Υπογραφή"
                                  className="max-h-full max-w-full object-contain p-0.5"
                                />
                              ) : (
                                <span className="text-[10px] text-zinc-400 italic">
                                  Χωρίς υπογραφή
                                </span>
                              )}
                            </div>

                            <input
                              type="file"
                              ref={signatureInputRef}
                              onChange={handleSignatureUpload}
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                            />

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSignaturePadOpen(true)}
                                className="h-6 text-[11px] px-2 gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                title="Σχεδίαση υπογραφής με το ποντίκι ή την αφή"
                              >
                                <PenTool className="w-3 h-3" />
                                Σχεδίαση
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => signatureInputRef.current?.click()}
                                className="h-6 text-[11px] px-2 gap-1"
                                title="Μεταφόρτωση αρχείου εικόνας"
                              >
                                <Upload className="w-3 h-3" />
                                Αρχείο
                              </Button>

                              {editSignature && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditSignature("")}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  title="Διαγραφή υπογραφής"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Leave Type Selector & Limits Checker */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      2. Είδος Άδειας *
                    </Label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Όριο: <strong>{stats.limit} ημ.</strong></span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-500">Έχει λάβει: <strong>{stats.used} ημ.</strong></span>
                      <span className="text-zinc-500">•</span>
                      <span className={`font-semibold ${stats.remaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        Υπόλοιπο: {stats.remaining} ημ.
                      </span>
                    </div>
                  </div>

                  <Select
                    value={leaveType}
                    onValueChange={(val) => {
                      if (!val) return;
                      setLeaveType(val);
                      if (val === "regular" && (!reason || reason.trim() === "")) {
                        setReason("για οικογενειακούς λόγους");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue>
                        {(val) => {
                          const found = leaveTypes.find((lt) => lt.id === val);
                          if (!found) return val;
                          const limit = editEmploymentType.startsWith("deputy")
                            ? found.deputyDaysLimit
                            : found.permanentDaysLimit;
                          return `${found.name} (${limit} ημ.)`;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id} className="text-xs">
                          {lt.name} ({editEmploymentType.startsWith("deputy") ? `${lt.deputyDaysLimit} ημ.` : `${lt.permanentDaysLimit} ημ.`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentLeaveTypeConfig?.description && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {currentLeaveTypeConfig.description}
                    </p>
                  )}

                  {isExceedingLimit && (
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>
                        <strong>Προειδοποίηση υπέρβασης:</strong> Ζητούνται {daysCount} ημέρες, ενώ το διαθέσιμο υπόλοιπο για αυτό το είδος άδειας είναι {stats.remaining} ημέρες.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Protocol Number & Date & Reason */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Αριθμός Πρωτοκόλλου</Label>
                    <Input
                      value={protocolNumber}
                      onChange={(e) => setProtocolNumber(e.target.value)}
                      placeholder="π.χ. 124 / 2026"
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Ημερομηνία Αίτησης & Απόφασης</Label>
                    <Input
                      type="date"
                      value={protocolDate}
                      onChange={(e) => setProtocolDate(e.target.value)}
                      className="text-xs h-8"
                    />
                    <p className="text-[10px] text-zinc-400">
                      Προεπιλογή η σημερινή ημέρα.
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-medium">
                    {leaveType === "regular" ? "Αιτιολογία" : "Αιτιολογία / Δικαιολογητικά (προαιρετικό)"}
                  </Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      leaveType === "regular"
                        ? "π.χ. για οικογενειακούς λόγους"
                        : "π.χ. Προσωπικοί λόγοι / Ιατρική γνωμάτευση Νοσοκομείου / Αιμοδοσία"
                    }
                    className="text-xs h-8"
                  />
                  {leaveType === "regular" && (
                    <p className="text-[10px] text-zinc-400">
                      Προεπιλογή: «για οικογενειακούς λόγους». Συμπεριλαμβάνεται δυναμικά στην απόφαση.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (7 cols): Calendar & Days Calculation */}
            <div className="lg:col-span-7 space-y-3">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    3. Ημερομηνίες Άδειας & Υπολογισμός Ημερών *
                  </Label>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Ορίστε έναρξη και λήξη (ή κάντε κλικ στην ίδια ημέρα για μονοήμερη)
                  </span>
                </div>

                <LeaveDateRangeCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  isMedicalLeave={isMedical}
                  daysCount={daysCount}
                  onDaysCountChange={setDaysCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-3.5 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between sm:justify-between w-full shrink-0">
          <Button
            variant="outline"
            size="default"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs px-4"
          >
            Ακύρωση
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="text-xs px-4"
            >
              {isSaving ? "Αποθήκευση..." : "Αποθήκευση μόνο"}
            </Button>

            <Button
              variant="default"
              size="default"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="text-xs px-5 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              <FileCheck className="w-4 h-4" />
              {isSaving ? "Αποθήκευση..." : "Αποθήκευση & Έκδοση Εγγράφων"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <SignaturePadModal
      isOpen={isSignaturePadOpen}
      onClose={() => setIsSignaturePadOpen(false)}
      onSave={(dataUrl) => setEditSignature(dataUrl)}
      title="Σχεδίαση Υπογραφής Εκπαιδευτικού"
      description={`Υπογραφή για τον/την εκπαιδευτικό ${currentTeacher ? `${currentTeacher.lastName} ${currentTeacher.firstName}` : ""}.`}
    />
  </>
  );
}
