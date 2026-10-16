"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  isDeputyTeacher,
  isEspaDeputy,
  formatTeacherAddress,
  formatDaysInWords,
  getApplicantGenderLabel,
  getLeavePhrases,
  getLeaveAdjective,
  getLeaveSubject,
  getLeaveDecisionSubject,
  exportElementToPdf,
  downloadLeaveApplicationDocx,
  downloadLeaveDecisionDocx,
  formatLeaveProtocolNumber,
  toGreekUpper,
  getCleanSchoolAddress,
  getSchoolTkCity,
  LEAVE_DOCUMENT_PRINT_CSS,
} from "@/lib/leave-documents";
import { GREEK_EMBLEM_BASE64 } from "@/lib/emblem-asset";
import { getEffectiveTemplate, resolveDecisionTemplate } from "@/lib/leave-templates";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Download,
  Printer,
  FileCheck,
  Check,
  Sparkles,
  Layers,
  PenTool,
  Pencil,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import { SignaturePadModal } from "@/components/leaves/signature-pad-modal";
import { toast } from "sonner";

function renderFormattedMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-zinc-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

interface LeaveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: Leave | null;
  teacher: Teacher | null;
  schoolProfile: SchoolProfile | null;
  leaveTypes: LeaveTypeConfig[];
}

export function LeaveDocumentModal({
  isOpen,
  onClose,
  leave,
  teacher,
  schoolProfile,
  leaveTypes,
}: LeaveDocumentModalProps) {
  const [activeTab, setActiveTab] = useState<"application" | "decision">("application");
  const [isExporting, setIsExporting] = useState(false);
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string>(teacher?.signature || "");
  const [liveSchoolProfile, setLiveSchoolProfile] = useState<SchoolProfile | null>(schoolProfile);

  // In-line decision template editing state
  const [isEditingDecision, setIsEditingDecision] = useState(false);
  const [decisionLegalBasis, setDecisionLegalBasis] = useState<string[]>([]);
  const [decisionText, setDecisionText] = useState<string>("");
  const [decisionNotifications, setDecisionNotifications] = useState<string[]>([]);

  useEffect(() => {
    setCurrentSignature(teacher?.signature || "");
  }, [teacher?.signature]);

  const applicationRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);

  const rawSchool: SchoolProfile = liveSchoolProfile || schoolProfile || {
    schoolName: "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών",
    schoolYear: "2026-2027",
    ministry: "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ",
    regionalDirectorate: "ΠΕΡΙΦ/ΚΗ Δ/ΝΣΗ Α/ΘΜΙΑΣ  ΕΚΠ/ΣΗΣ Κ. ΜΑΚΕΔΟΝΙΑΣ",
    directorate: "Δ/ΝΣΗ Α/ΘΜΙΑΣ  ΕΚΠ/ΣΗΣ Ν. ΣΕΡΡΩΝ",
    postalAddress: "3ο χλμ. Σερρών-Δράμας, Τ.Κ. 62100",
    phone: "",
    email: "",
    principalName: "",
    principalTitle: "Ο Δ/ντής  του  σχολείου",
  };

  const normalizedSchoolName =
    rawSchool.schoolName?.includes("Ειδικό Πειραματικό Σχολείο") && !rawSchool.schoolName.includes("Δημοτικό")
      ? rawSchool.schoolName.replace("Ειδικό Πειραματικό Σχολείο", "Ειδικό Πειραματικό Δημοτικό Σχολείο")
      : (rawSchool.schoolName || "Σχολείο");

  const school: SchoolProfile = {
    ...rawSchool,
    schoolName: normalizedSchoolName,
  };

  const isDeputy = isDeputyTeacher(teacher);

  // Initialize or reset decision content from effective template
  const resetToTemplateDecisionContent = (customSchool?: SchoolProfile) => {
    if (!leave || !teacher) return;
    const effSchool = customSchool || school;
    const foundLeaveType = leaveTypes.find((lt) => lt.id === leave.type);
    const effectiveTemplate = getEffectiveTemplate(foundLeaveType, isDeputy);
    const resolved = resolveDecisionTemplate(effectiveTemplate, {
      leave,
      teacher,
      school: effSchool,
      leaveTypes,
    });
    setDecisionLegalBasis(
      resolved.legalBasis.map((l) =>
        l.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
      )
    );
    setDecisionText(
      resolved.decisionText.replace(
        /Ειδικό Πειραματικό Σχολείο Σερρών/g,
        "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών"
      )
    );
    setDecisionNotifications(
      resolved.notifications.map((n) =>
        n.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
      )
    );
  };

  // When modal opens, fetch fresh school profile from backend and ensure application tab is active
  useEffect(() => {
    if (isOpen) {
      setActiveTab("application");
      setIsEditingDecision(false);

      fetch("/api/leaves/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.schoolProfile) {
            const fresh = { ...data.schoolProfile };
            if (fresh.schoolName?.includes("Ειδικό Πειραματικό Σχολείο") && !fresh.schoolName.includes("Δημοτικό")) {
              fresh.schoolName = fresh.schoolName.replace("Ειδικό Πειραματικό Σχολείο", "Ειδικό Πειραματικό Δημοτικό Σχολείο");
            }
            setLiveSchoolProfile(fresh);
            resetToTemplateDecisionContent(fresh);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    resetToTemplateDecisionContent();
  }, [
    leave?.id,
    teacher?.id,
    leave?.type,
    leave?.daysCount,
    leave?.startDate,
    leave?.endDate,
    leave?.protocolNumber,
    leave?.protocolDate,
    leave?.reason,
    isDeputy,
    school.schoolName,
  ]);

  if (!leave || !teacher) return null;

  const leaveName = getLeaveTypeName(leave.type, leaveTypes);
  const empLabel = getEmploymentTypeLabel(teacher.employmentType);
  const isEspa = isEspaDeputy(teacher);
  const leavePhrases = getLeavePhrases(leave.type, leaveTypes);
  const leaveSubject = leavePhrases.subject;
  const leaveGenitive = leavePhrases.genitive;
  const leaveAccusative = leavePhrases.accusative;
  const daysInfo = formatDaysInWords(leave.daysCount);
  const applicantLabel = getApplicantGenderLabel(teacher.firstName);
  const formattedProtocol = formatLeaveProtocolNumber(leave.protocolNumber, leave.type, leaveTypes);
  const cleanSchoolAddress = getCleanSchoolAddress(school.address, school.postalAddress);
  const schoolTkCity = getSchoolTkCity(school);
  const decisionSubject = getLeaveDecisionSubject(leave.type, leaveTypes);

  // Export currently active document as PDF
  const handleExportCurrentPdf = async () => {
    setIsExporting(true);
    try {
      if (activeTab === "application" && applicationRef.current) {
        const filename = `Αίτηση_Άδειας_${teacher.lastName}_${leave.startDate}.pdf`;
        await exportElementToPdf(applicationRef.current, filename);
        toast.success("Η Αίτηση εξήχθη επιτυχώς σε PDF!");
      } else if (activeTab === "decision" && decisionRef.current) {
        const filename = `Απόφαση_Άδειας_${teacher.lastName}_${leave.startDate}.pdf`;
        await exportElementToPdf(decisionRef.current, filename);
        toast.success("Η Απόφαση εξήχθη επιτυχώς σε PDF!");
      }
    } catch (e: any) {
      toast.error("Σφάλμα εξαγωγής PDF", { description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  // Save new signature drawn on the fly and persist to teacher profile
  const handleSaveSignature = async (dataUrl: string) => {
    setCurrentSignature(dataUrl);
    if (!teacher) return;
    try {
      await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teacher,
          signature: dataUrl,
        }),
      });
      toast.success("Η υπογραφή αποθηκεύτηκε στο προφίλ του εκπαιδευτικού!");
    } catch {
      toast.error("Σφάλμα αποθήκευσης υπογραφής");
    }
  };

  // Export BOTH documents in PDF with 1 click
  const handleExportBothPdfs = async () => {
    setIsExporting(true);
    try {
      if (applicationRef.current && decisionRef.current) {
        toast.info("Δημιουργία Αίτησης σε PDF...");
        await exportElementToPdf(
          applicationRef.current,
          `1_Αίτηση_Άδειας_${teacher.lastName}_${leave.startDate}.pdf`
        );
        toast.info("Δημιουργία Απόφασης σε PDF...");
        await exportElementToPdf(
          decisionRef.current,
          `2_Απόφαση_Άδειας_${teacher.lastName}_${leave.startDate}.pdf`
        );
        toast.success("Εξήχθησαν επιτυχώς και τα 2 έγγραφα σε PDF!");
      }
    } catch (e: any) {
      toast.error("Σφάλμα εξαγωγής εγγράφων", { description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  // Export Docx Word
  const handleExportDocx = async () => {
    try {
      if (activeTab === "application") {
        await downloadLeaveApplicationDocx(leave, teacher, school, leaveTypes);
        toast.success("Η Αίτηση κατέβηκε σε Word (.docx)");
      } else {
        await downloadLeaveDecisionDocx(leave, teacher, school, leaveTypes, {
          legalBasis: decisionLegalBasis.map((l) =>
            l.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
          ),
          decisionText: decisionText.replace(
            /Ειδικό Πειραματικό Σχολείο Σερρών/g,
            "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών"
          ),
          notifications: decisionNotifications.map((n) =>
            n.replace(/Ειδικό Πειραματικό Σχολείο Σερρών/g, "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών")
          ),
        });
        toast.success("Η Απόφαση κατέβηκε σε Word (.docx)");
      }
    } catch (e: any) {
      toast.error("Σφάλμα εξαγωγής Word", { description: e.message });
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    const targetElement = activeTab === "application" ? applicationRef.current : decisionRef.current;
    if (!targetElement) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Παρακαλώ επιτρέψτε τα popups για εκτύπωση");
      return;
    }

    const docTitle = activeTab === "application" ? "Αίτηση Άδειας" : "Απόφαση Άδειας";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            ${LEAVE_DOCUMENT_PRINT_CSS}
          </style>
        </head>
        <body>
          <div class="print-container">
            ${targetElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Έκδοση Εγγράφων Άδειας
              <Badge variant="outline" className="ml-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {leaveName} • {leave.daysCount} ημ.
              </Badge>
              {isDeputy && (
                <Badge variant="secondary" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {school.deputyLogo ? "✓ Με λογότυπο αναπληρωτών" : "Αναπληρωτής"}
                </Badge>
              )}
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Εκπαιδευτικός: <strong>{teacher.lastName} {teacher.firstName}</strong> ({teacher.specialty}) • {formatGreekDate(leave.startDate)} έως {formatGreekDate(leave.endDate)}
            </p>
          </div>

          {/* Document Switcher Tabs & In-line Edit Toggle */}
          <div className="flex items-center gap-2">
            {activeTab === "decision" && (
              <Button
                variant={isEditingDecision ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditingDecision(!isEditingDecision)}
                className={`h-7 text-xs gap-1.5 transition-colors ${
                  isEditingDecision
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "text-zinc-700 dark:text-zinc-300 hover:border-amber-500"
                }`}
              >
                {isEditingDecision ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Προεπισκόπηση
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Προσαρμογή Κειμένου
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveTab("application")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "application"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                1. Αίτηση Εκπαιδευτικού
              </button>
              <button
                onClick={() => setActiveTab("decision")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "decision"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                2. Απόφαση Διευθυντή
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-zinc-200/60 dark:bg-zinc-950">
          {/* Printable A4 Paper simulation */}
          <div className="bg-white text-zinc-900 w-[210mm] min-h-[297mm] p-[16mm] shadow-xl border border-zinc-300 rounded-sm font-serif text-[13px] leading-[1.6] flex flex-col justify-between">
            
            {/* ── 1. ΑΠΟΦΑΣΗ ΧΟΡΗΓΗΣΗΣ ΑΔΕΙΑΣ (Πιστό αντίγραφο επίσημου προτύπου) ── */}
            <div
              ref={decisionRef}
              className={`${activeTab === "decision" ? "flex flex-col min-h-[265mm] justify-between text-zinc-900" : "hidden"}`}
              style={{ fontFamily: "'Calibri', 'Candara', 'Segoe UI', Arial, sans-serif" }}
            >
              <div className="space-y-3">
                {/* Official Header - 3-row structure aligning Left & Right columns precisely */}
                <div className="space-y-0 pb-2">
                  {/* Row 0: Logo, Greek Republic, Ministry, Separator / Right empty */}
                  <div className="grid grid-cols-[1.35fr_1fr] gap-6 items-start">
                    <div className="text-center space-y-0.5">
                      <img
                        src={school.schoolLogo || `data:image/png;base64,${GREEK_EMBLEM_BASE64}`}
                        alt="Λογότυπο Σχολείου"
                        className="h-12 w-12 object-contain mx-auto mb-1"
                      />
                      <p className="font-bold text-[10pt] uppercase tracking-wide">
                        ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ
                      </p>
                      <p className="font-bold text-[10pt] uppercase">
                        {toGreekUpper(school.ministry || "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ")}
                      </p>
                      <p className="font-bold text-[10pt]">--------</p>
                    </div>
                    <div>{/* Blank cell to balance Row 0 */}</div>
                  </div>

                  {/* Row 1: Regional Directorate, Directorate, School Name / Right: Date & Protocol */}
                  <div className="grid grid-cols-[1.35fr_1fr] gap-6 items-start">
                    <div className="text-center space-y-0.5">
                      {school.regionalDirectorate && (
                        <p className="font-bold text-[10pt] uppercase">
                          {toGreekUpper(school.regionalDirectorate)}
                        </p>
                      )}
                      {school.directorate && (
                        <p className="font-bold text-[10pt] uppercase">
                          {toGreekUpper(school.directorate)}
                        </p>
                      )}
                      <p className="font-bold text-[10pt] uppercase pt-0.5">
                        {toGreekUpper(school.schoolName)}
                      </p>
                      {/* 2 empty lines under school name */}
                      <div className="h-7" aria-hidden="true"></div>
                    </div>

                    {/* Right Column: Date & Protocol starting at the same line as Regional Directorate */}
                    <div className="text-right space-y-1">
                      <p className="text-[10pt] font-bold text-zinc-900">
                        {school.city || "Σέρρες"}, {formatGreekDate(leave.protocolDate || leave.startDate)}
                      </p>
                      <p className="text-[10pt] font-bold text-zinc-900">
                        Αρ. Πρωτ. {formattedProtocol}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Contact Info / Right: Decision Title aligned with Information */}
                  <div className="grid grid-cols-[1.35fr_1fr] gap-6 items-start">
                    <div className="space-y-0.5 text-[10pt] font-bold text-zinc-900 leading-snug">
                      <p>
                        <span className="inline-block w-[110px]">Πληροφορίες</span>: {school.principalName || "-"}
                      </p>
                      <p>
                        <span className="inline-block w-[110px]">Διεύθυνση</span>: {cleanSchoolAddress}
                      </p>
                      <p>
                        <span className="inline-block w-[110px]">Τ.Κ.-Πόλη</span>: {schoolTkCity}
                      </p>
                      <p>
                        <span className="inline-block w-[110px]">Τηλέφωνο</span>: {school.phone || "-"}
                      </p>
                      <p>
                        <span className="inline-block w-[110px]">e-mail</span>: {school.email || "-"}
                      </p>
                    </div>

                    {/* Right: Decision Title aligned horizontally with Information ("Πληροφορίες") */}
                    <div className="text-center w-full pt-0.5 pb-1">
                      <h2 className="text-[11pt] font-bold uppercase text-zinc-950">
                        ΑΠΟΦΑΣΗ
                      </h2>
                    </div>
                  </div>

                  {/* Subject placed below contact info & decision title - Full width */}
                  <div className="pt-4 text-[10pt] text-zinc-950 font-bold">
                    ΘΕΜΑ: <span className="font-bold">{decisionSubject}</span>
                  </div>
                </div>

                {/* In-Line Editing Controls (when isEditingDecision is active) */}
                {isEditingDecision && (
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-md space-y-3 no-print font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-amber-600" />
                        Προσαρμογή Νομικής Βάσης & Κειμένου για τη συγκεκριμένη άδεια
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetToTemplateDecisionContent()}
                        className="h-6 text-[11px] text-amber-800 gap-1 hover:bg-amber-100"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Επαναφορά Προτύπου
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-zinc-700">
                        Έχοντας υπόψη (Σημεία):
                      </Label>
                      {decisionLegalBasis.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-xs font-mono font-bold pt-1.5 w-5 text-right shrink-0">{idx + 1}.</span>
                          <Textarea
                            value={line}
                            onChange={(e) => {
                              const copy = [...decisionLegalBasis];
                              copy[idx] = e.target.value;
                              setDecisionLegalBasis(copy);
                            }}
                            rows={2}
                            className="text-xs resize-y min-h-[38px] bg-white text-zinc-900 font-sans"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDecisionLegalBasis(decisionLegalBasis.filter((_, i) => i !== idx))}
                            className="h-7 w-7 text-red-500 shrink-0"
                            title="Διαγραφή διάταξης"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDecisionLegalBasis([...decisionLegalBasis, ""])}
                        className="h-6 text-[11px] gap-1 border-dashed mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Προσθήκη Διάταξης
                      </Button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] font-semibold text-zinc-700">
                        Κείμενο «Αποφασίζουμε»:
                      </Label>
                      <Textarea
                        value={decisionText}
                        onChange={(e) => setDecisionText(e.target.value)}
                        rows={3}
                        className="text-xs resize-y bg-white text-zinc-900 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="space-y-1.5 text-[12px] pt-2 text-zinc-900">
                  <p className="font-bold text-[12.5px]">
                    {school.principalTitle && school.principalTitle.includes("Σχολείου") && school.schoolName
                      ? school.principalTitle.replace(/του Σχολείου/i, school.schoolNameGenitive || `του ${school.schoolName}`)
                      : (school.principalTitle ? `${school.principalTitle} του ${school.schoolName || "Σχολείου"}` : `Ο   Διευθυντής του ${school.schoolName || "Σχολείου"}`)}
                  </p>
                  <p className="font-bold text-[12px] pt-1">Έχοντας υπόψη :</p>
                  <div className="space-y-1.5 pt-0.5 text-zinc-900 leading-relaxed text-justify">
                    {decisionLegalBasis.map((item, idx) => {
                      const clean = item.replace(/^\d+[\.\)]\s*/, "");
                      return (
                        <div key={idx} className="flex items-start text-justify">
                          <span className="font-normal shrink-0 mr-1.5">{idx + 1}.</span>
                          <span className="flex-1 text-justify">{renderFormattedMarkdown(clean)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Decision Action Statement */}
                <div className="pt-3 pb-1 text-center">
                  <h3 className="font-bold tracking-[0.06em] text-[13.5px] text-zinc-950">
                    Α&nbsp;π&nbsp;ο&nbsp;φ&nbsp;α&nbsp;σ&nbsp;ί&nbsp;ζ&nbsp;ο&nbsp;υ&nbsp;μ&nbsp;ε
                  </h3>
                </div>

                <div className="text-[12.5px] leading-relaxed text-justify pt-1 text-zinc-950">
                  {renderFormattedMarkdown(
                    decisionText.replace(
                      /Ειδικό Πειραματικό Σχολείο Σερρών/g,
                      "Ειδικό Πειραματικό Δημοτικό Σχολείο Σερρών"
                    )
                  )}
                </div>

                {/* Notification & Signatures - 2 Columns */}
                <div className="pt-10 grid grid-cols-2 gap-8 items-end text-xs">
                  {/* Left: ΚΟΙΝΟΠΟΙΗΣΗ */}
                  <div className="text-[11.5px] text-zinc-800 space-y-1">
                    <p className="font-bold text-[12px] text-zinc-950 mb-1">ΚΟΙΝΟΠΟΙΗΣΗ</p>
                    {decisionNotifications.map((notif, idx) => {
                      const clean = notif.replace(/^\d+[\.\)]\s*/, "");
                      return (
                        <p key={idx} className="text-zinc-900">{idx + 1}. {renderFormattedMarkdown(clean)}</p>
                      );
                    })}
                  </div>

                  {/* Right: Ο Δ/ντής του σχολείου */}
                  <div className="text-center w-full space-y-1">
                    <p className="font-bold text-[12.5px] text-zinc-950">
                      {school.principalTitle || "Ο Δ/ντής  του  σχολείου"}
                    </p>
                    
                    {/* Digital Stamp & Signature Area */}
                    <div className="h-24 flex items-center justify-center relative my-1">
                      {school.schoolStamp && (
                        <img
                          src={school.schoolStamp}
                          alt="Σφραγίδα Σχολείου"
                          className="max-h-24 max-w-24 object-contain opacity-90 absolute left-4 inset-y-0 my-auto pointer-events-none"
                        />
                      )}
                      {school.principalSignature && (
                        <img
                          src={school.principalSignature}
                          alt="Υπογραφή Διευθυντή"
                          className="max-h-20 max-w-40 object-contain z-10"
                        />
                      )}
                      {!school.schoolStamp && !school.principalSignature && (
                        <div className="text-[11px] text-zinc-400 italic border border-dashed border-zinc-300 rounded px-3 py-4">
                          (Χώρος Υπογραφής &amp; Σφραγίδας)
                        </div>
                      )}
                    </div>

                    <p className="font-bold text-[12.5px] text-zinc-950">{school.principalName || "Ονοματεπώνυμο Διευθυντή"}</p>
                  </div>
                </div>
              </div>

              {/* Deputy Footer Banner only if deputy ESPA teacher and logo exists */}
              {isEspa && school.deputyLogo && (
                <div className="pt-6 mt-auto border-t border-zinc-300 flex flex-col items-center justify-center">
                  <img
                    src={school.deputyLogo}
                    alt="Λογότυπο Αναπληρωτών (ΕΣΠΑ)"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* ── 2. ΑΙΤΗΣΗ ΕΚΠΑΙΔΕΥΤΙΚΟΥ (Πιστό αντίγραφο του επίσημου προτύπου) ── */}
            <div
              ref={applicationRef}
              className={`${activeTab === "application" ? "flex flex-col min-h-[265mm] justify-between font-sans text-zinc-900" : "hidden"}`}
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            >
              <div className="pt-4 px-2">
                <div className="grid grid-cols-2 gap-10 items-start">
                  
                  {/* Αριστερή Στήλη */}
                  <div className="space-y-3 text-[12.5px] leading-relaxed">
                    {/* Τίτλος Αίτησης - Ξεκινάει πιο κάτω σύμφωνα με το επίσημο πρότυπο */}
                    <div className="text-center pb-2 pt-16">
                      <span className="font-bold text-sm tracking-[0.35em] underline underline-offset-4">
                        Α Ι Τ Η Σ Η
                      </span>
                    </div>

                    {/* Στοιχεία Εκπαιδευτικού */}
                    <div className="space-y-1.5 pt-2">
                      <p>
                        <span className="font-semibold">ΕΠΩΝΥΜΟ:</span> {teacher.lastName}
                      </p>
                      <p>
                        <span className="font-semibold">ΟΝΟΜΑ:</span> {teacher.firstName}
                      </p>
                      <p>
                        <span className="font-semibold">ΟΝ. ΠΑΤΡΟΣ:</span> {teacher.fatherName || "—"}
                      </p>
                      <p>
                        <span className="font-semibold">ΕΙΔΙΚΟΤΗΤΑ:</span> {teacher.specialty}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-4">
                      <p>
                        <span className="font-semibold">Δ/ΝΣΗ ΚΑΤΟΙΚΙΑΣ:</span> {teacher.address || "—"}
                      </p>
                      <p>
                        <span className="font-semibold">Τ.Κ:</span> {teacher.postalCode || "—"}
                      </p>
                      <p>
                        <span className="font-semibold">ΠΟΛΗ:</span> {teacher.city || "—"}
                      </p>
                      <p>
                        <span className="font-semibold">ΤΗΛΕΦΩΝΟ:</span> {teacher.phone || "—"}
                      </p>
                    </div>

                    <div className="pt-6">
                      <p className="font-bold text-[13px]">
                        ΘΕΜΑ: <span className="font-normal">{leaveSubject}</span>
                      </p>
                    </div>

                    <div className="pt-10">
                      <p className="text-[12.5px]">
                        {school.city || "Σέρρες"}, {formatGreekDate(leave.protocolDate || leave.startDate)}
                      </p>
                    </div>
                  </div>

                  {/* Δεξιά Στήλη */}
                  <div className="space-y-5 text-[12.5px] leading-relaxed">
                    {/* Παραλήπτης */}
                    <div className="text-center space-y-1">
                      <p className="font-bold tracking-[0.35em] underline underline-offset-4 pb-1">
                        Π Ρ Ο Σ
                      </p>
                      <p className="font-normal text-[13px]">τη Διεύθυνση</p>
                      <p className="font-bold text-[13px] uppercase leading-tight whitespace-pre-line">
                        {school.schoolNameGenitive || `του ${school.schoolName || "Σχολείου"}`}
                      </p>
                    </div>

                    {/* Κείμενο Αίτησης */}
                    <div className="pt-12 text-justify leading-relaxed text-[13px]">
                      <p>
                        {leave.daysCount === 1 || leave.startDate === leave.endDate ? (
                          <>
                            Σας παρακαλώ να μου χορηγήσετε {leaveAccusative} <strong>1 (μίας)</strong> ημέρας στις <strong>{formatGreekDate(leave.startDate)}</strong>.
                          </>
                        ) : (
                          <>
                            Σας παρακαλώ να μου χορηγήσετε {leaveAccusative} <strong>{daysInfo.numberStr} ({daysInfo.wordStr})</strong> ημερών από <strong>{formatGreekDate(leave.startDate)}</strong> έως και <strong>{formatGreekDate(leave.endDate)}</strong>.
                          </>
                        )}
                      </p>
                    </div>

                    {/* Υπογραφή */}
                    <div className="pt-20 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1 mx-auto text-center">
                        <p className="font-semibold text-[13px] text-center">{applicantLabel}</p>
                        <button
                          type="button"
                          onClick={() => setIsSignaturePadOpen(true)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] inline-flex items-center gap-0.5 transition-colors no-print"
                          title={currentSignature ? "Αλλαγή υπογραφής" : "Σχεδίαση υπογραφής"}
                        >
                          <PenTool className="w-3 h-3" />
                          <span className="text-[10px]">{currentSignature ? "Αλλαγή" : "Σχεδίαση"}</span>
                        </button>
                      </div>

                      {/* Digital Signature or dotted line */}
                      <div
                        onClick={() => setIsSignaturePadOpen(true)}
                        className="h-20 flex items-center justify-center relative my-1 cursor-pointer group rounded hover:bg-zinc-50/80 transition-colors mx-auto"
                        title="Κάντε κλικ για σχεδίαση ή αλλαγή υπογραφής"
                      >
                        {currentSignature ? (
                          <img
                            src={currentSignature}
                            alt="Υπογραφή Εκπαιδευτικού"
                            className="max-h-16 max-w-40 object-contain mx-auto block"
                          />
                        ) : (
                          <div className="text-[11px] text-zinc-400 group-hover:text-blue-600 group-hover:border-blue-400 italic border border-dashed border-zinc-300 rounded px-3 py-2 transition-colors flex items-center justify-center gap-1 mx-auto">
                            <PenTool className="w-3 h-3 text-blue-500" />
                            <span>(Κλικ για υπογραφή)</span>
                          </div>
                        )}
                      </div>

                      <p className="font-bold underline text-[13px] text-center">
                        {teacher.firstName} {teacher.lastName}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Υποσέλιδο Λογότυπο (Μόνο για αναπληρωτές ΕΣΠΑ) */}
              {isEspa && school.deputyLogo ? (
                <div className="pt-6 pb-2 border-t border-zinc-200 flex flex-col items-center justify-center mt-auto">
                  <img
                    src={school.deputyLogo}
                    alt="Λογότυπο ΕΣΠΑ"
                    className="max-h-14 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-6" />
              )}
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between sm:justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Εκτύπωση
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDocx}
              className="text-xs gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Word ({activeTab === "application" ? "1. Αίτηση" : "2. Απόφαση"})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCurrentPdf}
              disabled={isExporting}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              PDF ({activeTab === "application" ? "1. Αίτηση" : "2. Απόφαση"})
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportBothPdfs}
              disabled={isExporting}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
            >
              <Layers className="w-4 h-4" />
              {isExporting ? "Δημιουργία..." : "Έκδοση & των 2 PDF (1. Αίτηση + 2. Απόφαση)"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <SignaturePadModal
        isOpen={isSignaturePadOpen}
        onClose={() => setIsSignaturePadOpen(false)}
        onSave={handleSaveSignature}
        title="Υπογραφή Αίτησης Εκπαιδευτικού"
        description={`Υπογραφή για τον/την εκπαιδευτικό ${teacher?.lastName} ${teacher?.firstName}.`}
      />
    </Dialog>
  );
}
