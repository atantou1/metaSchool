import requests

def main():
    res = requests.post("http://127.0.0.1:8000/api/diagnose", json={"teachers": [], "subjects": [], "classes": [], "subGroups": [], "assignments": [], "schoolConfig": {}, "fixedSlots": [], "customRules": [], "requireFirstAndLastHour": False})
    # Wait, the Next.js API parses everything from the DB and sends it to FastAPI. 
    # Calling FastAPI directly requires the big payload.
    # I should just run `test_diag.ts` which calls Next.js API!
