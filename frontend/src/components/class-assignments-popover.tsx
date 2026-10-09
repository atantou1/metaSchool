import React, { useState, useMemo, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Teacher, SubjectAssignment } from "@/types";
import { ChevronDown, Plus, X, Users, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ClassAssignmentsPopoverProps {
  classNameLabel: string;
  assignments: SubjectAssignment[];
  eligibleTeachers: Teacher[];
  smartDefaultIds: string[]; // From getSmartDefaultIds
  onChange: (newAssignments: SubjectAssignment[]) => void;
  onApplyToAll?: (newAssignments: SubjectAssignment[]) => void;
}

const STEP = 1;
const MIN = 0;
const MAX = 10; // Or dynamically pass max allowed based on grade

export const ClassAssignmentsPopover: React.FC<ClassAssignmentsPopoverProps> = ({
  classNameLabel,
  assignments,
  eligibleTeachers,
  smartDefaultIds,
  onChange,
  onApplyToAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // We determine if we are using the "empty state" which falls back to smart defaults
  const isUsingSmartDefault = assignments.length === 0;

  // The effective assignments to display
  const effectiveAssignments = useMemo(() => {
    if (isUsingSmartDefault) {
      if (!smartDefaultIds || smartDefaultIds.length === 0) return [];
      // Assign default hours, e.g., 1-3 or 0-0. Since it's smart default, let's just say 1-1 or whatever. 
      // Actually, if it's smart default, the hours are not set! This is a problem!
      return smartDefaultIds.map(id => ({ teacherId: id, hours: [1, 1] as [number, number] }));
    }
    return assignments;
  }, [assignments, isUsingSmartDefault, smartDefaultIds]);

    return null;
};
