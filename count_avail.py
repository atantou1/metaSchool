import json

total_available = 0
teacher_counts = []

with open("avail_dump.txt", "r") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        parts = line.split("|")
        t_id = parts[0]
        name = parts[1] + " " + parts[2]
        try:
            cons = json.loads(parts[3])
            avail = cons.get("availability", {})
            t_avail = sum(sum(1 for x in v if x) for v in avail.values())
            total_available += t_avail
            teacher_counts.append(f"{name}: {t_avail} slots")
        except:
            pass

print(f"Total available slots across all teachers: {total_available}")
print("\n".join(teacher_counts))
