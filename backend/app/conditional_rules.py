"""
Conditional Rule Engine — OR-Tools CP-SAT Handler
==================================================
Applies CONDITIONAL rules (IF/WHEN → THEN) from the Rule Builder
to the CP-SAT model using constraint reification.

Each CONDITIONAL rule is a logical proposition:
  "When (conditions with AND/OR) → Apply (actions)"

The key CP-SAT mechanism is OnlyEnforceIf(b) — constraints that activate
only when a boolean variable `b` is True.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from ortools.sat.python import cp_model

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def apply_conditional_rules(
    model: cp_model.CpModel,
    x: Dict[Tuple[str, int, int], cp_model.IntVar],
    rules: List[Dict[str, Any]],
    assignments: List[Any],
    teachers: List[Any],
    classes: List[Any],
    subgroups: List[Any],
    num_days: int,
    num_periods: int,
    objective_terms: List,
) -> None:
    """
    Main entry point. Iterates over CONDITIONAL rules and dispatches each one.
    
    Args:
        model:           The CP-SAT model being built
        x:               Decision variable dict: x[(asg_id, day, period)] = BoolVar
        rules:           List of raw rule dicts from the database (params already parsed)
        assignments:     All lesson assignments
        teachers:        All teachers
        classes:         All classes
        subgroups:       All subgroups
        num_days:        Number of school days (e.g. 5)
        num_periods:     Number of periods per day (e.g. 6)
        objective_terms: List of objective terms for soft rules (appended to)
    """
    # Build lookup structures
    teacher_assignments: Dict[str, List[Any]] = {}
    for asg in assignments:
        teacher_assignments.setdefault(asg.teacherId, []).append(asg)

    subject_assignments: Dict[str, List[Any]] = {}
    for asg in assignments:
        subject_assignments.setdefault(asg.subjectId, []).append(asg)

    class_assignments: Dict[str, List[Any]] = {}
    sg_to_class = {sg.id: sg.classId for sg in subgroups}
    for asg in assignments:
        cid = sg_to_class.get(asg.subGroupId)
        if cid:
            class_assignments.setdefault(cid, []).append(asg)

    ctx = _RuleContext(
        model=model,
        x=x,
        assignments=assignments,
        teacher_assignments=teacher_assignments,
        subject_assignments=subject_assignments,
        class_assignments=class_assignments,
        sg_to_class=sg_to_class,
        num_days=num_days,
        num_periods=num_periods,
        objective_terms=objective_terms,
    )

    for rule in rules:
        if not rule.get("isActive", True):
            continue
        rule_type = rule.get("type", "")
        params = rule.get("params", {})
        enforcement = rule.get("enforcement", "hard")
        weight = rule.get("weight", 100)
        rule_name = rule.get("name", rule.get("id", "unknown"))

        if rule_type == "CONDITIONAL":
            try:
                _apply_conditional(ctx, params, enforcement, weight, rule_name)
            except Exception as e:
                logger.warning(f"[ConditionalRules] Failed to apply rule '{rule_name}': {e}")
        else:
            # Legacy flat rules are handled separately — skip here
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Internal context dataclass
# ─────────────────────────────────────────────────────────────────────────────

class _RuleContext:
    __slots__ = [
        "model", "x", "assignments", "teacher_assignments",
        "subject_assignments", "class_assignments", "sg_to_class",
        "num_days", "num_periods", "objective_terms", "_bool_cache",
    ]

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        self._bool_cache: Dict[str, cp_model.IntVar] = {}

    def bool_var(self, name: str) -> cp_model.IntVar:
        """Cache-aware BoolVar factory to avoid naming clashes."""
        if name not in self._bool_cache:
            self._bool_cache[name] = self.model.NewBoolVar(name)
        return self._bool_cache[name]


# ─────────────────────────────────────────────────────────────────────────────
# Conditional rule dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def _apply_conditional(
    ctx: _RuleContext,
    params: Dict[str, Any],
    enforcement: str,
    weight: int,
    rule_name: str,
) -> None:
    """
    Applies a single CONDITIONAL rule.
    
    The strategy:
      1. For each (day, period) slot, evaluate whether the WHEN clause holds.
         This produces a BoolVar `when_holds[(d, p)]`.
      2. For each action in THEN, add the constraint OnlyEnforceIf(when_holds[(d, p)]).
    
    For "day-level" conditions (like is_day, teacher_daily_hours_gt), we build
    day-level BoolVars and fan them out across all periods of that day.
    """
    when_clause = params.get("when", {})
    then_actions = params.get("then", [])

    if not when_clause or not then_actions:
        return

    safe_name = rule_name.replace(" ", "_")[:40]

    # Build when_holds[(d, p)] BoolVars
    when_holds: Dict[Tuple[int, int], cp_model.IntVar] = {}

    for d in range(ctx.num_days):
        for p in range(ctx.num_periods):
            slot_key = f"{safe_name}_d{d}_p{p}"
            wh = _evaluate_when_clause(ctx, when_clause, d, p, slot_key)
            when_holds[(d, p)] = wh

    # Apply THEN actions, enforced only when when_holds is True
    for action_dict in then_actions:
        _apply_action(ctx, action_dict, when_holds, enforcement, weight, safe_name)


# ─────────────────────────────────────────────────────────────────────────────
# WHEN clause evaluation
# ─────────────────────────────────────────────────────────────────────────────

def _evaluate_when_clause(
    ctx: _RuleContext,
    when: Dict[str, Any],
    d: int,
    p: int,
    prefix: str,
) -> cp_model.IntVar:
    """
    Returns a BoolVar that is True iff the entire WHEN clause holds at (d, p).
    Supports nested AND/OR groups.
    """
    groups = when.get("groups", [])
    top_op = when.get("operator", "AND")

    group_vars = []
    for i, group in enumerate(groups):
        gv = _evaluate_group(ctx, group, d, p, f"{prefix}_g{i}")
        group_vars.append(gv)

    return _combine_bools(ctx, group_vars, top_op, f"{prefix}_when")


def _evaluate_group(
    ctx: _RuleContext,
    group: Dict[str, Any],
    d: int,
    p: int,
    prefix: str,
) -> cp_model.IntVar:
    """
    Evaluates a single condition group (list of conditions with AND/OR).
    Returns a BoolVar.
    """
    conditions = group.get("conditions", [])
    op = group.get("operator", "AND")

    cond_vars = []
    for i, cond in enumerate(conditions):
        cv = _evaluate_condition(ctx, cond, d, p, f"{prefix}_c{i}")
        if cv is not None:
            cond_vars.append(cv)

    if not cond_vars:
        # Empty group → always True
        v = ctx.bool_var(f"{prefix}_empty")
        ctx.model.Add(v == 1)
        return v

    return _combine_bools(ctx, cond_vars, op, f"{prefix}_group")


def _evaluate_condition(
    ctx: _RuleContext,
    cond: Dict[str, Any],
    d: int,
    p: int,
    prefix: str,
) -> Optional[cp_model.IntVar]:
    """
    Evaluates a single condition at slot (d, p).
    Returns a BoolVar (True if condition holds) or None if unsupported.
    """
    predicate = cond.get("predicate", "")

    # ── Time predicates (pure day/period checks, no CP-SAT variables needed) ──
    if predicate == "is_day":
        days = cond.get("days", [])
        v = ctx.bool_var(f"{prefix}_is_day")
        ctx.model.Add(v == (1 if d in days else 0))
        return v

    if predicate == "is_period":
        periods = cond.get("periods", [])
        v = ctx.bool_var(f"{prefix}_is_period")
        ctx.model.Add(v == (1 if p in periods else 0))
        return v

    if predicate == "is_period_gte":
        period_from = cond.get("periodFrom", 0)
        v = ctx.bool_var(f"{prefix}_is_pgte")
        ctx.model.Add(v == (1 if p >= period_from else 0))
        return v

    if predicate == "is_period_lte":
        period_to = cond.get("periodTo", 0)
        v = ctx.bool_var(f"{prefix}_is_plte")
        ctx.model.Add(v == (1 if p <= period_to else 0))
        return v

    if predicate == "is_period_range":
        pf = cond.get("periodFrom", 0)
        pt = cond.get("periodTo", 0)
        v = ctx.bool_var(f"{prefix}_is_prange")
        ctx.model.Add(v == (1 if pf <= p <= pt else 0))
        return v

    # ── Teacher predicates ────────────────────────────────────────────────────
    if predicate == "teacher_has_subject":
        teacher_id = cond.get("teacherId")
        subject_id = cond.get("subjectId")
        asgs = [a for a in ctx.assignments
                if a.teacherId == teacher_id and a.subjectId == subject_id]
        if not asgs:
            v = ctx.bool_var(f"{prefix}_thas_subj_false")
            ctx.model.Add(v == 0)
            return v
        # True if ANY matching assignment is active at (d, p)
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_thas_subj")
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        return v

    if predicate == "teacher_in_class":
        teacher_id = cond.get("teacherId")
        class_id = cond.get("classId")
        asgs = [a for a in ctx.assignments
                if a.teacherId == teacher_id
                and ctx.sg_to_class.get(a.subGroupId) == class_id]
        if not asgs:
            v = ctx.bool_var(f"{prefix}_tin_class_false")
            ctx.model.Add(v == 0)
            return v
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_tin_class")
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        return v

    if predicate in ("teacher_has_lesson", "teacher_is_free"):
        teacher_id = cond.get("teacherId")
        asgs = ctx.teacher_assignments.get(teacher_id, [])
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_{predicate}")
        if predicate == "teacher_has_lesson":
            ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
            ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        else:  # teacher_is_free
            ctx.model.Add(active_sum == 0).OnlyEnforceIf(v)
            ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v.Not())
        return v

    if predicate in ("teacher_daily_hours_gt", "teacher_daily_hours_lt", "teacher_daily_hours_eq"):
        teacher_id = cond.get("teacherId")
        threshold = cond.get("value", 0)
        asgs = ctx.teacher_assignments.get(teacher_id, [])
        daily_hours = sum(
            ctx.x.get((a.id, d, pp), ctx.model.NewConstant(0))
            for a in asgs
            for pp in range(ctx.num_periods)
        )
        v = ctx.bool_var(f"{prefix}_{predicate}")
        if predicate == "teacher_daily_hours_gt":
            gt = ctx.bool_var(f"{prefix}_dh_gt_inner")
            ctx.model.Add(daily_hours > threshold).OnlyEnforceIf(gt)
            ctx.model.Add(daily_hours <= threshold).OnlyEnforceIf(gt.Not())
            ctx.model.Add(v == gt)
        elif predicate == "teacher_daily_hours_lt":
            lt = ctx.bool_var(f"{prefix}_dh_lt_inner")
            ctx.model.Add(daily_hours < threshold).OnlyEnforceIf(lt)
            ctx.model.Add(daily_hours >= threshold).OnlyEnforceIf(lt.Not())
            ctx.model.Add(v == lt)
        else:
            eq = ctx.bool_var(f"{prefix}_dh_eq_inner")
            ctx.model.Add(daily_hours == threshold).OnlyEnforceIf(eq)
            ctx.model.Add(daily_hours != threshold).OnlyEnforceIf(eq.Not())
            ctx.model.Add(v == eq)
        return v

    # ── Class/Subject predicates ──────────────────────────────────────────────
    if predicate == "class_has_subject":
        class_id = cond.get("classId")
        subject_id = cond.get("subjectId")
        asgs = [a for a in ctx.assignments
                if a.subjectId == subject_id
                and ctx.sg_to_class.get(a.subGroupId) == class_id]
        if not asgs:
            v = ctx.bool_var(f"{prefix}_chas_subj_false")
            ctx.model.Add(v == 0)
            return v
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_chas_subj")
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        return v

    if predicate == "class_has_support":
        class_id = cond.get("classId")
        asgs = [a for a in ctx.assignments
                if ctx.sg_to_class.get(a.subGroupId) == class_id]
        # We'd need teacher info here — simplified: any assignment in class
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_chas_support")
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        return v

    if predicate == "class_is_free":
        class_id = cond.get("classId")
        asgs = ctx.class_assignments.get(class_id, [])
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_c_free")
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v)
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v.Not())
        return v

    if predicate == "subject_is_scheduled":
        subject_id = cond.get("subjectId")
        class_id = cond.get("classId")
        asgs = [a for a in ctx.subject_assignments.get(subject_id, [])
                if not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id]
        if not asgs:
            v = ctx.bool_var(f"{prefix}_subj_sched_false")
            ctx.model.Add(v == 0)
            return v
        active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
        v = ctx.bool_var(f"{prefix}_subj_sched")
        ctx.model.Add(active_sum >= 1).OnlyEnforceIf(v)
        ctx.model.Add(active_sum == 0).OnlyEnforceIf(v.Not())
        return v

    logger.warning(f"[ConditionalRules] Unknown predicate: '{predicate}' — skipping")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Boolean combination helpers
# ─────────────────────────────────────────────────────────────────────────────

def _combine_bools(
    ctx: _RuleContext,
    bools: List[cp_model.IntVar],
    operator: str,
    name: str,
) -> cp_model.IntVar:
    """Combines a list of BoolVars with AND or OR into a single BoolVar."""
    if not bools:
        v = ctx.bool_var(f"{name}_empty")
        ctx.model.Add(v == 1)
        return v
    if len(bools) == 1:
        return bools[0]

    result = ctx.bool_var(name)
    if operator == "AND":
        # result = 1  iff  all(bools) = 1
        ctx.model.AddBoolAnd(bools).OnlyEnforceIf(result)
        ctx.model.AddBoolOr([b.Not() for b in bools]).OnlyEnforceIf(result.Not())
    else:  # OR
        # result = 1  iff  any(bools) = 1
        ctx.model.AddBoolOr(bools).OnlyEnforceIf(result)
        ctx.model.AddBoolAnd([b.Not() for b in bools]).OnlyEnforceIf(result.Not())
    return result


# ─────────────────────────────────────────────────────────────────────────────
# THEN action applier
# ─────────────────────────────────────────────────────────────────────────────

def _apply_action(
    ctx: _RuleContext,
    action: Dict[str, Any],
    when_holds: Dict[Tuple[int, int], cp_model.IntVar],
    enforcement: str,
    weight: int,
    prefix: str,
) -> None:
    """
    Applies a single THEN action, enforced conditionally by when_holds[(d, p)].
    """
    action_type = action.get("action", "")
    safe_action = action_type.replace(" ", "_")

    # ── Simultaneity actions ──────────────────────────────────────────────────
    if action_type == "teacher_has_subject_same_slot":
        teacher_id = action.get("teacherId")
        subject_id = action.get("subjectId")
        class_id = action.get("classId")
        asgs = [a for a in ctx.assignments
                if a.teacherId == teacher_id and a.subjectId == subject_id
                and (not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id)]
        if not asgs:
            logger.warning(f"[ConditionalRules] {action_type}: no matching assignment found")
            return
        for (d, p), wh in when_holds.items():
            active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
            ctx.model.Add(active_sum >= 1).OnlyEnforceIf(wh)

    elif action_type == "teacher_free_same_slot":
        teacher_id = action.get("teacherId")
        asgs = ctx.teacher_assignments.get(teacher_id, [])
        for (d, p), wh in when_holds.items():
            active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
            ctx.model.Add(active_sum == 0).OnlyEnforceIf(wh)

    elif action_type == "teacher_has_lesson_same_slot":
        teacher_id = action.get("teacherId")
        asgs = ctx.teacher_assignments.get(teacher_id, [])
        for (d, p), wh in when_holds.items():
            active_sum = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
            ctx.model.Add(active_sum >= 1).OnlyEnforceIf(wh)

    # ── Schedule/Ωράριο actions (day-level — fire when WHEN holds for that day) ─
    elif action_type in (
        "teacher_start_not_before", "teacher_start_not_after",
        "teacher_end_not_before", "teacher_end_not_after",
        "teacher_max_hours_day", "teacher_min_hours_day",
    ):
        teacher_id = action.get("teacherId")
        threshold_period = action.get("period", 0)
        threshold_value = action.get("value", 0)
        asgs = ctx.teacher_assignments.get(teacher_id, [])

        # Build per-day active period lists
        for d in range(ctx.num_days):
            # The "day-level when" = any period in this day triggered the rule
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}_dtrig")

            daily_active = [
                sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
                for p in range(ctx.num_periods)
            ]
            daily_hours = sum(daily_active)

            if action_type == "teacher_start_not_before":
                # All periods before threshold_period must be 0
                for p in range(threshold_period):
                    ctx.model.Add(daily_active[p] == 0).OnlyEnforceIf(day_triggered)

            elif action_type == "teacher_start_not_after":
                # At least one period in [0..threshold_period] must be active
                early_slots = sum(daily_active[:threshold_period + 1])
                ctx.model.Add(early_slots >= 1).OnlyEnforceIf(day_triggered)

            elif action_type == "teacher_end_not_before":
                # At least one period in [threshold_period..end] must be active
                late_slots = sum(daily_active[threshold_period:])
                ctx.model.Add(late_slots >= 1).OnlyEnforceIf(day_triggered)

            elif action_type == "teacher_end_not_after":
                # All periods after threshold_period must be 0
                for p in range(threshold_period + 1, ctx.num_periods):
                    ctx.model.Add(daily_active[p] == 0).OnlyEnforceIf(day_triggered)

            elif action_type == "teacher_max_hours_day":
                ctx.model.Add(daily_hours <= threshold_value).OnlyEnforceIf(day_triggered)

            elif action_type == "teacher_min_hours_day":
                ctx.model.Add(daily_hours >= threshold_value).OnlyEnforceIf(day_triggered)

    # ── Gap actions ───────────────────────────────────────────────────────────
    elif action_type == "teacher_max_gaps_day":
        teacher_id = action.get("teacherId")
        max_gaps = action.get("value", 0)
        asgs = ctx.teacher_assignments.get(teacher_id, [])

        for d in range(ctx.num_days):
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}_dtrig")

            # Compute gaps via span - hours (same approach as main solver)
            daily_active = [
                sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
                for p in range(ctx.num_periods)
            ]
            daily_hours = sum(daily_active)
            span = ctx.model.NewIntVar(0, ctx.num_periods, f"{prefix}_{safe_action}_span_d{d}")
            ctx.model.Add(span <= ctx.num_periods)
            gaps = ctx.model.NewIntVar(0, ctx.num_periods, f"{prefix}_{safe_action}_gaps_d{d}")
            ctx.model.Add(gaps == span - daily_hours)
            ctx.model.Add(gaps <= max_gaps).OnlyEnforceIf(day_triggered)

    elif action_type == "teacher_no_gap_after":
        teacher_id = action.get("teacherId")
        asgs = ctx.teacher_assignments.get(teacher_id, [])
        for (d, p), wh in when_holds.items():
            if p + 1 < ctx.num_periods:
                next_active = sum(ctx.x.get((a.id, d, p + 1), ctx.model.NewConstant(0)) for a in asgs)
                # If teacher is active at p and rule holds, they must also be active at p+1 (or not have a gap)
                # More precisely: if active at p, then active at p+1
                teacher_at_p = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
                no_gap_needed = ctx.bool_var(f"{prefix}_nogap_d{d}_p{p}")
                ctx.model.Add(teacher_at_p >= 1).OnlyEnforceIf(no_gap_needed)
                ctx.model.Add(teacher_at_p == 0).OnlyEnforceIf(no_gap_needed.Not())
                both = _combine_bools(ctx, [wh, no_gap_needed], "AND", f"{prefix}_both_d{d}_p{p}")
                ctx.model.Add(next_active >= 1).OnlyEnforceIf(both)

    # ── Placement actions ─────────────────────────────────────────────────────
    elif action_type == "subject_in_period":
        subject_id = action.get("subjectId")
        class_id = action.get("classId")
        allowed_periods = action.get("periods", [])
        asgs = [a for a in ctx.subject_assignments.get(subject_id, [])
                if not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id]
        if not asgs or not allowed_periods:
            return
        # For days where the rule is triggered, all periods NOT in allowed_periods must be 0
        for d in range(ctx.num_days):
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}")
            for p in range(ctx.num_periods):
                if p not in allowed_periods:
                    total_at_p = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
                    ctx.model.Add(total_at_p == 0).OnlyEnforceIf(day_triggered)

    elif action_type == "subject_not_in_period":
        subject_id = action.get("subjectId")
        class_id = action.get("classId")
        forbidden_periods = action.get("periods", [])
        asgs = [a for a in ctx.subject_assignments.get(subject_id, [])
                if not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id]
        for d in range(ctx.num_days):
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}")
            for p in forbidden_periods:
                total_at_p = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
                ctx.model.Add(total_at_p == 0).OnlyEnforceIf(day_triggered)

    elif action_type == "subject_on_day":
        subject_id = action.get("subjectId")
        class_id = action.get("classId")
        allowed_days = action.get("days", [])
        asgs = [a for a in ctx.subject_assignments.get(subject_id, [])
                if not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id]
        for d in range(ctx.num_days):
            if d in allowed_days:
                continue
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}")
            total_on_day = sum(
                ctx.x.get((a.id, d, p), ctx.model.NewConstant(0))
                for a in asgs for p in range(ctx.num_periods)
            )
            ctx.model.Add(total_on_day == 0).OnlyEnforceIf(day_triggered)

    elif action_type == "subject_not_on_day":
        subject_id = action.get("subjectId")
        class_id = action.get("classId")
        forbidden_days = action.get("days", [])
        asgs = [a for a in ctx.subject_assignments.get(subject_id, [])
                if not class_id or ctx.sg_to_class.get(a.subGroupId) == class_id]
        for d in forbidden_days:
            day_wh_vars = [when_holds[(d, p)] for p in range(ctx.num_periods)]
            day_triggered = _combine_bools(ctx, day_wh_vars, "OR", f"{prefix}_{safe_action}_d{d}")
            total_on_day = sum(
                ctx.x.get((a.id, d, p), ctx.model.NewConstant(0))
                for a in asgs for p in range(ctx.num_periods)
            )
            ctx.model.Add(total_on_day == 0).OnlyEnforceIf(day_triggered)

    elif action_type == "class_free_slot":
        class_id = action.get("classId")
        asgs = ctx.class_assignments.get(class_id, [])
        for (d, p), wh in when_holds.items():
            total_at_slot = sum(ctx.x.get((a.id, d, p), ctx.model.NewConstant(0)) for a in asgs)
            ctx.model.Add(total_at_slot == 0).OnlyEnforceIf(wh)

    else:
        logger.warning(f"[ConditionalRules] Unknown action: '{action_type}' — skipping")
