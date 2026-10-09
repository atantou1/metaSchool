import json
import sys
from app.models import SolveRequest
from app.solver_diagnostics_deep import deep_diagnose
from app.diagnostics import run_diagnostics

def main():
    try:
        with open("../frontend/payload.json", "r") as f:
            data = json.load(f)
        
        req = SolveRequest(**data)
        
        print("Running heuristics diagnostics...")
        heuristic_items = run_diagnostics(req)
        for idx, item in enumerate(heuristic_items):
            print(f"{idx+1}. [{item.category}] {item.title}: {item.description}")
            
        print("\nRunning deep diagnostics (probing)...")
        results = deep_diagnose(req)
        
        print(f"\nProbes run: {results.get('probesRun')} in {results.get('totalProbeTime')}s")
        print("\nProbe Results (Feasible when removed?):")
        for k, v in results.get("probeResults", {}).items():
            print(f" - {k}: {'YES (Problematic!)' if v else 'No'}")
            
        print("\nDiagnostic Items generated:")
        for idx, item in enumerate(results.get("diagnosticItems", [])):
            print(f"{idx+1}. [{item.category}] {item.title}: {item.description} -> {item.suggestion}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
