import {
  ParameterDefinition,
  ReferenceStandard,
  TreatmentMethod,
  DemoSample,
  AnalysisResponse,
  RecommendationResponse,
  SimulationResponse,
  ScenarioComparisonResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getParameters(): Promise<ParameterDefinition[]> {
    const res = await fetch(`${API_BASE}/parameters`);
    if (!res.ok) throw new Error('Failed to fetch parameters');
    return res.json();
  },

  async getStandards(): Promise<ReferenceStandard[]> {
    const res = await fetch(`${API_BASE}/standards`);
    if (!res.ok) throw new Error('Failed to fetch reference standards');
    return res.json();
  },

  async getTreatments(): Promise<TreatmentMethod[]> {
    const res = await fetch(`${API_BASE}/treatments`);
    if (!res.ok) throw new Error('Failed to fetch treatment methods');
    return res.json();
  },

  async getDemoSamples(): Promise<DemoSample[]> {
    const res = await fetch(`${API_BASE}/samples/demo`);
    if (!res.ok) throw new Error('Failed to fetch demo samples');
    return res.json();
  },

  async getDemoSampleById(sampleId: string): Promise<DemoSample> {
    const res = await fetch(`${API_BASE}/samples/demo/${sampleId}`);
    if (!res.ok) throw new Error('Failed to fetch demo sample');
    return res.json();
  },

  async analyzeWater(payload: {
    source: string;
    intended_use: string;
    standard_id: string;
    measurements: Record<string, number>;
  }): Promise<AnalysisResponse> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis request failed');
    }
    return res.json();
  },

  async getRecommendations(payload: {
    measurements: Record<string, number>;
    standard_id: string;
    source?: string;
    intended_use?: string;
  }): Promise<RecommendationResponse> {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Recommendations failed' }));
      throw new Error(err.detail || 'Failed to retrieve recommendations');
    }
    return res.json();
  },

  async runSimulation(payload: {
    baseline_measurements: Record<string, number>;
    treatment_sequence: string[];
    standard_id: string;
  }): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Simulation failed' }));
      throw new Error(err.detail || 'Simulation execution failed');
    }
    return res.json();
  },

  async compareScenarios(payload: {
    baseline_measurements: Record<string, number>;
    standard_id: string;
    scenario_a_name: string;
    scenario_a_sequence: string[];
    scenario_b_name: string;
    scenario_b_sequence: string[];
  }): Promise<ScenarioComparisonResponse> {
    const res = await fetch(`${API_BASE}/compare-scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Scenario comparison failed');
    }
    return res.json();
  },

  async downloadPdfReport(payload: {
    source: string;
    intended_use: string;
    standard_id: string;
    baseline_measurements: Record<string, number>;
    treatment_sequence?: string[];
    report_title?: string;
  }): Promise<Blob> {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('PDF report generation failed');
    return res.blob();
  },

  async downloadCsvReport(payload: {
    source: string;
    intended_use: string;
    standard_id: string;
    baseline_measurements: Record<string, number>;
    treatment_sequence?: string[];
  }): Promise<Blob> {
    const res = await fetch(`${API_BASE}/reports/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('CSV report generation failed');
    return res.blob();
  },

  async getSavedSamples() {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error('Failed to fetch saved samples history');
    return res.json();
  },

  async saveSample(payload: {
    source: string;
    intended_use: string;
    standard_id: string;
    location_name?: string;
    notes?: string;
    measurements: Record<string, number>;
  }) {
    const res = await fetch(`${API_BASE}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save water sample');
    return res.json();
  },

  async getSavedSampleById(id: number) {
    const res = await fetch(`${API_BASE}/samples/${id}`);
    if (!res.ok) throw new Error('Failed to retrieve water sample');
    return res.json();
  },

  // Research Intelligence Lab APIs
  async previewResearchFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/research/preview`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to preview file' }));
      throw new Error(err.detail || 'Failed to preview file');
    }
    return res.json();
  },

  async uploadResearchDataset(
    file: File,
    datasetName: string,
    description?: string,
    mapping?: any
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_name', datasetName);
    if (description) formData.append('description', description);
    if (mapping) formData.append('mapping_json', JSON.stringify(mapping));

    const res = await fetch(`${API_BASE}/research/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Dataset upload failed');
    }
    return res.json();
  },

  async createManualResearchDataset(payload: {
    name: string;
    description?: string;
    observations: any[];
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/research/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Manual creation failed' }));
      throw new Error(err.detail || 'Failed to create manual dataset');
    }
    return res.json();
  },

  async loadSampleResearchDataset(): Promise<any> {
    const res = await fetch(`${API_BASE}/research/sample-dataset`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load sample dataset' }));
      throw new Error(err.detail || 'Failed to load sample dataset');
    }
    return res.json();
  },

  async getResearchDatasets(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/research/datasets`);
    if (!res.ok) throw new Error('Failed to retrieve research datasets');
    return res.json();
  },

  async getResearchDatasetDetails(datasetId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/research/datasets/${datasetId}`);
    if (!res.ok) throw new Error('Failed to retrieve dataset details');
    return res.json();
  },

  async auditResearchObservation(
    datasetId: number,
    payload: {
      observation_id: number;
      audit_status: 'pending' | 'accepted' | 'excluded' | 'annotated';
      audit_annotation?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/research/datasets/${datasetId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Audit failed' }));
      throw new Error(err.detail || 'Failed to audit observation');
    }
    return res.json();
  },

  async getResearchDatasetAnalysis(datasetId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/research/datasets/${datasetId}/analysis`);
    if (!res.ok) throw new Error('Failed to compute research analysis');
    return res.json();
  },

  async getExperimentRecommendations(datasetId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/research/datasets/${datasetId}/recommendations`);
    if (!res.ok) throw new Error('Failed to generate experiment recommendations');
    return res.json();
  },

  async compareExperiments(datasetId: number, experimentIds: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/research/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, experiment_ids: experimentIds })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Failed to compare experiments');
    }
    return res.json();
  },

  async downloadResearchPdfReport(
    datasetId: number,
    reportTitle?: string,
    includeRawData: boolean = true,
    includeAuditTrail: boolean = true
  ): Promise<Blob> {
    const res = await fetch(`${API_BASE}/research/reports/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        report_title: reportTitle,
        include_raw_data: includeRawData,
        include_audit_trail: includeAuditTrail
      })
    });
    if (!res.ok) throw new Error('PDF report generation failed');
    return res.blob();
  },

  async downloadResearchCsvReport(datasetId: number): Promise<Blob> {
    const res = await fetch(`${API_BASE}/research/reports/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId })
    });
    if (!res.ok) throw new Error('CSV report generation failed');
    return res.blob();
  }
};

