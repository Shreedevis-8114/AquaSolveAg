import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ParameterDefinition,
  ReferenceStandard,
  TreatmentMethod,
  DemoSample,
  AnalysisResponse,
  RecommendationResponse,
  SimulationResponse
} from '../types';
import { api } from '../services/api';

interface WaterContextType {
  parameters: ParameterDefinition[];
  standards: ReferenceStandard[];
  treatments: TreatmentMethod[];
  demoSamples: DemoSample[];
  loadingCatalog: boolean;
  source: string;
  setSource: (s: string) => void;
  intendedUse: string;
  setIntendedUse: (u: string) => void;
  standardId: string;
  setStandardId: (std: string) => void;
  measurements: Record<string, number>;
  setMeasurements: (m: Record<string, number>) => void;
  setParamValue: (paramId: string, val: number | undefined) => void;
  analysisResult: AnalysisResponse | null;
  recommendations: RecommendationResponse | null;
  activeSequence: string[];
  setActiveSequence: (seq: string[]) => void;
  simulationResult: SimulationResponse | null;
  loadDemoSample: (sampleId: string) => Promise<void>;
  runAnalysis: () => Promise<AnalysisResponse | null>;
  runSimulation: (customSequence?: string[]) => Promise<SimulationResponse | null>;
  resetAll: () => void;
}

const WaterContext = createContext<WaterContextType | undefined>(undefined);

export const WaterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parameters, setParameters] = useState<ParameterDefinition[]>([]);
  const [standards, setStandards] = useState<ReferenceStandard[]>([]);
  const [treatments, setTreatments] = useState<TreatmentMethod[]>([]);
  const [demoSamples, setDemoSamples] = useState<DemoSample[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Workflow state
  const [source, setSource] = useState('Borewell');
  const [intendedUse, setIntendedUse] = useState('Drinking');
  const [standardId, setStandardId] = useState('is10500');
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [activeSequence, setActiveSequence] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const [params, stds, tms, demos] = await Promise.all([
          api.getParameters(),
          api.getStandards(),
          api.getTreatments(),
          api.getDemoSamples()
        ]);
        setParameters(params);
        setStandards(stds);
        setTreatments(tms);
        setDemoSamples(demos);

        // Pre-fill with Dataset D (multi-problem showcase) if empty
        const defaultDemo = demos.find(d => d.id === 'dataset-d') || demos[0];
        if (defaultDemo) {
          setSource(defaultDemo.source);
          setIntendedUse(defaultDemo.intended_use);
          setStandardId(defaultDemo.standard_id);
          setMeasurements(defaultDemo.measurements);
        }
      } catch (err) {
        console.error('Failed to load initial catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const setParamValue = (paramId: string, val: number | undefined) => {
    setMeasurements(prev => {
      const next = { ...prev };
      if (val === undefined || isNaN(val)) {
        delete next[paramId];
      } else {
        next[paramId] = val;
      }
      return next;
    });
  };

  const loadDemoSample = async (sampleId: string) => {
    const demo = demoSamples.find(d => d.id === sampleId);
    if (!demo) return;
    setSource(demo.source);
    setIntendedUse(demo.intended_use);
    setStandardId(demo.standard_id);
    setMeasurements({ ...demo.measurements });
    setAnalysisResult(null);
    setRecommendations(null);
    setSimulationResult(null);
  };

  const runAnalysis = async (): Promise<AnalysisResponse | null> => {
    if (Object.keys(measurements).length === 0) return null;
    try {
      const result = await api.analyzeWater({
        source,
        intended_use: intendedUse,
        standard_id: standardId,
        measurements
      });
      setAnalysisResult(result);

      // Generate recommendations automatically
      const recs = await api.getRecommendations({
        measurements,
        standard_id: standardId,
        source,
        intended_use: intendedUse
      });
      setRecommendations(recs);

      // Initialize default treatment sequence from recommendations
      const recSequence = recs.recommended_sequence.map(s => s.id);
      setActiveSequence(recSequence);

      // Automatically compute initial simulation
      if (recSequence.length > 0) {
        const sim = await api.runSimulation({
          baseline_measurements: measurements,
          treatment_sequence: recSequence,
          standard_id: standardId
        });
        setSimulationResult(sim);
      }

      return result;
    } catch (err) {
      console.error('Error running analysis pipeline:', err);
      throw err;
    }
  };

  const runSimulation = async (customSequence?: string[]): Promise<SimulationResponse | null> => {
    const seq = customSequence || activeSequence;
    if (Object.keys(measurements).length === 0 || seq.length === 0) return null;
    try {
      const sim = await api.runSimulation({
        baseline_measurements: measurements,
        treatment_sequence: seq,
        standard_id: standardId
      });
      setSimulationResult(sim);
      return sim;
    } catch (err) {
      console.error('Error running simulation:', err);
      throw err;
    }
  };

  const resetAll = () => {
    setMeasurements({});
    setAnalysisResult(null);
    setRecommendations(null);
    setActiveSequence([]);
    setSimulationResult(null);
  };

  return (
    <WaterContext.Provider
      value={{
        parameters,
        standards,
        treatments,
        demoSamples,
        loadingCatalog,
        source,
        setSource,
        intendedUse,
        setIntendedUse,
        standardId,
        setStandardId,
        measurements,
        setMeasurements,
        setParamValue,
        analysisResult,
        recommendations,
        activeSequence,
        setActiveSequence,
        simulationResult,
        loadDemoSample,
        runAnalysis,
        runSimulation,
        resetAll
      }}
    >
      {children}
    </WaterContext.Provider>
  );
};

export const useWater = () => {
  const context = useContext(WaterContext);
  if (!context) throw new Error('useWater must be used within a WaterProvider');
  return context;
};
