const fs = require('fs');
const file = '/Users/antonisatlasis/Desktop/metaSchool/frontend/src/components/subjects-manager.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Props
content = content.replace(
  'interface ClassTeacherMultiSelectPopoverProps {',
  'interface ClassTeacherMultiSelectPopoverProps {\n  smartDefaultIds?: string[];'
);

// 2. Destructure smartDefaultIds
content = content.replace(
  '  selectedTeacherIds,\n  eligibleTeachers,\n  onChange,\n  onApplyToAll,\n}) => {',
  '  selectedTeacherIds,\n  smartDefaultIds,\n  eligibleTeachers,\n  onChange,\n  onApplyToAll,\n}) => {'
);

// 3. toggleTeacher
content = content.replace(
  '  const toggleTeacher = (id: string) => {\n    if (selectedTeacherIds.includes(id)) {\n      onChange(selectedTeacherIds.filter((tId) => tId !== id));\n    } else {\n      onChange([...selectedTeacherIds, id]);\n    }\n  };',
  '  const toggleTeacher = (id: string) => {\n    let current = selectedTeacherIds.filter(v => v !== "all");\n    if (current.includes(id)) {\n      onChange(current.filter((tId) => tId !== id));\n    } else {\n      onChange([...current, id]);\n    }\n  };'
);

// 4. Determine trigger label
content = content.replace(
  `  // Determine trigger label
  let triggerText = "ΟΛΟΙ";
  let triggerTitle = "Ανάθεση: Όλοι οι επιλέξιμοι εκπαιδευτικοί (χωρίς περιορισμό)";
  let isCustom = false;

  if (selectedTeacherIds.length === 1) {`,
  `  // Determine trigger label
  const isUsingSmartDefault = selectedTeacherIds.length === 0 && smartDefaultIds && smartDefaultIds.length > 0 && smartDefaultIds[0] !== "all";
  const displayIds = selectedTeacherIds.length > 0 ? selectedTeacherIds : (smartDefaultIds || []);

  let triggerText = "ΟΛΟΙ";
  let triggerTitle = "Ανάθεση: Όλοι οι επιλέξιμοι εκπαιδευτικοί";
  let isCustom = false;
  let isSmart = isUsingSmartDefault;

  if (selectedTeacherIds.includes("all") || (displayIds.length === 0)) {
     triggerText = "ΟΛΟΙ";
     triggerTitle = "Ανάθεση: ΟΛΟΙ";
     isCustom = selectedTeacherIds.includes("all");
     isSmart = false;
  } else if (displayIds.length === 1) {`
);

content = content.replace(
  `  if (selectedTeacherIds.length === 1) {
    const t = eligibleTeachers.find((t) => t.id === selectedTeacherIds[0]);
    if (t) {
      const rawName = t.shortName || t.lastName || t.firstName || "";
      triggerText = rawName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);
      triggerTitle = \`Ανάθεση: \${t.lastName} \${t.firstName}\`;
      isCustom = true;
    }
  } else if (selectedTeacherIds.length === 2) {
    const names = selectedTeacherIds.map((id) => {
      const t = eligibleTeachers.find((t) => t.id === id);
      const raw = t?.shortName || t?.lastName || t?.firstName || "";
      return raw.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);
    });
    triggerText = names.join("/");
    triggerTitle = \`Ανάθεση (2): \${selectedTeacherIds.map(id => eligibleTeachers.find(t => t.id === id)?.lastName).filter(Boolean).join(", ")}\`;
    isCustom = true;
  } else if (selectedTeacherIds.length > 2) {
    triggerText = \`\${selectedTeacherIds.length} εκπ.\`;
    triggerTitle = \`Ανάθεση (\${selectedTeacherIds.length} εκπαιδευτικοί)\`;
    isCustom = true;
  }`,
  `    const t = eligibleTeachers.find((t) => t.id === displayIds[0]);
    if (t) {
      const rawName = t.shortName || t.lastName || t.firstName || "";
      triggerText = rawName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);
      triggerTitle = isSmart ? \`Προεπιλογή: \${t.lastName} \${t.firstName}\` : \`Ανάθεση: \${t.lastName} \${t.firstName}\`;
      isCustom = !isSmart;
    }
  } else if (displayIds.length === 2) {
    const names = displayIds.map((id) => {
      const t = eligibleTeachers.find((t) => t.id === id);
      const raw = t?.shortName || t?.lastName || t?.firstName || "";
      return raw.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().substring(0, 4);
    });
    triggerText = names.join("/");
    triggerTitle = isSmart ? \`Προεπιλογή (2)\` : \`Ανάθεση (2): \${displayIds.map(id => eligibleTeachers.find(t => t.id === id)?.lastName).filter(Boolean).join(", ")}\`;
    isCustom = !isSmart;
  } else if (displayIds.length > 2) {
    triggerText = \`\${displayIds.length} εκπ.\`;
    triggerTitle = isSmart ? \`Προεπιλογή (\${displayIds.length} εκπαιδευτικοί)\` : \`Ανάθεση (\${displayIds.length} εκπαιδευτικοί)\`;
    isCustom = !isSmart;
  }`
);

// Trigger styling
content = content.replace(
  `        className={\`h-5 w-[44px] px-1 rounded flex items-center justify-between gap-0.5 text-[9px] font-mono font-semibold transition-all cursor-pointer shadow-2xs border \${
          isCustom
            ? selectedTeacherIds.length > 1
              ? "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200/90"
              : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 border-zinc-300"
            : "bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border-zinc-200/80"
        }\`}`,
  `        className={\`h-5 w-[44px] px-1 rounded flex items-center justify-between gap-0.5 text-[9px] font-mono font-semibold transition-all cursor-pointer shadow-2xs border \${
          isSmart
            ? "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/90"
            : isCustom
              ? displayIds.length > 1
                ? "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200/90"
                : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 border-zinc-300"
              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border-zinc-200/80"
        }\`}`
);

// Καθαρισμός button
content = content.replace(
  `          {selectedTeacherIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Καθαρισμός
            </button>
          )}`,
  `          {selectedTeacherIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10.5px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Επαναφορά
            </button>
          )}`
);

// ΟΛΟΙ Option
content = content.replace(
  `        {/* Option: ΟΛΟΙ (Χωρίς περιορισμό) */}
        <div
          onClick={() => onChange([])}
          className={\`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors mb-1.5 border \${
            selectedTeacherIds.length === 0
              ? "bg-zinc-100 border-zinc-300 font-medium text-zinc-900"
              : "hover:bg-zinc-50 border-transparent text-zinc-600"
          }\`}`,
  `        {/* Option: ΟΛΟΙ (Χωρίς περιορισμό) */}
        <div
          onClick={() => onChange(["all"])}
          className={\`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors mb-1.5 border \${
            selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)
              ? "bg-zinc-100 border-zinc-300 font-medium text-zinc-900"
              : "hover:bg-zinc-50 border-transparent text-zinc-600"
          }\`}`
);

content = content.replace(
  `          <div
            className={\`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all \${
              selectedTeacherIds.length === 0
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "border-zinc-300 bg-white"
            }\`}
          >
            {selectedTeacherIds.length === 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>`,
  `          <div
            className={\`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all \${
              selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "border-zinc-300 bg-white"
            }\`}
          >
            {(selectedTeacherIds.includes("all") || (!isUsingSmartDefault && displayIds.length === 0)) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>`
);

// Teacher rendering check mark
content = content.replace(
  `                    className={\`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all border \${
                      selectedTeacherIds.includes(t.id)
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-zinc-300 bg-white"
                    }\`}
                  >
                    {selectedTeacherIds.includes(t.id) && <Check className="w-2.5 h-2.5 stroke-[3]" />}`,
  `                    className={\`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all border \${
                      displayIds.includes(t.id)
                        ? (isUsingSmartDefault ? "bg-emerald-500 border-emerald-500 text-white" : "bg-indigo-600 border-indigo-600 text-white")
                        : "border-zinc-300 bg-white"
                    }\`}
                  >
                    {displayIds.includes(t.id) && <Check className="w-2.5 h-2.5 stroke-[3]" />}`
);

fs.writeFileSync(file, content, 'utf8');
