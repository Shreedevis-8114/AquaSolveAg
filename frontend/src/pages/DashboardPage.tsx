import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Droplet,
  Sparkles,
  Network,
  FileText,
  RotateCcw,
  Zap
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const {
    source,
    intendedUse,
    standardId,
    standards,
    measurements,
    analysisResult,
    recommendations,
    activeSequence,
    simulationResult,
    demoSamples,
    loadDemoSample,
    runAnalysis
  } = useWater();

  const [loading, setLoading] = useState(false);

  const selectedStandard = standards.find(s => s.id === standardId) || standards[0];

  const handleRunPipeline = async () => {
    try {
      setLoading(true);
      await runAnalysis();
    } finally {
      setLoading(false);
    }
  };

  const totalParams = Object.keys(measurements).length;
  const outsideCount = analysisResult ? analysisResult.summary.outside_reference_count : 0;
  const stagesCount = activeSequence.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Environmental Water Quality Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Active Source: <span className="text-cyan-400 font-semibold">{source}</span> • Standard: <span className="text-slate-200">{selectedStandard?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunPipeline}
            disabled={loading || totalParams === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{loading ? 'Evaluating...' : 'Run Chemistry Pipeline'}</span>
          </button>

          <Link
            to="/simulator"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-colors"
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Virtual Plant</span>
          </Link>
        </div>
      </div>

      {/* Quick Scenario Switcher */}
      <Card glow className="bg-navy-900/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Demonstration Datasets
            </span>
            <p className="text-xs text-slate-300">
              Load synthetic real-world testing samples directly into the telemetry pipeline:
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {demoSamples.map((demo) => (
              <button
                key={demo.id}
                onClick={() => loadDemoSample(demo.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all flex items-center gap-1.5"
              >
                <Droplet className="w-3 h-3 text-cyan-400" />
                <span>{demo.title.split('—')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters Tested</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalParams}</span>
            <span className="text-xs text-slate-400">measurements</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">pH, Turbidity, TDS, Hardness, Heavy Metals</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out-of-Spec Exceedances</span>
            <AlertTriangle className={`w-4 h-4 ${outsideCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${outsideCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {outsideCount}
            </span>
            <span className="text-xs text-slate-400">parameters</span>
          </div>
          <div className="mt-2">
            {outsideCount > 0 ? (
              <Badge variant="danger" size="sm" dot>Attention Required</Badge>
            ) : (
              <Badge variant="success" size="sm" dot>Compliant Baseline</Badge>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Treatment Stages</span>
            <Layers className="w-4 h-4 text-ocean-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stagesCount}</span>
            <span className="text-xs text-slate-400">sequenced</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Optimized for ionic & colloidal removal</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulation Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-200">
              {simulationResult ? 'Computed' : 'Pending'}
            </span>
          </div>
          <div className="mt-2">
            {simulationResult ? (
              <span className="text-[11px] text-emerald-400 font-medium">
                {simulationResult.resolved_concerns.length} concern(s) addressed
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Click Run Pipeline to evaluate</span>
            )}
          </div>
        </Card>
      </div>

      {/* Main Analysis & Treatment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Identified Concerns & Parameter Values */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Measured Water Chemistry Telemetry"
            subtitle="Current input parameter values against standard thresholds"
            action={
              <Link to="/analysis" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <span>Edit Measurements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(measurements).map(([pid, val]) => {
                const evalItem = analysisResult?.parameters[pid];
                const isOutOfSpec = evalItem && evalItem.status !== 'Within selected reference';
                return (
                  <div
                    key={pid}
                    className={`p-3 rounded-xl border transition-all ${
                      isOutOfSpec
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-navy-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">{pid}</span>
                      {isOutOfSpec ? (
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-white">{val}</span>
                      <span className="text-[10px] text-slate-400">{evalItem?.unit || ''}</span>
                    </div>
                    {evalItem && (
                      <p className={`text-[10px] mt-1 font-medium ${isOutOfSpec ? 'text-rose-300' : 'text-slate-400'}`}>
                        {evalItem.status}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Concerns Breakdown if any */}
          {analysisResult && analysisResult.concerns.length > 0 && (
            <Card
              title={`Identified Chemical Concerns (${analysisResult.concerns.length})`}
              subtitle="Specific parameters requiring targeted environmental treatment intervention"
            >
              <div className="space-y-3">
                {analysisResult.concerns.map((c) => (
                  <div
                    key={c.parameter_id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{c.parameter_name}</span>
                        <Badge variant="danger" size="sm">{c.status}</Badge>
                        <span className="text-xs font-mono text-slate-300">
                          {c.value} {c.unit}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{c.scientific_impact}</p>
                    </div>

                    <div className="shrink-0 text-right text-xs text-slate-400 font-mono">
                      <span>Limit: {c.reference_limit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Sequenced Virtual Plant Preview & Reports */}
        <div className="space-y-6">
          <Card
            title="Sequenced Treatment Train"
            subtitle="Algorithmic unit operations flow"
            action={
              <Link to="/simulator" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <span>Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {activeSequence.length > 0 ? (
              <div className="space-y-2">
                {activeSequence.map((stageId, idx) => {
                  const stageRec = recommendations?.recommended_sequence.find(s => s.id === stageId);
                  return (
                    <div
                      key={stageId}
                      className="p-2.5 rounded-xl bg-navy-950/80 border border-cyan-500/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">
                            {stageRec?.name || stageId.replace('_', ' ').toUpperCase()}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {stageRec?.stage_category || 'Treatment Process'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-cyan-400">Active</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No active stages sequenced. Run analysis to generate recommendations.
              </div>
            )}
          </Card>

          {/* Quick PDF Report Trigger Card */}
          <Card className="bg-gradient-to-br from-navy-900 to-ocean-950/40 border border-ocean-500/30">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Download Analysis Report</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generate a publication-grade ReportLab PDF or CSV export containing baseline measurements, scientific chemistry explanations, simulation runs, and before-and-after tables.
              </p>
              <Link
                to="/reports"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-semibold text-xs shadow-glow-cyan transition-all"
              >
                <span>Export Report Suite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
