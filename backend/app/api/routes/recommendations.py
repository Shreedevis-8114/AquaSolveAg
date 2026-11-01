from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.app.schemas.schemas import RecommendationRequest, RecommendationResponse
from backend.app.services.recommendation_engine import recommendation_engine
from backend.app.services.chemistry_engine import chemistry_engine

router = APIRouter(tags=["Recommendations"])

@router.get("/treatments", response_model=List[Dict[str, Any]])
def get_treatments():
    """Retrieve full catalog of 14 supported water treatment technologies and chemical principles."""
    return chemistry_engine.get_all_treatments()

@router.post("/recommend", response_model=RecommendationResponse)
def get_recommendations(request: RecommendationRequest):
    """
    Generate an environmental-chemistry-based, sequenced treatment train addressing identified water quality issues.
    """
    if not request.measurements:
        raise HTTPException(status_code=400, detail="Measurements required to generate recommendations.")

    return recommendation_engine.generate_recommendations(
        measurements=request.measurements,
        standard_id=request.standard_id,
        source=request.source or "Borewell",
        intended_use=request.intended_use or "Drinking"
    )
