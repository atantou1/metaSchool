import time
import uuid
from typing import Dict, List, Tuple, Any
from ortools.sat.python import cp_model
from app.models import (
    SolveRequest,
    SolveResponse,
    SlotResult,
    ValidateMoveRequest,
    ValidateMoveResponse,
)
from app.diagnostics import run_diagnostics

def solve_timetable(req: SolveRequest) -> SolveResponse:
    start_time = time.time()
    model = cp_model.CpModel()

    # Dynamic periods and days from school configuration
    num_days = len(req.schoolConfig.days) if req.schoolConfig.days else 5
    morning_periods = [p.index for p in req.schoolConfig.periods] if req.schoolConfig.periods else list(range(6))
    allday_periods = [p.index for p in req.schoolConfig.allDayPeriods] if req.schoolConfig.allDayPeriods else [6, 7, 8, 9]
    all_periods = sorted(list(set(morning_periods + allday_periods)))

    # 1. Filter active core teachers
    teachers = [t for t in req.teachers if not t.isSupport and t.isActive and t.maxWeeklyHours > 0 and t.id != "tch-unassigned"]
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
        is_allday_ht = (c_ht_obj is not None and c_ht_obj.isAllDay)

        for s in subjects:
            s_id = s.id
            if subject_allowed_spec[s_id] and t_spec not in subject_allowed_spec[s_id]:
                continue

            for c in classes:
                c_id = c.id
                c_is_allday = c.isAllDay

                # 1. Morning Head Teacher: STRICTLY in their own class (all hours: whole-class or subgroup)
                if is_morning_ht and c_ht != c_id:
                    continue

                # 2. All-Day Head Teacher: in All-Day class (during all-day periods) OR in morning classes (for remaining hours)
                if is_allday_ht:
                    if c_is_allday:
                        if c_ht != c_id:
                            continue
                        valid_periods = allday_periods
                    else:
                        valid_periods = morning_periods
                else:
                    if not c_is_allday:
                        if not t_is_morning:
                            continue
                        valid_periods = morning_periods
                    else:
                        if not t_is_allday:
                            continue
                        valid_periods = allday_periods

                for g_idx in [0, 1, 2]:
                    # All-Day Head teacher teaching in morning classes teaches in subgroup/co-teaching (g_idx in (1, 2))
                    if is_allday_ht and not c_is_allday and g_idx == 0:
                        continue

                    for d in range(num_days):
                        for p in valid_periods:
                            var = model.NewBoolVar(f"y_{t_id[:4]}_{s_id[:4]}_{c_id[:4]}_g{g_idx}_d{d}_p{p}")
                            y[(t_id, s_id, c_id, g_idx, d, p)] = var
                            eligible_tuples.append((t_id, s_id, c_id, g_idx, d, p))

    # 5. Teacher constraints
    objective_terms = []

    # 5a. Enforce each teacher's exact contract weekly hours
    for t in teachers:
        t_id = t.id
        t_max_h = t.maxWeeklyHours
        t_vars = [y[key] for key in eligible_tuples if key[0] == t_id]
        if t_vars:
            if t_id in ['tch-agg', 'tch-ant', 'tch-atl', 'tch-gki', 'tch-dhm', 'tch-eys', 'tch-hli', 'tch-kaz', 'tch-krg', 'tch-kat', 'tch-lan', 'tch-lat', 'tch-man', 'tch-mhl', 'tch-mpe', 'tch-mpo', 'tch-mpn', 'tch-mpt', 'tch-pap', 'tch-pal', 'tch-tza', 'tch-tsa', 'tch-xal']:
                model.Add(sum(t_vars) == t_max_h)


    # 5b. Teacher availability & daily workload
    for t in teachers:
        t_id = t.id
        t_max_h = t.maxWeeklyHours
        cons = t.constraints
        avail_days = cons.availableDays if cons and cons.availableDays is not None else list(range(num_days))
        avail_grid = cons.availability if cons and cons.availability else {}
        max_h = cons.maxHoursPerDay if cons and cons.maxHoursPerDay is not None else len(all_periods)
        min_h = cons.minHoursPerDay if cons and cons.minHoursPerDay is not None else 0
        max_ch = cons.maxConsecutiveHours if cons and cons.maxConsecutiveHours is not None else None

        t_periods = []
        if t.isMorning:
            t_periods.extend(morning_periods)
        if t.isAllDay:
            t_periods.extend(allday_periods)
        t_periods = sorted(list(set(t_periods)))

        for d in range(num_days):
            daily_p_dict = {}
            avail_p_on_day = []
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
                    avail_p_on_day.append(p)

            daily_hours = sum(daily_p_dict.values())
            eff_max_h = max_h if not (t.isMorning and t.isAllDay) else max(max_h, len(morning_periods))

            # Enforce minimum hours on active working days:
            # If working on day d (w_d == 1), then eff_min <= daily_hours <= eff_max_h
            # If off on day d (w_d == 0), then daily_hours == 0
            w_d = model.NewBoolVar(f"w_{t_id[:4]}_{d}")
            eff_min = min(min_h, eff_max_h) if min_h else 1
            if min_h and min_h > 0:
                model.Add(daily_hours >= eff_min * w_d)
            else:
                model.Add(daily_hours >= 1 * w_d)
            model.Add(daily_hours <= eff_max_h * w_d)

            # Enforce first & last available hour requirement if enabled
            # Can be configured per teacher (cons.requireFirstAndLastHour) or globally (schoolConfig / req)
            req_edge = False
            if cons and cons.requireFirstAndLastHour is not None:
                req_edge = cons.requireFirstAndLastHour
            elif req.schoolConfig and getattr(req.schoolConfig, 'requireFirstAndLastHour', None) is not None:
                req_edge = req.schoolConfig.requireFirstAndLastHour
            elif getattr(req, 'requireFirstAndLastHour', None) is not None:
                req_edge = req.requireFirstAndLastHour

            if req_edge and avail_p_on_day:
                first_p = min(avail_p_on_day)
                last_p = max(avail_p_on_day)
                if first_p == last_p:
                    model.Add(daily_p_dict[first_p] >= w_d)
                else:
                    if eff_min >= 2:
                        model.Add(daily_p_dict[first_p] >= w_d)
                        model.Add(daily_p_dict[last_p] >= w_d)
                    else:
                        is_multi = model.NewBoolVar(f"mh_{t_id[:4]}_{d}")
                        model.Add(daily_hours >= 2).OnlyEnforceIf(is_multi)
                        model.Add(daily_hours <= 1).OnlyEnforceIf(is_multi.Not())
                        model.Add(daily_p_dict[first_p] >= is_multi)
                        model.Add(daily_p_dict[last_p] >= is_multi)
                        model.Add(daily_p_dict[first_p] + daily_p_dict[last_p] >= w_d - is_multi)

            # Max consecutive hours constraint (sliding window within active shift)
            if max_ch and max_ch < len(t_periods):
                for i in range(len(t_periods) - max_ch):
                    consec = [daily_p_dict[t_periods[i + offset]] for offset in range(max_ch + 1)]
                    model.Add(sum(consec) <= max_ch)

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

                # HARD CONSTRAINT: Every class period must have EXACTLY 1 active session (NO EMPTY PERIODS!)
                # Either exactly 1 whole-class lesson (def_sum == 1, sg1_sum == 0, sg2_sum == 0)
                # OR exactly 1 split session where both subgroups are active (def_sum == 0, sg1_sum == 1, sg2_sum == 1)
                model.Add(sum(def_vars) + sum(sg1_vars) == 1)
                model.Add(sum(sg1_vars) == sum(sg2_vars))
                model.Add(sum(def_vars) <= 1)

    # 7. Subject hours per class from the Subjects table
    for c in classes:
        c_id = c.id
        c_grade = c.grade
        for s in subjects:
            s_id = s.id
            ch = subject_class_hours[s_id].get(c_id) or subject_class_hours[s_id].get(c_grade, [0, 0])
            s_c_vars = [y[k] for k in eligible_tuples if k[2] == c_id and k[1] == s_id]
            if ch and len(ch) >= 2:
                min_h = ch[0]
                max_h = ch[1]
                if min_h > 0:
                    model.Add(sum(s_c_vars) >= min_h)
                if max_h > 0:
                    model.Add(sum(s_c_vars) <= max_h)

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
        diag_items = run_diagnostics(req)
        conflict_summaries = [f"{item.title}: {item.description}" for item in diag_items]
        return SolveResponse(
            status="INFEASIBLE",
            solveTimeSeconds=round(elapsed, 3),
            slots=[],
            conflicts=conflict_summaries or [
                "Δεν βρέθηκε έγκυρη λύση για το πρόγραμμα.",
                "Ελέγξτε τις διαθεσιμότητες των εκπαιδευτικών ή το σύνολο των απαιτούμενων ωρών ανά τμήμα.",
            ],
            diagnosticItems=diag_items,
            diagnostics={
                "teachersCount": len(teachers),
                "totalTeacherHours": sum(t.maxWeeklyHours for t in teachers),
                "classesCount": len(classes),
                "itemsCount": len(diag_items),
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
