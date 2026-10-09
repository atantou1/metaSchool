import re

with open('src/components/subjects-manager.tsx', 'r') as f:
    content = f.read()

# Add import
if 'UnifiedAssignmentPopover' not in content:
    content = content.replace(
        'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";',
        'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";\nimport { UnifiedAssignmentPopover } from "@/components/UnifiedAssignmentPopover";'
    )

# Fix classAssignments in inlineData type
content = content.replace(
    '  classTeachers: Record<string, string[]>;\n',
    '  classTeachers: Record<string, string[]>;\n  classAssignments: Record<string, any[]>;\n'
)

# initialize inlineData
content = content.replace(
    '      classTeachers: initialTeachers,\n',
    '      classTeachers: initialTeachers,\n      classAssignments: subj.classAssignments || {},\n'
)

# clean target classAssignments on mode switch
content = content.replace(
    '      cleanTeachers[c.id] = inlineData.classTeachers[c.id] || [];\n',
    '      cleanTeachers[c.id] = inlineData.classTeachers[c.id] || [];\n      cleanAssignments[c.id] = inlineData.classAssignments[c.id] || [];\n'
)
content = content.replace(
    '    const cleanTeachers: Record<string, string[]> = {};',
    '    const cleanTeachers: Record<string, string[]> = {};\n    const cleanAssignments: Record<string, any[]> = {};'
)
content = content.replace(
    '      classTeachers: cleanTeachers,\n',
    '      classTeachers: cleanTeachers,\n      classAssignments: cleanAssignments,\n'
)

# edit subject payload
content = content.replace(
    '        classTeachers: inlineData.classTeachers,\n',
    '        classTeachers: inlineData.classTeachers,\n        classAssignments: inlineData.classAssignments,\n'
)

# Replace table header
content = content.replace(
    '<th className="px-3 py-2 text-center text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/50 w-24">Ώρες</th>\n                      <th className="px-3 py-2 text-left text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/50 min-w-[140px]">Εκπαιδευτικός(οί)</th>',
    '<th className="px-3 py-2 text-center text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/50 min-w-[120px]">Ανάθεση</th>'
)

with open('src/components/subjects-manager.tsx', 'w') as f:
    f.write(content)

