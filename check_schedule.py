import sqlite3
import json

conn = sqlite3.connect('frontend/metaschool.db')
c = conn.cursor()

c.execute("SELECT name, slots_data FROM schedules WHERE id='f4c8df8c-264c-40bc-a068-4e2a03cbe6b7'")
row = c.fetchone()

if row:
    name, slots_data = row
    slots = json.loads(slots_data)
    
    count_xry = 0
    assigned_slots = []
    
    for slot in slots:
        if slot.get('teacherId') == 'tch-xry':
            count_xry += 1
            assigned_slots.append(slot)
            
    print(f"Schedule '{name}' has {count_xry} slots for tch-xry.")
    if count_xry > 0:
        print("Example slots:")
        for s in assigned_slots[:3]:
            print(s)
else:
    print("Schedule not found.")
