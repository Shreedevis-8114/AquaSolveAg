from fastapi import APIRouter, Response, HTTPException
from backend.app.schemas.schemas import ReportGenerateRequest
from backend.app.services.report_generator import report_generator

router = APIRouter(tags=["Reports"])

@router.post("/reports/generate")
def generate_pdf_report(request: ReportGenerateRequest):
    """
    Generate and stream a publication-grade PDF water quality and treatment report.
    """
    if not request.baseline_measurements:
        raise HTTPException(status_code=400, detail="Baseline measurements are required.")

    pdf_bytes = report_generator.generate_pdf(
        source=request.source,
        intended_use=request.intended_use,
        standard_id=request.standard_id,
        baseline_measurements=request.baseline_measurements,
        treatment_sequence=request.treatment_sequence,
        report_title=request.report_title or "AquaSolve Water Quality Analysis Report"
    )

    filename = f"AquaSolve_Report_{request.standard_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/reports/csv")
def generate_csv_report(request: ReportGenerateRequest):
    """
    Export structured water quality measurements and simulation deltas as CSV.
    """
    if not request.baseline_measurements:
        raise HTTPException(status_code=400, detail="Baseline measurements are required.")

    csv_data = report_generator.generate_csv(
        source=request.source,
        standard_id=request.standard_id,
        baseline_measurements=request.baseline_measurements,
        treatment_sequence=request.treatment_sequence
    )

    filename = f"AquaSolve_Data_{request.standard_id}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
