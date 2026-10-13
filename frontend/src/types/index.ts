export interface DayAvailabilityConfig {
  morningActive?: boolean; // whether available during morning on this day (defaults to true)
  start: number; // 1-based morning start period (e.g. 1)
  end: number; // 1-based morning end period (e.g. 6)
  allDayActive?: boolean; // whether available during all-day on this day
  allDayStart?: number; // 1-based all-day start period (e.g. 1)
  allDayEnd?: number; // 1-based all-day end period (e.g. 4)
}

export interface TeacherConstraints {
  availability?: Record<string, boolean[]>; // "0" -> [true, true, ...]
  availableDays?: number[]; // [0, 1, 2, 3, 4] where 0=Monday, 4=Friday
  dayHours?: Record<string, DayAvailabilityConfig>; // "0" -> { start: 1, end: 6, ... }
  maxHoursPerDay?: number | null;
  minHoursPerDay?: number | null;
  maxConsecutiveHours?: number | null;
  maxConsecutiveGaps?: number | null;
  maxTotalGapsPerDay?: number | null;
  maxTotalGapsPerWeek?: number | null;
  requireFirstAndLastHour?: boolean | null;
  allowSimultaneousSessions?: boolean | null; // Εάν επιτρέπεται ταυτόχρονη διατμηματική διδασκαλία / ομαδική συνεδρία
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
  allowSimultaneousSessions?: boolean | null;
  afm?: string | null;
  adt?: string | null;
  am?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  birthDate?: string | null;
  birthYear?: string | null;
  employmentType?: "permanent" | "deputy_regular" | "deputy_espa" | "hourly";
  signature?: string | null;
}

export interface Leave {
  id: string;
  teacherId: string;
  type: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  protocolNumber?: string | null;
  protocolDate?: string | null;
  reason?: string | null;
  status: "approved" | "pending" | "rejected";
  documentsData?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  teacher?: Teacher;
}

export interface SchoolProfile {
  schoolName: string;
  schoolYear: string;
  ministry: string;
  regionalDirectorate: string;
  directorate: string;
  postalAddress: string;
  phone: string;
  email: string;
  principalName: string;
  principalTitle: string;
  principalSignature?: string;
  schoolStamp?: string;
  deputyLogo?: string;
}

export interface LeaveTypeConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  permanentDaysLimit: number;
  deputyDaysLimit: number;
  description: string;
  requiresMedicalCertificate?: boolean;
}

export interface SubjectAssignment {
  teacherId: string;
  hours?: [number, number] | null;
}

export interface Subject {
  id: string;
  title: string;
  code: string;
  color: string;
  allowedSpecialties?: string[] | null; // e.g. ["ΠΕ70", "ΠΕ71"]
  defaultSpecialty?: string | null;
  classHours?: Record<string, [number, number] | number> | null;
  classTeachers?: Record<string, string | string[] | null> | null;
  classAssignments?: Record<string, SubjectAssignment[]> | null;
  maxPerDay?: number | null;
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
  students?: string[]; // Array of student names
  weeklyHoursTarget?: number;
  supportHoursMin: number;
  supportHoursMax: number;
  orderIndex: number;
}

export interface SubGroup {
  id: string;
  classId: string;
  name: string;
  students?: string[];
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
  students?: string[];
}

export interface PeriodConfig {
  index: number;
  label: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
}

export interface SchoolConfig {
  schoolName: string;
  schoolYear: string;
  schoolType?: string;
  hasAllDay?: boolean;
  days: string[];
  periods: PeriodConfig[];
  allDayPeriods?: PeriodConfig[];
  allDayPeriodsCount?: number;
}

export interface TimetableData {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassEntity[];
  subGroups: SubGroup[];
  assignments: LessonAssignment[];
  slots: TimetableSlot[];
  schoolConfig: SchoolConfig | null;
  rules: Rule[];
}

export interface Rule {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  enforcement: "hard" | "soft";
  weight?: number;
  params: Record<string, any>;
  isActive: boolean;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
}

export interface ConflictDiagnosticItem {
  id: string;
  category: "teacher" | "class" | "subject" | "general";
  title: string;
  description: string;
  suggestion: string;
  targetTab?: "teachers" | "classes" | "subjects" | "rules";
  targetId?: string;
  severity?: "error" | "warning";
}

export type { Specialty, SpecialtyType } from "@/lib/specialties";
