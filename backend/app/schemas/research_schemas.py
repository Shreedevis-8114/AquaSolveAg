from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class ObservationBase(BaseModel):
    experiment_id: str
    sample_id: Optional[str] = None
    experiment_date: Optional[str] = None
    water_source: Optional[str] = "Groundwater"
    contaminant: str
    initial_concentration: float
    final_concentration: float
    unit: str = "mg/L"
    treatment_method: str
    treatment_duration: Optional[float] = None
    ph: Optional[float] = None
    temperature: Optional[float] = None
    treatment_dose: Optional[float] = None
    replicate_number: int = 1
    measurement_uncertainty: Optional[float] = None
    instrument_method: Optional[str] = None
    notes: Optional[str] = None

class ObservationCreate(ObservationBase):
    pass

class ObservationAuditUpdate(BaseModel):
    observation_id: int
    audit_status: str = Field(..., description="'accepted', 'excluded', or 'annotated'")
    audit_annotation: Optional[str] = None

class ObservationResponse(ObservationBase):
    id: int
    dataset_id: int
    removal_efficiency: Optional[float] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    audit_status: str = "accepted"
    audit_annotation: Optional[str] = None
    audited_at: Optional[str] = None

class ColumnMappingConfig(BaseModel):
    experiment_id: str = "experiment_id"
    sample_id: Optional[str] = "sample_id"
    experiment_date: Optional[str] = "experiment_date"
    water_source: Optional[str] = "water_source"
    contaminant: str = "contaminant"
    initial_concentration: str = "initial_concentration"
    final_concentration: str = "final_concentration"
    unit: Optional[str] = "unit"
    treatment_method: str = "treatment_method"
    treatment_duration: Optional[str] = "treatment_duration"
    ph: Optional[str] = "ph"
    temperature: Optional[str] = "temperature"
    treatment_dose: Optional[str] = "treatment_dose"
    replicate_number: Optional[str] = "replicate_number"
    measurement_uncertainty: Optional[str] = "measurement_uncertainty"
    instrument_method: Optional[str] = "instrument_method"
    notes: Optional[str] = "notes"

class ManualDatasetCreate(BaseModel):
    name: str = "Experimental Batch"
    description: Optional[str] = None
    observations: List[ObservationCreate]

class DataQualityMetrics(BaseModel):
    total_records: int
    valid_records: int
    flagged_records: int
    excluded_records: int
    missing_data_percentage: float
    total_replicate_groups: int
    single_replicate_count: int
    negative_removal_count: int
    outlier_count: int
    replicate_groups_count: Optional[int] = None
    missing_data_pct: Optional[float] = None
    potential_outliers_count: Optional[int] = None
    data_completeness_pct: Optional[float] = None
    quality_summary: Optional[str] = None

class FlaggedRecordDetail(BaseModel):
    observation_id: int
    experiment_id: str
    contaminant: str
    treatment_method: str
    flag_reason: str
    severity: str  # "warning", "caution", "anomaly"
    recommendation: str

class DatasetSummaryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    file_name: Optional[str] = None
    file_type: str
    uploaded_at: str
    total_records: int
    valid_records: int
    flagged_records: int

class DatasetDetailResponse(DatasetSummaryResponse):
    metadata: Dict[str, Any]
    quality_metrics: DataQualityMetrics
    observations: List[ObservationResponse]

class TreatmentPerformanceMetric(BaseModel):
    contaminant: str
    treatment_method: str
    record_count: int
    mean_removal_efficiency: float
    std_removal_efficiency: float
    min_removal_efficiency: float
    max_removal_efficiency: float
    median_removal_efficiency: float
    mean_initial_concentration: float
    mean_final_concentration: float
    unit: str

class ReplicateGroupAnalysis(BaseModel):
    group_key: str
    experiment_id: str
    contaminant: str
    treatment_method: str
    sample_size: int
    mean_initial: float
    mean_final: float
    mean_removal_efficiency: float
    std_removal_efficiency: float
    cv_percent: float  # Coefficient of variation (%)
    ci_95_lower: Optional[float] = None
    ci_95_upper: Optional[float] = None
    mean_uncertainty: Optional[float] = None
    propagated_uncertainty: Optional[float] = None
    is_small_sample: bool  # True if n < 3
    repeatability_rating: str  # "High Precision (CV < 5%)", "Moderate (CV 5-15%)", "High Variability (CV > 15%)"
    hypothesis_for_variability: Optional[str] = None
    observations: List[ObservationResponse]
    mean_removal: Optional[float] = None
    std_dev: Optional[float] = None
    coeff_of_variation_pct: Optional[float] = None
    ci_lower_95: Optional[float] = None
    ci_upper_95: Optional[float] = None
    reproducibility_status: Optional[str] = None
    small_sample_warning: Optional[bool] = None

    def model_post_init(self, __context: Any) -> None:
        if self.mean_removal is None:
            self.mean_removal = self.mean_removal_efficiency
        if self.std_dev is None:
            self.std_dev = self.std_removal_efficiency
        if self.coeff_of_variation_pct is None:
            self.coeff_of_variation_pct = self.cv_percent
        if self.ci_lower_95 is None and self.ci_95_lower is not None:
            self.ci_lower_95 = self.ci_95_lower
        if self.ci_upper_95 is None and self.ci_95_upper is not None:
            self.ci_upper_95 = self.ci_95_upper
        if self.reproducibility_status is None:
            self.reproducibility_status = self.repeatability_rating
        if self.small_sample_warning is None:
            self.small_sample_warning = self.is_small_sample

class ConditionCorrelation(BaseModel):
    parameter: str  # "ph", "temperature", "treatment_dose", "treatment_duration"
    contaminant: str
    treatment_method: str
    observation_count: int
    pearson_r: Optional[float] = None
    trend_description: str
    scientific_interpretation: str

class ResearchAnalysisResponse(BaseModel):
    dataset_id: int
    dataset_name: str
    quality_metrics: DataQualityMetrics
    treatment_performances: List[TreatmentPerformanceMetric]
    replicate_groups: List[ReplicateGroupAnalysis]
    condition_correlations: List[ConditionCorrelation]
    identified_research_gaps: List[str]

class ExperimentCompareRequest(BaseModel):
    dataset_id: int
    experiment_ids: List[str]

class ConditionDifference(BaseModel):
    condition: str
    is_mismatched: bool
    description: str
    severity: str  # "fair", "caution", "unfair_comparison"

class ExperimentCompareResponse(BaseModel):
    dataset_id: int
    experiments: List[Dict[str, Any]]
    condition_differences: List[ConditionDifference]
    fair_comparison_advisory: str
    performance_comparison_summary: str
    performance_comparison: Optional[str] = None
    condition_disparities: Optional[List[str]] = None

    def model_post_init(self, __context: Any) -> None:
        if self.performance_comparison is None:
            self.performance_comparison = self.performance_comparison_summary
        if self.condition_disparities is None:
            self.condition_disparities = [d.description for d in self.condition_differences if d.is_mismatched]

class ExperimentRecommendationItem(BaseModel):
    id: str
    priority: int
    category: str
    research_question: str
    reason: str
    reason_for_recommendation: Optional[str] = None
    supporting_observations: List[str]
    variables_to_investigate: List[str]
    variables_to_keep_constant: Dict[str, Any]
    variables_to_keep_consistent: Optional[List[str]] = None
    expected_information_gain: str
    confidence_limitations: str
    confidence_or_limitations: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.reason_for_recommendation is None:
            self.reason_for_recommendation = self.reason
        if self.confidence_or_limitations is None:
            self.confidence_or_limitations = self.confidence_limitations
        if self.variables_to_keep_consistent is None:
            self.variables_to_keep_consistent = [f"{k}: {v}" for k, v in self.variables_to_keep_constant.items()]

class ExperimentRecommendationResponse(BaseModel):
    dataset_id: int
    total_recommendations: int
    highest_priority_recommendation: Optional[ExperimentRecommendationItem] = None
    recommendations: List[ExperimentRecommendationItem]
    methodology_notes: List[str]

class ResearchReportRequest(BaseModel):
    dataset_id: int
    report_title: Optional[str] = "AquaSolve Research Intelligence Experimental Report"
    include_raw_data: bool = True
    include_audit_trail: bool = True
