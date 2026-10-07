from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ortools import __version__ as ortools_version
from .models import (
    SolveRequest,
    SolveResponse,
    ValidateMoveRequest,
    ValidateMoveResponse,
)
from .solver import solve_timetable, solve_support_timetable, validate_move

app = FastAPI(
    title="metaSchool Timetable Solver API",
    description="Local solver sidecar using Google OR-Tools CP-SAT for Greek school timetables",
    version="1.0.0",
)

# Configure CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "metaSchool-solver",
        "ortoolsVersion": ortools_version,
    }

@app.post("/api/solve", response_model=SolveResponse)
def solve_endpoint(req: SolveRequest):
    try:
        response = solve_timetable(req)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/solve-support", response_model=SolveResponse)
def solve_support_endpoint(req: SolveRequest):
    try:
        response = solve_support_timetable(req)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/validate", response_model=ValidateMoveResponse)
def validate_endpoint(req: ValidateMoveRequest):
    try:
        response = validate_move(req)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
