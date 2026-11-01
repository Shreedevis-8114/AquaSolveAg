from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import os
import pandas as pd

from backend.app.database.connection import get_db
from backend.app.models.entities import ResearchDataset, ResearchObservation
from backend.app.schemas.research_schemas import (
    ColumnMappingConfig,
    DatasetSummaryResponse,
    DatasetDetailResponse,
    ObservationAuditUpdate,
    ObservationResponse,
    ResearchAnalysisResponse,
    ExperimentCompareRequest,
    ExperimentCompareResponse,
    ExperimentRecommendationResponse,
    ResearchReportRequest,
    ManualDatasetCreate
)
from backend.app.services.research_data_service import research_data_service
from backend.app.services.research_analysis_service import research_analysis_service
from backend.app.services.research_recommendation_service import research_recommendation_service
from backend.app.services.research_comparison_service import research_comparison_service
from backend.app.services.research_report_service import research_report_service

router = APIRouter(prefix="/research", tags=["Research Intelligence Lab"])

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "knowledge")

@router.post("/preview")
async def preview_file(file: UploadFile = File(...)):
    """Upload a research spreadsheet to preview columns and sample rows for field mapping."""
    content = await file.read()
    try:
        df = research_data_service.parse_file_to_dataframe(content, file.filename or "data.csv")
        return research_data_service.extract_preview(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse spreadsheet: {str(e)}")

@router.post("/upload", response_model=DatasetDetailResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: str = Form("Experimental Dataset"),
    description: Optional[str] = Form(None),
    mapping_json: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload CSV or Excel dataset, apply column mapping, validate data quality, and store."""
    content = await file.read()
    try:
        df = research_data_service.parse_file_to_dataframe(content, file.filename or "data.csv")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")

    mapping = None
    if mapping_json:
        try:
            m_data = json.loads(mapping_json)
            mapping = ColumnMappingConfig(**m_data)
        except Exception:
            mapping = None

    dataset = research_data_service.ingest_dataframe(
        db=db,
        df=df,
        dataset_name=dataset_name,
        file_name=file.filename,
        file_type="xlsx" if (file.filename or "").endswith(('.xlsx', '.xls')) else "csv",
        mapping=mapping,
        description=description
    )

    return get_dataset_details(dataset.id, db)

@router.post("/manual", response_model=DatasetDetailResponse)
def create_manual_dataset(payload: ManualDatasetCreate, db: Session = Depends(get_db)):
    """Create a research dataset via manual observation entry."""
    records = [obs.model_dump() for obs in payload.observations]
    df = pd.DataFrame(records)
    dataset = research_data_service.ingest_dataframe(
        db=db,
        df=df,
        dataset_name=payload.name,
        file_name="manual_entry.json",
        file_type="manual",
        description=payload.description
    )
    return get_dataset_details(dataset.id, db)

@router.get("/sample-dataset", response_model=DatasetDetailResponse)
@router.post("/sample-dataset", response_model=DatasetDetailResponse)
def load_sample_research_dataset(db: Session = Depends(get_db)):
    """Load the verified synthetic research benchmark dataset."""
    sample_path = os.path.join(KNOWLEDGE_DIR, "research_sample_dataset.json")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample dataset file not found.")

    with open(sample_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    df = pd.DataFrame(data)
    dataset = research_data_service.ingest_dataframe(
        db=db,
        df=df,
        dataset_name="AquaSolve Benchmark Experimental Series",
        file_name="research_sample_dataset.csv",
        file_type="synthetic",
        description="Verified multi-experiment dataset with repeated replicates, pH shifts, adsorption isotherms, and realistic anomalies."
    )
    return get_dataset_details(dataset.id, db)

@router.get("/datasets", response_model=List[DatasetSummaryResponse])
def list_datasets(db: Session = Depends(get_db)):
    """List all research datasets stored in the database."""
    datasets = db.query(ResearchDataset).order_by(ResearchDataset.uploaded_at.desc()).all()
    results = []
    for d in datasets:
        results.append(
            DatasetSummaryResponse(
                id=d.id,
                name=d.name,
                description=d.description,
                file_name=d.file_name,
                file_type=d.file_type,
                uploaded_at=d.uploaded_at.isoformat(),
                total_records=d.total_records,
                valid_records=d.valid_records,
                flagged_records=d.flagged_records
            )
        )
    return results

@router.get("/datasets/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset_details(dataset_id: int, db: Session = Depends(get_db)):
    """Retrieve complete dataset records, metadata, and data quality indicators."""
    dataset = db.query(ResearchDataset).filter(ResearchDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    observations = dataset.observations
    quality_metrics = research_data_service.compute_quality_metrics(observations)

    obs_responses = [
        ObservationResponse(
            id=o.id,
            dataset_id=o.dataset_id,
            experiment_id=o.experiment_id,
            sample_id=o.sample_id,
            experiment_date=o.experiment_date,
            water_source=o.water_source,
            contaminant=o.contaminant,
            initial_concentration=o.initial_concentration,
            final_concentration=o.final_concentration,
            removal_efficiency=o.removal_efficiency,
            unit=o.unit,
            treatment_method=o.treatment_method,
            treatment_duration=o.treatment_duration,
            ph=o.ph,
            temperature=o.temperature,
            treatment_dose=o.treatment_dose,
            replicate_number=o.replicate_number,
            measurement_uncertainty=o.measurement_uncertainty,
            instrument_method=o.instrument_method,
            notes=o.notes,
            is_flagged=o.is_flagged,
            flag_reason=o.flag_reason,
            audit_status=o.audit_status,
            audit_annotation=o.audit_annotation,
            audited_at=o.audited_at.isoformat() if o.audited_at else None
        )
        for o in observations
    ]

    meta = json.loads(dataset.metadata_json) if dataset.metadata_json else {}

    return DatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        file_name=dataset.file_name,
        file_type=dataset.file_type,
        uploaded_at=dataset.uploaded_at.isoformat(),
        total_records=dataset.total_records,
        valid_records=dataset.valid_records,
        flagged_records=dataset.flagged_records,
        metadata=meta,
        quality_metrics=quality_metrics,
        observations=obs_responses
    )

@router.post("/datasets/{dataset_id}/audit", response_model=ObservationResponse)
def audit_observation(
    dataset_id: int,
    payload: ObservationAuditUpdate,
    db: Session = Depends(get_db)
):
    """Audit flagged observation: Accept, Exclude from statistics, or Annotate."""
    try:
        obs = research_data_service.update_observation_audit(
            db=db,
            observation_id=payload.observation_id,
            status=payload.audit_status,
            annotation=payload.audit_annotation
        )
        return ObservationResponse(
            id=obs.id,
            dataset_id=obs.dataset_id,
            experiment_id=obs.experiment_id,
            sample_id=obs.sample_id,
            experiment_date=obs.experiment_date,
            water_source=obs.water_source,
            contaminant=obs.contaminant,
            initial_concentration=obs.initial_concentration,
            final_concentration=obs.final_concentration,
            removal_efficiency=obs.removal_efficiency,
            unit=obs.unit,
            treatment_method=obs.treatment_method,
            treatment_duration=obs.treatment_duration,
            ph=obs.ph,
            temperature=obs.temperature,
            treatment_dose=obs.treatment_dose,
            replicate_number=obs.replicate_number,
            measurement_uncertainty=obs.measurement_uncertainty,
            instrument_method=obs.instrument_method,
            notes=obs.notes,
            is_flagged=obs.is_flagged,
            flag_reason=obs.flag_reason,
            audit_status=obs.audit_status,
            audit_annotation=obs.audit_annotation,
            audited_at=obs.audited_at.isoformat() if obs.audited_at else None
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/datasets/{dataset_id}/analysis", response_model=ResearchAnalysisResponse)
def get_dataset_analysis(dataset_id: int, db: Session = Depends(get_db)):
    """Run full statistical performance analysis, replicate reproducibility, and condition correlations."""
    dataset = db.query(ResearchDataset).filter(ResearchDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    observations = dataset.observations
    quality_metrics = research_data_service.compute_quality_metrics(observations)
    performances = research_analysis_service.compute_treatment_performance(observations)
    replicates = research_analysis_service.compute_replicate_reproducibility(observations)
    correlations = research_analysis_service.compute_condition_correlations(observations)
    gaps = research_analysis_service.identify_research_gaps(observations, replicates)

    return ResearchAnalysisResponse(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        quality_metrics=quality_metrics,
        treatment_performances=performances,
        replicate_groups=replicates,
        condition_correlations=correlations,
        identified_research_gaps=gaps
    )

@router.get("/datasets/{dataset_id}/recommendations", response_model=ExperimentRecommendationResponse)
def get_experiment_recommendations(dataset_id: int, db: Session = Depends(get_db)):
    """Generate intelligent follow-up experiment recommendations based on experimental results and gaps."""
    dataset = db.query(ResearchDataset).filter(ResearchDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    return research_recommendation_service.generate_recommendations(
        dataset_id=dataset.id,
        observations=dataset.observations
    )

@router.post("/compare", response_model=ExperimentCompareResponse)
def compare_experiments(payload: ExperimentCompareRequest, db: Session = Depends(get_db)):
    """Compare selected experiments side-by-side with operating condition disparity checks."""
    if len(payload.experiment_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least two experiments to compare.")

    return research_comparison_service.compare_experiments(
        db=db,
        dataset_id=payload.dataset_id,
        experiment_ids=payload.experiment_ids
    )

@router.post("/reports/pdf")
def generate_pdf_report(payload: ResearchReportRequest, db: Session = Depends(get_db)):
    """Generate and stream a publication-ready PDF research report via ReportLab."""
    try:
        pdf_bytes = research_report_service.generate_pdf_report(
            db=db,
            dataset_id=payload.dataset_id,
            report_title=payload.report_title or "AquaSolve Research Intelligence Experimental Report",
            include_raw_data=payload.include_raw_data,
            include_audit_trail=payload.include_audit_trail
        )
        filename = f"AquaSolve_Research_Report_{payload.dataset_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF report generation failed: {str(e)}")

@router.post("/reports/csv")
def export_csv_report(payload: ResearchReportRequest, db: Session = Depends(get_db)):
    """Export clean research dataset with calculated removal efficiencies and audit trails as CSV."""
    try:
        csv_data = research_report_service.generate_csv_export(
            db=db,
            dataset_id=payload.dataset_id
        )
        filename = f"AquaSolve_Research_Data_{payload.dataset_id}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")
