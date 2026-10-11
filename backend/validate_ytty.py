import json
from collections import defaultdict

def main():
    with open("../frontend/payload.json", "r") as f:
        data = json.load(f)
        
    fixed_slots = data.get("fixedSlots", [])
    teachers = {t["id"]: t for t in data["teachers"]}
    subjects = {s["id"]: s for s in data["subjects"]}
    
    print(f"Total fixed slots: {len(fixed_slots)}")
    
    # Check 1: Teacher overlaps (same teacher, same day, same period)
    teacher_schedule = defaultdict(list)
    for slot in fixed_slots:
        if slot["teacherId"]:
            teacher_schedule[(slot["teacherId"], slot["day"], slot["period"])].append(slot)
            
    for key, slots in teacher_schedule.items():
        if len(slots) > 1:
            t_id, d, p = key
            t_name = teachers[t_id]["lastName"] if t_id in teachers else t_id
            t_obj = teachers.get(t_id)
            if (t_obj and t_obj.get("isSupport")) or all(s.get("isSupport") for s in slots):
                continue
            print(f"ERROR: Teacher {t_name} has multiple assignments on Day {d}, Period {p}:")
            for s in slots:
                print(f"  -> Class: {s['classId']}, Subject: {s['subjectId']}, SubGroup: {s['subGroupId']}")

    # Check 2: Class overlaps
    class_schedule = defaultdict(list)
    for slot in fixed_slots:
        if slot["classId"]:
            class_schedule[(slot["classId"], slot["day"], slot["period"])].append(slot)
            
    for key, slots in class_schedule.items():
        if len(slots) > 1:
            c_id, d, p = key
            # Check subgroup compatibility. 
            # If any is 'main', it conflicts with everything else.
            # If both are 'subA' and 'subB', it's OK.
            sub_groups = [s["subGroupId"] for s in slots]
            has_main = any("main" in sg for sg in sub_groups)
            is_valid = True
            if has_main:
                is_valid = False
            else:
                # all must be subA or subB, and must be unique
                if len(set(sub_groups)) != len(sub_groups):
                    is_valid = False
            
            if not is_valid:
                print(f"ERROR: Class {c_id} has conflicting assignments on Day {d}, Period {p}:")
                for s in slots:
                    t_id = s.get('teacherId')
                    t_name = teachers.get(t_id, {}).get("lastName", t_id) if t_id else "None"
                    print(f"  -> SubGroup: {s['subGroupId']}, Subject: {s['subjectId']}, Teacher: {t_name}")

    # Check 3: Teacher Availability
    for slot in fixed_slots:
        t_id = slot.get("teacherId")
        d = slot["day"]
        p = slot["period"]
        if t_id and t_id in teachers:
            constraints = teachers[t_id].get("constraints") or {}
            avail = constraints.get("availability") or {}
            # avail keys are day indices "0", "1", ...
            day_avail = avail.get(str(d))
            if day_avail and p < len(day_avail):
                if not day_avail[p]:
                    t_name = teachers[t_id]["lastName"]
                    print(f"ERROR: Teacher {t_name} is assigned on Day {d}, Period {p} but is marked as UNAVAILABLE.")

    # Check 4: Teacher max consecutive limits, gaps, etc. (Approximation based on fixed slots alone)
    # Teacher max hours per day
    teacher_daily = defaultdict(int)
    for slot in fixed_slots:
        if slot["teacherId"]:
            teacher_daily[(slot["teacherId"], slot["day"])] += 1
            
    for (t_id, d), count in teacher_daily.items():
        if t_id in teachers:
            constraints = teachers[t_id].get("constraints") or {}
            max_daily = constraints.get("maxHoursPerDay")
            if max_daily is not None and count > max_daily:
                t_name = teachers[t_id]["lastName"]
                print(f"ERROR: Teacher {t_name} has {count} fixed hours on Day {d}, exceeding maxHoursPerDay of {max_daily}.")

if __name__ == "__main__":
    main()
