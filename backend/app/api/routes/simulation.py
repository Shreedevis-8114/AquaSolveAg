from fastapi import APIRouter, HTTPException
from backend.app.schemas.schemas import SimulationRequest, SimulationResponse
from backend.app.services.simulation_engine import simulation_engine

router = APIRouter(tags=["Simulation"])

@router.post("/simulate", response_model=SimulationResponse)
def simulate_treatment(request: SimulationRequest):
    """
    Simulate step-by-step passage of water through selected treatment stages.
    Evaluates concentration reductions, pH shifts, oxygenation, and validates engineering sequence rules.
    """
    if not request.baseline_measurements:
        raise HTTPException(status_code=400, detail="Baseline measurements are required.")

    return simulation_engine.run_simulation(
        baseline_measurements=request.baseline_measurements,
        treatment_sequence=request.treatment_sequence,
        standard_id=request.standard_id
    )
