from fastapi import APIRouter, HTTPException
from backend.app.schemas.schemas import ScenarioComparisonRequest, ScenarioComparisonResponse
from backend.app.services.simulation_engine import simulation_engine

router = APIRouter(tags=["What-If Scenarios"])

@router.post("/compare-scenarios", response_model=ScenarioComparisonResponse)
def compare_scenarios(request: ScenarioComparisonRequest):
    """
    Compare two alternative treatment train scenarios against the same baseline water sample.
    Highlights trade-offs, advantages, remaining contaminants, and cost/complexity notes.
    """
    if not request.baseline_measurements:
        raise HTTPException(status_code=400, detail="Baseline measurements are required.")

    res_a = simulation_engine.run_simulation(
        baseline_measurements=request.baseline_measurements,
        treatment_sequence=request.scenario_a_sequence,
        standard_id=request.standard_id
    )

    res_b = simulation_engine.run_simulation(
        baseline_measurements=request.baseline_measurements,
        treatment_sequence=request.scenario_b_sequence,
        standard_id=request.standard_id
    )

    # Calculate differences
    concerns_a = len(res_a.remaining_concerns)
    concerns_b = len(res_b.remaining_concerns)

    adv_a = []
    adv_b = []

    if concerns_a < concerns_b:
        adv_a.append(f"Resolves {concerns_b - concerns_a} more contaminant concern(s) than Scenario B.")
    elif concerns_b < concerns_a:
        adv_b.append(f"Resolves {concerns_a - concerns_b} more contaminant concern(s) than Scenario A.")

    if len(request.scenario_a_sequence) < len(request.scenario_b_sequence):
        adv_a.append("Fewer operational stages (simpler maintenance and lower capital footprint).")
    elif len(request.scenario_b_sequence) < len(request.scenario_a_sequence):
        adv_b.append("Fewer operational stages (simpler maintenance and lower capital footprint).")

    summary = {
        "scenario_a_name": request.scenario_a_name,
        "scenario_b_name": request.scenario_b_name,
        "scenario_a_stages_count": len(request.scenario_a_sequence),
        "scenario_b_stages_count": len(request.scenario_b_sequence),
        "scenario_a_remaining_concerns": concerns_a,
        "scenario_b_remaining_concerns": concerns_b,
        "scenario_a_advantages": adv_a,
        "scenario_b_advantages": adv_b,
        "engineering_recommendation": (
            f"Scenario A ({request.scenario_a_name}) yields superior chemical compliance."
            if concerns_a < concerns_b
            else f"Scenario B ({request.scenario_b_name}) yields superior chemical compliance."
            if concerns_b < concerns_a
            else "Both scenarios achieve comparable target contaminant removal; compare energy and footprint."
        )
    }

    return ScenarioComparisonResponse(
        baseline_measurements=request.baseline_measurements,
        standard_id=request.standard_id,
        scenario_a=res_a,
        scenario_b=res_b,
        comparison_summary=summary
    )
