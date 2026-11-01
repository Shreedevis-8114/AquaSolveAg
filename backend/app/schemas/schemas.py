from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class MeasurementInput(BaseModel):
    parameter_id: str
    value: float
    unit: Optional[str] = None

class AnalysisRequest(BaseModel):
    source: str = Field(default="Borewell", description="Source of water")
    intended_use: str = Field(default="Drinking", description="Intended usage")
    standard_id: str = Field(default="is10500", description="Selected reference standard")
    measurements: Dict[str, float] = Field(..., description="Map of parameter_id to numeric value")
    notes: Optional[str] = None

class ParameterEvaluation(BaseModel):
    parameter_id: str
    name: str
    value: float
    unit: str
    status: str  # "Within selected reference", "Above selected reference", "Below selected reference", "Not evaluated", "Invalid input"
    desirable_limit: Optional[float] = None
    permissible_limit: Optional[float] = None
    reference_range_str: str
    concern_level: str  # "normal", "moderate", "severe", "critical"
    scientific_summary: str
    health_significance: str
    notes: Optional[str] = None

class AnalysisSummary(BaseModel):
    total_submitted: int
    total_evaluated: int
    outside_reference_count: int
    unconfigured_count: int
    overall_status: str

class AnalysisResponse(BaseModel):
    source: str
    intended_use: str
    standard_id: str
    standard_name: str
    summary: AnalysisSummary
    parameters: Dict[str, ParameterEvaluation]
    concerns: List[Dict[str, Any]]
    educational_disclaimer: str

class RecommendationRequest(BaseModel):
    measurements: Dict[str, float]
    standard_id: str = "is10500"
    source: Optional[str] = "Borewell"
    intended_use: Optional[str] = "Drinking"

class TreatmentStageRecommendation(BaseModel):
    id: str
    name: str
    stage_category: str
    order: int
    rationale: str
    chemistry_principle: str
    target_contaminants: List[str]
    prerequisites: str
    limitations: str
    secondary_effects: str

class RecommendationResponse(BaseModel):
    recommended_sequence: List[TreatmentStageRecommendation]
    alternative_options: List[Dict[str, Any]]
    unresolved_contaminants: List[str]
    engineering_notes: List[str]
    disclaimer: str

class SimulationRequest(BaseModel):
    baseline_measurements: Dict[str, float]
    standard_id: str = "is10500"
    treatment_sequence: List[str]

class StageStepResult(BaseModel):
    stage_id: str
    stage_name: str
    stage_category: str
    incoming_values: Dict[str, float]
    outgoing_values: Dict[str, float]
    applied_effects: Dict[str, str]

class SimulationResponse(BaseModel):
    standard_id: str
    baseline_measurements: Dict[str, float]
    final_measurements: Dict[str, float]
    stage_steps: List[StageStepResult]
    parameter_evaluations_after: Dict[str, ParameterEvaluation]
    remaining_concerns: List[Dict[str, Any]]
    resolved_concerns: List[str]
    sequence_warnings: List[str]
    model_assumptions: List[Dict[str, Any]]
    scientific_disclaimer: str

class ScenarioComparisonRequest(BaseModel):
    baseline_measurements: Dict[str, float]
    standard_id: str = "is10500"
    scenario_a_name: str = "Recommended Sequence"
    scenario_a_sequence: List[str]
    scenario_b_name: str = "Alternative Sequence"
    scenario_b_sequence: List[str]

class ScenarioComparisonResponse(BaseModel):
    baseline_measurements: Dict[str, float]
    standard_id: str
    scenario_a: SimulationResponse
    scenario_b: SimulationResponse
    comparison_summary: Dict[str, Any]

class ReportGenerateRequest(BaseModel):
    source: str = "Borewell"
    intended_use: str = "Drinking"
    standard_id: str = "is10500"
    baseline_measurements: Dict[str, float]
    treatment_sequence: Optional[List[str]] = None
    report_title: Optional[str] = "AquaSolve Water Quality Analysis & Treatment Report"
