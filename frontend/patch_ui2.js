const fs = require('fs');
const file = '/Users/antonisatlasis/Desktop/metaSchool/frontend/src/components/subjects-manager.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert getSmartDefaultIds helper function at the top level
if (!content.includes('const getSmartDefaultIds')) {
  content = content.replace(
    'const ClassTeacherMultiSelectPopover: React.FC<ClassTeacherMultiSelectPopoverProps> = ({',
    'const getSmartDefaultIds = (c: Class, eligible: Teacher[]): string[] => {\n  if (c.headTeacherId && eligible.some((t) => t.id === c.headTeacherId)) return [c.headTeacherId];\n  if (eligible.length === 1) return [eligible[0].id];\n  return ["all"];\n};\n\nconst ClassTeacherMultiSelectPopover: React.FC<ClassTeacherMultiSelectPopoverProps> = ({'
  );
}

// Pass smartDefaultIds to ClassTeacherMultiSelectPopover
content = content.replace(
  '                  selectedTeacherIds={inlineData.classTeachers[c.id] || []}\n                  eligibleTeachers={eligibleTeachers}',
  '                  selectedTeacherIds={inlineData.classTeachers[c.id] || []}\n                  smartDefaultIds={getSmartDefaultIds(c, eligibleTeachers)}\n                  eligibleTeachers={eligibleTeachers}'
);

// We need to also apply smart defaults for View mode (read-only view)
content = content.replace(
  '                      const assignedTeacherIds = normalizeAssignedTeachers(subj.classTeachers?.[c.id]);',
  '                      const rawAssigned = normalizeAssignedTeachers(subj.classTeachers?.[c.id]);\n                      const allowedSpecs = subj.allowedSpecialties || [];\n                      const eligibleTeachers = data.teachers.filter(t => allowedSpecs.length === 0 || allowedSpecs.includes(t.specialty));\n                      const isUsingSmartDefault = rawAssigned.length === 0;\n                      const smartDefaults = getSmartDefaultIds(c, eligibleTeachers);\n                      let assignedTeacherIds = isUsingSmartDefault ? (smartDefaults[0] === "all" ? [] : smartDefaults) : (rawAssigned.includes("all") ? [] : rawAssigned);\n                      const isSmart = isUsingSmartDefault && smartDefaults[0] !== "all";'
);

content = content.replace(
  '                        const t = data.teachers.find((t) => t.id === assignedTeacherIds[0]);\n                        if (t) {\n                          const rawName = t.shortName || t.lastName || t.firstName || "";\n                          teacherLabel = rawName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);\n                          teacherTooltip = `Ανάθεση: ${t.lastName} ${t.firstName}`;',
  '                        const t = data.teachers.find((t) => t.id === assignedTeacherIds[0]);\n                        if (t) {\n                          const rawName = t.shortName || t.lastName || t.firstName || "";\n                          teacherLabel = rawName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);\n                          teacherTooltip = isSmart ? `Προεπιλογή: ${t.lastName} ${t.firstName}` : `Ανάθεση: ${t.lastName} ${t.firstName}`;'
);

content = content.replace(
  '                          return raw.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);\n                        });\n                        teacherLabel = labels.join("/");\n                        teacherTooltip = `Ανάθεση (2): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}`;',
  '                          return raw.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);\n                        });\n                        teacherLabel = labels.join("/");\n                        teacherTooltip = isSmart ? `Προεπιλογή (2): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}` : `Ανάθεση (2): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}`;'
);

content = content.replace(
  '                        teacherLabel = `${assignedTeacherIds.length} εκπ.`;\n                        teacherTooltip = `Ανάθεση (${assignedTeacherIds.length}): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}`;',
  '                        teacherLabel = `${assignedTeacherIds.length} εκπ.`;\n                        teacherTooltip = isSmart ? `Προεπιλογή (${assignedTeacherIds.length}): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}` : `Ανάθεση (${assignedTeacherIds.length}): ${teachers.map((t) => `${t.lastName} ${t.firstName}`).join(", ")}`;'
);

content = content.replace(
  '                            {teacherLabel ? (\n                              <div',
  '                            {teacherLabel ? (\n                              <div'
);

content = content.replace(
  '                                className="text-zinc-600 bg-white border border-zinc-200 px-1 py-0.5 rounded shadow-2xs truncate max-w-full cursor-help hover:border-zinc-300 transition-colors"',
  '                                className={`px-1 py-0.5 rounded shadow-2xs truncate max-w-full cursor-help transition-colors border ${isSmart ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "text-zinc-600 bg-white border-zinc-200 hover:border-zinc-300"}`}'
);

fs.writeFileSync(file, content, 'utf8');
