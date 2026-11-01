import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Droplets
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const {
    source,
    intendedUse,
    standardId,
    standards,
    measurements,
    activeSequence,
    analysisResult,
    simulationResult
  } = useWater();

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const selectedStandard = standards.find((s) => s.id === standardId) || standards[0];

  const handleDownloadPdf = async () => {
    if (Object.keys(measurements).length === 0) return;
    try {
      setDownloadingPdf(true);
      const blob = await api.downloadPdfReport({
        source,
        intended_use: intendedUse,
        standard_id: standardId,
        baseline_measurements: measurements,
        treatment_sequence: activeSequence,
        report_title: 'AquaSolve Environmental Chemistry & Treatment Report'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AquaSolve_Report_${source.replace(/\s+/g, '_')}_${standardId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (Object.keys(measurements).length === 0) return;
    try {
      setDownloadingCsv(true);
      const blob = await api.downloadCsvReport({
        source,
        intended_use: intendedUse,
        standard_id: standardId,
        baseline_measurements: measurements,
        treatment_sequence: activeSequence
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AquaSolve_Data_${source.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error:', err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title & Download Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Report Generation & Deliverables</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Export certified environmental chemistry dossiers, ReportLab PDF documentation, and structured datasets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || Object.keys(measurements).length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{downloadingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || Object.keys(measurements).length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-700/80 p-8 sm:p-12 space-y-8 shadow-2xl">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplets className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white">AquaSolve™ Environmental Report</h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Document Ref: AQ-REPORT-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
            </p>
          </div>

          <div className="text-right space-y-0.5 text-xs text-slate-400 font-mono">
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Evaluation Engine: v1.0 Production</div>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-navy-950 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans">Water Source</span>
            <span className="font-bold text-white text-sm">{source}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans">Intended Usage</span>
            <span className="font-bold text-white text-sm">{intendedUse}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans">Standard Benchmark</span>
            <span className="font-bold text-cyan-400 text-sm truncate block">{selectedStandard?.name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans">Overall Health</span>
            <span className="font-bold text-emerald-400 text-sm">
              {analysisResult ? `${analysisResult.summary.outside_reference_count} Exceedances` : 'Analyzed'}
            </span>
          </div>
        </div>

        {/* Section 1: Baseline Measurements */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span>1. Baseline Tested Measurements</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Parameter</th>
                  <th className="py-2.5 px-3">Measured</th>
                  <th className="py-2.5 px-3">Reference Limit</th>
                  <th className="py-2.5 px-3">Baseline Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {Object.entries(measurements).map(([pid, val]) => {
                  const evalItem = analysisResult?.parameters[pid];
                  return (
                    <tr key={pid}>
                      <td className="py-2.5 px-3 text-slate-200 font-bold uppercase">{pid}</td>
                      <td className="py-2.5 px-3 text-white">{val} {evalItem?.unit}</td>
                      <td className="py-2.5 px-3 text-slate-400">{evalItem?.reference_range_str || '-'}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={evalItem?.status === 'Within selected reference' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {evalItem?.status || 'Measured'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Sequenced Treatment Train */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
            2. Sequenced Treatment Train Simulation
          </h3>
          <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 font-mono text-xs text-slate-300">
            {activeSequence.length > 0
              ? activeSequence.map((s, idx) => `${idx + 1}. ${s.replace(/_/g, ' ').toUpperCase()}`).join('  ➔  ')
              : 'No stages active in sequence.'}
          </div>
        </div>

        {/* Section 3: Before-and-After Comparison */}
        {simulationResult && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              3. Simulated Hydrochemical Transformation
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3">Baseline</th>
                    <th className="py-2.5 px-3">Simulated Effluent</th>
                    <th className="py-2.5 px-3">Net Change</th>
                    <th className="py-2.5 px-3">Treated Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {Object.entries(measurements).map(([pid, baseVal]) => {
                    const finalVal = simulationResult.final_measurements[pid] ?? baseVal;
                    const afterEval = simulationResult.parameter_evaluations_after[pid];
                    const delta = finalVal - baseVal;
                    return (
                      <tr key={pid}>
                        <td className="py-2.5 px-3 text-slate-200 uppercase font-bold">{pid}</td>
                        <td className="py-2.5 px-3 text-slate-400">{baseVal}</td>
                        <td className="py-2.5 px-3 text-cyan-300 font-bold">{finalVal}</td>
                        <td className="py-2.5 px-3">{delta === 0 ? '0' : delta.toFixed(3)}</td>
                        <td className="py-2.5 px-3">
                          <span className={afterEval?.status === 'Within selected reference' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {afterEval?.status || 'Evaluated'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Public Health Disclaimer */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Official Scientific & Regulatory Disclaimer</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            This document represents a preliminary computer simulation based on established environmental engineering kinetics (AWWA, WHO, US EPA). Simulated results do <b>NOT</b> constitute laboratory potability certification. Complete physical, chemical, and microbiological lab verification is mandatory before water is cleared for human consumption.
          </p>
        </div>
      </div>
    </div>
  );
};
