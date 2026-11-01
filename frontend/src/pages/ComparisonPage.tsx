import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const ComparisonPage: React.FC = () => {
  const {
    parameters,
    measurements,
    analysisResult,
    simulationResult,
    activeSequence
  } = useWater();

  if (!simulationResult || !analysisResult) {
    return (
      <Card className="text-center py-12 space-y-4">
        <ArrowUpDown className="w-8 h-8 text-cyan-400 mx-auto" />
        <h3 className="font-bold text-lg text-white">Simulation Results Not Available</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please run the analysis pipeline or launch the virtual plant simulator to generate before-and-after comparison metrics.
        </p>
      </Card>
    );
  }

  const beforeExceedances = analysisResult.summary.outside_reference_count;
  const afterExceedances = simulationResult.remaining_concerns.length;
  const resolvedCount = simulationResult.resolved_concerns.length;

  // Split into comparable unit subsets so we don't plot NTU, pH, and 1000 mg/L on the same axis!
  const concentrationParams = ['tds', 'hardness', 'chloride', 'nitrate'];
  const minorParams = ['turbidity', 'iron', 'dissolved_oxygen', 'lead', 'arsenic'];

  const chartDataConcentrations = concentrationParams
    .filter((pid) => measurements[pid] !== undefined)
    .map((pid) => {
      const pDef = parameters.find((p) => p.id === pid);
      return {
        name: pDef?.name || pid.toUpperCase(),
        Baseline: measurements[pid],
        Treated: simulationResult.final_measurements[pid] ?? measurements[pid],
        unit: pDef?.unit || 'mg/L',
      };
    });

  const chartDataPhysical = minorParams
    .filter((pid) => measurements[pid] !== undefined)
    .map((pid) => {
      const pDef = parameters.find((p) => p.id === pid);
      return {
        name: pDef?.symbol || pid.toUpperCase(),
        Baseline: measurements[pid],
        Treated: simulationResult.final_measurements[pid] ?? measurements[pid],
        unit: pDef?.unit || '',
      };
    });

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Before & After Comparison Dashboard</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Quantitative evaluation of unit operations effect across chemical, physical, and toxic parameters
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters Evaluated</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{Object.keys(measurements).length}</span>
            <span className="text-xs text-slate-400">tested</span>
          </div>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exceedances (Before)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono">{beforeExceedances}</span>
            <span className="text-xs text-slate-400">concerns</span>
          </div>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exceedances (After)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${afterExceedances > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {afterExceedances}
            </span>
            <span className="text-xs text-slate-400">remaining</span>
          </div>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concerns Remediated</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">{resolvedCount}</span>
            <span className="text-xs text-slate-400">resolved</span>
          </div>
        </Card>
      </div>

      {/* Grouped Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concentration Minerals (mg/L) Chart */}
        <Card title="Major Solutes & Hardness (mg/L)" subtitle="Grouped comparison of bulk ionic concentration changes">
          <div className="h-72 w-full pt-4 font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataConcentrations} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b192c', borderColor: '#0284c7', borderRadius: '12px' }}
                />
                <Legend />
                <Bar dataKey="Baseline" fill="#f43f5e" name="Measured Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Treated" fill="#00fff0" name="Simulated Effluent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Physical & Micro Contaminants Chart */}
        <Card title="Physical & Trace Parameters" subtitle="Turbidity, dissolved iron, and dissolved oxygen kinetics">
          <div className="h-72 w-full pt-4 font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataPhysical} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b192c', borderColor: '#0284c7', borderRadius: '12px' }}
                />
                <Legend />
                <Bar dataKey="Baseline" fill="#f43f5e" name="Measured Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Treated" fill="#14b8a6" name="Simulated Effluent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Complete Comparison Table */}
      <Card title="Detailed Stage-Wise Hydrochemical Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Parameter</th>
                <th className="py-3 px-3">Baseline</th>
                <th className="py-3 px-3 text-cyan-300">Simulated Effluent</th>
                <th className="py-3 px-3">Standard Limit</th>
                <th className="py-3 px-3">Net Delta</th>
                <th className="py-3 px-3">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(measurements).map(([pid, baseVal]) => {
                const finalVal = simulationResult.final_measurements[pid] ?? baseVal;
                const pDef = parameters.find((p) => p.id === pid);
                const afterEval = simulationResult.parameter_evaluations_after[pid];
                const isWithin = afterEval?.status === 'Within selected reference';
                const delta = finalVal - baseVal;

                return (
                  <tr key={pid} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-slate-200">
                      {pDef?.name || pid} <span className="text-[10px] text-slate-400">({pDef?.unit})</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{baseVal}</td>
                    <td className="py-3 px-3 font-bold text-white">{finalVal}</td>
                    <td className="py-3 px-3 text-slate-400">{afterEval?.reference_range_str || '-'}</td>
                    <td className="py-3 px-3">
                      <span className={delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge variant={isWithin ? 'success' : 'warning'} size="sm" dot>
                        {afterEval?.status || 'Evaluated'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
