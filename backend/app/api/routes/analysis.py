from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.app.schemas.schemas import AnalysisRequest, AnalysisResponse
from backend.app.services.water_analyzer import water_analyzer
from backend.app.services.chemistry_engine import chemistry_engine

router = APIRouter(tags=["Analysis"])

@router.get("/parameters", response_model=List[Dict[str, Any]])
def get_parameters():
    """Retrieve all supported water quality parameters and their environmental chemistry definitions."""
    return chemistry_engine.get_all_parameters()

@router.get("/standards", response_model=List[Dict[str, Any]])
def get_standards():
    """Retrieve all configured regulatory and guideline reference standards (IS 10500, WHO, EPA)."""
    return chemistry_engine.get_all_standards()

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_water(request: AnalysisRequest):
    """
    Evaluate user-submitted water quality measurements against selected standard.
    Validates physical boundaries and classifies parameters into compliance, warnings, and exceedances.
    """
    if not request.measurements:
        raise HTTPException(status_code=400, detail="At least one parameter measurement must be provided.")

    return water_analyzer.evaluate_water(
        measurements=request.measurements,
        standard_id=request.standard_id,
        source=request.source,
        intended_use=request.intended_use
    )
