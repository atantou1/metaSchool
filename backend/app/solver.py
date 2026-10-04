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

    # Dynamic periods and days from school configuration
    num_days = len(req.schoolConfig.days) if req.schoolConfig.days else 5
    morning_periods = [p.index for p in req.schoolConfig.periods] if req.schoolConfig.periods else list(range(6))
    allday_periods = [p.index for p in req.schoolConfig.allDayPeriods] if req.schoolConfig.allDayPeriods else [6, 7, 8, 9]
    all_periods = sorted(list(set(morning_periods + allday_periods)))

    # 1. Filter active core teachers
    teachers = [t for t in req.teachers if not t.isSupport and t.isActive and t.maxWeeklyHours > 0]
    classes = req.classes
    subjects = req.subjects

    class_by_id = {c.id: c for c in classes}
    teacher_by_id = {t.id: t for t in teachers}

    # Head teacher mapping
    teacher_is_ht_of = {
        t.id: next((c.id for c in classes if c.headTeacherId == t.id), None)
        for t in teachers
    }

    # 2. Build subgroup mappings (default group 0, split A group 1, split B group 2)
    subgroups_by_class = {}
    for c in classes:
        c_sgs = [sg for sg in req.subGroups if sg.classId == c.id]
        sg_def = next((sg for sg in c_sgs if sg.isDefault), None)
        sg_def_id = sg_def.id if sg_def else f"grp-{c.id}-main"

        sg_splits = [sg for sg in c_sgs if not sg.isDefault]
        sg_a_id = sg_splits[0].id if len(sg_splits) > 0 else f"grp-{c.id}-subA"
        sg_b_id = sg_splits[1].id if len(sg_splits) > 1 else f"grp-{c.id}-subB"

        subgroups_by_class[c.id] = {
            0: sg_def_id,
            1: sg_a_id,
            2: sg_b_id,
        }

    # 3. Build subject eligibility and class hours
    subject_allowed_spec = {}
    subject_class_hours = {}
    for s in subjects:
        allowed = s.allowedSpecialties if s.allowedSpecialties else []
        subject_allowed_spec[s.id] = allowed
        subject_class_hours[s.id] = s.classHours if s.classHours else {}

    # 4. Create decision variables
    # y[(t_id, s_id, c_id, g_idx, d, p)]
    y: Dict[Tuple[str, str, str, int, int, int], cp_model.IntVar] = {}
    eligible_tuples: List[Tuple[str, str, str, int, int, int]] = []

    for t in teachers:
        t_id = t.id
        t_spec = t.specialty
        t_is_morning = t.isMorning
        t_is_allday = t.isAllDay

        c_ht = teacher_is_ht_of.get(t_id)
        c_ht_obj = class_by_id.get(c_ht) if c_ht else None
        is_morning_ht = (c_ht_obj is not None and not c_ht_obj.isAllDay)

        for s in subjects:
            s_id = s.id
            if subject_allowed_spec[s_id] and t_spec not in subject_allowed_spec[s_id]:
                continue

            for c in classes:
                c_id = c.id
                c_is_allday = c.isAllDay

                # If teacher is head teacher of a morning class (e.g. A1, A2..), they can only teach in their own class!
                if is_morning_ht and c_ht != c_id:
                    continue

                # Class period & teacher availability compatibility:
                # Morning classes run during morning_periods (require t.isMorning)
                # All-day classes run during allday_periods (require t.isAllDay)
                if not c_is_allday:
                    if not t_is_morning:
                        continue
                    valid_periods = morning_periods
                else:
                    if not t_is_allday:
                        continue
                    valid_periods = allday_periods

                for g_idx in [0, 1, 2]:
                    for d in range(num_days):
                        for p in valid_periods:
                            var = model.NewBoolVar(f"y_{t_id[:4]}_{s_id[:4]}_{c_id[:4]}_g{g_idx}_d{d}_p{p}")
                            y[(t_id, s_id, c_id, g_idx, d, p)] = var
                            eligible_tuples.append((t_id, s_id, c_id, g_idx, d, p))

    # 5. Teacher constraints
    objective_terms = []

    for t in teachers:
        t_id = t.id
        t_max_h = t.maxWeeklyHours
        t_vars = [y[key] for key in eligible_tuples if key[0] == t_id]

        # 5a. Cap teacher's weekly hours at their contract maximum
        if t_vars:
            model.Add(sum(t_vars) <= t_max_h)

        # 5b. Head teacher of All-Day (e.g. Kazakis):
        c_ht = teacher_is_ht_of.get(t_id)
        c_ht_obj = class_by_id.get(c_ht) if c_ht else None
        is_allday_ht = bool(c_ht_obj and c_ht_obj.isAllDay)

        # 5c. Teacher availability & daily workload
        cons = t.constraints
        avail_days = cons.availableDays if cons and cons.availableDays is not None else list(range(num_days))
        avail_grid = cons.availability if cons and cons.availability else {}
        max_h = cons.maxHoursPerDay if cons and cons.maxHoursPerDay is not None else len(all_periods)
        min_h = cons.minHoursPerDay if cons and cons.minHoursPerDay is not None else 0

        max_cg = cons.maxConsecutiveGaps if cons and cons.maxConsecutiveGaps is not None else None
        max_g_day = cons.maxTotalGapsPerDay if cons and cons.maxTotalGapsPerDay is not None else None
        max_ch = cons.maxConsecutiveHours if cons and cons.maxConsecutiveHours is not None else None

        t_periods = []
        if t.isMorning:
            t_periods.extend(morning_periods)
        if t.isAllDay:
            t_periods.extend(allday_periods)
        t_periods = sorted(list(set(t_periods)))
        m = len(t_periods)

        for d in range(num_days):
            daily_p_dict = {}
            for p in t_periods:
                p_vars = [y[k] for k in eligible_tuples if k[0] == t_id and k[4] == d and k[5] == p]
                if not p_vars:
                    p_act = model.NewBoolVar(f"p0_{t_id[:4]}_{d}_{p}")
                    model.Add(p_act == 0)
                    daily_p_dict[p] = p_act
                    continue

                is_avail = True
                if avail_days is not None and d not in avail_days:
                    is_avail = False
                if is_avail and avail_grid:
                    d_list = avail_grid.get(str(d))
                    if d_list and p < len(d_list):
                        is_avail = d_list[p]

                if not is_avail:
                    for v in p_vars:
                        model.Add(v == 0)
                    p_act = model.NewBoolVar(f"pun_{t_id[:4]}_{d}_{p}")
                    model.Add(p_act == 0)
                    daily_p_dict[p] = p_act
                else:
                    # Teacher can teach at most 1 lesson at any period
                    model.Add(sum(p_vars) <= 1)
                    p_act = model.NewBoolVar(f"pact_{t_id[:4]}_{d}_{p}")
                    model.Add(p_act == sum(p_vars))
                    daily_p_dict[p] = p_act

            daily_hours = sum(daily_p_dict.values())

            if max_h:
                eff_max_h = max_h if not (t.isMorning and t.isAllDay) else max(max_h, len(morning_periods))
                model.Add(daily_hours <= eff_max_h)

            if min_h and min_h > 1:
                eff_min = min(min_h, t_max_h)
                if eff_min > 1:
                    is_working = model.NewBoolVar(f"w_{t_id[:4]}_{d}")
                    model.Add(daily_hours >= eff_min * is_working)
                    model.Add(daily_hours <= len(t_periods) * is_working)

            # Shift period zones:
            # - For morning-only or all-day-only teachers: single zone (t_periods)
            # - For full-time all-day head teacher (e.g. Kazakis): unified continuous timeline (t_periods)
            # - For dual specialty teachers (e.g. Boutari, Tsalkoutis): evaluate gap limits within morning and within all-day shifts
            shift_zones = [t_periods] if is_allday_ht or not (t.isMorning and t.isAllDay) else [morning_periods, allday_periods]

            for zone in shift_zones:
                m_zone = len(zone)
                # Max consecutive teaching hours within shift
                if max_ch and max_ch < m_zone:
                    for i in range(m_zone - max_ch):
                        consec_vars = [daily_p_dict[zone[i + offset]] for offset in range(max_ch + 1) if zone[i + offset] in daily_p_dict]
                        if len(consec_vars) > max_ch:
                            model.Add(sum(consec_vars) <= max_ch)

                # Max consecutive gaps within shift
                if max_cg is not None:
                    for i, p1 in enumerate(zone):
                        for j, p2 in enumerate(zone):
                            if j >= i + max_cg + 2:
                                intermediate = [daily_p_dict[zone[k]] for k in range(i + 1, j) if zone[k] in daily_p_dict]
                                if intermediate and p1 in daily_p_dict and p2 in daily_p_dict:
                                    model.Add(sum(intermediate) >= daily_p_dict[p1] + daily_p_dict[p2] - 1)

                # Max total gaps per day within shift
                if max_g_day is not None:
                    for i in range(m_zone):
                        pi = zone[i]
                        for j in range(i + 1, m_zone):
                            pj = zone[j]
                            span_len = j - i + 1
                            min_required_lessons = span_len - max_g_day
                            if min_required_lessons > 2 and pi in daily_p_dict and pj in daily_p_dict:
                                window_vars = [daily_p_dict[zone[k]] for k in range(i, j + 1) if zone[k] in daily_p_dict]
                                model.Add(sum(window_vars) >= min_required_lessons).OnlyEnforceIf([daily_p_dict[pi], daily_p_dict[pj]])

            # TRANSITION GAP MINIMIZATION FOR DUAL SPECIALTY TEACHERS:
            # When a teacher teaches in both morning and all-day on day d, penalize any empty periods
            # between their morning and all-day lessons. This naturally forces morning lessons to the late
            # morning (periods 4, 5) directly adjacent to all-day period 6, producing 0 gaps!
            if t.isMorning and t.isAllDay and not is_allday_ht:
                for pm in morning_periods:
                    for pad in allday_periods:
                        for p_mid in range(pm + 1, pad):
                            tgap_var = model.NewBoolVar(f"tgap_{t_id[:4]}_{d}_{pm}_{pad}_{p_mid}")
                            model.Add(tgap_var >= daily_p_dict[pm] + daily_p_dict[pad] - daily_p_dict[p_mid] - 1)
                            objective_terms.append(10 * tgap_var)

    # 6. Class schedule & subgroup concurrency constraints
    for c in classes:
        c_id = c.id
        c_is_allday = c.isAllDay
        valid_periods = allday_periods if c_is_allday else morning_periods

        for d in range(num_days):
            for p in valid_periods:
                def_vars = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 0 and k[4] == d and k[5] == p]
                sg1_vars = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 1 and k[4] == d and k[5] == p]
                sg2_vars = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 2 and k[4] == d and k[5] == p]

                def_sum = sum(def_vars)
                sg1_sum = sum(sg1_vars)
                sg2_sum = sum(sg2_vars)

                # HARD CONSTRAINT: Every class period must have EXACTLY 1 active session (NO EMPTY PERIODS!)
                # Either exactly 1 whole-class lesson (def_sum == 1, sg1_sum == 0, sg2_sum == 0)
                # OR exactly 1 split session where both subgroups are active (def_sum == 0, sg1_sum == 1, sg2_sum == 1)
                model.Add(def_sum + sg1_sum == 1)
                model.Add(sg1_sum == sg2_sum)
                model.Add(def_sum <= 1)

        # 7. Head teacher & Subject hours per class
        for s in subjects:
            s_id = s.id
            ch = subject_class_hours[s_id].get(c_id, [0, 0])
            s_c_vars = [y[k] for k in eligible_tuples if k[2] == c_id and k[1] == s_id]

            # If subject is primary (ΓΛΩΣ) and class has a morning head teacher, ensure head teacher teaches at least 20 hours:
            if s.code == "ΓΛΩΣ" and c.headTeacherId and not c_is_allday:
                ht = teacher_by_id.get(c.headTeacherId)
                if ht and ht.maxWeeklyHours > 0:
                    ht_vars = [y[k] for k in eligible_tuples if k[0] == ht.id and k[2] == c_id]
                    model.Add(sum(ht_vars) >= min(20, ht.maxWeeklyHours))
            elif ch and len(ch) >= 2 and ch[1] > 0 and not (c_is_allday and s.code == "ΓΛΩΣ"):
                min_h = ch[0]
                model.Add(sum(s_c_vars) >= min_h)

    # 8. Locked / Fixed slots
    if req.fixedSlots:
        for fixed in req.fixedSlots:
            matching_keys = [
                k for k in eligible_tuples
                if k[4] == fixed.day and k[5] == fixed.period
                and (not fixed.teacherId or k[0] == fixed.teacherId)
                and (not fixed.subjectId or k[1] == fixed.subjectId)
                and (not fixed.classId or k[2] == fixed.classId)
            ]
            for mk in matching_keys:
                model.Add(y[mk] == 1)

    if objective_terms:
        model.Minimize(sum(objective_terms))

    # 9. Solve CP-SAT Model
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_search_workers = 8

    status_1 = solver.Solve(model)

    if status_1 not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        elapsed = time.time() - start_time
        return SolveResponse(
            status="INFEASIBLE",
            solveTimeSeconds=round(elapsed, 3),
            slots=[],
            conflicts=[
                "Δεν βρέθηκε έγκυρη λύση για το πρόγραμμα.",
                "Ελέγξτε τις διαθεσιμότητες των εκπαιδευτικών ή το σύνολο των απαιτούμενων ωρών ανά τμήμα.",
            ],
            diagnostics={
                "teachersCount": len(teachers),
                "totalTeacherHours": sum(t.maxWeeklyHours for t in teachers),
                "classesCount": len(classes),
            }
        )

    # 10. Collect solution slots
    results: List[SlotResult] = []
    for (t_id, s_id, c_id, g_idx, d, p), var in y.items():
        if solver.Value(var) == 1:
            sg_id = subgroups_by_class[c_id][g_idx]
            results.append(
                SlotResult(
                    id=f"slot-{uuid.uuid4().hex[:8]}",
                    day=d,
                    period=p,
                    assignmentId=None,
                    classId=c_id,
                    subGroupId=sg_id,
                    teacherId=t_id,
                    subjectId=s_id,
                    isSupport=False,
                    layer=1,
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
            "coreSlots": len(results),
            "supportSlots": 0,
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
            if is_support and other.isSupport:
                return ValidateMoveResponse(
                    valid=False,
                    clashReason="Υπάρχει ήδη υποστηρικτική ειδικότητα στο τμήμα την ίδια ώρα."
                )

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
