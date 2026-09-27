from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TeacherConstraints(BaseModel):
    availability: Optional[Dict[str, List[bool]]] = None  # day_index string -> list of booleans per period
    maxHoursPerDay: Optional[int] = None
    minHoursPerDay: Optional[int] = None
    maxConsecutiveHours: Optional[int] = None
    maxConsecutiveGaps: Optional[int] = None
    maxTotalGapsPerDay: Optional[int] = None
    maxTotalGapsPerWeek: Optional[int] = None

class TeacherInput(BaseModel):
    id: str
    firstName: str
    lastName: str
    specialty: str
    isSupport: bool = False
    color: str = "#71717a"
    constraints: Optional[TeacherConstraints] = None

class SubjectInput(BaseModel):
    id: str
    title: str
    code: str
    color: str = "#71717a"

class ClassInput(BaseModel):
    id: str
    name: str
    grade: str
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
    periods: List[PeriodConfig] = []
    allDayPeriods: List[PeriodConfig] = []

class CustomRuleInput(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    rulePayload: Dict[str, Any] = {}
    isActive: bool = True

class FixedSlotInput(BaseModel):
    day: int
    period: int
    assignmentId: str

class SolveRequest(BaseModel):
    teachers: List[TeacherInput]
    subjects: List[SubjectInput]
    classes: List[ClassInput]
    subGroups: List[SubGroupInput]
    assignments: List[AssignmentInput]
    schoolConfig: SchoolConfigInput
    customRules: Optional[List[CustomRuleInput]] = []
    fixedSlots: Optional[List[FixedSlotInput]] = []

class SlotResult(BaseModel):
    id: str
    day: int
    period: int
    assignmentId: str
    classId: str
    subGroupId: str
    teacherId: str
    subjectId: str
    isSupport: bool
    layer: int

class SolveResponse(BaseModel):
    status: str  # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "ERROR"
    solveTimeSeconds: float
    slots: List[SlotResult] = []
    conflicts: List[str] = []
    diagnostics: Optional[Dict[str, Any]] = None

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
