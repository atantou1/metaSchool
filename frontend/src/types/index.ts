export interface TeacherConstraints {
  availability?: Record<string, boolean[]>; // "0" -> [true, true, ...]
  availableDays?: number[]; // [0, 1, 2, 3, 4] where 0=Monday, 4=Friday
  maxHoursPerDay?: number | null;
  minHoursPerDay?: number | null;
  maxConsecutiveHours?: number | null;
  maxConsecutiveGaps?: number | null;
  maxTotalGapsPerDay?: number | null;
  maxTotalGapsPerWeek?: number | null;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  shortName?: string | null;
  isTeaching?: boolean;
  isOnCall?: boolean;
  isMorning?: boolean;
  isAllDay?: boolean;
  isActive?: boolean;
  maxWeeklyHours?: number;
  isSupport: boolean;
  color: string;
  constraints?: TeacherConstraints | null;
}

export interface Subject {
  id: string;
  title: string;
  code: string;
  color: string;
}

export interface ClassEntity {
  id: string;
  name: string;
  grade: string;
  color?: string;
  shortName?: string | null;
  studentsCount?: number;
  headTeacherId?: string | null;
  room?: string | null;
  isAllDay?: boolean;
  supportSpecialties?: string[]; // Array of specialty codes e.g. ["ΠΕ26", "ΠΕ29"]
  weeklyHoursTarget?: number;
  supportHoursMin: number;
  supportHoursMax: number;
  orderIndex: number;
}

export interface SubGroup {
  id: string;
  classId: string;
  name: string;
  isDefault: boolean;
}

export interface LessonAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  subGroupId: string;
  hours: number;
  isAllDay: boolean;
  concurrentGroupId?: string | null;
}

export interface TimetableSlot {
  id: string;
  day: number;
  period: number;
  assignmentId: string;
  classId: string;
  subGroupId: string;
  teacherId: string;
  subjectId: string;
  isSupport: boolean;
  layer: number;
  isLocked?: boolean;
}

export interface PeriodConfig {
  index: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface SchoolConfig {
  schoolName: string;
  schoolYear: string;
  days: string[];
  periods: PeriodConfig[];
  allDayPeriods?: PeriodConfig[];
}

export interface TimetableData {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassEntity[];
  subGroups: SubGroup[];
  assignments: LessonAssignment[];
  slots: TimetableSlot[];
  schoolConfig: SchoolConfig | null;
}

export type { Specialty, SpecialtyType } from "@/lib/specialties";

