import json
from app.diagnostics import run_diagnostics
from app.models import SolveRequest

with open("test_payload.json", "r") as f:
    payload = json.load(f)
    
req = SolveRequest(**payload)
items = run_diagnostics(req)
for i in items:
    print(i.title, "-", i.description)
