import React, { useState } from 'react';
import {
  GitCompare,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import { ScenarioComparisonResponse } from '../types';

export const WhatIfPage: React.FC = () => {
  const {
    measurements,
    standardId,
    recommendations,
    treatments,
    activeSequence
  } = useWater();

  // Scenario A defaults to recommended sequence
  const [seqA, setSeqA] = useState<string[]>(
    recommendations ? recommendations.recommended_sequence.map((s) => s.id) : activeSequence
  );

  // Scenario B defaults to alternative or simplified sequence
  const [seqB, setSeqB] = useState<string[]>(
    activeSequence.filter((s) => s !== 'reverse_osmosis')
  );

  const [nameA, setNameA] = useState('Scenario A (Recommended)');
  const [nameB, setNameB] = useState('Scenario B (Alternative)');
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ScenarioComparisonResponse | null>(null);

  const handleRunComparison = async () => {
    if (Object.keys(measurements).length === 0) return;
    try {
      setComparing(true);
      const res = await api.compareScenarios({
        baseline_measurements: measurements,
        standard_id: standardId,
        scenario_a_name: nameA,
        scenario_a_sequence: seqA,
        scenario_b_name: nameB,
        scenario_b_sequence: seqB
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(false);
    }
  };

  const removeStage = (scenario: 'A' | 'B', stageId: string) => {
    if (scenario === 'A') setSeqA(seqA.filter((s) => s !== stageId));
    else setSeqB(seqB.filter((s) => s !== stageId));
  };

  const addStage = (scenario: 'A' | 'B', stageId: string) => {
    if (scenario === 'A' && !seqA.includes(stageId)) setSeqA([...seqA, stageId]);
    if (scenario === 'B' && !seqB.includes(stageId)) setSeqB([...seqB, stageId]);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">What-If Scenario Comparison</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Evaluate technological trade-offs, stage omissions, and comparative chemical compliance
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={comparing || Object.keys(measurements).length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
        >
          <GitCompare className="w-4 h-4" />
          <span>{comparing ? 'Evaluating Scenarios...' : 'Compare Scenarios'}</span>
        </button>
      </div>

      {/* Scenario Sequence Builders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario A Card */}
        <Card title={nameA} subtitle={`${seqA.length} Process Stages`}>
          <div className="space-y-3">
            <div className="space-y-2 min-h-[180px]">
              {seqA.map((sid, idx) => {
                const t = treatments.find((tm) => tm.id === sid);
                return (
                  <div
                    key={sid}
                    className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{t?.name || sid}</span>
                    </div>

                    <button
                      onClick={() => removeStage('A', sid)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Stage */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) addStage('A', e.target.value);
                  e.target.value = '';
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="">+ Add Stage to {nameA}...</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id} disabled={seqA.includes(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Scenario B Card */}
        <Card title={nameB} subtitle={`${seqB.length} Process Stages`}>
          <div className="space-y-3">
            <div className="space-y-2 min-h-[180px]">
              {seqB.map((sid, idx) => {
                const t = treatments.find((tm) => tm.id === sid);
                return (
                  <div
                    key={sid}
                    className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-ocean-500/20 text-ocean-300 font-mono text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{t?.name || sid}</span>
                    </div>

                    <button
                      onClick={() => removeStage('B', sid)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Stage */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) addStage('B', e.target.value);
                  e.target.value = '';
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="">+ Add Stage to {nameB}...</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id} disabled={seqB.includes(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Results */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          {/* Engineering Conclusion Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-ocean-950/40 border border-cyan-500/30 flex items-start gap-3">
            <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Engineering Recommendation
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                {result.comparison_summary.engineering_recommendation}
              </p>
            </div>
          </div>

          {/* Metric Comparison Table */}
          <Card title="Comparative Chemical Effluent Analysis">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Parameter</th>
                    <th className="py-3 px-3">Baseline</th>
                    <th className="py-3 px-3 text-cyan-300">{nameA}</th>
                    <th className="py-3 px-3 text-ocean-300">{nameB}</th>
                    <th className="py-3 px-3">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(result.baseline_measurements).map(([pid, baseVal]) => {
                    const valA = result.scenario_a.final_measurements[pid] ?? baseVal;
                    const valB = result.scenario_b.final_measurements[pid] ?? baseVal;
                    const diff = valB - valA;

                    return (
                      <tr key={pid} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3 font-sans font-bold text-slate-200 uppercase">
                          {pid}
                        </td>
                        <td className="py-3 px-3 text-slate-400">{baseVal}</td>
                        <td className="py-3 px-3 font-bold text-cyan-400">{valA}</td>
                        <td className="py-3 px-3 font-bold text-ocean-400">{valB}</td>
                        <td className="py-3 px-3 text-slate-300">
                          {diff === 0 ? 'Equal' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
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
