"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
import {
  Printer,
  FileText,
  Users,
  Clock,
  Lock,
  Coffee,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface TeacherTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeacher: Teacher | null;
  data: TimetableData;
}

export const TeacherTimetableModal: React.FC<TeacherTimetableModalProps> = ({
  isOpen,
  onClose,
  initialTeacher,
  data,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExportingWord, setIsExportingWord] = useState(false);

  // Selected teacher state (allows switching from dropdown inside the modal)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacher?.id || ""
  );
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  // Sync when initialTeacher prop changes
  useEffect(() => {
    if (initialTeacher?.id) {
      setSelectedTeacherId(initialTeacher.id);
    }
  }, [initialTeacher?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(e.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    if (isTeacherDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTeacherDropdownOpen]);

  // Fast maps
  const teacherMap = useMemo(
    () => new Map<string, Teacher>(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  );
  const subjectMap = useMemo(
    () => new Map<string, Subject>(data.subjects.map((s) => [s.id, s])),
    [data.subjects]
  );
  const classMap = useMemo(
    () => new Map<string, ClassEntity>(data.classes.map((c) => [c.id, c])),
    [data.classes]
  );

  // Current active teacher
  const currentTeacher = useMemo(() => {
    return teacherMap.get(selectedTeacherId) || initialTeacher;
  }, [teacherMap, selectedTeacherId, initialTeacher]);

  // Slots for current teacher
  const teacherSlots = useMemo(() => {
    if (!currentTeacher) return [];
    return data.slots.filter((s) => s.teacherId === currentTeacher.id);
  }, [data.slots, currentTeacher]);

  // Total distinct teaching hours (simultaneous slots in different classes count as 1 hour)
  const totalTeachingHours = useMemo(() => {
    return new Set(teacherSlots.map((s) => `${s.day}_${s.period}`)).size;
  }, [teacherSlots]);

  // Check if teacher has all-day slots (periods 6..9)
  const hasAllDaySlots = useMemo(() => {
    return teacherSlots.some((s) => s.period >= 6);
  }, [teacherSlots]);

  // Automatically include all-day if teacher is marked as all-day or has all-day slots
  const isTeacherAllDay = Boolean(currentTeacher?.isAllDay || hasAllDaySlots);

  // Index teacher slots by `day_period`
  const slotsByCell = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const slot of teacherSlots) {
      const key = `${slot.day}_${slot.period}`;
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [teacherSlots]);

  // Index co-teachers by `classId_day_period`
  const coTeachersByCell = useMemo(() => {
    if (!currentTeacher) return new Map<string, Teacher[]>();
    const map = new Map<string, Teacher[]>();

    for (const slot of teacherSlots) {
      const otherSlots = data.slots.filter(
        (s) =>
          s.classId === slot.classId &&
          s.day === slot.day &&
          s.period === slot.period &&
          s.teacherId !== currentTeacher.id
      );
      if (otherSlots.length > 0) {
        const others = otherSlots
          .map((s) => teacherMap.get(s.teacherId))
          .filter((t): t is Teacher => Boolean(t && t.id !== "tch-unassigned"));
        if (others.length > 0) {
          map.set(`${slot.day}_${slot.period}`, others);
        }
      }
    }
    return map;
  }, [data.slots, teacherSlots, currentTeacher, teacherMap]);

  // Calculate teaching range and gaps per day
  const dayScheduleStats = useMemo(() => {
    const stats = new Map<
      number,
      {
        teachingPeriods: number[];
        minPeriod: number;
        maxPeriod: number;
        gaps: number[];
      }
    >();

    for (let day = 0; day < 5; day++) {
      const daySlots = teacherSlots.filter((s) => s.day === day);
      const periods = Array.from(new Set(daySlots.map((s) => s.period))).sort((a, b) => a - b);
      if (periods.length > 0) {
        const minPeriod = periods[0];
        const maxPeriod = periods[periods.length - 1];
        const gaps: number[] = [];
        for (let p = minPeriod + 1; p < maxPeriod; p++) {
          if (!periods.includes(p)) {
            gaps.push(p);
          }
        }
        stats.set(day, {
          teachingPeriods: periods,
          minPeriod,
          maxPeriod,
          gaps,
        });
      } else {
        stats.set(day, {
          teachingPeriods: [],
          minPeriod: -1,
          maxPeriod: -1,
          gaps: [],
        });
      }
    }
    return stats;
  }, [teacherSlots]);

  // Total gaps count
  const totalGapsCount = useMemo(() => {
    let count = 0;
    dayScheduleStats.forEach((val) => {
      count += val.gaps.length;
    });
    return count;
  }, [dayScheduleStats]);

  // Classes taught count
  const uniqueClassesTaught = useMemo(() => {
    const ids = new Set<string>();
    teacherSlots.forEach((s) => ids.add(s.classId));
    return Array.from(ids)
      .map((id) => classMap.get(id))
      .filter((c): c is ClassEntity => Boolean(c));
  }, [teacherSlots, classMap]);

  // Subjects taught summary (counts distinct periods per subject)
  const subjectStats = useMemo(() => {
    const subjectSlots = new Map<string, Set<string>>();
    for (const slot of teacherSlots) {
      const set = subjectSlots.get(slot.subjectId) || new Set<string>();
      set.add(`${slot.day}_${slot.period}`);
      subjectSlots.set(slot.subjectId, set);
    }
    const list: { subject: Subject; hours: number }[] = [];
    subjectSlots.forEach((slotSet, subjectId) => {
      const subj = subjectMap.get(subjectId);
      if (subj) list.push({ subject: subj, hours: slotSet.size });
    });
    return list.sort((a, b) => b.hours - a.hours);
  }, [teacherSlots, subjectMap]);

  // Sorted teachers list for dropdown selector
  const availableTeachers = useMemo(() => {
    return data.teachers
      .filter((t) => t.id !== "tch-unassigned")
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "el"));
  }, [data.teachers]);

  if (!currentTeacher) return null;

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
        label: `${i + 1}η`,
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
            label: `${i + 1}η`,
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
      label: `${i + 1}η`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: false,
    };
  });

  // All-day periods continue after 6th period as 1η, 2η, etc.
  const allDayPeriods = allDayList.map((p, i) => {
    const idx = p.index !== undefined ? p.index : 6 + i;
    const start = p.startTime || "";
    const end = p.endTime || "";
    return {
      index: idx,
      label: `${i + 1}η`,
      timeRange: start && end ? `${start} - ${end}` : "",
      isAllDay: true,
    };
  });

  // Automatically show all-day periods when teacher teaches all-day
  const activePeriods = isTeacherAllDay && hasAllDay && allDayPeriods.length > 0
    ? [...morningPeriods, ...allDayPeriods]
    : morningPeriods;

  // Print Action
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1050,height=800");
    if (!printWindow) {
      toast.error("Αποτυχία ανοίγματος παραθύρου εκτύπωσης. Ελέγξτε τα pop-ups.");
      return;
    }

    const heading = `Πρόγραμμα: ${currentTeacher.lastName} ${currentTeacher.firstName} (${formatSpecialtyLabel(currentTeacher.specialty)})`;

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
            ${p.isAllDay ? `<div class="allday-tag">Ολοημ.</div>` : ""}
          </td>
      `;

      for (const d of days) {
        const cellKey = `${d.index}_${p.index}`;
        const slots = slotsByCell.get(cellKey) || [];
        const dayStat = dayScheduleStats.get(d.index);

        if (slots.length > 0) {
          tableHtml += `<td class="slot-cell">`;
          slots.forEach((s) => {
            const cls = classMap.get(s.classId);
            const rawName = cls?.name || "Τμήμα";
            const classDisplayName = rawName.toLowerCase().startsWith("τμημα")
              ? rawName
              : `Τμήμα ${rawName}`;

            const studentText =
              s.students && s.students.length > 0
                ? `<div class="students">👥 ${s.students.join(", ")}</div>`
                : "";

            tableHtml += `
              <div class="card">
                <div class="class-title"><strong>${classDisplayName}</strong></div>
                ${studentText}
              </div>
            `;
          });
          tableHtml += `</td>`;
        } else if (dayStat && dayStat.gaps.includes(p.index)) {
          tableHtml += `<td class="gap-cell">ΚΕΝΟ</td>`;
        } else {
          // Off-hour empty cell: entire cell is gray
          tableHtml += `<td class="off-cell"></td>`;
        }
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
              width: 44px;
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
            .allday-tag {
              font-size: 8px;
              color: #b45309;
              font-weight: 600;
              margin-top: 1px;
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
              padding: 3px 4px;
              margin-bottom: 2px;
              font-size: 10px;
              line-height: 1.2;
            }
            .card:last-child {
              margin-bottom: 0;
            }
            .class-title {
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
            .gap-cell {
              background: #fef3c7;
              color: #b45309;
              font-weight: 700;
              font-size: 10px;
              text-align: center;
              vertical-align: middle;
              padding: 4px;
            }
            .off-cell {
              background: #f8fafc;
              padding: 0;
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
    if (!currentTeacher) return;
    try {
      setIsExportingWord(true);
      const { exportTeacherTimetableToDocx } = await import("@/lib/docx-export");
      await exportTeacherTimetableToDocx({
        teacher: currentTeacher,
        activePeriods,
        days,
        slotsByCell,
        coTeachersByCell,
        dayScheduleStats,
        classMap,
        subjectMap,
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
            {/* Teacher Swatch Badge */}
            <div
              className="px-2 py-1 rounded-md text-xs font-bold font-mono border shadow-2xs flex-none"
              style={getTeacherTileInlineStyle(currentTeacher)}
            >
              {getTeacherAbbr(currentTeacher)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground leading-tight flex items-center gap-1.5">
                  <span>Πρόγραμμα:</span>
                  <div className="relative inline-flex items-center" ref={teacherDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsTeacherDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-muted/70 focus:outline-none"
                      title="Κλικ για επιλογή άλλου εκπαιδευτικού"
                    >
                      <span>{currentTeacher.lastName} {currentTeacher.firstName}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                          isTeacherDropdownOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>

                    {isTeacherDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-64 max-h-72 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl z-[150] p-1 font-sans">
                        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
                          Επιλογή Εκπαιδευτικού
                        </div>
                        {availableTeachers.map((tch) => {
                          const isSelected = tch.id === currentTeacher.id;
                          return (
                            <button
                              key={tch.id}
                              type="button"
                              onClick={() => {
                                setSelectedTeacherId(tch.id);
                                setIsTeacherDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-muted font-bold text-primary"
                                  : "hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className="px-1 py-0.2 rounded text-[10px] font-mono font-bold shrink-0"
                                  style={getTeacherTileInlineStyle(tch)}
                                >
                                  {getTeacherAbbr(tch)}
                                </span>
                                <span className="truncate font-semibold">
                                  {tch.lastName} {tch.firstName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({tch.specialty})
                                </span>
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

                <Badge variant="outline" className="text-[10px] font-mono border-border bg-background ml-1">
                  {formatSpecialtyLabel(currentTeacher.specialty)}
                </Badge>
                {currentTeacher.isAllDay && (
                  <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px]">
                    Ολοήμερο
                  </Badge>
                )}
              </div>

              {/* Stats summary */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 font-sans">
                <span className="flex items-center gap-1 font-mono text-[11px] text-foreground font-semibold">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {totalTeachingHours} ώρες διδασκαλίας
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
                  {totalGapsCount} {totalGapsCount === 1 ? "κενό" : "κενά"}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  {uniqueClassesTaught.length} {uniqueClassesTaught.length === 1 ? "τμήμα" : "τμήματα"}
                </span>
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
              className="h-7 px-2.5 text-[11px] font-sans bg-background border-border text-foreground hover:bg-muted cursor-pointer"
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

        {/* Content Body: Timetable Grid with full scroll support */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-3 bg-muted/30"
          ref={printAreaRef}
        >
          <div className="bg-card rounded-lg border border-border shadow-xs min-w-[700px] mb-2">
            <table className="w-full border-collapse text-left font-sans table-fixed">
              <thead>
                <tr className="border-b border-border">
                  {/* Left Corner header */}
                  <th className="w-20 py-2 px-2 bg-muted/60 border-r border-border text-[11px] font-bold text-foreground text-center">
                    ΩΡΑ
                  </th>
                  {/* 5 Day Headers */}
                  {days.map((day) => {
                    const dayStat = dayScheduleStats.get(day.index);
                    const hoursCount = dayStat?.teachingPeriods.length || 0;
                    return (
                      <th
                        key={day.index}
                        className="py-2 px-2 border-r border-border text-center bg-muted/50 text-foreground last:border-r-0"
                      >
                        <div className="text-xs font-bold tracking-wide uppercase">
                          {day.name}
                        </div>
                        <div className="text-[10px] font-normal opacity-75 font-mono">
                          {hoursCount > 0 ? `${hoursCount} ώρες` : "—"}
                        </div>
                      </th>
                    );
                  })}
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
                      className={`p-1.5 border-r border-border text-center select-none w-20 ${
                        period.isAllDay
                          ? "bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-r-amber-200 dark:border-r-amber-800"
                          : "bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="font-bold text-[11px] font-mono leading-tight">
                        {period.label}
                      </div>
                      {period.isAllDay && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-sans font-medium mt-0.5 inline-block">
                          Ολοημ.
                        </span>
                      )}
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
                      const dayStat = dayScheduleStats.get(day.index);
                      const isGap = dayStat && dayStat.gaps.includes(period.index);
                      const isOff = slots.length === 0 && !isGap;

                      return (
                        <td
                          key={cellKey}
                          className={`border-r border-border last:border-r-0 transition-colors ${
                            isOff
                              ? "bg-muted/40 dark:bg-muted/40 p-0 align-middle"
                              : isGap
                              ? "bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-0 align-middle"
                              : "p-1.5 align-top"
                          }`}
                        >
                          {isOff ? (
                            /* Entire cell is solid gray, no inner card, covers 100% of cell */
                            <div className="w-full h-full min-h-[46px]" />
                          ) : isGap ? (
                            /* Entire cell is gap-colored with coffee icon and text, covering 100% of cell */
                            <div className="w-full h-full min-h-[46px] flex items-center justify-center gap-1.5 text-[11px] font-sans font-semibold select-none p-1">
                              <Coffee className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              <span>Κενό</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 h-full justify-start">
                              {slots.map((slot) => {
                                const cls = classMap.get(slot.classId);
                                const classColor = cls?.color || "#2563eb";
                                const rawName = cls?.name || "Τμήμα";
                                const classDisplayName = rawName.toLowerCase().startsWith("τμημα")
                                  ? rawName
                                  : `Τμήμα ${rawName}`;

                                return (
                                  <div
                                    key={slot.id}
                                    className="relative flex flex-col gap-0.5 px-2 py-1.5 rounded border border-border text-left shadow-2xs bg-card hover:border-foreground/30 transition-all"
                                    style={{
                                      borderLeftWidth: "3px",
                                      borderLeftColor: classColor,
                                    }}
                                  >
                                    {/* Class Name Badge & Lock */}
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span
                                          className="px-1.5 py-0.5 rounded font-bold font-mono text-[11px] text-white flex-none shadow-2xs"
                                          style={{ backgroundColor: classColor }}
                                          title={classDisplayName}
                                        >
                                          {classDisplayName}
                                        </span>
                                      </div>

                                      {slot.isLocked && (
                                        <span title="Κλειδωμένη ώρα" className="flex-none">
                                          <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                        </span>
                                      )}
                                    </div>

                                    {/* Students List Badge (if any) */}
                                    {slot.students && slot.students.length > 0 && (
                                      <div className="pt-0.5 mt-0.5 border-t border-purple-100 dark:border-purple-900 flex items-center gap-1 text-[8.5px] text-purple-900 dark:text-purple-200 bg-purple-100/70 dark:bg-purple-900/50 px-1 py-0.5 rounded font-normal">
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

        {/* Footer Statistics & Breakdown */}
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
              Τμήματα: <strong>{uniqueClassesTaught.map((c) => c.name).join(", ")}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-6 px-3 text-[11px] font-sans cursor-pointer"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
