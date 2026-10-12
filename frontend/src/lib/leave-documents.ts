import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, Packer } from "docx";
import { Leave, Teacher, SchoolProfile, LeaveTypeConfig } from "@/types";

// Helper to format Greek date (e.g., 12/10/2026)
export function formatGreekDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getLeaveTypeName(typeId: string, leaveTypes: LeaveTypeConfig[]): string {
  const found = leaveTypes.find((t) => t.id === typeId);
  return found ? found.name : typeId;
}

export function getEmploymentTypeLabel(empType?: string | null): string {
  switch (empType) {
    case "permanent":
      return "Μόνιμος Εκπαιδευτικός";
    case "deputy_regular":
      return "Αναπληρωτής (Τακτικού Προϋπολογισμού)";
    case "deputy_espa":
      return "Αναπληρωτής (ΕΣΠΑ)";
    case "hourly":
      return "Ωρομίσθιος Εκπαιδευτικός";
    default:
      return "Μόνιμος Εκπαιδευτικός";
  }
}

// Client-side PDF generator from an existing DOM node
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2, // 2x for sharp printing
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  // Standard A4: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);

  return pdf.output("blob");
}

// Generate Word (.docx) for Leave Application (Αίτηση)
export async function downloadLeaveApplicationDocx(
  leave: Leave,
  teacher: Teacher,
  school: SchoolProfile,
  leaveTypes: LeaveTypeConfig[]
) {
  const leaveName = getLeaveTypeName(leave.type, leaveTypes);
  const empLabel = getEmploymentTypeLabel(teacher.employmentType);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "ΠΡΟΣ:", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Τη Διεύθυνση του ${school.schoolName || "Σχολείου"}`, bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `${school.postalAddress || ""}`, size: 20 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 },
            children: [
              new TextRun({ text: "ΑΙΤΗΣΗ ΧΟΡΗΓΗΣΗΣ ΑΔΕΙΑΣ", bold: true, size: 28, underline: {} }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "ΣΤΟΙΧΕΙΑ ΑΙΤΟΥΝΤΟΣ / ΑΙΤΟΥΣΑΣ:", bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Επώνυμο: ", bold: true }),
              new TextRun({ text: teacher.lastName }),
              new TextRun({ text: "   Όνομα: ", bold: true }),
              new TextRun({ text: teacher.firstName }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Πατρώνυμο: ", bold: true }),
              new TextRun({ text: teacher.fatherName || "-" }),
              new TextRun({ text: "   Μητρώνυμο: ", bold: true }),
              new TextRun({ text: teacher.motherName || "-" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Κλάδος / Ειδικότητα: ", bold: true }),
              new TextRun({ text: teacher.specialty }),
              new TextRun({ text: "   Σχέση Εργασίας: ", bold: true }),
              new TextRun({ text: empLabel }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Α.Δ.Τ.: ", bold: true }),
              new TextRun({ text: teacher.adt || "-" }),
              new TextRun({ text: "   Α.Φ.Μ.: ", bold: true }),
              new TextRun({ text: teacher.afm || "-" }),
              new TextRun({ text: "   Α.Μ.: ", bold: true }),
              new TextRun({ text: teacher.am || "-" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Διεύθυνση Κατοικίας: ", bold: true }),
              new TextRun({ text: teacher.address || "-" }),
              new TextRun({ text: "   Τηλέφωνο: ", bold: true }),
              new TextRun({ text: teacher.phone || "-" }),
            ],
          }),

          new Paragraph({
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({ text: "ΘΕΜΑ: ", bold: true, size: 22 }),
              new TextRun({ text: `Αίτημα χορήγησης ${leaveName}`, bold: true, size: 22 }),
            ],
          }),

          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `Παρακαλώ να μου χορηγήσετε ${leave.daysCount} ημέρα/ες ${leaveName}, από ${formatGreekDate(leave.startDate)} έως και ${formatGreekDate(leave.endDate)}${leave.reason ? ` για τον εξής λόγο: ${leave.reason}` : ""}.`,
                size: 22,
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "Συνημμένα υποβάλλω τα απαιτούμενα δικαιολογητικά έγγραφα.",
                size: 20,
                italics: true,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({ text: `Ημερομηνία: ${formatGreekDate(leave.protocolDate || leave.startDate)}`, size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "Ο / Η Αιτών / Αιτούσα", bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 600 },
            children: [
              new TextRun({ text: `${teacher.firstName} ${teacher.lastName}`, size: 22 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Αίτηση_Άδειας_${teacher.lastName}_${formatGreekDate(leave.startDate).replace(/\//g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Generate Word (.docx) for Leave Decision (Απόφαση)
export async function downloadLeaveDecisionDocx(
  leave: Leave,
  teacher: Teacher,
  school: SchoolProfile,
  leaveTypes: LeaveTypeConfig[]
) {
  const leaveName = getLeaveTypeName(leave.type, leaveTypes);
  const empLabel = getEmploymentTypeLabel(teacher.employmentType);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ", bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: school.ministry || "ΥΠΟΥΡΓΕΙΟ ΠΑΙΔΕΙΑΣ, ΘΡΗΣΚΕΥΜΑΤΩΝ ΚΑΙ ΑΘΛΗΤΙΣΜΟΥ", bold: true, size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: school.regionalDirectorate || "", size: 18 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: school.directorate || "", size: 18 })],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ text: school.schoolName || "", bold: true, size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Ταχ. Δ/νση: ${school.postalAddress || "-"}`, size: 18 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Τηλέφωνο: ${school.phone || "-"}  |  Email: ${school.email || "-"}`, size: 18 })],
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: `Αρ. Πρωτοκόλλου: ${leave.protocolNumber || "____"}`, bold: true, size: 20 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `Ημερομηνία: ${formatGreekDate(leave.protocolDate || leave.startDate)}`, size: 20 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: "Α Π Ο Φ Α Σ Η", bold: true, size: 28 }),
            ],
          }),

          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "ΘΕΜΑ: ", bold: true, size: 22 }),
              new TextRun({
                text: `Χορήγηση ${leaveName} στον/στην εκπαιδευτικό ${teacher.lastName} ${teacher.firstName}, κλάδου ${teacher.specialty}.`,
                size: 22,
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "Ο/Η Διευθυντής/ντρια του Σχολείου,", bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [new TextRun({ text: "Έχοντας υπόψη:", bold: true, size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "1. Τις κείμενες διατάξεις του Υπαλληλικού Κώδικα (Ν. 3528/2007) όπως τροποποιήθηκε και ισχύει.", size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. Τις διατάξεις του Ν. 1566/1985 για τη δομή και λειτουργία της πρωτοβάθμιας και δευτεροβάθμιας εκπαίδευσης.", size: 20 })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `3. Την από ${formatGreekDate(leave.startDate)} αίτηση του/της εκπαιδευτικού ${teacher.lastName} ${teacher.firstName}.`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 250 },
            children: [new TextRun({ text: "4. Τα συνυποβαλλόμενα δικαιολογητικά στοιχεία.", size: 20 })],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: "Α Π Ο Φ Α Σ Ι Ζ Ο Υ Μ Ε", bold: true, size: 24 })],
          }),

          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `Χορηγούμε στον/στην εκπαιδευτικό ${teacher.lastName} ${teacher.firstName} του ${teacher.fatherName || ""}, κλάδου ${teacher.specialty} (${empLabel}), ${leave.daysCount} ημέρα/ες ${leaveName}, από ${formatGreekDate(leave.startDate)} έως και ${formatGreekDate(leave.endDate)}.`,
                size: 22,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({ text: "Κοινοποίηση:", bold: true, size: 20 }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `1. ${school.directorate || "Διεύθυνση Εκπαίδευσης"}`, size: 18 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. Ατομικός Φάκελος Εκπαιδευτικού", size: 18 })],
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: school.principalTitle || "Ο Διευθυντής του Σχολείου", bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 500 },
            children: [
              new TextRun({ text: school.principalName || "Ονοματεπώνυμο Διευθυντή", bold: true, size: 22 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Απόφαση_Άδειας_${teacher.lastName}_${formatGreekDate(leave.startDate).replace(/\//g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
