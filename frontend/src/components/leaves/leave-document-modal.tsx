"use client";

import React, { useState, useRef } from "react";
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
  exportElementToPdf,
  downloadLeaveApplicationDocx,
  downloadLeaveDecisionDocx,
} from "@/lib/leave-documents";
import {
  FileText,
  Download,
  Printer,
  FileCheck,
  Check,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<"application" | "decision">("decision");
  const [isExporting, setIsExporting] = useState(false);

  const applicationRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);

  if (!leave || !teacher) return null;

  const school: SchoolProfile = schoolProfile || {
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
  };

  const leaveName = getLeaveTypeName(leave.type, leaveTypes);
  const empLabel = getEmploymentTypeLabel(teacher.employmentType);

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
        await downloadLeaveDecisionDocx(leave, teacher, school, leaveTypes);
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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab === "application" ? "Αίτηση" : "Απόφαση"} Άδειας</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000; margin: 0; padding: 20px; }
            .print-container { width: 100%; max-width: 800px; margin: 0 auto; }
            h1, h2, h3, h4 { margin: 0 0 10px 0; }
            p { margin: 0 0 12px 0; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
            img { max-height: 80px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${targetElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
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
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Εκπαιδευτικός: <strong>{teacher.lastName} {teacher.firstName}</strong> ({teacher.specialty}) • {formatGreekDate(leave.startDate)} έως {formatGreekDate(leave.endDate)}
            </p>
          </div>

          {/* Document Switcher Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab("decision")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "decision"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              1. Απόφαση Διευθυντή
            </button>
            <button
              onClick={() => setActiveTab("application")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "application"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              2. Αίτηση Εκπαιδευτικού
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-zinc-200/60 dark:bg-zinc-950">
          {/* Printable A4 Paper simulation */}
          <div className="bg-white text-zinc-900 w-[210mm] min-h-[297mm] p-[16mm] shadow-xl border border-zinc-300 rounded-sm font-serif text-[13px] leading-[1.6]">
            
            {/* ── 1. ΑΠΟΦΑΣΗ ΧΟΡΗΓΗΣΗΣ ΑΔΕΙΑΣ ── */}
            <div
              ref={decisionRef}
              className={`${activeTab === "decision" ? "block" : "hidden"} space-y-4`}
            >
              {/* Official Header */}
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div className="space-y-0.5 text-xs text-zinc-800">
                  <p className="font-bold text-sm tracking-wide">ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ</p>
                  <p className="font-semibold">{school.ministry || "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ"}</p>
                  <p>{school.regionalDirectorate || "ΠΕΡΙΦΕΡΕΙΑΚΗ Δ/ΝΣΗ Π.Ε. & Δ.Ε. ΑΤΤΙΚΗΣ"}</p>
                  <p>{school.directorate || "ΔΙΕΥΘΥΝΣΗ ΠΡΩΤΟΒΑΘΜΙΑΣ ΕΚΠΑΙΔΕΥΣΗΣ"}</p>
                  <p className="font-bold text-sm text-zinc-950 pt-1">{school.schoolName}</p>
                  <p className="text-[11px] text-zinc-600 pt-0.5">
                    Ταχ. Διεύθυνση: {school.postalAddress || "-"}
                  </p>
                  <p className="text-[11px] text-zinc-600">
                    Τηλ: {school.phone || "-"} | Email: {school.email || "-"}
                  </p>
                </div>

                <div className="text-right text-xs space-y-1">
                  <p className="font-mono font-semibold">
                    Αρ. Πρωτοκόλλου: <span className="underline">{leave.protocolNumber || "____"}</span>
                  </p>
                  <p>
                    Ημερομηνία: <strong>{formatGreekDate(leave.protocolDate || leave.startDate)}</strong>
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center pt-3 pb-2">
                <h2 className="text-base font-bold tracking-widest uppercase underline decoration-1 underline-offset-4">
                  Α Π Ο Φ Α Σ Η
                </h2>
              </div>

              {/* Subject */}
              <div className="bg-zinc-50 border-l-4 border-zinc-700 p-2 text-xs">
                <span className="font-bold">ΘΕΜΑ: </span>
                <span>
                  Χορήγηση <strong>{leaveName}</strong> στον/στην εκπαιδευτικό{" "}
                  <strong>{teacher.lastName} {teacher.firstName}</strong>, κλάδου{" "}
                  <strong>{teacher.specialty}</strong>.
                </span>
              </div>

              {/* Body */}
              <div className="space-y-2 text-xs pt-1">
                <p className="font-semibold">{school.principalTitle || "Ο/Η Διευθυντής/ντρια του Σχολείου"},</p>
                <p className="font-medium underline">Έχοντας υπόψη:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-zinc-800">
                  <li>
                    Τις ισχύουσες διατάξεις του <strong>Υπαλληλικού Κώδικα (Ν. 3528/2007)</strong>, όπως τροποποιήθηκε και ισχύει, καθώς και τις σχετικές εγκυκλίους του Υ.ΠΑΙ.Θ.Α.
                  </li>
                  <li>
                    Τις διατάξεις του <strong>Ν. 1566/1985</strong> για τη δομή και λειτουργία της πρωτοβάθμιας και δευτεροβάθμιας εκπαίδευσης.
                  </li>
                  <li>
                    Την από <strong>{formatGreekDate(leave.startDate)}</strong> σχετική αίτηση του/της εκπαιδευτικού <strong>{teacher.lastName} {teacher.firstName}</strong> με Αρ. Πρωτ. <strong>{leave.protocolNumber || "____"}</strong>.
                  </li>
                  {leave.reason ? (
                    <li>
                      Τους αναφερόμενους λόγους και τα συνυποβαλλόμενα δικαιολογητικά: <em>«{leave.reason}»</em>.
                    </li>
                  ) : (
                    <li>Τα υποβληθέντα δικαιολογητικά στοιχεία.</li>
                  )}
                </ol>
              </div>

              {/* Decision statement */}
              <div className="pt-3 text-center">
                <h3 className="font-bold tracking-wider uppercase text-sm">
                  Α Π Ο Φ Α Σ Ι Ζ Ο Υ Μ Ε
                </h3>
              </div>

              <div className="text-xs leading-relaxed text-justify pt-1">
                Χορηγούμε στον/στην εκπαιδευτικό{" "}
                <strong>{teacher.lastName} {teacher.firstName}</strong>{" "}
                {teacher.fatherName ? `του ${teacher.fatherName}` : ""}, κλάδου{" "}
                <strong>{teacher.specialty}</strong> ({empLabel}),{" "}
                {teacher.am ? `με Α.Μ. ${teacher.am},` : teacher.afm ? `με Α.Φ.Μ. ${teacher.afm},` : ""}{" "}
                <strong>{leave.daysCount}</strong> ({leave.daysCount === 1 ? "μία" : leave.daysCount === 2 ? "δύο" : leave.daysCount === 3 ? "τρεις" : leave.daysCount === 4 ? "τέσσερις" : leave.daysCount === 5 ? "πέντε" : `${leave.daysCount}`}) ημέρα/ες{" "}
                <strong>{leaveName}</strong>, από <strong>{formatGreekDate(leave.startDate)}</strong> έως και{" "}
                <strong>{formatGreekDate(leave.endDate)}</strong>.
              </div>

              {/* Notification & Signatures */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="text-[11px] text-zinc-600 space-y-0.5">
                  <p className="font-bold text-zinc-800">Κοινοποίηση:</p>
                  <p>1. {school.directorate || "Διεύθυνση Εκπαίδευσης"}</p>
                  <p>2. Ατομικός Φάκελος Εκπαιδευτικού</p>
                </div>

                <div className="text-center w-64 space-y-1">
                  <p className="font-semibold">{school.principalTitle || "Ο Διευθυντής του Σχολείου"}</p>
                  
                  {/* Digital Stamp & Signature Area */}
                  <div className="h-24 flex items-center justify-center relative my-1">
                    {school.schoolStamp && (
                      <img
                        src={school.schoolStamp}
                        alt="Σφραγίδα Σχολείου"
                        className="max-h-24 max-w-24 object-contain opacity-90 absolute left-2 pointer-events-none"
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
                        (Χώρος Υπογραφής & Σφραγίδας)
                      </div>
                    )}
                  </div>

                  <p className="font-bold underline">{school.principalName || "Ονοματεπώνυμο Διευθυντή"}</p>
                </div>
              </div>
            </div>

            {/* ── 2. ΑΙΤΗΣΗ ΕΚΠΑΙΔΕΥΤΙΚΟΥ ── */}
            <div
              ref={applicationRef}
              className={`${activeTab === "application" ? "block" : "hidden"} space-y-4`}
            >
              {/* Top destination header */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-3">
                <div className="text-xs">
                  <p className="font-mono text-zinc-500">
                    Αρ. Πρωτ. Αίτησης: <strong>{leave.protocolNumber || "____"}</strong>
                  </p>
                </div>
                <div className="text-right text-xs space-y-0.5 max-w-xs">
                  <p className="font-bold text-sm">ΠΡΟΣ:</p>
                  <p className="font-semibold">Τη Διεύθυνση του {school.schoolName || "Σχολείου"}</p>
                  <p className="text-zinc-600 text-[11px]">{school.postalAddress || ""}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center pt-3 pb-2">
                <h2 className="text-base font-bold tracking-wider uppercase underline decoration-1 underline-offset-4">
                  ΑΙΤΗΣΗ ΧΟΡΗΓΗΣΗΣ ΑΔΕΙΑΣ
                </h2>
              </div>

              {/* Applicant Profile Box */}
              <div className="border border-zinc-300 rounded-md p-3 bg-zinc-50/70 text-xs space-y-2">
                <p className="font-bold text-[11px] uppercase tracking-wider text-zinc-600 border-b border-zinc-200 pb-1">
                  Στοιχεία Αιτούντος / Αιτούσας Εκπαιδευτικού
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <p>
                    <span className="font-semibold">Επώνυμο: </span>
                    {teacher.lastName}
                  </p>
                  <p>
                    <span className="font-semibold">Όνομα: </span>
                    {teacher.firstName}
                  </p>
                  <p>
                    <span className="font-semibold">Πατρώνυμο: </span>
                    {teacher.fatherName || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Μητρώνυμο: </span>
                    {teacher.motherName || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Κλάδος / Ειδικότητα: </span>
                    {teacher.specialty}
                  </p>
                  <p>
                    <span className="font-semibold">Σχέση Εργασίας: </span>
                    {empLabel}
                  </p>
                  <p>
                    <span className="font-semibold">Α.Φ.Μ.: </span>
                    {teacher.afm || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Α.Δ.Τ.: </span>
                    {teacher.adt || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Αριθμός Μητρώου (Α.Μ.): </span>
                    {teacher.am || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Τηλέφωνο Επικοινωνίας: </span>
                    {teacher.phone || "-"}
                  </p>
                  <p className="col-span-2">
                    <span className="font-semibold">Διεύθυνση Κατοικίας: </span>
                    {teacher.address || "-"}
                  </p>
                </div>
              </div>

              {/* Subject */}
              <div className="text-xs pt-1">
                <p>
                  <span className="font-bold">ΘΕΜΑ: </span>
                  Αίτημα χορήγησης <strong>{leaveName}</strong>
                </p>
              </div>

              {/* Body */}
              <div className="text-xs leading-relaxed text-justify space-y-3 pt-1">
                <p>
                  Παρακαλώ όπως μου χορηγήσετε <strong>{leave.daysCount}</strong> ({leave.daysCount === 1 ? "μία" : leave.daysCount === 2 ? "δύο" : leave.daysCount === 3 ? "τρεις" : `${leave.daysCount}`}) ημέρα/ες{" "}
                  <strong>{leaveName}</strong>, από <strong>{formatGreekDate(leave.startDate)}</strong> έως και{" "}
                  <strong>{formatGreekDate(leave.endDate)}</strong>
                  {leave.reason ? ` για τον εξής λόγο: «${leave.reason}»` : ""}.
                </p>
                <p className="italic text-zinc-700">
                  Συνημμένα υποβάλλω τα απαραίτητα δικαιολογητικά έγγραφα (π.χ. ιατρική γνωμάτευση / υπεύθυνη δήλωση / βεβαίωση).
                </p>
              </div>

              {/* Bottom date and applicant signature */}
              <div className="pt-12 flex justify-between items-end text-xs">
                <div>
                  <p>
                    Ημερομηνία: <strong>{formatGreekDate(leave.protocolDate || leave.startDate)}</strong>
                  </p>
                </div>

                <div className="text-center w-56 space-y-1">
                  <p className="font-semibold">Ο / Η Αιτών / Αιτούσα</p>
                  
                  {/* Digital Signature */}
                  <div className="h-20 flex items-center justify-center relative my-1">
                    {teacher.signature ? (
                      <img
                        src={teacher.signature}
                        alt="Υπογραφή Εκπαιδευτικού"
                        className="max-h-16 max-w-36 object-contain"
                      />
                    ) : (
                      <div className="text-[11px] text-zinc-400 italic border border-dashed border-zinc-300 rounded px-3 py-3">
                        (Υπογραφή)
                      </div>
                    )}
                  </div>

                  <p className="font-bold underline">{teacher.firstName} {teacher.lastName}</p>
                </div>
              </div>
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
              Εξαγωγή Word (.docx)
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
              PDF ({activeTab === "decision" ? "Απόφαση" : "Αίτηση"})
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportBothPdfs}
              disabled={isExporting}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
            >
              <Layers className="w-4 h-4" />
              {isExporting ? "Δημιουργία..." : "Έκδοση & των 2 PDF (Αίτηση + Απόφαση)"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
