import time
import uuid
from typing import Dict, List, Tuple, Any
from ortools.sat.python import cp_model
from .models import (
    SolveRequest,
    SolveResponse,
    SlotResult,
    ValidateMoveRequest,
    ValidateMoveResponse,
)

def solve_timetable(req: SolveRequest) -> SolveResponse:
    start_time = time.time()
    model = cp_model.CpModel()

    num_days = len(req.schoolConfig.days) if req.schoolConfig.days else 5
    num_periods = len(req.schoolConfig.periods) if req.schoolConfig.periods else 6

    # Build lookup dictionaries
    subgroup_to_class = {sg.id: sg.classId for sg in req.subGroups}
    subgroup_is_default = {sg.id: sg.isDefault for sg in req.subGroups}
    teacher_dict = {t.id: t for t in req.teachers}
    class_dict = {c.id: c for c in req.classes}

    # Separate Core vs Support assignments
    core_assignments = []
    support_assignments = []

    for asg in req.assignments:
        teacher = teacher_dict.get(asg.teacherId)
        if teacher and teacher.isSupport:
            support_assignments.append(asg)
        else:
            core_assignments.append(asg)

    # -------------------------------------------------------------
    # LAYER 1: Core Schedule CP-SAT Formulation
    # -------------------------------------------------------------
    # x[(asg_id, d, p)] is binary
    x: Dict[Tuple[str, int, int], cp_model.IntVar] = {}

    for asg in core_assignments:
        for d in range(num_days):
            for p in range(num_periods):
                var_name = f"x_{asg.id}_d{d}_p{p}"
                x[(asg.id, d, p)] = model.NewBoolVar(var_name)

    # 1. Total hours required for each core assignment
    for asg in core_assignments:
        model.Add(
            sum(x[(asg.id, d, p)] for d in range(num_days) for p in range(num_periods))
            == asg.hours
        )

    # 2. Teacher collisions, availability, and workload constraints for Core
    for teacher in req.teachers:
        if teacher.isSupport:
            continue
        
        t_assignments = [a for a in core_assignments if a.teacherId == teacher.id]
        if not t_assignments:
            continue

        total_t_hours = sum(a.hours for a in t_assignments)
        cons = teacher.constraints

        for d in range(num_days):
            # Check available days (e.g. availableDays = [0, 1, 2, 3, 4] or [1, 2, 3])
            if cons and cons.availableDays is not None and d not in cons.availableDays:
                for a in t_assignments:
                    for p in range(num_periods):
                        model.Add(x[(a.id, d, p)] == 0)
                continue

            daily_p_vars = []
            for p in range(num_periods):
                # Check teacher availability per period
                is_available = True
                if cons and cons.availability:
                    day_key = str(d)
                    avail_list = cons.availability.get(day_key)
                    if avail_list and p < len(avail_list):
                        is_available = avail_list[p]

                if not is_available:
                    for a in t_assignments:
                        model.Add(x[(a.id, d, p)] == 0)
                else:
                    # At most 1 lesson simultaneously
                    model.Add(
                        sum(x[(a.id, d, p)] for a in t_assignments) <= 1
                    )
                
                # Active indicator for this period
                p_active = model.NewBoolVar(f"p_act_t{teacher.id}_d{d}_p{p}")
                model.Add(p_active == sum(x[(a.id, d, p)] for a in t_assignments))
                daily_p_vars.append(p_active)

            daily_hours = sum(daily_p_vars)

            # Max hours per day for teacher
            if cons and cons.maxHoursPerDay is not None:
                model.Add(daily_hours <= cons.maxHoursPerDay)

            # Min hours per day: if teacher teaches on day d, teach at least minHoursPerDay (e.g. 2 hours)
            if cons and cons.minHoursPerDay is not None:
                min_h = cons.minHoursPerDay
                effective_min_h = min(min_h, total_t_hours)
                if effective_min_h > 1:
                    is_working = model.NewBoolVar(f"working_t{teacher.id}_d{d}")
                    model.Add(daily_hours >= effective_min_h * is_working)
                    model.Add(daily_hours <= num_periods * is_working)

            # Max consecutive hours without break
            if cons and cons.maxConsecutiveHours is not None:
                max_consec = cons.maxConsecutiveHours
                if max_consec and max_consec < num_periods:
                    window_size = max_consec + 1
                    for p_idx in range(num_periods - window_size + 1):
                        model.Add(sum(daily_p_vars[p_idx : p_idx + window_size]) <= max_consec)

    # 3. Class & Sub-Group Concurrency
    # Group assignments by class
    class_assignments: Dict[str, List[Any]] = {c.id: [] for c in req.classes}
    for asg in core_assignments:
        cid = subgroup_to_class.get(asg.subGroupId)
        if cid and cid in class_assignments:
            class_assignments[cid].append(asg)

    # Concurrency grouping (concurrentGroupId)
    concurrent_groups: Dict[str, List[Any]] = {}
    for asg in core_assignments:
        if asg.concurrentGroupId:
            concurrent_groups.setdefault(asg.concurrentGroupId, []).append(asg)

    # Add strict synchronization constraint for concurrent groups
    for cg_id, cg_asgs in concurrent_groups.items():
        if len(cg_asgs) > 1:
            base_asg = cg_asgs[0]
            for other_asg in cg_asgs[1:]:
                for d in range(num_days):
                    for p in range(num_periods):
                        model.Add(x[(base_asg.id, d, p)] == x[(other_asg.id, d, p)])

    # For each class, at each (d, p), ensure no conflicting lessons
    for c in req.classes:
        c_asgs = class_assignments.get(c.id, [])
        if not c_asgs:
            continue

        default_asgs = [a for a in c_asgs if subgroup_is_default.get(a.subGroupId, False)]
        split_asgs = [a for a in c_asgs if not subgroup_is_default.get(a.subGroupId, False)]

        # Group split assignments by subgroup
        split_by_subgroup: Dict[str, List[Any]] = {}
        for a in split_asgs:
            split_by_subgroup.setdefault(a.subGroupId, []).append(a)

        for d in range(num_days):
            for p in range(num_periods):
                # Default (whole class) assignment count at this period
                default_sum = sum(x[(a.id, d, p)] for a in default_asgs)
                model.Add(default_sum <= 1)

                # Each subgroup can have at most 1 lesson
                for sg_id, sg_asgs in split_by_subgroup.items():
                    sg_sum = sum(x[(a.id, d, p)] for a in sg_asgs)
                    model.Add(sg_sum <= 1)
                    # If whole class is active, split subgroup cannot be active
                    model.Add(default_sum + sg_sum <= 1)

    # 4. Respect fixed/locked slots if provided
    if req.fixedSlots:
        for fixed in req.fixedSlots:
            if (fixed.assignmentId, fixed.day, fixed.period) in x:
                model.Add(x[(fixed.assignmentId, fixed.day, fixed.period)] == 1)

    # Gap calculation and objective
    objective_terms = []
    
    for teacher in req.teachers:
        if teacher.isSupport:
            continue
        t_assignments = [a for a in core_assignments if a.teacherId == teacher.id]
        if not t_assignments:
            continue
            
        cons = teacher.constraints
        weekly_gaps_vars = []

        for d in range(num_days):
            daily_active = [
                sum(x[(a.id, d, p)] for a in t_assignments)
                for p in range(num_periods)
            ]
            daily_hours = sum(daily_active)
            
            # To calculate span, we find first and last active periods
            is_working_day = model.NewBoolVar(f"work_day_t{teacher.id}_d{d}")
            model.Add(daily_hours > 0).OnlyEnforceIf(is_working_day)
            model.Add(daily_hours == 0).OnlyEnforceIf(is_working_day.Not())

            first_p = model.NewIntVar(0, num_periods - 1, f"first_t{teacher.id}_d{d}")
            last_p = model.NewIntVar(0, num_periods - 1, f"last_t{teacher.id}_d{d}")
            
            # If not working, first_p and last_p are 0 (and span is 0)
            model.Add(first_p == 0).OnlyEnforceIf(is_working_day.Not())
            model.Add(last_p == 0).OnlyEnforceIf(is_working_day.Not())
            
            # AddMinEquality and AddMaxEquality for finding boundaries
            first_exprs = []
            last_exprs = []
            for p in range(num_periods):
                p_active_bool = model.NewBoolVar(f"p_act_bool_t{teacher.id}_d{d}_p{p}")
                model.Add(daily_active[p] == 1).OnlyEnforceIf(p_active_bool)
                model.Add(daily_active[p] == 0).OnlyEnforceIf(p_active_bool.Not())
                
                # For first: if active -> p, else -> M
                first_exprs.append(p * p_active_bool + num_periods * p_active_bool.Not())
                # For last: if active -> p, else -> 0
                last_exprs.append(p * p_active_bool)
                
            model.AddMinEquality(first_p, first_exprs)
            model.AddMaxEquality(last_p, last_exprs)
            
            span = model.NewIntVar(0, num_periods, f"span_t{teacher.id}_d{d}")
            model.Add(span == last_p - first_p + 1).OnlyEnforceIf(is_working_day)
            model.Add(span == 0).OnlyEnforceIf(is_working_day.Not())
            
            daily_gaps = model.NewIntVar(0, num_periods, f"gaps_t{teacher.id}_d{d}")
            model.Add(daily_gaps == span - daily_hours)
            weekly_gaps_vars.append(daily_gaps)
            
            # Penalize gaps to minimize them globally
            objective_terms.append(daily_gaps * 10)

            # Hard Constraint: Max Total Gaps Per Day
            if cons and cons.maxTotalGapsPerDay is not None:
                model.Add(daily_gaps <= cons.maxTotalGapsPerDay)
                
            # Hard Constraint: Max Consecutive Gaps
            if cons and cons.maxConsecutiveGaps is not None:
                max_cg = cons.maxConsecutiveGaps
                if max_cg < num_periods:
                    # Forbid sequences of (active, empty x (max_cg+1), active)
                    # A simpler way: inside the span, we cannot have max_cg + 1 consecutive zeros
                    window = max_cg + 1
                    for p in range(num_periods - window + 1):
                        # If p >= first_p and p + window <= last_p, then the sum of active in window > 0
                        # Equivalently, sum(active in window) == 0 implies it's outside the span
                        window_sum = sum(daily_active[p + i] for i in range(window))
                        is_empty_window = model.NewBoolVar(f"empty_win_t{teacher.id}_d{d}_p{p}")
                        model.Add(window_sum == 0).OnlyEnforceIf(is_empty_window)
                        model.Add(window_sum > 0).OnlyEnforceIf(is_empty_window.Not())
                        
                        # If window is entirely empty, it must be either before first_p or after last_p
                        model.Add(first_p > p).OnlyEnforceIf(is_empty_window)
                        model.Add(last_p < p + window).OnlyEnforceIf(is_empty_window)

        # Hard Constraint: Max Total Gaps Per Week
        if cons and cons.maxTotalGapsPerWeek is not None:
            model.Add(sum(weekly_gaps_vars) <= cons.maxTotalGapsPerWeek)

    if objective_terms:
        model.Minimize(sum(objective_terms))

    # Solve Layer 1
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 15.0
    solver.parameters.num_search_workers = 4

    status_1 = solver.Solve(model)

    if status_1 not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        elapsed = time.time() - start_time
        return SolveResponse(
            status="INFEASIBLE",
            solveTimeSeconds=elapsed,
            slots=[],
            conflicts=[
                "Δεν βρέθηκε έγκυρη λύση για το βασικό πρόγραμμα (Layer 1).",
                "Ελέγξτε τις διαθεσιμότητες των εκπαιδευτικών ή το σύνολο των απαιτούμενων ωρών ανά τμήμα.",
            ],
            diagnostics={
                "coreAssignmentsCount": len(core_assignments),
                "totalHoursRequired": sum(a.hours for a in core_assignments),
                "availableSlots": len(req.classes) * num_days * num_periods,
            }
        )

    # Collect Layer 1 results
    results: List[SlotResult] = []
    for asg in core_assignments:
        cid = subgroup_to_class.get(asg.subGroupId, "")
        for d in range(num_days):
            for p in range(num_periods):
                if solver.Value(x[(asg.id, d, p)]) == 1:
                    results.append(
                        SlotResult(
                            id=f"slot-{uuid.uuid4().hex[:8]}",
                            day=d,
                            period=p,
                            assignmentId=asg.id,
                            classId=cid,
                            subGroupId=asg.subGroupId,
                            teacherId=asg.teacherId,
                            subjectId=asg.subjectId,
                            isSupport=False,
                            layer=1,
                        )
                    )

    # -------------------------------------------------------------
    # LAYER 2: Support Overlay CP-SAT Formulation
    # -------------------------------------------------------------
    if False and support_assignments:  # Temporarily disabled Layer 2
        model_2 = cp_model.CpModel()
        y: Dict[Tuple[str, int, int], cp_model.IntVar] = {}

        for asg in support_assignments:
            for d in range(num_days):
                for p in range(num_periods):
                    y[(asg.id, d, p)] = model_2.NewBoolVar(f"y_{asg.id}_d{d}_p{p}")

        # 1. Hours required for support assignments
        for asg in support_assignments:
            model_2.Add(
                sum(y[(asg.id, d, p)] for d in range(num_days) for p in range(num_periods))
                == asg.hours
            )

        # 2. Therapist collision & availability (a therapist cannot be in 2 classes at once)
        for teacher in req.teachers:
            if not teacher.isSupport:
                continue
            sup_t_asgs = [a for a in support_assignments if a.teacherId == teacher.id]
            if not sup_t_asgs:
                continue
            
            total_sup_hours = sum(a.hours for a in sup_t_asgs)
            cons = teacher.constraints

            for d in range(num_days):
                # Check available days
                if cons and cons.availableDays is not None and d not in cons.availableDays:
                    for a in sup_t_asgs:
                        for p in range(num_periods):
                            model_2.Add(y[(a.id, d, p)] == 0)
                    continue

                daily_p_vars = []
                for p in range(num_periods):
                    # Check availability
                    is_available = True
                    if cons and cons.availability:
                        day_key = str(d)
                        avail_list = cons.availability.get(day_key)
                        if avail_list and p < len(avail_list):
                            is_available = avail_list[p]
                    if not is_available:
                        for a in sup_t_asgs:
                            model_2.Add(y[(a.id, d, p)] == 0)
                    else:
                        model_2.Add(sum(y[(a.id, d, p)] for a in sup_t_asgs) <= 1)

                    p_act = model_2.NewBoolVar(f"sup_p_act_t{teacher.id}_d{d}_p{p}")
                    model_2.Add(p_act == sum(y[(a.id, d, p)] for a in sup_t_asgs))
                    daily_p_vars.append(p_act)

                daily_hours = sum(daily_p_vars)
                if cons and cons.maxHoursPerDay is not None:
                    model_2.Add(daily_hours <= cons.maxHoursPerDay)

                if cons and cons.minHoursPerDay is not None:
                    min_h = cons.minHoursPerDay
                    effective_min_h = min(min_h, total_sup_hours)
                    if effective_min_h > 1:
                        is_working = model_2.NewBoolVar(f"sup_working_t{teacher.id}_d{d}")
                        model_2.Add(daily_hours >= effective_min_h * is_working)
                        model_2.Add(daily_hours <= num_periods * is_working)

        # 3. Class collision: At most 1 therapist per class at the same time!
        for c in req.classes:
            c_sup_asgs = [
                a for a in support_assignments
                if subgroup_to_class.get(a.subGroupId) == c.id
            ]
            for d in range(num_days):
                for p in range(num_periods):
                    model_2.Add(sum(y[(a.id, d, p)] for a in c_sup_asgs) <= 1)

            # Class flexible support hours constraint
            if c.supportHoursMin > 0 or c.supportHoursMax > 0:
                tot_c_sup = sum(
                    y[(a.id, d, p)]
                    for a in c_sup_asgs
                    for d in range(num_days)
                    for p in range(num_periods)
                )
                if c.supportHoursMin > 0:
                    model_2.Add(tot_c_sup >= c.supportHoursMin)
                if c.supportHoursMax > 0:
                    model_2.Add(tot_c_sup <= c.supportHoursMax)

        solver_2 = cp_model.CpSolver()
        solver_2.parameters.max_time_in_seconds = 10.0
        status_2 = solver_2.Solve(model_2)

        if status_2 in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for asg in support_assignments:
                cid = subgroup_to_class.get(asg.subGroupId, "")
                for d in range(num_days):
                    for p in range(num_periods):
                        if solver_2.Value(y[(asg.id, d, p)]) == 1:
                            results.append(
                                SlotResult(
                                    id=f"slot-sup-{uuid.uuid4().hex[:8]}",
                                    day=d,
                                    period=p,
                                    assignmentId=asg.id,
                                    classId=cid,
                                    subGroupId=asg.subGroupId,
                                    teacherId=asg.teacherId,
                                    subjectId=asg.subjectId,
                                    isSupport=True,
                                    layer=2,
                                )
                            )

    elapsed = time.time() - start_time
    status_str = "OPTIMAL" if status_1 == cp_model.OPTIMAL else "FEASIBLE"

    return SolveResponse(
        status=status_str,
        solveTimeSeconds=round(elapsed, 3),
        slots=results,
        conflicts=[],
        diagnostics={
            "totalSlotsAssigned": len(results),
            "coreSlots": len([s for s in results if not s.isSupport]),
            "supportSlots": len([s for s in results if s.isSupport]),
        }
    )

def validate_move(req: ValidateMoveRequest) -> ValidateMoveResponse:
    target_slot = next((s for s in req.allSlots if s.id == req.slotId), None)
    if not target_slot:
        return ValidateMoveResponse(valid=False, clashReason="Το κελί δεν βρέθηκε.")

    subgroup_to_class = {sg.id: sg.classId for sg in req.subGroups}
    subgroup_is_default = {sg.id: sg.isDefault for sg in req.subGroups}

    target_class_id = target_slot.classId
    target_teacher_id = target_slot.teacherId
    is_support = target_slot.isSupport

    for other in req.allSlots:
        if other.id == target_slot.id:
            continue
        if other.day != req.targetDay or other.period != req.targetPeriod:
            continue

        # 1. Teacher collision check
        if other.teacherId == target_teacher_id:
            return ValidateMoveResponse(
                valid=False,
                clashReason=f"Ο/Η εκπαιδευτικός διδάσκει ήδη την ώρα αυτή στο τμήμα {other.classId}."
            )

        # 2. Class collision check
        if other.classId == target_class_id:
            # If both are support, max 1 therapist per class
            if is_support and other.isSupport:
                return ValidateMoveResponse(
                    valid=False,
                    clashReason="Υπάρχει ήδη υποστηρικτική ειδικότητα στο τμήμα την ίδια ώρα."
                )

            # If core: check whole-class vs split
            if not is_support and not other.isSupport:
                tgt_is_def = subgroup_is_default.get(target_slot.subGroupId, False)
                oth_is_def = subgroup_is_default.get(other.subGroupId, False)

                if tgt_is_def or oth_is_def:
                    return ValidateMoveResponse(
                        valid=False,
                        clashReason="Το τμήμα έχει ήδη μάθημα ολομέλειας τη συγκεκριμένη ώρα."
                    )
                if target_slot.subGroupId == other.subGroupId:
                    return ValidateMoveResponse(
                        valid=False,
                        clashReason="Η υπο-ομάδα έχει ήδη μάθημα τη συγκεκριμένη ώρα."
                    )

    return ValidateMoveResponse(valid=True, clashReason=None)
