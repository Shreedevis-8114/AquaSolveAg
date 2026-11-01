import React, { useState, useEffect, useId } from 'react';
import {
  Microscope,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  ScatterChart as ScatterIcon,
  HelpCircle,
  FileDown,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Beaker,
  Layers,
  Sparkles,
  Sliders,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  ErrorBar
} from 'recharts';
import { api } from '../services/api';
import {
  ResearchDatasetDetail,
  ResearchDatasetSummary,
  ResearchObservation,
  ResearchAnalysisResponse,
  ExperimentRecommendationResponse,
  ExperimentCompareResponse,
  ColumnMappingPreview,
  ColumnMappingConfig
} from '../types/research';
import { useWater } from '../contexts/WaterContext';
import { Link } from 'react-router-dom';

export const ResearchLabPage: React.FC = () => {
  const { analysisResult } = useWater();
  const selectPrefix = useId();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'ingestion' | 'quality' | 'performance' | 'reproducibility' | 'planner' | 'comparison' | 'export'
  >('overview');

  // Datasets State
  const [datasets, setDatasets] = useState<ResearchDatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<ResearchDatasetDetail | null>(null);
  const [analysis, setAnalysis] = useState<ResearchAnalysisResponse | null>(null);
  const [recommendations, setRecommendations] = useState<ExperimentRecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ingestion & Mapping State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<ColumnMappingPreview | null>(null);
  const [datasetNameInput, setDatasetNameInput] = useState<string>('');
  const [datasetDescInput, setDatasetDescInput] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({});
  const [manualForm, setManualForm] = useState({
    name: 'Lab Bench Study',
    description: 'Manual bench-scale experimental data',
    contaminant: 'Lead (Pb)',
    initial_concentration: '0.15',
    final_concentration: '0.012',
    unit: 'mg/L',
    treatment_method: 'Granular Activated Carbon (GAC)',
    ph: '7.2',
    temperature: '22',
    treatment_duration: '30',
    treatment_dose: '2.0',
    replicate_number: '1',
    measurement_uncertainty: '0.002',
    instrument_method: 'ICP-MS',
    notes: 'Bench scale batch equilibrium test'
  });

  // Filter State in Performance tab
  const [perfContaminantFilter, setPerfContaminantFilter] = useState<string>('all');
  const [perfMethodFilter, setPerfMethodFilter] = useState<string>('all');
  const [scatterXAxis, setScatterXAxis] = useState<'ph' | 'duration' | 'dose' | 'temp'>('ph');

  // Audit State
  const [auditTargetObs, setAuditTargetObs] = useState<ResearchObservation | null>(null);
  const [auditStatusChoice, setAuditStatusChoice] = useState<'accepted' | 'excluded' | 'annotated'>('accepted');
  const [auditAnnotationText, setAuditAnnotationText] = useState<string>('');

  // Comparison State
  const [selectedCompareExpIds, setSelectedCompareExpIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ExperimentCompareResponse | null>(null);

  // Initialize and load datasets
  useEffect(() => {
    loadDatasetsList();
  }, []);

  const loadDatasetsList = async (preferredId?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.getResearchDatasets();
      setDatasets(list);
      if (list.length > 0) {
        const idToLoad = preferredId || (selectedDatasetId && list.some(d => d.id === selectedDatasetId) ? selectedDatasetId : list[0].id);
        setSelectedDatasetId(idToLoad);
        await loadDatasetData(idToLoad);
      } else {
        // Auto-load benchmark sample dataset if database has none
        await handleLoadSampleDataset();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load research datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasetData = async (id: number) => {
    setActionLoading(true);
    try {
      const [detail, ana, recs] = await Promise.all([
        api.getResearchDatasetDetails(id),
        api.getResearchDatasetAnalysis(id),
        api.getExperimentRecommendations(id)
      ]);
      setDatasetDetail(detail);
      setAnalysis(ana);
      setRecommendations(recs);

      // Reset comparison selections if switching dataset
      setSelectedCompareExpIds([]);
      setComparisonResult(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load dataset details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDatasetChange = (id: number) => {
    setSelectedDatasetId(id);
    loadDatasetData(id);
  };

  const handleLoadSampleDataset = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await api.loadSampleResearchDataset();
      setSuccessMessage('AquaSolve Verified Benchmark Experimental Series loaded successfully.');
      await loadDatasetsList(result.id);
      setActiveTab('overview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load benchmark sample dataset');
    } finally {
      setActionLoading(false);
    }
  };

  // File Upload Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setDatasetNameInput(file.name.replace(/\.[^/.]+$/, ''));
    try {
      setActionLoading(true);
      const preview = await api.previewResearchFile(file);
      setFilePreview(preview);
      // Initialize mapping with detected fields
      setColumnMapping(preview.detected_mapping || {});
      setSuccessMessage(`File parsed. ${preview.total_preview_rows} rows previewed. Confirm column mappings below.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse spreadsheet columns');
      setSelectedFile(null);
      setFilePreview(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV or Excel file.');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.uploadResearchDataset(
        selectedFile,
        datasetNameInput || 'Experimental Dataset',
        datasetDescInput,
        columnMapping
      );
      setSuccessMessage(`Dataset "${result.name}" ingested with ${result.total_records} experimental observations.`);
      setSelectedFile(null);
      setFilePreview(null);
      await loadDatasetsList(result.id);
      setActiveTab('quality');
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload and validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const observation = {
        experiment_id: `EXP-M-${Date.now().toString().slice(-4)}`,
        sample_id: `SMP-${Date.now().toString().slice(-3)}`,
        experiment_date: new Date().toISOString().split('T')[0],
        contaminant: manualForm.contaminant,
        initial_concentration: parseFloat(manualForm.initial_concentration) || 0,
        final_concentration: parseFloat(manualForm.final_concentration) || 0,
        unit: manualForm.unit,
        treatment_method: manualForm.treatment_method,
        treatment_duration: manualForm.treatment_duration ? parseFloat(manualForm.treatment_duration) : null,
        ph: manualForm.ph ? parseFloat(manualForm.ph) : null,
        temperature: manualForm.temperature ? parseFloat(manualForm.temperature) : null,
        treatment_dose: manualForm.treatment_dose ? parseFloat(manualForm.treatment_dose) : null,
        replicate_number: parseInt(manualForm.replicate_number, 10) || 1,
        measurement_uncertainty: manualForm.measurement_uncertainty ? parseFloat(manualForm.measurement_uncertainty) : null,
        instrument_method: manualForm.instrument_method,
        notes: manualForm.notes
      };

      const result = await api.createManualResearchDataset({
        name: manualForm.name || 'Manual Lab Dataset',
        description: manualForm.description,
        observations: [observation]
      });

      setSuccessMessage('Manual observation recorded successfully.');
      await loadDatasetsList(result.id);
      setActiveTab('quality');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save manual experiment');
    } finally {
      setActionLoading(false);
    }
  };

  // Seed observation from current Water Analysis (Module 9 Integration)
  const handleImportCurrentAnalysis = async () => {
    if (!analysisResult) {
      setErrorMessage('No active Water Analysis found. Run an analysis in the Water Analysis module first.');
      return;
    }
    setActionLoading(true);
    try {
      const observations: any[] = [];
      const dateStr = new Date().toISOString().split('T')[0];

      Object.entries(analysisResult.parameters).forEach(([key, param], idx) => {
        // Only import chemical/heavy-metal contaminants or evaluated parameters
        if (param.status !== 'Not evaluated' && param.value > 0) {
          observations.push({
            experiment_id: `AQUA-${key.toUpperCase().slice(0, 3)}-01`,
            sample_id: `SMP-ANALYSIS-${analysisResult.source.slice(0, 3).toUpperCase()}`,
            experiment_date: dateStr,
            water_source: analysisResult.source,
            contaminant: param.name,
            initial_concentration: param.value,
            // Hypothetical post-treatment estimate based on permissible limit or 80% baseline
            final_concentration: param.desirable_limit ? Math.min(param.value * 0.25, param.desirable_limit) : param.value * 0.3,
            unit: param.unit,
            treatment_method: 'Integrated Treatment Sequence',
            ph: analysisResult.parameters['ph']?.value || 7.0,
            temperature: 20.0,
            treatment_duration: 30.0,
            treatment_dose: 1.5,
            replicate_number: 1,
            measurement_uncertainty: 0.005,
            instrument_method: 'Field Spectrophotometry / ICP-OES',
            notes: `Imported from AquaSolve Water Analysis (${analysisResult.source} for ${analysisResult.intended_use})`
          });
        }
      });

      if (observations.length === 0) {
        throw new Error('No valid parameters available in current analysis to import.');
      }

      const result = await api.createManualResearchDataset({
        name: `Field Analysis Dataset (${analysisResult.source})`,
        description: `Imported from AquaSolve Diagnostic Analysis (${analysisResult.intended_use}) with ${observations.length} contaminant observations.`,
        observations
      });

      setSuccessMessage(`Successfully imported ${observations.length} water analysis parameters into Research Lab!`);
      await loadDatasetsList(result.id);
      setActiveTab('overview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import water analysis data');
    } finally {
      setActionLoading(false);
    }
  };

  // Audit Handler
  const handleSaveAudit = async () => {
    if (!selectedDatasetId || !auditTargetObs) return;
    setActionLoading(true);
    try {
      await api.auditResearchObservation(selectedDatasetId, {
        observation_id: auditTargetObs.id,
        audit_status: auditStatusChoice,
        audit_annotation: auditAnnotationText
      });
      setSuccessMessage(`Observation ${auditTargetObs.experiment_id} audit status updated to "${auditStatusChoice}".`);
      setAuditTargetObs(null);
      // Reload current dataset
      await loadDatasetData(selectedDatasetId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update audit status');
    } finally {
      setActionLoading(false);
    }
  };

  // Comparison Handlers
  const toggleExpComparisonSelect = (expId: string) => {
    setSelectedCompareExpIds(prev => {
      if (prev.includes(expId)) {
        return prev.filter(id => id !== expId);
      } else {
        if (prev.length >= 6) {
          alert('You can compare a maximum of 6 experiments at once.');
          return prev;
        }
        return [...prev, expId];
      }
    });
  };

  const handleRunComparison = async () => {
    if (!selectedDatasetId) return;
    if (selectedCompareExpIds.length < 2) {
      setErrorMessage('Please select at least 2 experiments to compare.');
      return;
    }
    setActionLoading(true);
    try {
      const cmp = await api.compareExperiments(selectedDatasetId, selectedCompareExpIds);
      setComparisonResult(cmp);
      setActiveTab('comparison');
    } catch (err: any) {
      setErrorMessage(err.message || 'Comparison failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Download Reports
  const handleDownloadPdf = async () => {
    if (!selectedDatasetId) return;
    setActionLoading(true);
    try {
      const blob = await api.downloadResearchPdfReport(
        selectedDatasetId,
        `AquaSolve Research Intelligence Report - ${datasetDetail?.name || 'Experimental Series'}`
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AquaSolve_Research_Dossier_Dataset_${selectedDatasetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Research PDF Dossier downloaded successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download PDF report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!selectedDatasetId) return;
    setActionLoading(true);
    try {
      const blob = await api.downloadResearchCsvReport(selectedDatasetId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AquaSolve_Research_Dataset_${selectedDatasetId}_Clean.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Clean Research CSV exported successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export CSV report');
    } finally {
      setActionLoading(false);
    }
  };

  // Extract unique contaminants and methods for filters
  const uniqueContaminants = datasetDetail
    ? Array.from(new Set(datasetDetail.observations.map(o => o.contaminant))).sort()
    : [];
  const uniqueMethods = datasetDetail
    ? Array.from(new Set(datasetDetail.observations.map(o => o.treatment_method))).sort()
    : [];

  // Filtered observations for Performance tab charts
  const filteredObservations = (datasetDetail?.observations || []).filter(obs => {
    if (perfContaminantFilter !== 'all' && obs.contaminant !== perfContaminantFilter) return false;
    if (perfMethodFilter !== 'all' && obs.treatment_method !== perfMethodFilter) return false;
    return true;
  });

  // Prepare chart data for Performance bar chart (Grouped by Treatment Method & Contaminant)
  const performanceBarChartData = (analysis?.treatment_performances || [])
    .filter(tp => perfContaminantFilter === 'all' || tp.contaminant === perfContaminantFilter)
    .filter(tp => perfMethodFilter === 'all' || tp.treatment_method === perfMethodFilter)
    .map(tp => ({
      name: `${tp.treatment_method.slice(0, 16)} (${tp.contaminant})`,
      meanRemoval: tp.mean_removal_efficiency,
      minRemoval: tp.min_removal_efficiency,
      maxRemoval: tp.max_removal_efficiency,
      stdDev: tp.std_removal_efficiency,
      count: tp.experiment_count,
      errorY: [tp.std_removal_efficiency, tp.std_removal_efficiency]
    }));

  // Scatter Plot data (pH or Duration or Dose vs Removal Efficiency)
  const scatterPlotData = filteredObservations
    .filter(o => o.removal_efficiency !== null && o.removal_efficiency !== undefined)
    .map(o => {
      let xVal = 0;
      if (scatterXAxis === 'ph') xVal = o.ph || 7.0;
      else if (scatterXAxis === 'duration') xVal = o.treatment_duration || 0;
      else if (scatterXAxis === 'dose') xVal = o.treatment_dose || 0;
      else if (scatterXAxis === 'temp') xVal = o.temperature || 20.0;

      return {
        x: xVal,
        y: o.removal_efficiency,
        experiment_id: o.experiment_id,
        contaminant: o.contaminant,
        method: o.treatment_method,
        uncertainty: o.measurement_uncertainty || 0
      };
    });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Dataset Selector Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-950 to-slate-900 border border-cyan-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide uppercase">
              <Microscope className="w-3.5 h-3.5 text-teal-400" />
              <span>AquaSolve Research Intelligence Lab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Experimental Data Analysis & Intelligent Experiment Planning
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Empowering environmental chemistry researchers to detect measurement uncertainties, audit data quality, evaluate non-clamped removal performance, and plan deterministic, scientifically justified follow-up experiments.
            </p>
          </div>

          {/* Dataset Control Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-navy-900/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Dataset:</span>
              <select
                id={`${selectPrefix}-active-dataset`}
                aria-label="Active research dataset"
                className="bg-navy-950 text-cyan-300 text-xs font-semibold rounded-lg px-2 py-1 border border-cyan-500/20 focus:outline-none focus:border-cyan-400 cursor-pointer"
                value={selectedDatasetId || ''}
                onChange={(e) => handleDatasetChange(Number(e.target.value))}
                disabled={actionLoading || datasets.length === 0}
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    #{d.id}: {d.name} ({d.total_records} obs)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLoadSampleDataset}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-glow-cyan transition-all disabled:opacity-50"
              title="Load standard benchmark dataset with multi-replicates and condition variations"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Benchmark Dataset</span>
            </button>

            {analysisResult && (
              <button
                onClick={handleImportCurrentAnalysis}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-800/80 hover:bg-navy-700/80 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
                title="Import parameters from the Water Analysis module into Research Lab"
              >
                <Beaker className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import Water Analysis</span>
              </button>
            )}

            <button
              onClick={() => selectedDatasetId && loadDatasetData(selectedDatasetId)}
              disabled={actionLoading || !selectedDatasetId}
              className="p-2 rounded-xl bg-navy-800/80 hover:bg-navy-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh dataset analysis"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Alert Banners */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { key: 'overview', label: 'Research Overview', icon: Layers },
          { key: 'ingestion', label: 'Data Import & Mapping', icon: Upload },
          {
            key: 'quality',
            label: 'Data Quality & Audit',
            icon: ShieldAlert,
            badge: datasetDetail?.quality_metrics.flagged_records
          },
          { key: 'performance', label: 'Performance Explorer', icon: BarChart3 },
          { key: 'reproducibility', label: 'Reproducibility & Uncertainty', icon: TrendingUp },
          {
            key: 'planner',
            label: 'Experiment Planner',
            icon: Sparkles,
            badge: recommendations?.total_recommendations
          },
          {
            key: 'comparison',
            label: 'Experiment Comparison',
            icon: SlidersHorizontal,
            badge: selectedCompareExpIds.length > 0 ? selectedCompareExpIds.length : undefined
          },
          { key: 'export', label: 'Report & Export', icon: FileDown }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.key === 'quality'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RESEARCH OVERVIEW & INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Experiments</span>
              <div className="text-2xl font-black text-white mt-1">
                {datasetDetail?.quality_metrics.total_records ?? 0}
              </div>
              <span className="text-[10px] text-cyan-400/80 mt-1 block">
                {datasetDetail?.valid_records ?? 0} mathematically valid
              </span>
            </div>

            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Flagged Records</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {datasetDetail?.quality_metrics.flagged_records ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {datasetDetail?.quality_metrics.potential_outliers_count ?? 0} outliers / anomalies
              </span>
            </div>

            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completeness</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {datasetDetail?.quality_metrics.data_completeness_pct != null
                  ? datasetDetail.quality_metrics.data_completeness_pct.toFixed(1)
                  : '100'}%
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Missing: {datasetDetail?.quality_metrics.missing_data_pct != null
                  ? datasetDetail.quality_metrics.missing_data_pct.toFixed(1)
                  : '0'}%
              </span>
            </div>

            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Replicate Groups</span>
              <div className="text-2xl font-black text-teal-300 mt-1">
                {analysis?.replicate_groups.length ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Student's t 95% C.I.
              </span>
            </div>

            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Research Gaps</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {analysis?.identified_research_gaps.length ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Design space deficits
              </span>
            </div>

            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Experiments</span>
              <div className="text-2xl font-black text-cyan-300 mt-1">
                {recommendations?.total_recommendations ?? 0}
              </div>
              <span className="text-[10px] text-cyan-400 mt-1 block">
                Deterministic suggestions
              </span>
            </div>
          </div>

          {/* Highest Priority Recommendation Highlight */}
          {recommendations?.highest_priority_recommendation && (
            <div className="bg-gradient-to-r from-cyan-950/60 via-navy-900 to-teal-950/60 border border-cyan-500/40 rounded-2xl p-6 shadow-glow-cyan relative">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                      ★ Top Priority Research Inquiry
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Category: {String(recommendations.highest_priority_recommendation.category || 'Inquiry').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {recommendations.highest_priority_recommendation.research_question}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                    {recommendations.highest_priority_recommendation.reason_for_recommendation || (recommendations.highest_priority_recommendation as any).reason}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('planner')}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs shadow-lg transition-all"
                >
                  <span>Inspect Full Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-cyan-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Variables to Investigate:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(recommendations.highest_priority_recommendation.variables_to_investigate || []).map((v, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[11px]">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Hold Consistent (Controls):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {((recommendations.highest_priority_recommendation.variables_to_keep_consistent || Object.entries((recommendations.highest_priority_recommendation as any).variables_to_keep_constant || {}).map(([k, v]) => `${k}: ${v}`))).map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Expected Scientific Gain:</span>
                  <p className="text-slate-300 text-[11px] leading-tight">
                    {recommendations.highest_priority_recommendation.expected_information_gain}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Research Gaps & Quality Summary Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identified Research Gaps */}
            <div className="bg-navy-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Identified Experimental Design Gaps ({analysis?.identified_research_gaps.length ?? 0})</span>
                </h3>
                <span className="text-[11px] text-slate-400">Design space under-representation</span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(analysis?.identified_research_gaps || []).map((gap: any, idx) => {
                  const isString = typeof gap === 'string';
                  const title = isString
                    ? (gap.includes(':') ? gap.split(':')[0] : 'Research Gap')
                    : (gap.gap_type ? String(gap.gap_type).replace(/_/g, ' ') : 'Research Gap');
                  const desc = isString
                    ? (gap.includes(':') ? gap.split(':').slice(1).join(':').trim() : gap)
                    : (gap.description || String(gap));
                  const severity = isString
                    ? (gap.toLowerCase().includes('deficit') || gap.toLowerCase().includes('desorption') ? 'high' : 'medium')
                    : (gap.severity || 'medium');

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        severity === 'high'
                          ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                          : severity === 'medium'
                          ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                          : 'bg-slate-800/40 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {title}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${
                          severity === 'high' ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {severity} severity
                        </span>
                      </div>
                      <p className="font-medium text-slate-200">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quality Summary & Scientific Integrity Standards */}
            <div className="bg-navy-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Data Quality Assessment & Protocol</span>
                </h3>
                <span className="text-[11px] text-teal-400 font-mono">Statistical Audit</span>
              </div>

              <div className="p-4 rounded-xl bg-navy-950/80 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed space-y-2">
                <p className="font-semibold text-white">Quality Audit Summary:</p>
                <p>{datasetDetail?.quality_metrics.quality_summary || 'Evaluating experimental records...'}</p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Statistical Outlier Detection:</span>
                    <span className="text-cyan-300 font-mono">Tukey's IQR (1.5x) / Z-Score (&gt;2.5)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Negative Removal Treatment:</span>
                    <span className="text-amber-300 font-mono">Preserved (Sorbent desorption flag)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Small Sample Size Warning:</span>
                    <span className="text-slate-200 font-mono">Triggered on n &lt; 3 replicates</span>
                  </div>
                </div>
              </div>

              {/* Cross Module Links */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-3">
                <span className="font-semibold text-slate-200 block">Cross-Module Integration Shortcuts</span>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/simulator"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-300 text-xs border border-cyan-500/30 transition-colors"
                  >
                    <span>Simulate Plant Conditions</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    to="/analysis"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    <span>Inspect Raw Water Standards</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    to="/chemistry"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    <span>Reaction Equilibria Guide</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA INGESTION & COLUMN MAPPING */}
      {/* ========================================================================= */}
      {activeTab === 'ingestion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spreadsheet Upload Form */}
            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Experimental Dataset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload CSV or Excel spreadsheets (.xlsx, .xls). Interactive column mapping will match your custom lab headers.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Dataset File:
                </label>
                <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-6 text-center cursor-pointer bg-navy-950/60 transition-colors">
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="research-file-upload"
                  />
                  <label htmlFor="research-file-upload" className="cursor-pointer space-y-2 block">
                    <FileSpreadsheet className="w-8 h-8 text-cyan-400 mx-auto" />
                    <p className="text-xs font-semibold text-cyan-300">
                      {selectedFile ? selectedFile.name : 'Click to select CSV or Excel (.xlsx)'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Files are parsed locally and never sent to third-party endpoints.
                    </p>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataset-name-input" className="block text-xs font-semibold text-slate-300 mb-1">
                    Dataset Title:
                  </label>
                  <input
                    id="dataset-name-input"
                    type="text"
                    value={datasetNameInput}
                    onChange={(e) => setDatasetNameInput(e.target.value)}
                    placeholder="e.g. Adsorption Pilot Run 3"
                    className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label htmlFor="dataset-desc-input" className="block text-xs font-semibold text-slate-300 mb-1">
                    Experimental Scope:
                  </label>
                  <input
                    id="dataset-desc-input"
                    type="text"
                    value={datasetDescInput}
                    onChange={(e) => setDatasetDescInput(e.target.value)}
                    placeholder="e.g. Bench scale GAC vs Coagulation"
                    className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Column Mapping Preview if file selected */}
              {filePreview && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Interactive Column Mapping</span>
                    </span>
                    <span className="text-[11px] text-cyan-300 font-mono">
                      {filePreview.columns.length} columns detected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs max-h-56 overflow-y-auto pr-1">
                    {[
                      { key: 'experiment_id', label: 'Experiment ID' },
                      { key: 'sample_id', label: 'Sample ID' },
                      { key: 'contaminant', label: 'Contaminant *' },
                      { key: 'initial_concentration', label: 'Initial Conc (C0) *' },
                      { key: 'final_concentration', label: 'Final Conc (Ct) *' },
                      { key: 'treatment_method', label: 'Treatment Method *' },
                      { key: 'treatment_duration', label: 'Duration (min)' },
                      { key: 'ph', label: 'pH' },
                      { key: 'temperature', label: 'Temp (°C)' },
                      { key: 'treatment_dose', label: 'Dose (mg/L or g/L)' },
                      { key: 'replicate_number', label: 'Replicate #' },
                      { key: 'measurement_uncertainty', label: 'Uncertainty (±)' },
                      { key: 'instrument_method', label: 'Instrument' }
                    ].map(field => (
                      <div key={field.key} className="bg-navy-950 p-2 rounded-lg border border-slate-800">
                        <label htmlFor={`${selectPrefix}-map-${field.key}`} className="block text-[11px] text-slate-400 font-medium mb-1">
                          {field.label}:
                        </label>
                        <select
                          id={`${selectPrefix}-map-${field.key}`}
                          value={(columnMapping as any)[field.key] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                          className="w-full bg-navy-900 border border-slate-700 text-cyan-300 text-[11px] rounded px-2 py-1 focus:outline-none"
                        >
                          <option value="">-- Auto-detect / None --</option>
                          {filePreview.columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleExecuteUpload}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Mapping & Ingest Dataset</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual Single-Experiment Entry Form */}
            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-teal-400" />
                  <span>Manual Experiment Entry</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add single experimental trial or bench measurement directly to AquaSolve database.
                </p>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="manual-target-contaminant" className="block text-slate-400 mb-1">Target Contaminant *</label>
                    <input
                      id="manual-target-contaminant"
                      type="text"
                      value={manualForm.contaminant}
                      onChange={e => setManualForm({ ...manualForm, contaminant: e.target.value })}
                      required
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-treatment-method" className="block text-slate-400 mb-1">Treatment Method *</label>
                    <input
                      id="manual-treatment-method"
                      type="text"
                      value={manualForm.treatment_method}
                      onChange={e => setManualForm({ ...manualForm, treatment_method: e.target.value })}
                      required
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="manual-c0-initial" className="block text-slate-400 mb-1">C0 Initial *</label>
                    <input
                      id="manual-c0-initial"
                      type="number"
                      step="any"
                      value={manualForm.initial_concentration}
                      onChange={e => setManualForm({ ...manualForm, initial_concentration: e.target.value })}
                      required
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-ct-final" className="block text-slate-400 mb-1">Ct Final *</label>
                    <input
                      id="manual-ct-final"
                      type="number"
                      step="any"
                      value={manualForm.final_concentration}
                      onChange={e => setManualForm({ ...manualForm, final_concentration: e.target.value })}
                      required
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-concentration-unit" className="block text-slate-400 mb-1">Unit</label>
                    <input
                      id="manual-concentration-unit"
                      type="text"
                      value={manualForm.unit}
                      onChange={e => setManualForm({ ...manualForm, unit: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label htmlFor="manual-ph" className="block text-slate-400 mb-1">pH</label>
                    <input
                      id="manual-ph"
                      type="number"
                      step="any"
                      value={manualForm.ph}
                      onChange={e => setManualForm({ ...manualForm, ph: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-dose" className="block text-slate-400 mb-1">Dose (mg/L)</label>
                    <input
                      id="manual-dose"
                      type="number"
                      step="any"
                      value={manualForm.treatment_dose}
                      onChange={e => setManualForm({ ...manualForm, treatment_dose: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-time" className="block text-slate-400 mb-1">Time (min)</label>
                    <input
                      id="manual-time"
                      type="number"
                      step="any"
                      value={manualForm.treatment_duration}
                      onChange={e => setManualForm({ ...manualForm, treatment_duration: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-replicate" className="block text-slate-400 mb-1">Replicate #</label>
                    <input
                      id="manual-replicate"
                      type="number"
                      value={manualForm.replicate_number}
                      onChange={e => setManualForm({ ...manualForm, replicate_number: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="manual-uncertainty" className="block text-slate-400 mb-1">Measurement Uncertainty (±)</label>
                    <input
                      id="manual-uncertainty"
                      type="number"
                      step="any"
                      value={manualForm.measurement_uncertainty}
                      onChange={e => setManualForm({ ...manualForm, measurement_uncertainty: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-instrument" className="block text-slate-400 mb-1">Instrument Method</label>
                    <input
                      id="manual-instrument"
                      type="text"
                      value={manualForm.instrument_method}
                      onChange={e => setManualForm({ ...manualForm, instrument_method: e.target.value })}
                      className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="manual-notes" className="block text-slate-400 mb-1">Observation Notes</label>
                  <textarea
                    id="manual-notes"
                    rows={2}
                    value={manualForm.notes}
                    onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Record Observation</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATA QUALITY & AUDIT DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {/* Quality Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Valid Observations</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {datasetDetail?.valid_records ?? 0} / {datasetDetail?.total_records ?? 0}
              </div>
              <span className="text-[10px] text-slate-400">Zero-division and non-physical values screened</span>
            </div>

            <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Flagged For Review</span>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {datasetDetail?.quality_metrics.flagged_records ?? 0}
              </div>
              <span className="text-[10px] text-slate-400">Statistical outliers or potential desorption</span>
            </div>

            <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Negative Removal Efficiencies</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">
                {datasetDetail?.quality_metrics.negative_removal_count ?? 0}
              </div>
              <span className="text-[10px] text-slate-400">Ct &gt; C0 (Preserved, not clamped to 0%)</span>
            </div>

            <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Data Completeness</span>
              <div className="text-xl font-bold text-teal-300 mt-1">
                {datasetDetail?.quality_metrics.data_completeness_pct != null ? datasetDetail.quality_metrics.data_completeness_pct.toFixed(1) : '100'}%
              </div>
              <span className="text-[10px] text-slate-400">Missing fields percentage: {datasetDetail?.quality_metrics.missing_data_pct != null ? datasetDetail.quality_metrics.missing_data_pct.toFixed(1) : '0'}%</span>
            </div>
          </div>

          {/* Observations Table with Flag Inspector & Audit Actions */}
          <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>Observation Records & Audit Trail ({datasetDetail?.observations.length ?? 0})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Scientists can inspect flagged anomalies and choose to Accept, Exclude from statistics, or Annotate.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Dataset: #{datasetDetail?.id}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Exp ID</th>
                    <th className="py-3 px-3">Contaminant</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-2 text-right">C0</th>
                    <th className="py-3 px-2 text-right">Ct</th>
                    <th className="py-3 px-3 text-right">Removal %</th>
                    <th className="py-3 px-2 text-center">pH</th>
                    <th className="py-3 px-2 text-center">Dose</th>
                    <th className="py-3 px-2 text-center">Rep #</th>
                    <th className="py-3 px-3">Status / Flag Reason</th>
                    <th className="py-3 px-3">Audit</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {(datasetDetail?.observations || []).map((obs) => {
                    const isNeg = (obs.removal_efficiency ?? 0) < 0;
                    return (
                      <tr
                        key={obs.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          obs.is_flagged ? 'bg-amber-950/15' : ''
                        } ${obs.audit_status === 'excluded' ? 'opacity-50 line-through' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-cyan-300">{obs.experiment_id}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-200">{obs.contaminant}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-300">{obs.treatment_method}</td>
                        <td className="py-2.5 px-2 text-right text-slate-200">{obs.initial_concentration} {obs.unit}</td>
                        <td className="py-2.5 px-2 text-right text-slate-200">{obs.final_concentration} {obs.unit}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          isNeg ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {obs.removal_efficiency !== null && obs.removal_efficiency !== undefined
                            ? `${obs.removal_efficiency.toFixed(2)}%`
                            : 'N/A'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-300">{obs.ph ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-300">{obs.treatment_dose ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center text-teal-300">#{obs.replicate_number}</td>
                        <td className="py-2.5 px-3 font-sans">
                          {obs.is_flagged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full" title={obs.flag_reason || ''}>
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{obs.flag_reason || 'Flagged'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400/80">Valid</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            obs.audit_status === 'accepted'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : obs.audit_status === 'excluded'
                              ? 'bg-rose-500/20 text-rose-300'
                              : obs.audit_status === 'annotated'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {obs.audit_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setAuditTargetObs(obs);
                              setAuditStatusChoice(obs.audit_status !== 'pending' ? (obs.audit_status as any) : 'accepted');
                              setAuditAnnotationText(obs.audit_annotation || '');
                            }}
                            className="px-2 py-1 rounded bg-navy-800 hover:bg-cyan-600 hover:text-white text-cyan-300 border border-cyan-500/30 text-[10px] font-sans font-semibold transition-colors"
                          >
                            Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Action Modal / Inspector */}
          {auditTargetObs && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-navy-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-white">
                      Audit Observation: {auditTargetObs.experiment_id}
                    </h3>
                  </div>
                  <button onClick={() => setAuditTargetObs(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p><span className="text-slate-400 font-semibold">Contaminant & Method:</span> {auditTargetObs.contaminant} via {auditTargetObs.treatment_method}</p>
                  <p><span className="text-slate-400 font-semibold">Removal Efficiency:</span> {auditTargetObs.removal_efficiency?.toFixed(2)}% (Initial: {auditTargetObs.initial_concentration}, Final: {auditTargetObs.final_concentration})</p>
                  {auditTargetObs.flag_reason && (
                    <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-200">
                      <span className="font-bold">Flagged Reason:</span> {auditTargetObs.flag_reason}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label htmlFor="audit-status-decision" className="block text-xs font-semibold text-slate-200">
                    Audit Decision:
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { status: 'accepted', label: 'Accept', desc: 'Include in all statistics' },
                      { status: 'excluded', label: 'Exclude', desc: 'Omit from aggregations' },
                      { status: 'annotated', label: 'Annotate', desc: 'Keep with note' }
                    ].map(opt => (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => setAuditStatusChoice(opt.status as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          auditStatusChoice === opt.status
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold capitalize">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="audit-rationale-notes" className="block text-xs font-semibold text-slate-200 mb-1">
                      Scientific Audit Rationale & Notes:
                    </label>
                    <textarea
                      id="audit-rationale-notes"
                      rows={3}
                      value={auditAnnotationText}
                      onChange={(e) => setAuditAnnotationText(e.target.value)}
                      placeholder="e.g. Sorbent breakthrough verified; keep data to document desorption threshold."
                      className="w-full bg-navy-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setAuditTargetObs(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAudit}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold shadow-lg"
                  >
                    Save Audit Decision
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPERIMENTAL PERFORMANCE EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Filters:</span>
              </span>

              <select
                id={`${selectPrefix}-perf-contaminant`}
                aria-label="Filter performance by contaminant"
                value={perfContaminantFilter}
                onChange={e => setPerfContaminantFilter(e.target.value)}
                className="bg-navy-950 border border-slate-700 text-cyan-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Contaminants ({uniqueContaminants.length})</option>
                {uniqueContaminants.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                id={`${selectPrefix}-perf-method`}
                aria-label="Filter performance by treatment method"
                value={perfMethodFilter}
                onChange={e => setPerfMethodFilter(e.target.value)}
                className="bg-navy-950 border border-slate-700 text-cyan-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Treatment Methods ({uniqueMethods.length})</option>
                {uniqueMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Scatter X-Axis:</span>
              {(['ph', 'duration', 'dose', 'temp'] as const).map(param => (
                <button
                  key={param}
                  onClick={() => setScatterXAxis(param)}
                  className={`px-2.5 py-1 rounded text-xs uppercase font-mono font-semibold transition-colors ${
                    scatterXAxis === param
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {param}
                </button>
              ))}
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Treatment Removal Efficiency Bar Chart */}
            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Mean Removal Efficiency by Treatment Group (%)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Includes negative removal values if desorption occurred. Error bars indicate standard deviation.
                  </p>
                </div>
              </div>

              <div className="h-80 w-full">
                {performanceBarChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceBarChartData} margin={{ top: 20, right: 20, left: -10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#06b6d4', borderRadius: '0.75rem', fontSize: '11px' }}
                        formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Mean Removal']}
                      />
                      <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '0% Net Removal', fill: '#f43f5e', fontSize: 10 }} />
                      <Bar dataKey="meanRemoval" fill="#06b6d4" radius={[6, 6, 0, 0]}>
                        <ErrorBar dataKey="errorY" width={4} stroke="#38bdf8" strokeWidth={1.5} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No matching performance records for selected filters.
                  </div>
                )}
              </div>
            </div>

            {/* Operating Condition Scatter Plot */}
            <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ScatterIcon className="w-4 h-4 text-teal-400" />
                    <span>Condition vs Removal Efficiency: {scatterXAxis.toUpperCase()}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Individual experimental points demonstrating non-linear response and leaching boundaries.
                  </p>
                </div>
              </div>

              <div className="h-80 w-full">
                {scatterPlotData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={scatterXAxis}
                        stroke="#94a3b8"
                        fontSize={10}
                        domain={['auto', 'auto']}
                        label={{ value: scatterXAxis.toUpperCase(), position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Removal %"
                        stroke="#94a3b8"
                        fontSize={10}
                        domain={['auto', 'auto']}
                        label={{ value: 'Removal %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                      />
                      <ZAxis range={[50, 50]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#14b8a6', borderRadius: '0.75rem', fontSize: '11px' }}
                        formatter={(val: any, name: any) => [
                          name === 'Removal %' ? `${Number(val).toFixed(2)}%` : val,
                          name
                        ]}
                      />
                      <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" />
                      <Scatter data={scatterPlotData} fill="#14b8a6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No data points available for scatter plot.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Condition Correlations Summary Table */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Operating Condition Correlations (Pearson r & Empirical Significance)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(analysis?.condition_correlations || []).map((corr, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-navy-950/70 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 capitalize">{corr.condition_variable} vs Removal</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      r = {corr.pearson_r != null ? corr.pearson_r.toFixed(3) : 'N/A'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {corr.treatment_method} • {corr.contaminant} (n={corr.sample_size})
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {corr.scientific_interpretation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPRODUCIBILITY & UNCERTAINTY ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'reproducibility' && (
        <div className="space-y-6">
          <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Replicate Reproducibility & Uncertainty Assessment</span>
              </h3>
              <p className="text-xs text-slate-300 max-w-4xl mt-1 leading-relaxed">
                Evaluates replicate variability across identical experimental batches. Calculates Coefficient of Variation (CV%), Student's <em>t</em> 95% Confidence Interval, and analytical uncertainty propagation. Small sample sizes (n &lt; 3) trigger automatic statistical warnings.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Treatment & Target</th>
                    <th className="py-3 px-2 text-center">n</th>
                    <th className="py-3 px-3 text-right">Mean Removal</th>
                    <th className="py-3 px-2 text-right">Std Dev (s)</th>
                    <th className="py-3 px-2 text-right">CV (%)</th>
                    <th className="py-3 px-3 text-center">95% C.I. Bounds</th>
                    <th className="py-3 px-2 text-right">Propagated Uncertainty</th>
                    <th className="py-3 px-3">Reproducibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {(analysis?.replicate_groups || []).map((rep, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-sans font-semibold text-white">
                        <div>{rep.treatment_method}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{rep.contaminant}</div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-teal-300">
                        {rep.sample_size}
                        {rep.small_sample_warning && (
                          <span className="block text-[9px] text-amber-400 font-sans font-normal">n&lt;3 warn</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-300">
                        {rep.mean_removal != null ? `${rep.mean_removal.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-300">
                        {rep.std_dev != null ? `±${rep.std_dev.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {rep.coeff_of_variation_pct != null ? (
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            rep.coeff_of_variation_pct < 5
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : rep.coeff_of_variation_pct < 15
                              ? 'text-amber-400 bg-amber-950/40'
                              : 'text-rose-400 bg-rose-950/40'
                          }`}>
                            {rep.coeff_of_variation_pct.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-200">
                        {rep.ci_lower_95 != null && rep.ci_upper_95 != null ? (
                          `[${rep.ci_lower_95.toFixed(1)}% — ${rep.ci_upper_95.toFixed(1)}%]`
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">n &lt; 2 (No C.I.)</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-300">
                        {rep.propagated_uncertainty_mean != null ? (
                          `±${rep.propagated_uncertainty_mean.toFixed(2)}%`
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          rep.reproducibility_status.includes('High')
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : rep.reproducibility_status.includes('Acceptable')
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {rep.reproducibility_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scientific Variability Hypotheses */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Scientific Hypotheses for Replicate Inconsistency</span>
            </h3>
            <p className="text-xs text-slate-400">
              When CV% &gt; 10%, AquaSolve synthesizes environmental chemistry hypotheses regarding the origin of experimental scatter:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(analysis?.replicate_groups || [])
                .filter(r => r.scientific_hypotheses && r.scientific_hypotheses.length > 0)
                .map((r, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-navy-950/70 border border-cyan-500/20 text-xs space-y-1.5">
                    <span className="font-semibold text-cyan-300">
                      {r.treatment_method} ({r.contaminant}) — CV: {r.coeff_of_variation_pct != null ? `${r.coeff_of_variation_pct.toFixed(1)}%` : '-'}
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                      {r.scientific_hypotheses.map((hyp, hIdx) => (
                        <li key={hIdx}>{hyp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INTELLIGENT EXPERIMENT RECOMMENDATION ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-navy-900 via-navy-950 to-teal-950/50 border border-cyan-500/30 rounded-2xl p-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Scientific Inquiry Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Intelligent Follow-Up Experiment Recommendations
            </h2>
            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              Based on empirical evidence from your current dataset, AquaSolve identifies under-sampled operating boundaries, replicate deficits, unexplained anomalies, and high-value head-to-head comparisons to maximize experimental information gain.
            </p>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {(recommendations?.recommendations || []).map((rec) => (
              <div
                key={rec.id}
                className={`p-5 rounded-2xl border transition-all ${
                  rec.priority === 'high'
                    ? 'bg-navy-900/90 border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-navy-900/60 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        rec.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : rec.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-xs text-cyan-400/80 font-mono">
                        {String(rec.category || 'General').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">
                      {rec.research_question}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {rec.reason_for_recommendation || (rec as any).reason}
                </p>

                {/* Detailed Experimental Variable Specification */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-semibold text-cyan-400 block mb-1">Variables to Investigate:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                      {(rec.variables_to_investigate || []).map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-semibold text-teal-400 block mb-1">Hold Consistent (Controls):</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                      {((rec.variables_to_keep_consistent || Object.entries((rec as any).variables_to_keep_constant || {}).map(([k, v]) => `${k}: ${v}`))).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-navy-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-semibold text-amber-400 block mb-1">Expected Scientific Gain:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {rec.expected_information_gain}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Limitation: {rec.confidence_or_limitations || (rec as any).confidence_limitations || 'Specific to matrix.'}
                    </span>
                  </div>
                </div>

                {/* Supporting Dataset Observations */}
                {rec.supporting_observations.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Supporting Experiments:</span>
                    <div className="flex flex-wrap gap-1">
                      {rec.supporting_observations.map((obsId, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {obsId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: EXPERIMENT COMPARISON WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Experiment Selection Bar */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span>Select Experiments for Head-to-Head Comparison (2 to 6)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select trials to compare removal performance, operating condition disparities, and replicate consistency.
                </p>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={actionLoading || selectedCompareExpIds.length < 2}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
              >
                Execute Side-by-Side Comparison ({selectedCompareExpIds.length})
              </button>
            </div>

            {/* Quick Checkbox Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(datasetDetail?.observations || []).map(obs => {
                const isSelected = selectedCompareExpIds.includes(obs.experiment_id);
                return (
                  <button
                    key={obs.id}
                    onClick={() => toggleExpComparisonSelect(obs.experiment_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 border'
                        : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200 border'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-cyan-400 text-navy-950' : 'border border-slate-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{obs.experiment_id}</span>
                    <span className="text-[10px] text-slate-500 font-sans">({obs.treatment_method.slice(0, 10)})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Matrix Output */}
          {comparisonResult && (
            <div className="space-y-4">
              {/* Confounding Condition Disparity Alert */}
              {comparisonResult.condition_disparities.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Confounding Disparities Detected</span>
                  </div>
                  <p>{comparisonResult.fair_comparison_advisory}</p>
                  <ul className="list-disc list-inside text-[11px] text-amber-300/90 pl-1">
                    {comparisonResult.condition_disparities.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Matrix Table */}
              <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3">Parameter / Metric</th>
                        {comparisonResult.experiments.map(exp => (
                          <th key={exp.experiment_id} className="py-3 px-3 text-cyan-300 font-mono text-center">
                            {exp.experiment_id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Contaminant</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center text-white">{exp.contaminant}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Treatment Technology</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center text-cyan-300">{exp.treatment_method}</td>
                        ))}
                      </tr>
                      <tr className="bg-cyan-950/20 font-mono font-bold">
                        <td className="py-2.5 px-3 text-cyan-400 font-sans">Removal Efficiency (%)</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className={`py-2.5 px-3 text-center ${
                            (exp.removal_efficiency ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {exp.removal_efficiency != null ? `${exp.removal_efficiency.toFixed(2)}%` : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Initial Feed (C0)</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-slate-200">
                            {exp.initial_concentration} {exp.unit}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Final Residual (Ct)</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-slate-200">
                            {exp.final_concentration} {exp.unit}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Operating pH</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-slate-300">{exp.ph ?? '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Reaction Time (min)</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-slate-300">{exp.treatment_duration ?? '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Temperature (°C)</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-slate-300">{exp.temperature ?? '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-300">Replicate Count</td>
                        {comparisonResult.experiments.map(exp => (
                          <td key={exp.experiment_id} className="py-2.5 px-3 text-center font-mono text-teal-300">{exp.replicate_count}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-navy-950/80 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-semibold text-white">Comparative Scientific Assessment:</span>
                  <p>{comparisonResult.performance_comparison}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: REPORT & EXPORT GENERATOR */}
      {/* ========================================================================= */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Report Card */}
            <div className="bg-navy-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Publication-Ready PDF Research Dossier
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Generates an academic-grade scientific report using ReportLab containing dataset metadata, data quality audits, removal performance, Student's t replicate confidence bounds, and prioritized follow-up experiment plans.
                </p>
              </div>

              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Automated Data Quality & Outlier Audit Trail</li>
                <li>Removal Efficiency Analysis (preserving negative values)</li>
                <li>Replicate Reproducibility & Propagated Uncertainty</li>
                <li>Deterministic Intelligent Experiment Recommendations</li>
              </ul>

              <button
                onClick={handleDownloadPdf}
                disabled={actionLoading || !selectedDatasetId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Scientific PDF Report</span>
              </button>
            </div>

            {/* CSV Data Export Card */}
            <div className="bg-navy-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Curated CSV Experimental Dataset
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Exports clean tabular records including standardized contaminant names, initial/final concentrations, calculated removal efficiencies, audit decisions, and instrument metadata.
                </p>
              </div>

              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Standardized units and validated headers</li>
                <li>Calculated removal efficiency percentages</li>
                <li>Audit flags and researcher annotations</li>
                <li>Ready for statistical R, Python, or Origin analysis</li>
              </ul>

              <button
                onClick={handleDownloadCsv}
                disabled={actionLoading || !selectedDatasetId}
                className="w-full py-3 rounded-xl bg-navy-800 hover:bg-navy-700 border border-teal-500/40 text-teal-300 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>Export Standardized CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchLabPage;
