import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  VerticalAlign,
  PageOrientation,
  ShadingType,
  BorderStyle,
} from "docx";
import { ClassEntity, Teacher, Subject, TimetableSlot } from "@/types";

interface ExportDocxParams {
  classData: ClassEntity;
  headTeacher?: Teacher | null;
  activePeriods: { index: number; label: string }[];
  days: { index: number; name: string }[];
  slotsByCell: Map<string, TimetableSlot[]>;
  teacherMap: Map<string, Teacher>;
  subjects: Subject[];
}

export async function exportClassTimetableToDocx({
  classData,
  headTeacher,
  activePeriods,
  days,
  slotsByCell,
  teacherMap,
  subjects,
}: ExportDocxParams): Promise<void> {
  // Determine class heading
  let heading = classData.name;
  if (headTeacher && classData.name.toUpperCase().includes(headTeacher.lastName.toUpperCase())) {
    heading = `Τμήμα ${headTeacher.lastName}`;
  } else if (!classData.name.toLowerCase().startsWith("τμημα")) {
    heading = `Τμήμα ${classData.name}`;
  }

  // Border style for table cells
  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "CBD5E1",
  };

  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };

  // Header Row (ΩΡΑ + 5 days)
  const headerCells: TableCell[] = [
    new TableCell({
      width: { size: 10, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "ΩΡΑ",
              bold: true,
              size: 20, // 10pt
              font: "Calibri",
              color: "0F172A",
            }),
          ],
        }),
      ],
    }),
    ...days.map(
      (day) =>
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 120, bottom: 120, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: day.name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toUpperCase(),
                  bold: true,
                  size: 20, // 10pt
                  font: "Calibri",
                  color: "0F172A",
                }),
              ],
            }),
          ],
        })
    ),
  ];

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headerCells,
    }),
  ];

  // Data rows (one for each period)
  for (const period of activePeriods) {
    const rowCells: TableCell[] = [
      // Column 0: Time period (e.g. 1η, 2η)
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${period.index + 1}η`,
                bold: true,
                size: 22, // 11pt
                font: "Calibri",
                color: "0F172A",
              }),
            ],
          }),
        ],
      }),
    ];

    // Columns 1-5: The 5 days
    for (const day of days) {
      const cellKey = `${day.index}_${period.index}`;
      const slots = slotsByCell.get(cellKey) || [];

      const cellParagraphs: Paragraph[] = [];

      if (slots.length === 0) {
        cellParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "—",
                size: 18,
                color: "94A3B8",
                font: "Calibri",
              }),
            ],
          })
        );
      } else {
        slots.forEach((slot, slotIndex) => {
          const tch = teacherMap.get(slot.teacherId);
          const tchName = tch
            ? `${tch.lastName} ${tch.firstName ? tch.firstName[0] + "." : ""}`
            : "Χωρίς Ανάθεση";

          cellParagraphs.push(
            new Paragraph({
              spacing: { before: slotIndex > 0 ? 80 : 0, after: 20 },
              children: [
                new TextRun({
                  text: tchName,
                  bold: true,
                  size: 20, // 10pt
                  font: "Calibri",
                  color: "0F172A",
                }),
              ],
            })
          );

          if (slot.students && slot.students.length > 0) {
            cellParagraphs.push(
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: `👥 ${slot.students.join(", ")}`,
                    size: 15, // 7.5pt
                    font: "Calibri",
                    color: "6B21A8",
                  }),
                ],
              })
            );
          }
        });
      }

      rowCells.push(
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: cellParagraphs,
        })
      );
    }

    tableRows.push(
      new TableRow({
        children: rowCells,
      })
    );
  }

  // Create Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch margins
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: heading,
                bold: true,
                size: 36, // 18pt
                font: "Calibri",
                color: "0F172A",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  // Pack and download as .docx
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanHeading = heading.replace(/\s+/g, "_");
  link.download = `programma_${cleanHeading}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExportTeacherDocxParams {
  teacher: Teacher;
  activePeriods: { index: number; label: string }[];
  days: { index: number; name: string }[];
  slotsByCell: Map<string, TimetableSlot[]>;
  coTeachersByCell?: Map<string, Teacher[]>;
  dayScheduleStats?: Map<number, { teachingPeriods: number[]; minPeriod: number; maxPeriod: number; gaps: number[] }>;
  classMap: Map<string, ClassEntity>;
  subjectMap: Map<string, Subject>;
}

export async function exportTeacherTimetableToDocx({
  teacher,
  activePeriods,
  days,
  slotsByCell,
  coTeachersByCell,
  dayScheduleStats,
  classMap,
  subjectMap,
}: ExportTeacherDocxParams): Promise<void> {
  const heading = `Πρόγραμμα: ${teacher.lastName} ${teacher.firstName} (${teacher.specialty})`;

  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "CBD5E1",
  };

  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };

  const GREEK_DAYS_UPPER_UNACCENTED = [
    "ΔΕΥΤΕΡΑ",
    "ΤΡΙΤΗ",
    "ΤΕΤΑΡΤΗ",
    "ΠΕΜΠΤΗ",
    "ΠΑΡΑΣΚΕΥΗ",
  ];

  const headerCells = [
    new TableCell({
      width: { size: 10, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 60, right: 60 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "ΩΡΑ",
              bold: true,
              size: 18,
              font: "Calibri",
              color: "0F172A",
            }),
          ],
        }),
      ],
    }),
    ...days.map((day, idx) => {
      const dayLabel = GREEK_DAYS_UPPER_UNACCENTED[day.index] || day.name.toUpperCase();
      return new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: dayLabel,
                bold: true,
                size: 18,
                font: "Calibri",
                color: "0F172A",
              }),
            ],
          }),
        ],
      });
    }),
  ];

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headerCells,
    }),
  ];

  for (const p of activePeriods) {
    const rowCells: TableCell[] = [];

    rowCells.push(
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: p.label,
                bold: true,
                size: 20,
                font: "Calibri",
                color: "0F172A",
              }),
            ],
          }),
        ],
      })
    );

    for (const d of days) {
      const cellKey = `${d.index}_${p.index}`;
      const slots = slotsByCell.get(cellKey) || [];
      const dayStat = dayScheduleStats?.get(d.index);
      const isGap = dayStat && dayStat.gaps.includes(p.index);
      const isOff = slots.length === 0 && !isGap;

      const cellParagraphs: Paragraph[] = [];

      if (slots.length === 0) {
        if (isGap) {
          cellParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: "Κενό",
                  italics: true,
                  size: 16,
                  font: "Calibri",
                  color: "D97706",
                }),
              ],
            })
          );
        } else {
          // Empty off hours: gray cell, no text
          cellParagraphs.push(
            new Paragraph({
              spacing: { before: 20, after: 20 },
              children: [],
            })
          );
        }
      } else {
        slots.forEach((s, sIdx) => {
          const cls = classMap.get(s.classId);
          const rawName = cls?.name || "Τμήμα";
          const clsTitle = rawName.toLowerCase().startsWith("τμημα") ? rawName : `Τμήμα ${rawName}`;

          const cardRuns: TextRun[] = [
            new TextRun({
              text: clsTitle,
              bold: true,
              size: 20,
              font: "Calibri",
              color: "0F172A",
            }),
          ];

          cellParagraphs.push(
            new Paragraph({
              spacing: { before: sIdx > 0 ? 60 : 0, after: 20 },
              children: cardRuns,
            })
          );

          if (s.students && s.students.length > 0) {
            cellParagraphs.push(
              new Paragraph({
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({
                    text: `👥 ${s.students.join(", ")}`,
                    size: 15,
                    font: "Calibri",
                    color: "6B21A8",
                  }),
                ],
              })
            );
          }
        });
      }

      rowCells.push(
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: isGap
            ? { type: ShadingType.CLEAR, fill: "FEF3C7" }
            : isOff
            ? { type: ShadingType.CLEAR, fill: "F8FAFC" }
            : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [] })],
        })
      );
    }

    tableRows.push(
      new TableRow({
        children: rowCells,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: heading,
                bold: true,
                size: 36,
                font: "Calibri",
                color: "0F172A",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanTeacher = `${teacher.lastName}_${teacher.firstName}`.replace(/[\\/?%*:|"<>]/g, "").replace(/\s+/g, "_");
  link.download = `programma_${cleanTeacher}.docx`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}
