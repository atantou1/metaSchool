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
  PeriodConfig,
} from "@/types";
import { getTeacherTileInlineStyle, getTeacherAbbr } from "@/lib/teacher-utils";
import { formatSpecialtyLabel } from "@/lib/specialties";
import { resolveTeacherSubjectBadge } from "@/lib/subject-utils";
import {
  Printer,
  FileText,
  CalendarDays,
  User,
  Users,
  Clock,
  Sparkles,
  Lock,
  Layers,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
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
  const [isExportingWord, setIsExportingWord] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Selected class state to allow in-modal switching
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    () => classData?.id || null
  );
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (classData?.id) {
      setSelectedClassId(classData.id);
    }
  }, [classData?.id]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };
    if (isClassDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isClassDropdownOpen]);

  // Active current class
  const currentClass = useMemo(() => {
    if (!selectedClassId) return classData;
    return data.classes.find((c) => c.id === selectedClassId) || classData;
  }, [data.classes, selectedClassId, classData]);

  // Sorted list of classes for selector navigation
  const sortedClasses = useMemo(() => {
    return [...data.classes].sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      return a.name.localeCompare(b.name, "el");
    });
  }, [data.classes]);

  const currentClassIndex = useMemo(() => {
    if (!currentClass) return -1;
    return sortedClasses.findIndex((c) => c.id === currentClass.id);
  }, [sortedClasses, currentClass]);

  const handlePrevClass = () => {
    if (currentClassIndex > 0) {
      setSelectedClassId(sortedClasses[currentClassIndex - 1].id);
    }
  };

  const handleNextClass = () => {
    if (currentClassIndex >= 0 && currentClassIndex < sortedClasses.length - 1) {
      setSelectedClassId(sortedClasses[currentClassIndex + 1].id);
    }
  };

  // Fast maps
  const teacherMap = useMemo(
    () => new Map<string, Teacher>(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  );
  const subjectMap = useMemo(
    () => new Map<string, Subject>(data.subjects.map((s) => [s.id, s])),
    [data.subjects]
  );

  // Filter slots for active class
  const classSlots = useMemo(() => {
    if (!currentClass) return [];
    return data.slots.filter((s) => s.classId === currentClass.id);
  }, [data.slots, currentClass]);

  // Check if class has all-day slots (periods 6..9)
  const hasAllDaySlots = useMemo(() => {
    return classSlots.some((s) => s.period >= 6);
  }, [classSlots]);

  // Toggle for showing all-day periods
  const [showAllDay, setShowAllDay] = useState<boolean>(() => {
    return Boolean(currentClass?.isAllDay || hasAllDaySlots);
  });

  // Re-sync when currentClass changes
  React.useEffect(() => {
    if (currentClass) {
      setShowAllDay(Boolean(currentClass.isAllDay || hasAllDaySlots));
    }
  }, [currentClass, hasAllDaySlots]);

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

  if (!currentClass) return null;

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

  const morningList: PeriodConfig[] = data.schoolConfig?.periods && data.schoolConfig.periods.length > 0
    ? data.schoolConfig.periods
    : defaultMorningTimes.map((t, i) => ({
        index: i,
        label: `${i + 1}η ώρα`,
        startTime: t.start,
        endTime: t.end,
        isAllDay: false,
      }));

  const hasAllDay = Boolean(
    data.schoolConfig?.hasAllDay !== undefined
      ? data.schoolConfig.hasAllDay
      : data.schoolConfig?.allDayPeriods && data.schoolConfig.allDayPeriods.length > 0
  );

  const allDayList: PeriodConfig[] = hasAllDay
    ? (data.schoolConfig?.allDayPeriods && data.schoolConfig.allDayPeriods.length > 0
        ? data.schoolConfig.allDayPeriods
        : defaultAllDayTimes.map((t, i) => ({
            index: 6 + i,
            label: `${i + 1}η Ολοημ.`,
            startTime: t.start,
            endTime: t.end,
            isAllDay: true,
          })))
    : [];

  const morningPeriods = morningList.map((p, i) => {
    const idx = p.index !== undefined ? p.index : i;
    const start = p.startTime || "";
    const end = p.endTime || "";
    return {
      index: idx,
      label: p.label || `${i + 1}η ώρα`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: false,
    };
  });

  const allDayPeriods = allDayList.map((p, i) => {
    const idx = p.index !== undefined ? p.index : 6 + i;
    const start = p.startTime || "";
    const end = p.endTime || "";
    return {
      index: idx,
      label: p.label || `${i + 1}η Ολοημ.`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: true,
    };
  });

  // Always show only morning periods — ολοήμερο is a separate class entity
  const activePeriods = morningPeriods;

  // Head teacher
  const headTeacher = currentClass.headTeacherId
    ? teacherMap.get(currentClass.headTeacherId)
    : null;

  // Print Action
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1050,height=800");
    if (!printWindow) {
      toast.error("Αποτυχία ανοίγματος παραθύρου εκτύπωσης. Ελέγξτε τα pop-ups.");
      return;
    }

    let heading = currentClass.name;
    if (headTeacher && currentClass.name.toUpperCase().includes(headTeacher.lastName.toUpperCase())) {
      heading = `Τμήμα ${headTeacher.lastName}`;
    } else if (!currentClass.name.toLowerCase().startsWith("τμημα")) {
      heading = `Τμήμα ${currentClass.name}`;
    }

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
            <div class="period-label">${p.index + 1}η</div>
          </td>
      `;

      for (const d of days) {
        const slots = slotsByCell.get(`${d.index}_${p.index}`) || [];
        tableHtml += `<td class="slot-cell">`;
        if (slots.length > 0) {
          slots.forEach((s) => {
            const tch = teacherMap.get(s.teacherId);
            const tchName = tch
              ? `${tch.lastName} ${tch.firstName ? tch.firstName[0] + "." : ""}`
              : "Χωρίς Ανάθεση";
            const badge = resolveTeacherSubjectBadge(
              tch,
              data.subjects,
              currentClass.id,
              s.subjectId
            );
            const studentText =
              s.students && s.students.length > 0
                ? `<div class="students">👥 ${s.students.join(", ")}</div>`
                : "";
            tableHtml += `
              <div class="card">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                  <div class="teacher-name" style="font-weight: 700;">${tchName}</div>
                  ${badge ? `<span style="background-color: ${badge.color}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; font-family: monospace;">${badge.code}</span>` : ""}
                </div>
                ${studentText}
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
          <title></title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #18181b;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 6mm 8mm;
            }
            @media print {
              html, body {
                padding: 6mm 8mm;
                overflow: hidden;
              }
            }
            .header {
              border-bottom: 2px solid #18181b;
              padding-bottom: 4px;
              margin-bottom: 6px;
              text-align: center;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              margin: 0;
              color: #18181b;
              letter-spacing: -0.01em;
            }
            .timetable {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th, td {
              border: 1px solid #cbd5e1;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              padding: 4px 2px;
              font-size: 11px;
              font-weight: 700;
              text-align: center;
            }
            .time-col {
              width: 36px;
            }
            .time-cell {
              background: #f8fafc;
              padding: 2px;
              text-align: center;
              vertical-align: middle;
            }
            .period-label {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }
            .all-day-row .time-cell {
              background: #fffbeb;
            }
            .slot-cell {
              padding: 2px 3px;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .card {
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              padding: 2px 4px;
              margin-bottom: 2px;
              font-size: 10px;
              line-height: 1.2;
            }
            .card:last-child {
              margin-bottom: 0;
            }
            .teacher-name {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
            }
            .students {
              font-size: 7.5pt;
              color: #6b21a8;
              margin-top: 2px;
              font-weight: 500;
              line-height: 1.15;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${heading}</h1>
          </div>

          ${tableHtml}

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

  // Export Word (.docx) Action
  const handleExportWord = async () => {
    if (!currentClass) return;
    try {
      setIsExportingWord(true);
      const { exportClassTimetableToDocx } = await import("@/lib/docx-export");
      await exportClassTimetableToDocx({
        classData: currentClass,
        headTeacher,
        activePeriods,
        days,
        slotsByCell,
        teacherMap,
        subjects: data.subjects,
      });
      toast.success("Το αρχείο Word (.docx) δημιουργήθηκε επιτυχώς!");
    } catch (err: any) {
      console.error("Error exporting Word document:", err);
      toast.error("Σφάλμα εξαγωγής Word", { description: err.message });
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 flex flex-col overflow-hidden bg-card text-card-foreground border-0 shadow-none rounded-none z-[120] !translate-x-0 !translate-y-0 !top-0 !left-0"
        showCloseButton={true}
      >
        {/* Header Bar */}
        <DialogHeader className="px-4 py-2 border-b border-border bg-muted/40 flex flex-row items-center justify-between flex-none gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0"
              style={{ backgroundColor: currentClass.color || "#2563eb" }}
            >
              {currentClass.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-base font-bold text-foreground leading-tight flex items-center gap-1.5">
                  <span>Πρόγραμμα Τμήματος:</span>
                  <div className="relative inline-flex items-center" ref={classDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsClassDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-muted/70 focus:outline-none"
                      title="Κλικ για επιλογή άλλου τμήματος"
                    >
                      <span>{currentClass.name}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                          isClassDropdownOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>

                    {isClassDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 max-h-72 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl z-[150] p-1 font-sans">
                        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
                          Επιλογή Τμήματος
                        </div>
                        {sortedClasses.map((cls) => {
                          const isSelected = cls.id === currentClass.id;
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                setSelectedClassId(cls.id);
                                setIsClassDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-muted font-bold text-primary"
                                  : "hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cls.color || "#2563eb" }}
                                />
                                <span className="truncate">{cls.name}</span>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogTitle>

                <div className="flex items-center gap-0.5 ml-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevClass}
                    disabled={currentClassIndex <= 0}
                    title="Προηγούμενο τμήμα"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextClass}
                    disabled={currentClassIndex < 0 || currentClassIndex >= sortedClasses.length - 1}
                    title="Επόμενο τμήμα"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {currentClass.isAllDay && (
                  <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] ml-1">
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
                {currentClass.studentsCount && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {currentClass.studentsCount} Μαθητές
                  </span>
                )}
                {currentClass.room && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    Αίθουσα: {currentClass.room}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 pr-6">
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

            {/* Export Word (.docx) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportWord}
              disabled={isExportingWord}
              className="h-7 px-2.5 text-[11px] font-sans bg-background border-border text-foreground hover:bg-muted cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
              {isExportingWord ? "Εξαγωγή..." : "Word (.docx)"}
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body: Timetable Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-3 bg-muted/30" ref={printAreaRef}>
          <div className="bg-card rounded-lg border border-border shadow-xs min-w-[700px] mb-2">
            <table className="w-full border-collapse text-left font-sans table-fixed">
              <thead>
                <tr className="border-b border-border">
                  {/* Left Corner header */}
                  <th className="w-20 py-2 px-2 bg-muted/60 border-r border-border text-[11px] font-bold text-foreground text-center">
                    ΩΡΑ
                  </th>
                  {/* 5 Day Headers */}
                  {days.map((day) => (
                    <th
                      key={day.index}
                      className="py-2 px-2 border-r border-border text-center bg-muted/50 text-foreground last:border-r-0"
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
                      className={`p-1 border-r border-border text-center select-none ${
                        period.isAllDay
                          ? "bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-r-amber-200 dark:border-r-amber-800"
                          : "bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="font-bold text-[11px] font-mono leading-tight">
                        {period.label}
                      </div>
                      {period.timeRange && (
                        <div className="text-[9.5px] text-muted-foreground font-mono mt-0.5">
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
                          className="p-1 border-r border-border last:border-r-0 align-top h-auto"
                        >
                          {slots.length === 0 ? (
                            <div className="h-full w-full min-h-[32px] rounded border border-dashed border-border/60 flex items-center justify-center text-[10px] text-muted-foreground font-mono select-none">
                              —
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 h-full justify-start">
                              {slots.map((slot) => {
                                const teacher = teacherMap.get(slot.teacherId);
                                const isUnassigned =
                                  !teacher || teacher.id === "tch-unassigned";
                                const badge = resolveTeacherSubjectBadge(
                                  teacher,
                                  data.subjects,
                                  currentClass.id,
                                  slot.subjectId
                                );

                                // Border color: subject badge color for specialists, subtle blue for primary/general
                                const subjColor = badge ? badge.color : "#3b82f6";

                                return (
                                  <div
                                    key={slot.id}
                                    className="relative flex flex-col gap-0.5 px-1.5 py-1 rounded border border-border bg-card hover:border-foreground/30 text-left shadow-2xs transition-all"
                                    style={{
                                      borderLeftWidth: "3px",
                                      borderLeftColor: subjColor,
                                    }}
                                  >
                                    {/* Top Row: Lock icon only (if locked) */}
                                    {slot.isLocked && (
                                      <div className="flex justify-end">
                                        <span title="Κλειδωμένη ώρα">
                                          <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                        </span>
                                      </div>
                                    )}

                                    {/* Teacher name + Subject code box (if not ΠΕ70/ΠΕ71) */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {teacher && !isUnassigned ? (
                                        <>
                                          <span
                                            className="truncate text-foreground font-bold text-[12px]"
                                            title={`${teacher.lastName} ${teacher.firstName}`}
                                          >
                                            {teacher.lastName} {teacher.firstName ? teacher.firstName[0] + "." : ""}
                                          </span>
                                          {badge && (
                                            <span
                                              className="flex-none px-1.5 py-0.5 rounded text-[9px] font-bold font-mono leading-none text-white shadow-2xs"
                                              style={{ backgroundColor: badge.color }}
                                              title={badge.title}
                                            >
                                              {badge.code}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-amber-600 dark:text-amber-400 italic text-[10px]">
                                          Χωρίς Ανάθεση
                                        </span>
                                      )}
                                    </div>

                                    {/* Students: icon + names only, no label */}
                                    {slot.students && slot.students.length > 0 && (
                                      <div className="pt-0.5 border-t border-purple-100 dark:border-purple-900 flex items-center gap-1 text-[8.5px] text-purple-900 dark:text-purple-200 bg-purple-100/70 dark:bg-purple-900/50 px-1 py-0.5 rounded font-normal">
                                        <Users className="w-2.5 h-2.5 text-purple-700 dark:text-purple-300 flex-none" />
                                        <span className="truncate" title={slot.students.join(", ")}>
                                          {slot.students.join(", ")}
                                        </span>
                                      </div>
                                    )}
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
        <div className="px-4 py-1.5 border-t border-border bg-card flex-none flex items-center justify-between text-xs text-muted-foreground">
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
