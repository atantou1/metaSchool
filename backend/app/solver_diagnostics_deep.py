"""
Deep Diagnostics — Constraint Relaxation Probing

When the solver returns INFEASIBLE, this module systematically identifies
which constraint group(s) are causing the problem by selectively disabling
each group and re-running the solver with a short time limit.
"""
import time
from typing import List, Dict, Set, Optional
from .models import SolveRequest, SolveResponse, ConflictDiagnosticItem
from .diagnostics import run_diagnostics
from .solver import solve_timetable


# --- Constraint Group Definitions ---
CONSTRAINT_GROUPS: Dict[str, dict] = {
    "weekly_hours": {
        "label": "Εβδομαδιαίες Ώρες Εκπαιδευτικών",
        "description": "Η ακριβής κάλυψη εβδομαδιαίων ωρών συμβολαίου κάθε εκπαιδευτικού δεν μπορεί να ικανοποιηθεί ταυτόχρονα με τους υπόλοιπους περιορισμούς.",
        "suggestion": "Μειώστε τις εβδομαδιαίες ώρες κάποιων εκπαιδευτικών ή ανοίξτε περισσότερη διαθεσιμότητα.",
        "targetTab": "teachers",
        "category": "teacher",
        "drilldown": True,
    },
    "availability": {
        "label": "Διαθεσιμότητα Εκπαιδευτικών",
        "description": "Οι μη-διαθέσιμες ώρες/ημέρες εκπαιδευτικών περιορίζουν τόσο πολύ τον χώρο λύσεων που ο αλγόριθμος δεν βρίσκει λύση.",
        "suggestion": "Ανοίξτε επιπλέον ώρες/ημέρες διαθεσιμότητας στους εκπαιδευτικούς.",
        "targetTab": "teachers",
        "category": "teacher",
        "drilldown": True,
    },
    "daily_workload": {
        "label": "Ημερήσια Όρια Ωρών (Ελάχιστες/Μέγιστες)",
        "description": "Τα ημερήσια όρια ωρών (ελάχιστα ή/και μέγιστα) εκπαιδευτικών δεν χωράνε σε συνδυασμό με τους υπόλοιπους περιορισμούς.",
        "suggestion": "Χαλαρώστε τα ημερήσια όρια: μειώστε το ελάχιστο ωρών/ημέρα ή αυξήστε το μέγιστο.",
        "targetTab": "teachers",
        "category": "teacher",
        "drilldown": True,
    },
    "edge_hours": {
        "label": "Υποχρεωτική 1η & Τελευταία Ώρα",
        "description": "Η απαίτηση οι εκπαιδευτικοί να διδάσκουν στην πρώτη και τελευταία ώρα της ημέρας δεν μπορεί να ικανοποιηθεί.",
        "suggestion": "Απενεργοποιήστε την «Υποχρεωτική 1η/Τελευταία Ώρα» ή αυξήστε τα επιτρεπόμενα κενά.",
        "targetTab": "rules",
        "category": "general",
        "drilldown": False,
    },
    "max_consecutive": {
        "label": "Μέγιστες Συνεχόμενες Ώρες",
        "description": "Ο περιορισμός μέγιστων συνεχόμενων ωρών δεν αφήνει αρκετό χώρο ανάθεσης.",
        "suggestion": "Αυξήστε το μέγιστο συνεχόμενων ωρών στην καρτέλα Εκπαιδευτικοί ή αφαιρέστε τον περιορισμό.",
        "targetTab": "teachers",
        "category": "teacher",
        "drilldown": True,
    },
    "gaps": {
        "label": "Περιορισμοί Κενών Ωρών",
        "description": "Ο περιορισμός μέγιστων κενών ωρών (ανά ημέρα ή/και συνεχόμενων) είναι πολύ αυστηρός.",
        "suggestion": "Αυξήστε τα επιτρεπόμενα κενά ή αφαιρέστε τον περιορισμό κενών.",
        "targetTab": "teachers",
        "category": "teacher",
        "drilldown": True,
    },
    "class_coverage": {
        "label": "Πλήρης Κάλυψη Τμημάτων",
        "description": "Δεν υπάρχουν αρκετοί εκπαιδευτικοί για να γεμίσουν κάθε ώρα κάθε τμήματος.",
        "suggestion": "Αυξήστε τις ώρες εκπαιδευτικών ή ελέγξτε αν κάποιο τμήμα θα μπορούσε να έχει λιγότερες ώρες.",
        "targetTab": "teachers",
        "category": "class",
        "drilldown": False,
    },
    "subject_hours": {
        "label": "Ώρες Μαθημάτων ανά Τμήμα",
        "description": "Οι ελάχιστες/μέγιστες ώρες κάποιων μαθημάτων δεν χωράνε στο πρόγραμμα.",
        "suggestion": "Μειώστε τις ελάχιστες ώρες κάποιων μαθημάτων ή αυξήστε τις μέγιστες.",
        "targetTab": "subjects",
        "category": "subject",
        "drilldown": False,
    },
    "fixed_slots": {
        "label": "Κλειδωμένες Ώρες",
        "description": "Κάποιες κλειδωμένες ώρες συγκρούονται με τους υπόλοιπους περιορισμούς.",
        "suggestion": "Ξεκλειδώστε κάποιες κλειδωμένες ώρες και ξανατρέξτε τον αλγόριθμο.",
        "targetTab": "rules",
        "category": "general",
        "drilldown": False,
    },
}

PROBE_TIME_LIMIT = 3.0  # seconds per probe


def deep_diagnose(req: SolveRequest) -> Dict:
    """
    Run deep constraint relaxation probing to identify infeasibility causes.

    Returns a dict with:
      - diagnosticItems: List[ConflictDiagnosticItem]
      - probeResults: dict mapping group_name -> bool (True = removing it makes model feasible)
      - totalProbeTime: float
    """
    probe_start = time.time()
    all_items: List[ConflictDiagnosticItem] = []

    # ─── Phase 1: Heuristic diagnostics (fast, existing) ─────────────
    heuristic_items = run_diagnostics(req)
    specific_heuristic = [it for it in heuristic_items if it.id != "general_infeasible"]
    all_items.extend(specific_heuristic)

    # ─── Phase 2: Constraint Relaxation Probing ──────────────────────
    probe_results: Dict[str, bool] = {}
    problematic_groups: List[str] = []

    for group_name in CONSTRAINT_GROUPS:
        try:
            result = solve_timetable(
                req,
                disabled_groups={group_name},
                probe_time_limit=PROBE_TIME_LIMIT,
            )
            is_feasible = result.status in ("OPTIMAL", "FEASIBLE")
            probe_results[group_name] = is_feasible
            if is_feasible:
                problematic_groups.append(group_name)
        except Exception:
            probe_results[group_name] = False

    # Create diagnostic items for each problematic group
    for group_name in problematic_groups:
        info = CONSTRAINT_GROUPS[group_name]
        all_items.append(ConflictDiagnosticItem(
            id=f"probe_{group_name}",
            category=info["category"],
            title=f"Εντοπίστηκε Σύγκρουση: {info['label']}",
            description=info["description"],
            suggestion=info["suggestion"],
            targetTab=info.get("targetTab"),
            severity="error",
        ))

    # ─── Phase 3: Per-Teacher Drill-Down ─────────────────────────────
    drilldown_groups = [g for g in problematic_groups if CONSTRAINT_GROUPS[g].get("drilldown")]

    if "weekly_hours" in drilldown_groups or "availability" in drilldown_groups:
        teachers = [
            t for t in req.teachers
            if not t.isSupport and t.isActive and t.isTeaching
            and t.maxWeeklyHours > 0 and t.id != "tch-unassigned"
        ]
        
        # Test availability drill-down
        if "availability" in drilldown_groups:
            for t in teachers:
                try:
                    # To test one teacher's availability, we pass relaxed_availability={t.id}
                    # But since solver.py doesn't support this yet, we can't do it cleanly without modifying solver.py
                    pass
                except Exception:
                    pass
                
        # Test weekly_hours drill-down
        if "weekly_hours" in drilldown_groups:
            for t in teachers:
                try:
                    result = solve_timetable(
                        req,
                        relaxed_teachers={t.id},
                        probe_time_limit=PROBE_TIME_LIMIT,
                    )
                    if result.status in ("OPTIMAL", "FEASIBLE"):
                        all_items.append(ConflictDiagnosticItem(
                            id=f"probe_teacher_wh_{t.id}",
                            category="teacher",
                            title=f"Πρόβλημα Ωρών: {t.firstName} {t.lastName}",
                            description=(
                                f"Αν χαλαρώσουν οι ακριβείς εβδομαδιαίες ώρες ({t.maxWeeklyHours}ω) "
                                f"του/της {t.firstName} {t.lastName}, ο αλγόριθμος βρίσκει λύση. "
                                f"Αυτό σημαίνει ότι οι ώρες αυτού/ής του/της εκπαιδευτικού δεν χωράνε."
                            ),
                            suggestion=(
                                f"Μειώστε τις εβδομαδιαίες ώρες ή ανοίξτε περισσότερη "
                                f"διαθεσιμότητα για τον/την {t.firstName} {t.lastName}."
                            ),
                            targetTab="teachers",
                            targetId=t.id,
                            severity="error",
                        ))
                except Exception:
                    pass

    # ─── Fallback: No single cause found ─────────────────────────────
    has_probe_findings = any(it.id.startswith("probe_") for it in all_items)
    has_heuristic_findings = len(specific_heuristic) > 0

    if not has_probe_findings and not has_heuristic_findings:
        all_items.append(ConflictDiagnosticItem(
            id="deep_no_single_cause",
            category="general",
            title="Πολλαπλές Αλληλεξαρτώμενες Συγκρούσεις",
            description=(
                "Κανένας μεμονωμένος περιορισμός δεν εξηγεί το πρόβλημα από μόνος του. "
                "Η αιτία είναι ο συνδυασμός πολλαπλών περιορισμών ταυτόχρονα."
            ),
            suggestion=(
                "Δοκιμάστε σταδιακές χαλαρώσεις: αυξήστε τις διαθεσιμότητες, "
                "μειώστε ελάχιστα ωράρια, ή αφαιρέστε κάποιους custom κανόνες."
            ),
            targetTab="rules",
            severity="error",
        ))

    total_time = round(time.time() - probe_start, 2)

    return {
        "diagnosticItems": all_items,
        "probeResults": probe_results,
        "totalProbeTime": total_time,
        "probesRun": len(probe_results),
    }
