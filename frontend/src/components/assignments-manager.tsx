"use client";

import React, { useMemo } from "react";
import { TimetableData } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

interface AssignmentsManagerProps {
  data: TimetableData;
  onRefresh: () => void;
}

export const AssignmentsManager: React.FC<AssignmentsManagerProps> = ({
  data,
  onRefresh,
}) => {
  // Sort assignments by class name, then subject
  const sortedAssignments = useMemo(() => {
    return [...data.assignments].sort((a, b) => {
      const classA = data.classes.find(c => c.id === data.subGroups.find(sg => sg.id === a.subGroupId)?.classId)?.name || "";
      const classB = data.classes.find(c => c.id === data.subGroups.find(sg => sg.id === b.subGroupId)?.classId)?.name || "";
      if (classA !== classB) return classA.localeCompare(classB);
      
      const subjA = data.subjects.find(s => s.id === a.subjectId)?.title || "";
      const subjB = data.subjects.find(s => s.id === b.subjectId)?.title || "";
      return subjA.localeCompare(subjB);
    });
  }, [data.assignments, data.classes, data.subGroups, data.subjects]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header Info */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-zinc-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            Πίνακας Αναθέσεων
          </h2>
          <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
            Εδώ διαχειρίζεστε πόσες ώρες θα διδάξει ο κάθε εκπαιδευτικός στο κάθε τμήμα. Ο αλγόριθμος χρησιμοποιεί αυτές τις ώρες ως απόλυτο στόχο για να γεμίσει το πρόγραμμα.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
        <div className="overflow-y-auto flex-1">
          <Table className="w-full text-xs">
            <TableHeader className="bg-zinc-50/80 backdrop-blur-sm sticky top-0 z-10">
              <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                <TableHead className="w-[150px] font-semibold text-zinc-700 h-9">Τμήμα</TableHead>
                <TableHead className="w-[120px] font-semibold text-zinc-700 h-9">Ομάδα / Γκρουπ</TableHead>
                <TableHead className="w-[200px] font-semibold text-zinc-700 h-9">Μάθημα</TableHead>
                <TableHead className="w-[200px] font-semibold text-zinc-700 h-9">Εκπαιδευτικός</TableHead>
                <TableHead className="w-[80px] font-semibold text-zinc-700 h-9 text-center">Ώρες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    Δεν υπάρχουν αναθέσεις.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment) => {
                  const teacher = data.teachers.find((t) => t.id === assignment.teacherId);
                  const subject = data.subjects.find((s) => s.id === assignment.subjectId);
                  const subGroup = data.subGroups.find((sg) => sg.id === assignment.subGroupId);
                  const classEntity = data.classes.find((c) => c.id === subGroup?.classId);

                  return (
                    <TableRow
                      key={assignment.id}
                      className="group border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors"
                    >
                      {/* Τμήμα */}
                      <TableCell className="font-medium text-zinc-800">
                        {classEntity?.name || "Άγνωστο"}
                      </TableCell>

                      {/* Ομάδα */}
                      <TableCell>
                        {subGroup?.isDefault ? (
                          <Badge variant="outline" className="text-[10px] bg-zinc-100 border-zinc-200 text-zinc-600 font-medium">
                            {subGroup.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-200 text-amber-700 font-medium">
                            {subGroup?.name || "Άγνωστο"}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Μάθημα */}
                      <TableCell>
                        {subject ? (
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: subject.color }} 
                            />
                            <span className="truncate">{subject.title}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Άγνωστο</span>
                        )}
                      </TableCell>

                      {/* Εκπαιδευτικός */}
                      <TableCell>
                        {teacher ? (
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: teacher.color }} 
                            />
                            <span className="truncate">{teacher.lastName} {teacher.firstName}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Άγνωστο</span>
                        )}
                      </TableCell>

                      {/* Ώρες */}
                      <TableCell className="text-center font-semibold text-zinc-900">
                        {assignment.hours}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
