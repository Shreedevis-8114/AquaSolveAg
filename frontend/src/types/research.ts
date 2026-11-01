export interface ResearchQualityMetrics {
  total_records: number;
  valid_records: number;
  flagged_records: number;
  missing_data_pct: number;
  replicate_groups_count: number;
  potential_outliers_count: number;
  non_physical_count: number;
  negative_removal_count: number;
  data_completeness_pct: number;
  quality_summary: string;
}

export interface ResearchObservation {
  id: number;
  dataset_id: number;
  experiment_id: string;
  sample_id?: string | null;
  experiment_date?: string | null;
  water_source?: string | null;
  contaminant: string;
  initial_concentration: number;
  final_concentration: number;
  removal_efficiency?: number | null;
  unit: string;
  treatment_method: string;
  treatment_duration?: number | null;
  ph?: number | null;
  temperature?: number | null;
  treatment_dose?: number | null;
  replicate_number: number;
  measurement_uncertainty?: number | null;
  instrument_method?: string | null;
  notes?: string | null;
  is_flagged: boolean;
  flag_reason?: string | null;
  audit_status: 'pending' | 'accepted' | 'excluded' | 'annotated';
  audit_annotation?: string | null;
  audited_at?: string | null;
}

export interface ResearchDatasetSummary {
  id: number;
  name: string;
  description?: string | null;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  total_records: number;
  valid_records: number;
  flagged_records: number;
}

export interface ResearchDatasetDetail {
  id: number;
  name: string;
  description?: string | null;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  total_records: number;
  valid_records: number;
  flagged_records: number;
  metadata?: Record<string, any>;
  quality_metrics: ResearchQualityMetrics;
  observations: ResearchObservation[];
}

export interface ColumnMappingPreview {
  columns: string[];
  detected_mapping: Record<string, string>;
  preview_rows: Record<string, any>[];
  total_preview_rows: number;
}

export interface ColumnMappingConfig {
  experiment_id?: string | null;
  sample_id?: string | null;
  experiment_date?: string | null;
  water_source?: string | null;
  contaminant?: string | null;
  initial_concentration?: string | null;
  final_concentration?: string | null;
  treatment_method?: string | null;
  treatment_duration?: string | null;
  ph?: string | null;
  temperature?: string | null;
  treatment_dose?: string | null;
  replicate_number?: string | null;
  measurement_uncertainty?: string | null;
  instrument_method?: string | null;
  notes?: string | null;
  unit_default?: string;
}

export interface TreatmentPerformanceGroup {
  treatment_method: string;
  contaminant: string;
  experiment_count: number;
  mean_removal_efficiency: number;
  min_removal_efficiency: number;
  max_removal_efficiency: number;
  std_removal_efficiency: number;
  performance_rating: string;
  observations_summary: Array<{
    experiment_id: string;
    removal_efficiency: number;
    ph?: number | null;
    dose?: number | null;
    duration?: number | null;
    uncertainty?: number | null;
  }>;
}

export interface ReplicateStatGroup {
  group_key: string;
  treatment_method: string;
  contaminant: string;
  sample_size: number;
  mean_removal: number;
  std_dev: number;
  coeff_of_variation_pct: number;
  ci_lower_95: number;
  ci_upper_95: number;
  propagated_uncertainty_mean: number;
  reproducibility_status: string;
  small_sample_warning: boolean;
  scientific_hypotheses: string[];
  replicate_values: number[];
}

export interface ConditionCorrelation {
  condition_variable: string;
  contaminant: string;
  treatment_method: string;
  pearson_r: number;
  p_value: number;
  sample_size: number;
  scientific_interpretation: string;
}

export interface ResearchGap {
  gap_type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  recommendation_prompt: string;
}

export interface ResearchAnalysisResponse {
  dataset_id: number;
  dataset_name: string;
  quality_metrics: ResearchQualityMetrics;
  treatment_performances: TreatmentPerformanceGroup[];
  replicate_groups: ReplicateStatGroup[];
  condition_correlations: ConditionCorrelation[];
  identified_research_gaps: ResearchGap[];
}

export interface ExperimentRecommendationItem {
  id: string;
  research_question: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  reason_for_recommendation: string;
  supporting_observations: string[];
  variables_to_investigate: string[];
  variables_to_keep_consistent: string[];
  expected_information_gain: string;
  confidence_or_limitations: string;
}

export interface ExperimentRecommendationResponse {
  dataset_id: number;
  total_recommendations: number;
  highest_priority_recommendation?: ExperimentRecommendationItem | null;
  recommendations: ExperimentRecommendationItem[];
  methodology_notes: string;
}

export interface ExperimentCompareItem {
  experiment_id: string;
  sample_id?: string | null;
  contaminant: string;
  treatment_method: string;
  initial_concentration: number;
  final_concentration: number;
  removal_efficiency: number;
  unit: string;
  ph?: number | null;
  temperature?: number | null;
  treatment_duration?: number | null;
  treatment_dose?: number | null;
  replicate_count: number;
  replicate_cv_pct?: number | null;
  replicate_ci_95?: string | null;
  data_completeness_pct: number;
  audit_status: string;
  notes?: string | null;
}

export interface ExperimentCompareResponse {
  dataset_id: number;
  experiments: ExperimentCompareItem[];
  condition_disparities: string[];
  fair_comparison_advisory: string;
  performance_comparison: string;
}
