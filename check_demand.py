import sqlite3
import json

conn = sqlite3.connect('frontend/metaschool.db')
c = conn.cursor()

c.execute("SELECT sum(max_weekly_hours) FROM teachers WHERE is_active=1 AND is_teaching=1 AND is_support=0 AND specialty IN ('ΠΕ70', 'ΠΕ71')")
supply = c.fetchone()[0]

c.execute("SELECT class_hours, allowed_specialties FROM subjects")
subjects = c.fetchall()

demand = 0
for row in subjects:
    class_hours = json.loads(row[0]) if row[0] else {}
    allowed_specialties = json.loads(row[1]) if row[1] else []
    
    if "ΠΕ70" in allowed_specialties or "ΠΕ71" in allowed_specialties:
        for k, v in class_hours.items():
            if isinstance(v, list) and len(v) > 0:
                # Need to multiply by number of classes in that grade/id!
                # Actually, wait. I'll just check lesson_assignments!
                pass

c.execute("SELECT sum(a.hours) FROM lesson_assignments a JOIN subjects s ON a.subject_id=s.id WHERE s.allowed_specialties LIKE '%ΠΕ70%' OR s.allowed_specialties LIKE '%ΠΕ71%'")
demand_assigned = c.fetchone()[0]
print("Supply:", supply)
print("Demand from assignments:", demand_assigned)
