from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TeacherConstraints(BaseModel):
    availability: Optional[Dict[str, List[bool]]] = None  # day_index string -> list of booleans per period
    availableDays: Optional[List[int]] = None  # list of day indices [0..4]
    maxHoursPerDay: Optional[int] = None
    minHoursPerDay: Optional[int] = None
    maxConsecutiveHours: Optional[int] = None
    maxConsecutiveGaps: Optional[int] = None
    maxTotalGapsPerDay: Optional[int] = None
    maxTotalGapsPerWeek: Optional[int] = None
    requireFirstAndLastHour: Optional[bool] = None
    allowSimultaneousSessions: Optional[bool] = False

class TeacherInput(BaseModel):
    id: str
    firstName: str
    lastName: str
    specialty: str
    isSupport: bool = False
    isMorning: bool = True
    isAllDay: bool = False
    isTeaching: bool = True
    isActive: bool = True
    maxWeeklyHours: int = 24
    color: str = "#71717a"
    constraints: Optional[TeacherConstraints] = None
    allowSimultaneousSessions: Optional[bool] = False

class SubjectInput(BaseModel):
    id: str
    title: str
    code: str
    color: str = "#71717a"
    allowedSpecialties: Optional[List[str]] = []
    classHours: Optional[Dict[str, List[int]]] = {}
    classTeachers: Optional[Dict[str, Optional[Any]]] = {}
    classAssignments: Optional[Dict[str, List[Dict[str, Any]]]] = {}
    maxPerDay: Optional[int] = None

class ClassInput(BaseModel):
    id: str
    name: str
    grade: str
    headTeacherId: Optional[str] = None
    isAllDay: bool = False
    weeklyHoursTarget: int = 30
    supportHoursMin: int = 0
    supportHoursMax: int = 0
    orderIndex: int = 0

class SubGroupInput(BaseModel):
    id: str
    classId: str
    name: str
    isDefault: bool = False

class AssignmentInput(BaseModel):
    id: str
    teacherId: str
    subjectId: str
    subGroupId: str
    hours: int
    isAllDay: bool = False
    concurrentGroupId: Optional[str] = None

class PeriodConfig(BaseModel):
    index: int
    label: str
    startTime: str
    endTime: str

class SchoolConfigInput(BaseModel):
    schoolName: str = "metaSchool"
    schoolYear: str = "2026-2027"
    days: List[str] = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"]
    hasAllDay: Optional[bool] = True
    schoolType: Optional[str] = None
    periods: List[PeriodConfig] = []
    allDayPeriods: List[PeriodConfig] = []
    requireFirstAndLastHour: Optional[bool] = None

class CustomRuleInput(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    rulePayload: Dict[str, Any] = {}
    isActive: bool = True

class FixedSlotInput(BaseModel):
    day: int
    period: int
    assignmentId: Optional[str] = None
    teacherId: Optional[str] = None
    subjectId: Optional[str] = None
    classId: Optional[str] = None
    subGroupId: Optional[str] = None

class SolveRequest(BaseModel):
    teachers: List[TeacherInput]
    subjects: List[SubjectInput]
    classes: List[ClassInput]
    subGroups: List[SubGroupInput]
    assignments: Optional[List[AssignmentInput]] = []
    schoolConfig: SchoolConfigInput
    customRules: Optional[List[CustomRuleInput]] = []
    fixedSlots: Optional[List[FixedSlotInput]] = []
    requireFirstAndLastHour: Optional[bool] = None

class SlotResult(BaseModel):
    id: str
    day: int
    period: int
    assignmentId: Optional[str] = None
    classId: str
    subGroupId: str
    teacherId: str
    subjectId: str
    isSupport: bool
    layer: int

class ConflictDiagnosticItem(BaseModel):
    id: str
    category: str  # "teacher", "class", "subject", "general"
    title: str
    description: str
    suggestion: str
    targetTab: Optional[str] = None  # "teachers", "classes", "subjects", "rules"
    targetId: Optional[str] = None
    severity: str = "error"  # "error", "warning"

class SolveResponse(BaseModel):
    status: str  # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "ERROR"
    solveTimeSeconds: float
    slots: List[SlotResult] = []
    conflicts: List[str] = []
    diagnostics: Optional[Dict[str, Any]] = None
    diagnosticItems: Optional[List[ConflictDiagnosticItem]] = []

class ValidateMoveRequest(BaseModel):
    slotId: str
    targetDay: int
    targetPeriod: int
    allSlots: List[SlotResult]
    teachers: List[TeacherInput]
    classes: List[ClassInput]
    subGroups: List[SubGroupInput]

class ValidateMoveResponse(BaseModel):
    valid: bool
    clashReason: Optional[str] = None
