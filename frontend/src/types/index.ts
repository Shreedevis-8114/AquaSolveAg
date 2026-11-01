export interface ParameterDefinition {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  category: string;
  min_valid: number;
  max_valid: number;
  scientific_definition: string;
  environmental_significance: string;
  common_sources: string;
  relevant_chemistry: string;
  potential_consequences: string;
}

export interface StandardLimit {
  min?: number;
  max?: number;
  desirable_min?: number;
  desirable_max?: number;
  permissible_max?: number;
  type: string;
  notes?: string;
}

export interface ReferenceStandard {
  id: string;
  name: string;
  description: string;
  jurisdiction: string;
  publication_year: string;
  source: string;
  limits: Record<string, StandardLimit>;
}

export interface TreatmentMethod {
  id: string;
  name: string;
  stage_category: string;
  icon: string;
  description: string;
  target_contaminants: string[];
  chemistry_principle: string;
  suitable_applications: string;
  prerequisites: string;
  limitations: string;
  secondary_effects: string;
  reference: string;
}

export interface DemoSample {
  id: string;
  title: string;
  description: string;
  source: string;
  intended_use: string;
  standard_id: string;
  measurements: Record<string, number>;
}

export interface ParameterEvaluation {
  parameter_id: string;
  name: string;
  value: number;
  unit: string;
  status: 'Within selected reference' | 'Above selected reference' | 'Below selected reference' | 'Not evaluated' | 'Invalid input';
  desirable_limit?: number | null;
  permissible_limit?: number | null;
  reference_range_str: string;
  concern_level: 'normal' | 'moderate' | 'severe' | 'critical';
  scientific_summary: string;
  health_significance: string;
  notes?: string;
}

export interface ConcernItem {
  parameter_id: string;
  parameter_name: string;
  value: number;
  unit: string;
  status: string;
  concern_level: 'normal' | 'moderate' | 'severe' | 'critical';
  reference_standard: string;
  reference_limit: string;
  scientific_impact: string;
  chemical_basis: string;
}

export interface AnalysisSummary {
  total_submitted: number;
  total_evaluated: number;
  outside_reference_count: number;
  unconfigured_count: number;
  overall_status: string;
}

export interface AnalysisResponse {
  source: string;
  intended_use: string;
  standard_id: string;
  standard_name: string;
  summary: AnalysisSummary;
  parameters: Record<string, ParameterEvaluation>;
  concerns: ConcernItem[];
  educational_disclaimer: string;
}

export interface TreatmentStageRecommendation {
  id: string;
  name: string;
  stage_category: string;
  order: number;
  rationale: string;
  chemistry_principle: string;
  target_contaminants: string[];
  prerequisites: string;
  limitations: string;
  secondary_effects: string;
}

export interface RecommendationResponse {
  recommended_sequence: TreatmentStageRecommendation[];
  alternative_options: Array<{ stage: string; name: string; rationale: string }>;
  unresolved_contaminants: string[];
  engineering_notes: string[];
  disclaimer: string;
}

export interface StageStepResult {
  stage_id: string;
  stage_name: string;
  stage_category: string;
  incoming_values: Record<string, number>;
  outgoing_values: Record<string, number>;
  applied_effects: Record<string, string>;
}

export interface SimulationResponse {
  standard_id: string;
  baseline_measurements: Record<string, number>;
  final_measurements: Record<string, number>;
  stage_steps: StageStepResult[];
  parameter_evaluations_after: Record<string, ParameterEvaluation>;
  remaining_concerns: ConcernItem[];
  resolved_concerns: string[];
  sequence_warnings: string[];
  model_assumptions: Array<{ stage: string; parameter: string; effect: string; source: string }>;
  scientific_disclaimer: string;
}

export interface ScenarioComparisonResponse {
  baseline_measurements: Record<string, number>;
  standard_id: string;
  scenario_a: SimulationResponse;
  scenario_b: SimulationResponse;
  comparison_summary: {
    scenario_a_name: string;
    scenario_b_name: string;
    scenario_a_stages_count: number;
    scenario_b_stages_count: number;
    scenario_a_remaining_concerns: number;
    scenario_b_remaining_concerns: number;
    scenario_a_advantages: string[];
    scenario_b_advantages: string[];
    engineering_recommendation: string;
  };
}

export * from './research';
