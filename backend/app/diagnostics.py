from typing import List, Dict, Any, Optional
from app.models import SolveRequest, TeacherInput, ClassInput, SubjectInput, ConflictDiagnosticItem

def run_diagnostics(req: SolveRequest) -> List[ConflictDiagnosticItem]:
    items: List[ConflictDiagnosticItem] = []
    
    teachers = [t for t in req.teachers if t.id != "tch-unassigned" and t.isTeaching and t.isActive]
    classes = req.classes
    subjects = req.subjects
    
    num_days = len(req.schoolConfig.days) if req.schoolConfig and req.schoolConfig.days else 5
    num_morning = len(req.schoolConfig.periods) if req.schoolConfig and req.schoolConfig.periods else 6
    num_allday = len(req.schoolConfig.allDayPeriods) if req.schoolConfig and req.schoolConfig.allDayPeriods else 4
    
    teacher_by_id = {t.id: t for t in teachers}
    class_by_id = {c.id: c for c in classes}
    teacher_is_ht_of = {c.headTeacherId: c.id for c in classes if c.headTeacherId}
    
    day_names = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"]
    
    # -------------------------------------------------------------
    # 1. Check Teacher Available Hours vs Contract Weekly Hours
    # -------------------------------------------------------------
    for t in teachers:
        t_id = t.id
        cons = t.constraints
        t_max_w = t.maxWeeklyHours
        
        avail_days = cons.availableDays if cons and cons.availableDays is not None else list(range(num_days))
        avail_grid = cons.availability if cons and cons.availability else {}
        
        t_periods = []
        if t.isMorning:
            t_periods.extend(range(num_morning))
        if t.isAllDay:
            t_periods.extend(range(num_morning, num_morning + num_allday))
            
        total_avail_slots = 0
        for d in range(num_days):
            if d not in avail_days:
                continue
            d_slots = avail_grid.get(str(d))
            if d_slots:
                total_avail_slots += sum(1 for p in t_periods if p < len(d_slots) and d_slots[p])
            else:
                total_avail_slots += len(t_periods)
                
        if total_avail_slots < t_max_w:
            items.append(ConflictDiagnosticItem(
                id=f"t_avail_hours_{t_id}",
                category="teacher",
                title=f"Ανεπαρκείς Ώρες Διαθεσιμότητας: {t.firstName} {t.lastName}",
                description=f"Ο/Η εκπαιδευτικός έχει συμβόλαιο {t_max_w} ωρών/εβδομάδα, αλλά έχουν δηλωθεί μόνο {total_avail_slots} διαθέσιμες ώρες στο ωράριό του/της.",
                suggestion=f"Ανοίξτε επιπλέον ημέρες ή ώρες διαθεσιμότητας στην καρτέλα Εκπαιδευτικοί (χρειάζονται τουλάχιστον {t_max_w - total_avail_slots} επιπλέον ώρες).",
                targetTab="teachers",
                targetId=t_id,
                severity="error"
            ))
            
        # Check minHoursPerDay vs contract
        min_h = cons.minHoursPerDay if cons and cons.minHoursPerDay is not None else 0
        if min_h > 0 and len(avail_days) > 0:
            if min_h * len(avail_days) > t_max_w:
                items.append(ConflictDiagnosticItem(
                    id=f"t_min_hours_overflow_{t_id}",
                    category="teacher",
                    title=f"Σύγκρουση Ελάχιστων Ωρών: {t.firstName} {t.lastName}",
                    description=f"Το ελάχιστο ημερήσιο όριο ({min_h} ώρες x {len(avail_days)} ημέρες = {min_h * len(avail_days)} ώρες) υπερβαίνει τις εβδομαδιαίες ώρες συμβολαίου ({t_max_w} ώρες).",
                    suggestion="Μειώστε το ελάχιστο όριο ωρών ανά ημέρα ή προσαρμόστε τις ημέρες διαθεσιμότητας.",
                    targetTab="teachers",
                    targetId=t_id,
                    severity="error"
                ))

        # Check edge periods vs gaps
        req_edge = False
        if cons and cons.requireFirstAndLastHour is not None:
            req_edge = cons.requireFirstAndLastHour
        elif req.schoolConfig and getattr(req.schoolConfig, 'requireFirstAndLastHour', None) is not None:
            req_edge = req.schoolConfig.requireFirstAndLastHour
        elif getattr(req, 'requireFirstAndLastHour', None) is not None:
            req_edge = req.requireFirstAndLastHour
            
        max_gaps = cons.maxTotalGapsPerDay if cons and cons.maxTotalGapsPerDay is not None else 1
        max_h_day = cons.maxHoursPerDay if cons and cons.maxHoursPerDay is not None else num_morning
        
        if req_edge:
            for d in avail_days:
                d_slots = avail_grid.get(str(d))
                active_p = []
                for p in t_periods:
                    is_p = True
                    if d_slots and p < len(d_slots):
                        is_p = d_slots[p]
                    if is_p:
                        active_p.append(p)
                if len(active_p) >= 2:
                    first_p = min(active_p)
                    last_p = max(active_p)
                    span = last_p - first_p + 1
                    min_gaps_needed = max(0, span - max_h_day)
                    if min_gaps_needed > max_gaps:
                        d_name = day_names[d] if d < len(day_names) else f"Ημέρα {d+1}"
                        items.append(ConflictDiagnosticItem(
                            id=f"t_edge_gaps_{t_id}_{d}",
                            category="teacher",
                            title=f"Σύγκρουση Κενών & Ακραίων Ωρών: {t.firstName} {t.lastName} ({d_name})",
                            description=f"Η απαίτηση διδασκαλίας στην 1η και τελευταία ώρα (διάστημα {span} ωρών) με μέγιστο ημερήσιο όριο {max_h_day} ωρών απαιτεί τουλάχιστον {min_gaps_needed} κενές ώρες, αλλά το επιτρεπόμενο όριο κενών είναι {max_gaps}.",
                            suggestion=f"Αυξήστε το μέγιστο όριο κενών ανά ημέρα σε τουλάχιστον {min_gaps_needed} ή απενεργοποιήστε την υποχρεωτική 1η/τελευταία ώρα.",
                            targetTab="teachers",
                            targetId=t_id,
                            severity="error"
                        ))

    # -------------------------------------------------------------
    # 2. Check Class Total Capacity vs Head Teacher & Specialties
    # -------------------------------------------------------------
    subject_class_hours: Dict[str, Dict[str, List[int]]] = {s.id: s.classHours or {} for s in subjects}
    
    for c in classes:
        c_id = c.id
        c_grade = c.grade
        c_is_allday = c.isAllDay
        max_class_periods = num_allday * num_days if c_is_allday else num_morning * num_days # 20 or 30
        max_split_capacity = max_class_periods * 2 # With 2 subgroups (co-teaching), can absorb up to 2x hours
        
        # Calculate Head Teacher hours in this class
        ht_hours = 0
        if c.headTeacherId and c.headTeacherId in teacher_by_id:
            ht = teacher_by_id[c.headTeacherId]
            if c_is_allday:
                # Calculate from HT's subjects in this class
                ht_specs = {ht.specialty} if ht.specialty else set()
                ht_hours = sum(
                    (subject_class_hours[s.id].get(c_id) or subject_class_hours[s.id].get(c_grade, [0, 0]))[0]
                    for s in subjects
                    if set(s.allowedSpecialties or []).intersection(ht_specs)
                )
            else:
                ht_hours = ht.maxWeeklyHours
            
        # Calculate minimum required specialty hours
        spec_min_total = 0
        spec_details = []
        for s in subjects:
            s_id = s.id
            s_specs = s.allowedSpecialties or []
            # Check if this subject is a specialty subject (not general class teacher subject)
            is_ht_subject = ("ΠΕ70" in s_specs or "ΠΕ71" in s_specs)
            if is_ht_subject:
                continue
                
            ch = subject_class_hours[s_id].get(c_id) or subject_class_hours[s_id].get(c_grade, [0, 0])
            if ch and len(ch) >= 2 and ch[0] > 0:
                spec_min_total += ch[0]
                spec_details.append(f"{s.title}: {ch[0]}ω")
                
        total_class_demand = ht_hours + spec_min_total
        # Only report capacity overflow if demand exceeds the theoretical maximum capacity with subgroups (2x periods)
        if total_class_demand > max_split_capacity:
            items.append(ConflictDiagnosticItem(
                id=f"c_capacity_overflow_{c_id}",
                category="class" if not c_is_allday else "subject",
                title=f"Υπερκάλυψη Ωρών Τμήματος: {c.name}",
                description=f"Το τμήμα διαθέτει {max_class_periods} διδακτικές ώρες την εβδομάδα (μέγιστο {max_split_capacity} ώρες ακόμη και με πλήρη συνδιδασκαλία/υποομάδες). Οι απαιτούμενες ώρες ({ht_hours}ω υπεύθυνος + {spec_min_total}ω ειδικότητες: {', '.join(spec_details)}) φτάνουν τις {total_class_demand}ω και δεν χωράνε.",
                suggestion=f"Μειώστε τις ελάχιστες ώρες των μαθημάτων στον πίνακα Μαθημάτων ώστε το άθροισμα να μην υπερβαίνει τις {max_split_capacity} ώρες.",
                targetTab="subjects",
                targetId=c_id,
                severity="error"
            ))

    # -------------------------------------------------------------
    # 3. Check Supply vs Demand for Each Subject Specialty
    # -------------------------------------------------------------
    for s in subjects:
        s_id = s.id
        s_specs = set(s.allowedSpecialties or [])
        if not s_specs:
            continue
            
        # Total supply across all teachers of this specialty (excluding morning Head Teachers who are locked to their own class)
        total_specialty_supply = 0
        for t in teachers:
            if t.specialty in s_specs:
                c_ht = teacher_is_ht_of.get(t.id)
                c_ht_obj = class_by_id.get(c_ht) if c_ht else None
                if c_ht_obj and not c_ht_obj.isAllDay:
                    # Morning head teachers teach 100% in their own class
                    continue
                elif c_ht_obj and c_ht_obj.isAllDay:
                    # All-day head teacher has remaining hours after their all-day class subjects
                    ht_ad_hours = sum(
                        (subject_class_hours[s_ad.id].get(c_ht) or subject_class_hours[s_ad.id].get(c_ht_obj.grade, [0, 0]))[0]
                        for s_ad in subjects
                        if set(s_ad.allowedSpecialties or []).intersection({t.specialty})
                    )
                    total_specialty_supply += max(0, t.maxWeeklyHours - ht_ad_hours)
                else:
                    total_specialty_supply += t.maxWeeklyHours
                    
        # Total demand for this subject across all classes
        total_subject_demand = 0
        for c in classes:
            c_id = c.id
            c_grade = c.grade
            ch = subject_class_hours[s_id].get(c_id) or subject_class_hours[s_id].get(c_grade, [0, 0])
            if ch and len(ch) >= 2 and ch[0] > 0:
                total_subject_demand += ch[0]
                
        # Check if demand exceeds supply
        is_general_spec = bool(s_specs.intersection({"ΠΕ70", "ΠΕ71"}))
        if not is_general_spec and total_subject_demand > total_specialty_supply:
            items.append(ConflictDiagnosticItem(
                id=f"s_deficit_{s_id}",
                category="subject",
                title=f"Έλλειψη Ωρών Εκπαιδευτικών: {s.title}",
                description=f"Τα τμήματα απαιτούν συνολικά τουλάχιστον {total_subject_demand} ώρες {s.title}, αλλά οι διαθέσιμοι εκπαιδευτικοί ειδικότητας ({', '.join(s_specs)}) καλύπτουν μόνο {total_specialty_supply} ώρες (έλλειμμα {total_subject_demand - total_specialty_supply} ωρών).",
                suggestion=f"Αυξήστε τις εβδομαδιαίες ώρες των εκπαιδευτικών ειδικότητας ή μειώστε τις απαιτούμενες ώρες του μαθήματος στα τμήματα.",
                targetTab="subjects",
                targetId=s_id,
                severity="error"
            ))

    # -------------------------------------------------------------
    # 4. Fallback General Conflict if no specific items found
    # -------------------------------------------------------------
    if not items:
        items.append(ConflictDiagnosticItem(
            id="general_infeasible",
            category="general",
            title="Αδυναμία Επίλυσης Ωρολογίου Προγράμματος",
            description="Ο μαθηματικός αλγόριθμος CP-SAT δεν μπόρεσε να βρει έγκυρη ανάθεση που να ικανοποιεί ταυτόχρονα όλους τους περιορισμούς.",
            suggestion="Ελέγξτε τις διαθεσιμότητες των εκπαιδευτικών (κενά, συνεχόμενες ώρες) ή τις απαιτούμενες ώρες ανά μάθημα.",
            targetTab="rules",
            severity="error"
        ))
        
    return items
