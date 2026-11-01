import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  TestTube2,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Droplet,
  ArrowRight,
  Database,
  Microscope
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';

const WATER_SOURCES = [
  'Borewell',
  'Municipal supply',
  'River',
  'Lake',
  'Pond',
  'Groundwater',
  'Industrial sample',
  'Other'
];

const INTENDED_USES = [
  'Drinking',
  'Cooking',
  'Domestic',
  'Irrigation',
  'Industrial cooling',
  'Environmental discharge'
];

export const AnalysisPage: React.FC = () => {
  const location = useLocation();
  const {
    parameters,
    standards,
    demoSamples,
    source,
    setSource,
    intendedUse,
    setIntendedUse,
    standardId,
    setStandardId,
    measurements,
    setParamValue,
    analysisResult,
    loadDemoSample,
    runAnalysis,
    resetAll
  } = useWater();

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Auto-scroll to results when requested via navbar concerns button (#diagnostic-results)
  useEffect(() => {
    if (location.hash === '#diagnostic-results' && analysisResult) {
      const timer = setTimeout(() => {
        const el = document.getElementById('diagnostic-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [location.hash, analysisResult]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(measurements).length === 0) return;
    try {
      setAnalyzing(true);
      await runAnalysis();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      setSaving(true);
      const res = await api.saveSample({
        source,
        intended_use: intendedUse,
        standard_id: standardId,
        location_name: `${source} Sampling Station`,
        measurements
      });
      setSaveMessage(`Sample #${res.id} saved to database successfully.`);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Water Quality Data Input & Analysis</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enter test measurements, configure regulatory limits, and validate water safety benchmarks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Form</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={saving || Object.keys(measurements).length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>{saving ? 'Saving...' : 'Save Sample'}</span>
          </button>
        </div>
      </div>

      {/* Quick Jump Banner when Diagnostic Results are ready */}
      {analysisResult && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-navy-900 to-navy-950 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glow-cyan">
          <div className="flex items-center gap-2.5 text-xs text-rose-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            <span>
              <b>Diagnostic Results Ready:</b> {analysisResult.summary.outside_reference_count} parameter(s) deviate from {analysisResult.standard_name}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/research-lab"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/70 hover:bg-teal-900 border border-teal-500/40 text-teal-300 font-semibold text-xs transition-all shadow-sm"
              title="Benchmark these measurements against lab datasets"
            >
              <Microscope className="w-3.5 h-3.5 text-teal-400" />
              <span>Send to Research Lab</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('diagnostic-results');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-navy-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Jump to Diagnostic Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Preset Demonstration Dataset Loaders */}
      <Card glow className="bg-navy-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Quick Load Demonstration Datasets
            </h3>
            <p className="text-xs text-slate-300">
              Select verified synthetic testing datasets reflecting distinct environmental hydrogeology:
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {demoSamples.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => loadDemoSample(demo.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all flex items-center gap-1.5"
              >
                <Droplet className="w-3 h-3 text-cyan-400" />
                <span>{demo.title.split('—')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <form onSubmit={handleAnalyze} className="space-y-6">
        {/* Sample Metadata Card */}
        <Card title="Sample Metadata & Regulatory Context">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Water Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              >
                {WATER_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Intended Water Use
              </label>
              <select
                value={intendedUse}
                onChange={(e) => setIntendedUse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              >
                {INTENDED_USES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Benchmark Standard
              </label>
              <select
                value={standardId}
                onChange={(e) => setStandardId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              >
                {standards.map((std) => (
                  <option key={std.id} value={std.id}>{std.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* 10 Water Parameters Grid */}
        <Card
          title="Physical, Chemical & Heavy Metal Parameters"
          subtitle="Enter lab measurements. Blank values remain unevaluated."
          action={
            <span className="text-xs text-slate-400 font-mono">
              {Object.keys(measurements).length} parameters provided
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parameters.map((param) => {
              const val = measurements[param.id] !== undefined ? measurements[param.id] : '';
              const evalItem = analysisResult?.parameters[param.id];

              return (
                <div
                  key={param.id}
                  className="p-3.5 rounded-xl bg-navy-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-200">{param.name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono ml-1.5">({param.unit})</span>
                    </div>

                    {evalItem && (
                      <Badge
                        size="sm"
                        variant={
                          evalItem.status === 'Within selected reference'
                            ? 'success'
                            : evalItem.status === 'Invalid input'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {evalItem.status.split(' ')[0]}
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder={`e.g. ${param.id === 'ph' ? '7.2' : param.id === 'tds' ? '450' : '0.0'}`}
                      value={val}
                      onChange={(e) => {
                        const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        setParamValue(param.id, v);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 truncate" title={param.scientific_definition}>
                    {param.scientific_definition}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={analyzing || Object.keys(measurements).length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all disabled:opacity-50"
            >
              <TestTube2 className="w-4 h-4" />
              <span>{analyzing ? 'Evaluating Chemistry...' : 'Run Water Quality Analysis'}</span>
            </button>
          </div>
        </Card>
      </form>

      {/* Analysis Results View */}
      {analysisResult && (
        <div id="diagnostic-results" className="space-y-6 pt-6 border-t border-slate-800 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-white">Diagnostic Analysis Results</h2>
              <p className="text-xs text-slate-400">
                Evaluation under <span className="text-cyan-400 font-semibold">{analysisResult.standard_name}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Out of benchmark: <b className="text-rose-400">{analysisResult.summary.outside_reference_count}</b>
              </span>
            </div>
          </div>

          {/* Detailed Parameter Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Parameter</th>
                    <th className="py-3 px-3 font-mono">Measured</th>
                    <th className="py-3 px-3">Benchmark Range</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Environmental Chemistry Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {Object.entries(analysisResult.parameters).map(([pid, evalItem]) => {
                    const isWithin = evalItem.status === 'Within selected reference';
                    const isInvalid = evalItem.status === 'Invalid input';

                    return (
                      <tr key={pid} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3 font-sans font-bold text-slate-200">
                          {evalItem.name}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {evalItem.value} <span className="text-slate-400 text-[10px]">{evalItem.unit}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {evalItem.reference_range_str}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <Badge
                            variant={isWithin ? 'success' : isInvalid ? 'danger' : 'warning'}
                            dot
                            size="sm"
                          >
                            {evalItem.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-300 text-[11px] max-w-xs">
                          {evalItem.health_significance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
