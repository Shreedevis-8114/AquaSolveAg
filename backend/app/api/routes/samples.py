from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.app.database.connection import get_db
from backend.app.models.entities import WaterSample, Measurement, AnalysisRecord
from backend.app.services.chemistry_engine import chemistry_engine

router = APIRouter(tags=["Samples & History"])

class SampleSaveInput(BaseModel):
    source: str
    intended_use: str = "Drinking"
    standard_id: str = "is10500"
    location_name: Optional[str] = None
    notes: Optional[str] = None
    measurements: Dict[str, float]

@router.get("/samples/demo", response_model=List[Dict[str, Any]])
def get_demo_samples():
    """List all synthetic demonstration datasets (A, B, C, D, E)."""
    return chemistry_engine.get_samples()

@router.get("/samples/demo/{sample_id}", response_model=Dict[str, Any])
def get_demo_sample_by_id(sample_id: str):
    """Retrieve a specific demonstration dataset by ID."""
    sample = chemistry_engine.get_sample_by_id(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Demo sample not found.")
    return sample

@router.get("/samples")
def list_saved_samples(db: Session = Depends(get_db)):
    """List historical user water samples stored in the database."""
    samples = db.query(WaterSample).order_by(WaterSample.created_at.desc()).all()
    results = []
    for s in samples:
        results.append({
            "id": s.id,
            "source": s.source,
            "intended_use": s.intended_use,
            "standard_id": s.standard_id,
            "location_name": s.location_name,
            "notes": s.notes,
            "created_at": s.created_at.isoformat(),
            "measurements_count": len(s.measurements)
        })
    return results

@router.post("/samples")
def save_water_sample(payload: SampleSaveInput, db: Session = Depends(get_db)):
    """Persist a water sample and its parameters to SQLite database."""
    sample = WaterSample(
        source=payload.source,
        intended_use=payload.intended_use,
        standard_id=payload.standard_id,
        location_name=payload.location_name,
        notes=payload.notes,
        created_at=datetime.utcnow()
    )
    db.add(sample)
    db.flush()

    for pid, val in payload.measurements.items():
        p_def = chemistry_engine.get_parameter(pid)
        unit = p_def["unit"] if p_def else ""
        m = Measurement(
            sample_id=sample.id,
            parameter_id=pid,
            value=val,
            unit=unit
        )
        db.add(m)

    db.commit()
    db.refresh(sample)

    return {
        "id": sample.id,
        "message": "Water sample and measurements saved successfully.",
        "created_at": sample.created_at.isoformat()
    }

@router.get("/samples/{sample_id}")
def get_saved_sample(sample_id: int, db: Session = Depends(get_db)):
    """Retrieve details and measurements of a saved water sample."""
    sample = db.query(WaterSample).filter(WaterSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Saved water sample not found.")

    meas = {m.parameter_id: m.value for m in sample.measurements}
    return {
        "id": sample.id,
        "source": sample.source,
        "intended_use": sample.intended_use,
        "standard_id": sample.standard_id,
        "location_name": sample.location_name,
        "notes": sample.notes,
        "created_at": sample.created_at.isoformat(),
        "measurements": meas
    }
