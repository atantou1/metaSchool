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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Lock,
  Layers,
  Sparkles,
  Coffee,
  CheckCircle2,
  CalendarCheck,
  Building,
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

  // Selected teacher state (allows switching from dropdown inside the modal)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacher?.id || ""
  );

  // Sync when initialTeacher prop changes
  useEffect(() => {
    if (initialTeacher?.id) {
      setSelectedTeacherId(initialTeacher.id);
    }
  }, [initialTeacher?.id]);

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

  // Check if teacher has all-day slots (periods 6..9)
  const hasAllDaySlots = useMemo(() => {
    return teacherSlots.some((s) => s.period >= 6);
  }, [teacherSlots]);

  // Toggle for showing all-day periods
  const [showAllDay, setShowAllDay] = useState<boolean>(() => {
    return Boolean(currentTeacher?.isAllDay || hasAllDaySlots);
  });

  useEffect(() => {
    if (currentTeacher) {
      setShowAllDay(Boolean(currentTeacher.isAllDay || hasAllDaySlots));
    }
  }, [currentTeacher, hasAllDaySlots]);

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
  // To identify if another teacher is co-teaching or support in the same class/slot
  const coTeachersByCell = useMemo(() => {
    if (!currentTeacher) return new Map<string, Teacher[]>();
    const map = new Map<string, Teacher[]>();

    for (const slot of teacherSlots) {
      const key = `${slot.classId}_${slot.day}_${slot.period}`;
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
      const periods = daySlots.map((s) => s.period).sort((a, b) => a - b);
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

  // Subjects taught summary
  const subjectStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slot of teacherSlots) {
      counts.set(slot.subjectId, (counts.get(slot.subjectId) || 0) + 1);
    }
    const list: { subject: Subject; hours: number }[] = [];
    counts.forEach((hours, subjectId) => {
      const subj = subjectMap.get(subjectId);
      if (subj) list.push({ subject: subj, hours });
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
        const cellKey = `${d.index}_${p.index}`;
        const slots = slotsByCell.get(cellKey) || [];
        const coTeachers = coTeachersByCell.get(cellKey) || [];
        const dayStat = dayScheduleStats.get(d.index);

        tableHtml += `<td class="slot-cell">`;
        if (slots.length > 0) {
          slots.forEach((s) => {
            const cls = classMap.get(s.classId);
            const subj = subjectMap.get(s.subjectId);
            const coTeacherText =
              coTeachers.length > 0
                ? `<div class="coteacher">👥 Συνδιδασκαλία: ${coTeachers.map((ct) => `${ct.lastName} (${ct.specialty})`).join(", ")}</div>`
                : "";

            tableHtml += `
              <div class="card ${s.isSupport ? "support" : ""}">
                <div class="class-title">Τμήμα: <strong>${cls?.name || "—"}</strong></div>
                <div class="subject-title">${subj?.title || subj?.code || "—"}</div>
                ${coTeacherText}
              </div>
            `;
          });
        } else if (dayStat && dayStat.gaps.includes(p.index)) {
          tableHtml += `<div class="gap-card">ΚΕΝΟ</div>`;
        } else if (dayStat && dayStat.teachingPeriods.length === 0) {
          tableHtml += `<div class="off-card">—</div>`;
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
          <title>Ατομικό Πρόγραμμα - ${currentTeacher.lastName} ${currentTeacher.firstName}</title>
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
            .class-title {
              font-size: 11.5px;
              color: #0f172a;
            }
            .subject-title {
              font-size: 10px;
              color: #475569;
              margin-top: 1px;
            }
            .coteacher {
              font-size: 9px;
              color: #7c3aed;
              margin-top: 2px;
              font-weight: 600;
            }
            .gap-card {
              background: #f4f4f5;
              border: 1px dashed #d4d4d8;
              color: #71717a;
              border-radius: 4px;
              padding: 4px;
              text-align: center;
              font-size: 10px;
              font-weight: 700;
            }
            .off-card {
              color: #a1a1aa;
              text-align: center;
              font-size: 11px;
              padding-top: 10px;
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
              <div class="subtitle">Ατομικό Πρόγραμμα • <strong>${currentTeacher.lastName} ${currentTeacher.firstName}</strong> (${formatSpecialtyLabel(currentTeacher.specialty)})</div>
            </div>
            <div class="meta">
              <div>Σχολικό Έτος: ${schoolYear}</div>
              <div>Ώρες Διδασκαλίας: <strong>${teacherSlots.length}</strong> | Κενά: <strong>${totalGapsCount}</strong></div>
            </div>
          </div>

          ${tableHtml}

          <div class="footer">
            <span>Σύστημα metaSchool • Εκτυπώθηκε στις ${new Date().toLocaleDateString("el-GR")}</span>
            <span>Υπογραφή Εκπαιδευτικού: _______________________</span>
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
    csv += `Ατομικό Πρόγραμμα - ${currentTeacher.lastName} ${currentTeacher.firstName} (${currentTeacher.specialty})\n`;
    csv += `Ώρα;` + days.map((d) => d.name).join(";") + "\n";

    for (const p of activePeriods) {
      const row = [`"${p.label} (${p.timeRange})"`];
      for (const d of days) {
        const cellKey = `${d.index}_${p.index}`;
        const slots = slotsByCell.get(cellKey) || [];
        const coTeachers = coTeachersByCell.get(cellKey) || [];
        const dayStat = dayScheduleStats.get(d.index);

        if (slots.length > 0) {
          const text = slots
            .map((s) => {
              const cls = classMap.get(s.classId);
              const subj = subjectMap.get(s.subjectId);
              const coText =
                coTeachers.length > 0
                  ? ` [Συνδ: ${coTeachers.map((ct) => ct.lastName).join(", ")}]`
                  : "";
              return `${cls?.name || "—"} - ${subj?.title || subj?.code || "—"}${coText}`;
            })
            .join(" / ");
          row.push(`"${text.replace(/"/g, '""')}"`);
        } else if (dayStat && dayStat.gaps.includes(p.index)) {
          row.push('"ΚΕΝΟ"');
        } else {
          row.push('""');
        }
      }
      csv += row.join(";") + "\n";
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `programma_${currentTeacher.lastName}_${currentTeacher.specialty}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Εξήχθη επιτυχώς το αρχείο CSV!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] h-[92vh] p-0 flex flex-col overflow-hidden bg-white border border-zinc-200 shadow-2xl rounded-xl z-[120]"
        showCloseButton={true}
      >
        {/* Header Bar */}
        <DialogHeader className="px-5 py-3 border-b border-zinc-200 bg-zinc-50/70 flex flex-row items-center justify-between flex-none gap-4">
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
                <DialogTitle className="text-base font-bold text-zinc-900 leading-tight">
                  Πρόγραμμα: {currentTeacher.lastName} {currentTeacher.firstName}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-zinc-300 bg-white">
                  {formatSpecialtyLabel(currentTeacher.specialty)}
                </Badge>
                {currentTeacher.isSupport && (
                  <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                    Παράλληλη / Ένταξη
                  </Badge>
                )}
                {currentTeacher.isAllDay && (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                    Ολοήμερο
                  </Badge>
                )}
              </div>

              {/* Stats summary */}
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5 font-sans">
                <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-600 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  {teacherSlots.length} ώρες διδασκαλίας
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                  <Coffee className="w-3.5 h-3.5 text-zinc-400" />
                  {totalGapsCount} {totalGapsCount === 1 ? "κενό" : "κενά"}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  {uniqueClassesTaught.length} {uniqueClassesTaught.length === 1 ? "τμήμα" : "τμήματα"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 pr-6">
            {/* Quick Teacher Switcher Dropdown */}
            <div className="w-56">
              <Select
                value={selectedTeacherId}
                onValueChange={(val) => {
                  if (val) setSelectedTeacherId(val);
                }}
              >
                <SelectTrigger className="h-7 text-xs bg-white border-zinc-200">
                  <SelectValue placeholder="Επιλογή εκπαιδευτικού..." />
                </SelectTrigger>
                <SelectContent className="max-h-64 bg-white z-[130]">
                  {availableTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <span className="font-semibold">{t.lastName}</span> {t.firstName}{" "}
                      <span className="text-zinc-400 text-[10px]">({t.specialty})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle All Day */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDay(!showAllDay)}
              className={`h-7 px-2.5 text-[11px] font-sans ${
                showAllDay
                  ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                  : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
              {showAllDay ? "Απόκρυψη Ολοημέρου" : "Προβολή Ολοημέρου"}
            </Button>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 px-2.5 text-[11px] font-sans bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-zinc-600" />
              Εκτύπωση (A4)
            </Button>

            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-7 px-2.5 text-[11px] font-sans bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-zinc-600" />
              CSV
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body: Timetable Grid */}
        <div className="flex-1 overflow-auto p-4 bg-zinc-100/60" ref={printAreaRef}>
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden min-w-[700px]">
            <table className="w-full border-collapse text-left font-sans">
              <thead>
                <tr className="border-b border-zinc-200">
                  {/* Left Corner header */}
                  <th className="w-24 p-2.5 bg-zinc-100/80 border-r border-zinc-200 text-[11px] font-bold text-zinc-700 text-center">
                    ΩΡΑ
                  </th>
                  {/* 5 Day Headers */}
                  {days.map((day) => {
                    const dayStat = dayScheduleStats.get(day.index);
                    const hoursCount = dayStat?.teachingPeriods.length || 0;
                    return (
                      <th
                        key={day.index}
                        className={`p-2.5 border-r border-zinc-200 text-center ${day.headerBg} last:border-r-0`}
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
              <tbody className="divide-y divide-zinc-200 text-xs">
                {activePeriods.map((period) => (
                  <tr
                    key={period.index}
                    className={`hover:bg-zinc-50/60 transition-colors ${
                      period.isAllDay ? "bg-amber-50/20" : ""
                    }`}
                  >
                    {/* Period Row Label (Left Axis) */}
                    <td
                      className={`p-2 border-r border-zinc-200 text-center select-none ${
                        period.isAllDay
                          ? "bg-amber-50/60 text-amber-900 border-r-amber-200"
                          : "bg-zinc-50/80 text-zinc-700"
                      }`}
                    >
                      <div className="font-bold text-[11px] font-mono leading-tight">
                        {period.label}
                      </div>
                      {period.timeRange && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {period.timeRange}
                        </div>
                      )}
                    </td>

                    {/* 5 Day Cells */}
                    {days.map((day) => {
                      const cellKey = `${day.index}_${period.index}`;
                      const slots = slotsByCell.get(cellKey) || [];
                      const coTeachers = coTeachersByCell.get(cellKey) || [];
                      const dayStat = dayScheduleStats.get(day.index);
                      const isGap = dayStat && dayStat.gaps.includes(period.index);
                      const isOffDay = dayStat && dayStat.teachingPeriods.length === 0;

                      return (
                        <td
                          key={cellKey}
                          className="p-1.5 border-r border-zinc-200 last:border-r-0 align-top h-16 min-h-[64px]"
                        >
                          {slots.length === 0 ? (
                            isGap ? (
                              /* Gap Cell */
                              <div className="h-full w-full min-h-[48px] rounded border border-dashed border-amber-300 bg-amber-50/40 flex flex-col items-center justify-center text-[10px] text-amber-800 font-sans font-medium select-none p-1">
                                <Coffee className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                                <span>Κενό</span>
                              </div>
                            ) : isOffDay ? (
                              /* Day Off / Free Day */
                              <div className="h-full w-full min-h-[48px] rounded border border-dashed border-zinc-200/60 bg-zinc-50/30 flex items-center justify-center text-[10px] text-zinc-300 font-mono select-none">
                                —
                              </div>
                            ) : (
                              /* Empty Cell before/after workday */
                              <div className="h-full w-full min-h-[48px] rounded border border-dashed border-zinc-200/50 flex items-center justify-center text-[10px] text-zinc-300 font-mono select-none">
                                —
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col gap-1.5 h-full">
                              {slots.map((slot) => {
                                const cls = classMap.get(slot.classId);
                                const subject = subjectMap.get(slot.subjectId);
                                const subjColor = subject?.color || "#6366f1";
                                const classColor = cls?.color || "#2563eb";

                                return (
                                  <div
                                    key={slot.id}
                                    className={`relative flex flex-col justify-between p-2 rounded-md border text-left shadow-2xs transition-all ${
                                      slot.isSupport
                                        ? "bg-purple-50/80 border-purple-300"
                                        : "bg-white hover:border-zinc-400"
                                    }`}
                                    style={{
                                      borderLeftWidth: "4px",
                                      borderLeftColor: subjColor,
                                    }}
                                  >
                                    {/* Top Row: Class Badge & Subject */}
                                    <div className="flex items-start justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {/* Class Pill */}
                                        <span
                                          className="px-1.5 py-0.5 rounded font-bold font-mono text-[10.5px] text-white flex-none shadow-2xs"
                                          style={{ backgroundColor: classColor }}
                                          title={`Τμήμα ${cls?.name || ""}`}
                                        >
                                          {cls?.name || "Τμήμα"}
                                        </span>
                                        <span
                                          className="font-bold text-xs text-zinc-900 leading-tight truncate"
                                          title={subject?.title || subject?.code}
                                        >
                                          {subject?.title || subject?.code || "Μάθημα"}
                                        </span>
                                      </div>

                                      {/* Indicator icons */}
                                      <div className="flex items-center gap-1 flex-none">
                                        {slot.isLocked && (
                                          <span title="Κλειδωμένη ώρα">
                                            <Lock className="w-2.5 h-2.5 text-zinc-500" />
                                          </span>
                                        )}
                                        {slot.isSupport && (
                                          <Badge className="h-3.5 px-1 text-[8px] bg-purple-200 text-purple-900 font-mono">
                                            Παράλληλη
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Co-teaching Badge (if other teachers share this slot!) */}
                                    {coTeachers.length > 0 && (
                                      <div className="mt-1.5 pt-1 border-t border-purple-100 flex items-center gap-1 text-[10px] text-purple-900 bg-purple-100/60 px-1.5 py-0.5 rounded">
                                        <Users className="w-3 h-3 text-purple-700 flex-none" />
                                        <span className="truncate">
                                          Συνδ:{" "}
                                          <strong className="font-semibold">
                                            {coTeachers
                                              .map(
                                                (ct) =>
                                                  `${ct.lastName} ${ct.firstName ? ct.firstName[0] + "." : ""}`
                                              )
                                              .join(", ")}
                                          </strong>
                                        </span>
                                      </div>
                                    )}

                                    {/* Room if available */}
                                    {cls?.room && coTeachers.length === 0 && (
                                      <div className="mt-1 text-[9.5px] text-zinc-400 font-mono flex items-center gap-1">
                                        <Building className="w-3 h-3 text-zinc-400" />
                                        <span>Αίθ: {cls.room}</span>
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
        <div className="px-5 py-2.5 border-t border-zinc-200 bg-white flex-none flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2 overflow-x-auto max-w-[70%] py-0.5">
            <span className="font-semibold text-zinc-700 text-[11px] flex-none">
              Μαθήματα ({subjectStats.length}):
            </span>
            {subjectStats.map(({ subject, hours }) => (
              <span
                key={subject.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] text-zinc-700 flex-none font-medium"
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
            <span className="text-zinc-500">
              Τμήματα: <strong>{uniqueClassesTaught.map((c) => c.name).join(", ")}</strong>
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
