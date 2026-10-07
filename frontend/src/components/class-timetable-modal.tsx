"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClassEntity,
  TimetableData,
  TimetableSlot,
  Teacher,
  Subject,
} from "@/types";
import { getTeacherTileInlineStyle, getTeacherAbbr } from "@/lib/teacher-utils";
import { formatSpecialtyLabel } from "@/lib/specialties";
import {
  Printer,
  Download,
  CalendarDays,
  User,
  Users,
  Clock,
  Sparkles,
  Lock,
  Layers,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface ClassTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassEntity | null;
  data: TimetableData;
}

export const ClassTimetableModal: React.FC<ClassTimetableModalProps> = ({
  isOpen,
  onClose,
  classData,
  data,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Fast maps
  const teacherMap = useMemo(
    () => new Map<string, Teacher>(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  );
  const subjectMap = useMemo(
    () => new Map<string, Subject>(data.subjects.map((s) => [s.id, s])),
    [data.subjects]
  );

  // Filter slots for this class
  const classSlots = useMemo(() => {
    if (!classData) return [];
    return data.slots.filter((s) => s.classId === classData.id);
  }, [data.slots, classData]);

  // Check if class has all-day slots (periods 6..9)
  const hasAllDaySlots = useMemo(() => {
    return classSlots.some((s) => s.period >= 6);
  }, [classSlots]);

  // Toggle for showing all-day periods
  const [showAllDay, setShowAllDay] = useState<boolean>(() => {
    return Boolean(classData?.isAllDay || hasAllDaySlots);
  });

  // Re-sync when classData changes
  React.useEffect(() => {
    if (classData) {
      setShowAllDay(Boolean(classData.isAllDay || hasAllDaySlots));
    }
  }, [classData, hasAllDaySlots]);

  // Index slots by `day_period`
  const slotsByCell = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const slot of classSlots) {
      const key = `${slot.day}_${slot.period}`;
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [classSlots]);

  // Statistics: Subjects count
  const subjectStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slot of classSlots) {
      if (!slot.isSupport) {
        counts.set(slot.subjectId, (counts.get(slot.subjectId) || 0) + 1);
      }
    }
    const list: { subject: Subject; hours: number }[] = [];
    counts.forEach((hours, subjectId) => {
      const subj = subjectMap.get(subjectId);
      if (subj) list.push({ subject: subj, hours });
    });
    return list.sort((a, b) => b.hours - a.hours);
  }, [classSlots, subjectMap]);

  // Teachers assigned to this class
  const classTeachers = useMemo(() => {
    const teacherIds = new Set<string>();
    classSlots.forEach((s) => teacherIds.add(s.teacherId));
    return Array.from(teacherIds)
      .map((id) => teacherMap.get(id))
      .filter((t): t is Teacher => Boolean(t && t.id !== "tch-unassigned"));
  }, [classSlots, teacherMap]);

  if (!classData) return null;

  // Days definition (0 to 4)
  const days = [
    { index: 0, name: "Δευτέρα", short: "ΔΕΥ", headerBg: "bg-blue-50/80 text-blue-900 border-blue-200" },
    { index: 1, name: "Τρίτη", short: "ΤΡΙ", headerBg: "bg-emerald-50/80 text-emerald-900 border-emerald-200" },
    { index: 2, name: "Τετάρτη", short: "ΤΕΤ", headerBg: "bg-amber-50/80 text-amber-900 border-amber-200" },
    { index: 3, name: "Πέμπτη", short: "ΠΕΜ", headerBg: "bg-purple-50/80 text-purple-900 border-purple-200" },
    { index: 4, name: "Παρασκευή", short: "ΠΑΡ", headerBg: "bg-rose-50/80 text-rose-900 border-rose-200" },
  ];

  // Default times fallback
  const defaultMorningTimes = [
    { start: "08:15", end: "09:00" },
    { start: "09:05", end: "09:50" },
    { start: "10:05", end: "10:50" },
    { start: "10:55", end: "11:40" },
    { start: "11:55", end: "12:35" },
    { start: "12:40", end: "13:15" },
  ];
  const defaultAllDayTimes = [
    { start: "13:20", end: "14:00" },
    { start: "14:15", end: "15:00" },
    { start: "15:15", end: "16:00" },
    { start: "16:15", end: "17:00" },
  ];

  // Periods list based on toggle
  const morningPeriods = Array.from({ length: 6 }, (_, i) => {
    const configPeriod = data.schoolConfig?.periods?.find((p) => p.index === i);
    const start = configPeriod?.startTime || defaultMorningTimes[i]?.start || "";
    const end = configPeriod?.endTime || defaultMorningTimes[i]?.end || "";
    return {
      index: i,
      label: `${i + 1}η ώρα`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: false,
    };
  });

  const allDayPeriods = Array.from({ length: 4 }, (_, i) => {
    const periodIdx = 6 + i;
    const configPeriod = data.schoolConfig?.allDayPeriods?.find((p) => p.index === periodIdx);
    const start = configPeriod?.startTime || defaultAllDayTimes[i]?.start || "";
    const end = configPeriod?.endTime || defaultAllDayTimes[i]?.end || "";
    return {
      index: periodIdx,
      label: `${i + 1}η Ολοημ.`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: true,
    };
  });

  const activePeriods = showAllDay
    ? [...morningPeriods, ...allDayPeriods]
    : morningPeriods;

  // Head teacher
  const headTeacher = classData.headTeacherId
    ? teacherMap.get(classData.headTeacherId)
    : null;

  // Print Action
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1050,height=800");
    if (!printWindow) {
      toast.error("Αποτυχία ανοίγματος παραθύρου εκτύπωσης. Ελέγξτε τα pop-ups.");
      return;
    }

    const schoolName = data.schoolConfig?.schoolName || "Δημοτικό Σχολείο";
    const schoolYear = data.schoolConfig?.schoolYear || "2026-2027";

    let tableHtml = `
      <table class="timetable">
        <thead>
          <tr>
            <th class="time-col">Ώρα</th>
            ${days.map((d) => `<th>${d.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    for (const p of activePeriods) {
      tableHtml += `
        <tr class="${p.isAllDay ? "all-day-row" : ""}">
          <td class="time-cell">
            <div class="period-label">${p.label}</div>
            <div class="period-time">${p.timeRange}</div>
          </td>
      `;

      for (const d of days) {
        const slots = slotsByCell.get(`${d.index}_${p.index}`) || [];
        tableHtml += `<td class="slot-cell">`;
        if (slots.length > 0) {
          slots.forEach((s) => {
            const subj = subjectMap.get(s.subjectId);
            const tch = teacherMap.get(s.teacherId);
            const tchName = tch
              ? `${tch.lastName} ${tch.firstName ? tch.firstName[0] + "." : ""}`
              : "";
            tableHtml += `
              <div class="card ${s.isSupport ? "support" : ""}">
                <div class="subject-title">${subj?.title || subj?.code || "—"}</div>
                <div class="teacher-name">${tchName} ${tch?.specialty ? `(${tch.specialty})` : ""}</div>
              </div>
            `;
          });
        }
        tableHtml += `</td>`;
      }
      tableHtml += `</tr>`;
    }

    tableHtml += `
        </tbody>
      </table>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ωρολόγιο Πρόγραμμα - Τμήμα ${classData.name}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #18181b;
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #18181b;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #52525b;
              margin-top: 3px;
            }
            .meta {
              text-align: right;
              font-size: 12px;
              color: #52525b;
            }
            .timetable {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #d4d4d8;
              vertical-align: top;
            }
            th {
              background: #f4f4f5;
              padding: 6px 4px;
              font-size: 12px;
              font-weight: 700;
              text-align: center;
            }
            .time-col {
              width: 90px;
            }
            .time-cell {
              background: #fafafa;
              padding: 6px 4px;
              text-align: center;
            }
            .period-label {
              font-size: 11px;
              font-weight: 700;
              color: #27272a;
            }
            .period-time {
              font-size: 9px;
              color: #71717a;
              margin-top: 2px;
            }
            .all-day-row .time-cell {
              background: #fffbeb;
            }
            .slot-cell {
              padding: 4px;
              height: 48px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              padding: 4px 6px;
              margin-bottom: 2px;
              font-size: 11px;
            }
            .card.support {
              border-left: 3px solid #8b5cf6;
              background: #faf5ff;
            }
            .subject-title {
              font-weight: 700;
              color: #0f172a;
              line-height: 1.15;
            }
            .teacher-name {
              font-size: 9.5px;
              color: #475569;
              margin-top: 2px;
            }
            .footer {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #71717a;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${schoolName}</h1>
              <div class="subtitle">Εβδομαδιαίο Ωρολόγιο Πρόγραμμα • <strong>Τμήμα ${classData.name}</strong></div>
            </div>
            <div class="meta">
              <div>Σχολικό Έτος: ${schoolYear}</div>
              ${headTeacher ? `<div>Υπεύθυνος: ${headTeacher.lastName} ${headTeacher.firstName}</div>` : ""}
            </div>
          </div>

          ${tableHtml}

          <div class="footer">
            <span>Σύστημα metaSchool • Εκτυπώθηκε στις ${new Date().toLocaleDateString("el-GR")}</span>
            <span>Σελίδα 1 από 1</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CSV Export Action
  const handleExportCsv = () => {
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += `Ωρολόγιο Πρόγραμμα - Τμήμα ${classData.name}\n`;
    csv += `Ώρα;` + days.map((d) => d.name).join(";") + "\n";

    for (const p of activePeriods) {
      const row = [`"${p.label} (${p.timeRange})"`];
      for (const d of days) {
        const slots = slotsByCell.get(`${d.index}_${p.index}`) || [];
        if (slots.length === 0) {
          row.push('""');
        } else {
          const text = slots
            .map((s) => {
              const subj = subjectMap.get(s.subjectId);
              const tch = teacherMap.get(s.teacherId);
              return `${subj?.title || subj?.code || "—"} (${tch ? tch.lastName : ""})`;
            })
            .join(" / ");
          row.push(`"${text.replace(/"/g, '""')}"`);
        }
      }
      csv += row.join(";") + "\n";
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `programma_${classData.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Εξήχθη επιτυχώς το αρχείο CSV!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] h-[92vh] p-0 flex flex-col overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-xl z-[120]"
        showCloseButton={true}
      >
        {/* Header Bar */}
        <DialogHeader className="px-5 py-3 border-b border-border bg-muted/40 flex flex-row items-center justify-between flex-none gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ backgroundColor: classData.color || "#2563eb" }}
            >
              {classData.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground leading-tight">
                  Πρόγραμμα Τμήματος: {classData.name}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-border bg-background">
                  {classData.grade ? `Τάξη ${classData.grade}` : "Τμήμα"}
                </Badge>
                {classData.isAllDay && (
                  <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px]">
                    Ολοήμερο
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 font-sans">
                {headTeacher && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Υπεύθυνος: <strong className="text-foreground">{headTeacher.lastName} {headTeacher.firstName}</strong> ({formatSpecialtyLabel(headTeacher.specialty)})
                  </span>
                )}
                {classData.studentsCount && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {classData.studentsCount} Μαθητές
                  </span>
                )}
                {classData.room && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    Αίθουσα: {classData.room}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {classSlots.length} ώρες/εβδ.
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 pr-6">
            {/* Toggle All Day */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDay(!showAllDay)}
              className={`h-7 px-2.5 text-[11px] font-sans ${
                showAllDay
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
              {showAllDay ? "Απόκρυψη Ολοημέρου" : "Προβολή Ολοημέρου"}
            </Button>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 px-2.5 text-[11px] font-sans bg-background border-border text-foreground hover:bg-muted"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              Εκτύπωση (A4)
            </Button>

            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-7 px-2.5 text-[11px] font-sans bg-background border-border text-foreground hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              CSV
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body: Timetable Grid */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30" ref={printAreaRef}>
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden min-w-[700px]">
            <table className="w-full border-collapse text-left font-sans">
              <thead>
                <tr className="border-b border-border">
                  {/* Left Corner header */}
                  <th className="w-24 p-2.5 bg-muted/60 border-r border-border text-[11px] font-bold text-foreground text-center">
                    ΩΡΑ
                  </th>
                  {/* 5 Day Headers */}
                  {days.map((day) => (
                    <th
                      key={day.index}
                      className={`p-2.5 border-r border-border text-center bg-muted/50 text-foreground last:border-r-0`}
                    >
                      <div className="text-xs font-bold tracking-wide uppercase">
                        {day.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {activePeriods.map((period) => (
                  <tr
                    key={period.index}
                    className={`hover:bg-muted/40 transition-colors ${
                      period.isAllDay ? "bg-amber-50/20 dark:bg-amber-950/20" : ""
                    }`}
                  >
                    {/* Period Row Label (Left Axis) */}
                    <td
                      className={`p-2 border-r border-border text-center select-none ${
                        period.isAllDay
                          ? "bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-r-amber-200 dark:border-r-amber-800"
                          : "bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="font-bold text-[11px] font-mono leading-tight">
                        {period.label}
                      </div>
                      {period.timeRange && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {period.timeRange}
                        </div>
                      )}
                    </td>

                    {/* 5 Day Cells */}
                    {days.map((day) => {
                      const cellKey = `${day.index}_${period.index}`;
                      const slots = slotsByCell.get(cellKey) || [];

                      return (
                        <td
                          key={cellKey}
                          className="p-1.5 border-r border-border last:border-r-0 align-top h-16 min-h-[64px]"
                        >
                          {slots.length === 0 ? (
                            <div className="h-full w-full min-h-[48px] rounded border border-dashed border-border/80 flex items-center justify-center text-[10px] text-muted-foreground font-mono select-none">
                              —
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 h-full">
                              {slots.map((slot) => {
                                const subject = subjectMap.get(slot.subjectId);
                                const teacher = teacherMap.get(slot.teacherId);
                                const isUnassigned =
                                  !teacher || teacher.id === "tch-unassigned";

                                // Subtle subject border/background tint
                                const subjColor = subject?.color || "#6366f1";

                                return (
                                  <div
                                    key={slot.id}
                                    className={`relative flex flex-col justify-between p-2 rounded-md border border-border text-left shadow-2xs transition-all ${
                                      slot.isSupport
                                        ? "bg-purple-50/80 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800"
                                        : "bg-card hover:border-foreground/30"
                                    }`}
                                    style={{
                                      borderLeftWidth: "4px",
                                      borderLeftColor: subjColor,
                                    }}
                                  >
                                    {/* Top Row: Subject Title */}
                                    <div className="flex items-start justify-between gap-1">
                                      <span
                                        className="font-bold text-xs text-foreground leading-tight truncate"
                                        title={subject?.title || subject?.code}
                                      >
                                        {subject?.title || subject?.code || "Άγνωστο"}
                                      </span>

                                      {/* Indicator icons */}
                                      <div className="flex items-center gap-1 flex-none">
                                        {slot.isLocked && (
                                          <span title="Κλειδωμένη ώρα">
                                            <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                          </span>
                                        )}
                                        {slot.isSupport && (
                                          <Badge className="h-3.5 px-1 text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 font-mono">
                                            Παράλληλη
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Bottom Row: Teacher badge */}
                                    <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {teacher && !isUnassigned ? (
                                          <>
                                            <span
                                              className="px-1 py-0.2 rounded text-[9.5px] font-bold font-mono border flex-none"
                                              style={getTeacherTileInlineStyle(teacher)}
                                              title={`${teacher.lastName} ${teacher.firstName} (${formatSpecialtyLabel(teacher.specialty)})`}
                                            >
                                              {getTeacherAbbr(teacher)}
                                            </span>
                                            <span
                                              className="truncate text-muted-foreground font-medium text-[10.5px]"
                                              title={`${teacher.lastName} ${teacher.firstName}`}
                                            >
                                              {teacher.lastName} {teacher.firstName ? teacher.firstName[0] + "." : ""}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-amber-600 dark:text-amber-400 italic text-[10px]">
                                            Χωρίς Ανάθεση
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Statistics & Teachers summary */}
        <div className="px-5 py-2.5 border-t border-border bg-card flex-none flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 overflow-x-auto max-w-[70%] py-0.5">
            <span className="font-semibold text-foreground text-[11px] flex-none">
              Μαθήματα ({subjectStats.length}):
            </span>
            {subjectStats.map(({ subject, hours }) => (
              <span
                key={subject.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 border border-border text-[10px] text-foreground flex-none font-medium"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: subject.color || "#6366f1" }}
                />
                {subject.title || subject.code}: <strong>{hours}ω</strong>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-none font-mono text-[11px]">
            <span className="text-muted-foreground">
              Διδάσκοντες: <strong>{classTeachers.length}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-6 px-3 text-[11px] font-sans"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
