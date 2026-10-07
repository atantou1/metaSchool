def solve_support_timetable(req: SolveRequest) -> SolveResponse:
    start_time = time.time()
    model = cp_model.CpModel()

    # Dynamic periods and days from school configuration
    num_days = len(req.schoolConfig.days) if req.schoolConfig.days else 5
    morning_periods = [p.index for p in req.schoolConfig.periods] if req.schoolConfig.periods else list(range(6))
    allday_periods = [p.index for p in req.schoolConfig.allDayPeriods] if req.schoolConfig.allDayPeriods else [6, 7, 8, 9]
    all_periods = sorted(list(set(morning_periods + allday_periods)))

    # 1. Filter active teachers (BOTH basic and support)
    teachers = [t for t in req.teachers if t.isActive and t.maxWeeklyHours > 0 and t.id != "tch-unassigned"]
    classes = req.classes
    subjects = req.subjects

    class_by_id = {c.id: c for c in classes}
    teacher_by_id = {t.id: t for t in teachers}

    # Head teacher mapping
    teacher_is_ht_of = {
        t.id: next((c.id for c in classes if c.headTeacherId == t.id), None)
        for t in teachers
    }

    # 2. Build subgroup mappings
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
    y: Dict[Tuple[str, str, str, int, int, int], cp_model.IntVar] = {}
    eligible_tuples: List[Tuple[str, str, str, int, int, int]] = []

    for t in teachers:
        t_id = t.id
        t_spec = t.specialty
        t_is_morning = t.isMorning
        t_is_allday = t.isAllDay
        t_is_support = t.isSupport

        c_ht = teacher_is_ht_of.get(t_id)
        c_ht_obj = class_by_id.get(c_ht) if c_ht else None
        is_morning_ht = (c_ht_obj is not None and not c_ht_obj.isAllDay)
        is_allday_ht = (c_ht_obj is not None and c_ht_obj.isAllDay)

        for s in subjects:
            s_id = s.id
            if not t_is_support and subject_allowed_spec[s_id] and t_spec not in subject_allowed_spec[s_id]:
                continue

            for c in classes:
                c_id = c.id
                c_is_allday = c.isAllDay

                # Same logic as basic solver: morning HT strictly in own class, etc.
                if is_morning_ht and c_ht != c_id:
                    continue

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
                    if is_allday_ht and not c_is_allday and g_idx == 0:
                        continue

                    for d in range(num_days):
                        for p in valid_periods:
                            var = model.NewBoolVar(f"y_{t_id[:4]}_{s_id[:4]}_{c_id[:4]}_g{g_idx}_d{d}_p{p}")
                            y[(t_id, s_id, c_id, g_idx, d, p)] = var
                            eligible_tuples.append((t_id, s_id, c_id, g_idx, d, p))

    # 5. Teacher constraints
    objective_terms = []

    # 5a. Enforce weekly hours
    for t in teachers:
        # NOTE: Support teachers also follow their weekly hours
        if not t.isActive or not t.isTeaching or t.id == 'tch-unassigned':
            continue
            
        t_id = t.id
        t_max_h = t.maxWeeklyHours
        t_vars = [y[key] for key in eligible_tuples if key[0] == t_id]
        if t_vars:
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
        max_cg = cons.maxConsecutiveGaps if cons and cons.maxConsecutiveGaps is not None else None
        max_tg_day = cons.maxTotalGapsPerDay if cons and cons.maxTotalGapsPerDay is not None else None
        is_regular_tch = t.isActive and t.isTeaching and t.id != 'tch-unassigned' # Both basic and support

        t_periods = []
        if t.isMorning:
            t_periods.extend(morning_periods)
        if t.isAllDay:
            t_periods.extend(allday_periods)
        t_periods = sorted(list(set(t_periods)))

        valid_avail_days = []
        for d in range(num_days):
            if avail_days is not None and d not in avail_days:
                continue
            day_has_period = False
            for p in t_periods:
                p_vars = [y[k] for k in eligible_tuples if k[0] == t_id and k[4] == d and k[5] == p]
                if not p_vars:
                    continue
                is_avail = True
                if avail_grid:
                    d_list = avail_grid.get(str(d))
                    if d_list and p < len(d_list):
                        is_avail = d_list[p]
                if is_avail:
                    day_has_period = True
                    break
            if day_has_period:
                valid_avail_days.append(d)

        num_valid_days = len(valid_avail_days)

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
                    model.Add(sum(p_vars) <= 1)
                    p_act = model.NewBoolVar(f"pact_{t_id[:4]}_{d}_{p}")
                    model.Add(p_act == sum(p_vars))
                    daily_p_dict[p] = p_act
                    avail_p_on_day.append(p)

            daily_hours = sum(daily_p_dict.values())
            eff_max_h = max_h if not (t.isMorning and t.isAllDay) else max(max_h, len(morning_periods))

            w_d = model.NewBoolVar(f"w_{t_id[:4]}_{d}")
            eff_min = min(min_h, eff_max_h) if min_h else 1

            if is_regular_tch and t_max_h > 0:
                if d in valid_avail_days:
                    if t_max_h >= num_valid_days:
                        model.Add(w_d == 1)
                        if min_h and min_h > 0:
                            if num_valid_days * min_h <= t_max_h:
                                eff_min = min(min_h, eff_max_h)
                            else:
                                eff_min = max(1, t_max_h // num_valid_days)
                        else:
                            eff_min = 1
                        model.Add(daily_hours >= eff_min)
                        model.Add(daily_hours <= eff_max_h)
                    else:
                        eff_min = min(min_h, eff_max_h) if min_h else 1
                        model.Add(daily_hours >= eff_min * w_d)
                        model.Add(daily_hours <= eff_max_h * w_d)
                else:
                    model.Add(w_d == 0)
                    model.Add(daily_hours == 0)
            else:
                if d not in valid_avail_days:
                    model.Add(w_d == 0)
                    model.Add(daily_hours == 0)
                else:
                    eff_min = min(min_h, eff_max_h) if min_h else 1
                    model.Add(daily_hours >= eff_min * w_d)
                    model.Add(daily_hours <= eff_max_h * w_d)

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

            if max_ch and max_ch < len(t_periods):
                for i in range(len(t_periods) - max_ch):
                    consec = [daily_p_dict[t_periods[i + offset]] for offset in range(max_ch + 1)]
                    model.Add(sum(consec) <= max_ch)

            if max_cg is not None and len(t_periods) >= 3:
                for i in range(len(t_periods)):
                    for j in range(i + 1, len(t_periods)):
                        p_start = t_periods[i]
                        p_end = t_periods[j]
                        gap_count = p_end - p_start - 1
                        if gap_count == max_cg + 1 or (max_cg == 0 and gap_count >= 1):
                            middle_vars = [daily_p_dict[p] for p in range(p_start + 1, p_end) if p in daily_p_dict]
                            if middle_vars:
                                model.Add(daily_p_dict[p_start] + daily_p_dict[p_end] - sum(middle_vars) <= 1)
                            else:
                                model.Add(daily_p_dict[p_start] + daily_p_dict[p_end] <= 1)

            if max_tg_day is not None:
                if max_tg_day == 0:
                    for i in range(len(t_periods)):
                        for j in range(i + 2, len(t_periods)):
                            p_start = t_periods[i]
                            p_end = t_periods[j]
                            middle_vars = [daily_p_dict[p] for p in range(p_start + 1, p_end) if p in daily_p_dict]
                            if middle_vars:
                                model.Add(daily_p_dict[p_start] + daily_p_dict[p_end] - sum(middle_vars) <= 1)
                            else:
                                model.Add(daily_p_dict[p_start] + daily_p_dict[p_end] <= 1)
                else:
                    start_p = model.NewIntVar(0, len(all_periods), f"st_{t_id[:4]}_{d}")
                    end_p = model.NewIntVar(0, len(all_periods), f"en_{t_id[:4]}_{d}")
                    span = model.NewIntVar(0, len(all_periods), f"sp_{t_id[:4]}_{d}")
                    for p in t_periods:
                        model.Add(start_p <= p).OnlyEnforceIf(daily_p_dict[p])
                        model.Add(end_p >= p).OnlyEnforceIf(daily_p_dict[p])
                    model.Add(span == end_p - start_p + 1).OnlyEnforceIf(w_d)
                    model.Add(span == 0).OnlyEnforceIf(w_d.Not())
                    model.Add(span - daily_hours <= max_tg_day).OnlyEnforceIf(w_d)

    # 6. Class schedule & subgroup concurrency constraints
    for c in classes:
        c_id = c.id
        c_is_allday = c.isAllDay
        valid_periods = allday_periods if c_is_allday else morning_periods

        for d in range(num_days):
            for p in valid_periods:
                def_vars_basic = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 0 and k[4] == d and k[5] == p and not teacher_by_id[k[0]].isSupport]
                sg1_vars_basic = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 1 and k[4] == d and k[5] == p and not teacher_by_id[k[0]].isSupport]
                sg2_vars_basic = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 2 and k[4] == d and k[5] == p and not teacher_by_id[k[0]].isSupport]

                def_vars_support = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 0 and k[4] == d and k[5] == p and teacher_by_id[k[0]].isSupport]
                sg1_vars_support = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 1 and k[4] == d and k[5] == p and teacher_by_id[k[0]].isSupport]
                sg2_vars_support = [y[k] for k in eligible_tuples if k[2] == c_id and k[3] == 2 and k[4] == d and k[5] == p and teacher_by_id[k[0]].isSupport]

                all_basic = def_vars_basic + sg1_vars_basic + sg2_vars_basic
                all_support = def_vars_support + sg1_vars_support + sg2_vars_support

                # EXACTLY 1 active session type for BASIC teachers
                is_default_active = model.NewBoolVar(f"def_act_c{c_id}_d{d}_p{p}")
                is_split_active = model.NewBoolVar(f"split_act_c{c_id}_d{d}_p{p}")
                
                model.Add(is_default_active + is_split_active == 1)
                
                # If Main is active
                model.Add(sum(def_vars_basic) >= 1).OnlyEnforceIf(is_default_active)
                model.Add(sum(sg1_vars_basic) == 0).OnlyEnforceIf(is_default_active)
                model.Add(sum(sg2_vars_basic) == 0).OnlyEnforceIf(is_default_active)
                
                model.Add(sum(sg1_vars_support) == 0).OnlyEnforceIf(is_default_active)
                model.Add(sum(sg2_vars_support) == 0).OnlyEnforceIf(is_default_active)

                # If Split is active
                model.Add(sum(def_vars_basic) == 0).OnlyEnforceIf(is_split_active)
                model.Add(sum(sg1_vars_basic) >= 1).OnlyEnforceIf(is_split_active)
                model.Add(sum(sg2_vars_basic) >= 1).OnlyEnforceIf(is_split_active)

                model.Add(sum(def_vars_support) == 0).OnlyEnforceIf(is_split_active)

                # Global total capacity and Support dependence on Basic
                model.Add(sum(all_basic) + sum(all_support) <= 3)

                # Bind Support Subject to Basic Subject
                for s in subjects:
                    c_s_p_basic = [y[k] for k in eligible_tuples if k[2] == c_id and k[1] == s.id and k[4] == d and k[5] == p and not teacher_by_id[k[0]].isSupport]
                    c_s_p_support = [y[k] for k in eligible_tuples if k[2] == c_id and k[1] == s.id and k[4] == d and k[5] == p and teacher_by_id[k[0]].isSupport]
                    if c_s_p_support:
                        model.Add(sum(c_s_p_support) <= 3 * sum(c_s_p_basic))

    # 7. Subject hours per class (BASIC ONLY)
    for c in classes:
        c_id = c.id
        c_grade = c.grade
        for s in subjects:
            s_id = s.id
            ch = subject_class_hours[s_id].get(c_id) or subject_class_hours[s_id].get(c_grade, [0, 0])
            s_c_vars_basic = [y[k] for k in eligible_tuples if k[2] == c_id and k[1] == s_id and not teacher_by_id[k[0]].isSupport]
            if ch and len(ch) >= 2:
                min_h = ch[0]
                max_h = ch[1]
                if min_h > 0:
                    model.Add(sum(s_c_vars_basic) >= min_h)
                if max_h > 0:
                    model.Add(sum(s_c_vars_basic) <= max_h)

    # 7b. Support hours per class
    for c in classes:
        c_vars_support = [y[k] for k in eligible_tuples if k[2] == c.id and teacher_by_id[k[0]].isSupport]
        if c.supportHoursMin > 0:
            model.Add(sum(c_vars_support) >= c.supportHoursMin)
        if c.supportHoursMax > 0:
            model.Add(sum(c_vars_support) <= c.supportHoursMax)

    # 8. Locked / Fixed slots
    if req.fixedSlots:
        for fixed in req.fixedSlots:
            matching_keys = [
                k for k in eligible_tuples
                if k[4] == fixed.day and k[5] == fixed.period
                and (not fixed.teacherId or k[0] == fixed.teacherId)
                and (not fixed.subjectId or k[1] == fixed.subjectId)
                and (not fixed.classId or k[2] == fixed.classId)
                and (not fixed.subGroupId or (k[2] in subgroups_by_class and subgroups_by_class[k[2]].get(k[3]) == fixed.subGroupId))
            ]
            for mk in matching_keys:
                model.Add(y[mk] == 1)

    if objective_terms:
        model.Minimize(sum(objective_terms))

    # 9. Solve CP-SAT Model
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 300.0
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
                "Δεν βρέθηκε έγκυρη λύση για το συνολικό πρόγραμμα (Βασικές + Συμπληρωματικές).",
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
            is_supp = teacher_by_id[t_id].isSupport
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
                    isSupport=is_supp,
                    layer=2 if is_supp else 1,
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
            "coreSlots": sum(1 for s in results if not s.isSupport),
            "supportSlots": sum(1 for s in results if s.isSupport),
        }
    )

