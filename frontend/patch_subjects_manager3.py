import re

with open('src/components/subjects-manager.tsx', 'r') as f:
    content = f.read()

edit_mode_target = """              <div className="flex flex-col items-center justify-center gap-1">
                <ClassHoursSliderPopover
                  classNameLabel={c.name}
                  value={inlineData.classHours[c.id] || [0, 0]}
                  max={maxAllowed}
                  onChange={(range) => {
                    setInlineData({
                      ...inlineData,
                      classHours: {
                        ...inlineData.classHours,
                        [c.id]: range,
                      },
                    });
                  }}
                  onApplyToAll={(range) => {
                    const newClassHours = { ...inlineData.classHours };
                    sortedClasses.forEach((sc) => {
                      const isAllDay = Boolean(sc.isAllDay || sc.grade === "Ολοήμερο" || sc.name?.toLowerCase().includes("ολοήμερ"));
                      if (!isAllDay) {
                        newClassHours[sc.id] = range;
                      }
                    });
                    setInlineData({
                      ...inlineData,
                      classHours: newClassHours,
                    });
                    toast.success(`Οι ώρες εφαρμόστηκαν σε όλα τα τμήματα πλην Ολοήμερου (${range[0]}${range[1] !== range[0] ? '-' + range[1] : ''}ω).`);
                  }}
                />
                <ClassTeacherMultiSelectPopover
                  classNameLabel={c.name}
                  selectedTeacherIds={inlineData.classTeachers[c.id] || []}
                  smartDefaultIds={getSmartDefaultIds(c, eligibleTeachers)}
                  eligibleTeachers={eligibleTeachers}
                  onChange={(teacherIds) => {
                    setInlineData({
                      ...inlineData,
                      classTeachers: {
                        ...inlineData.classTeachers,
                        [c.id]: teacherIds,
                      },
                    });
                  }}
                  onApplyToAll={(teacherIds) => {
                    const newClassTeachers = { ...inlineData.classTeachers };
                    sortedClasses.forEach((sc) => {
                      const isAllDay = Boolean(sc.isAllDay || sc.grade === "Ολοήμερο" || sc.name?.toLowerCase().includes("ολοήμερ"));
                      if (!isAllDay) {
                        newClassTeachers[sc.id] = teacherIds;
                      }
                    });
                    setInlineData({
                      ...inlineData,
                      classTeachers: newClassTeachers,
                    });
                    toast.success("Η ανάθεση εκπαιδευτικών εφαρμόστηκε σε όλα τα πρωινά τμήματα.");
                  }}
                />
              </div>"""

edit_mode_replacement = """              <div className="flex flex-col items-center justify-center gap-1">
                <UnifiedAssignmentPopover
                  classNameLabel={c.name}
                  classHours={inlineData.classHours[c.id] || [0, 0]}
                  assignments={inlineData.classAssignments?.[c.id] || []}
                  eligibleTeachers={eligibleTeachers}
                  smartDefaultIds={getSmartDefaultIds(c, eligibleTeachers)}
                  maxAllowedHours={maxAllowed}
                  onChangeHours={(range) => {
                    setInlineData({
                      ...inlineData,
                      classHours: { ...inlineData.classHours, [c.id]: range },
                    });
                  }}
                  onApplyHoursToAll={(range) => {
                    const newClassHours = { ...inlineData.classHours };
                    sortedClasses.forEach((sc) => {
                      const isAllDay = Boolean(sc.isAllDay || sc.grade === "Ολοήμερο" || sc.name?.toLowerCase().includes("ολοήμερ"));
                      if (!isAllDay) newClassHours[sc.id] = range;
                    });
                    setInlineData({ ...inlineData, classHours: newClassHours });
                    toast.success(`Οι ώρες εφαρμόστηκαν σε όλα τα τμήματα πλην Ολοήμερου.`);
                  }}
                  onChangeAssignments={(assignments) => {
                    setInlineData({
                      ...inlineData,
                      classAssignments: { ...inlineData.classAssignments, [c.id]: assignments },
                    });
                  }}
                />
              </div>"""

content = content.replace(edit_mode_target, edit_mode_replacement)

with open('src/components/subjects-manager.tsx', 'w') as f:
    f.write(content)

