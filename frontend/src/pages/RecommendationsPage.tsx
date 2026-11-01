import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Network,
  Split,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const RecommendationsPage: React.FC = () => {
  const { recommendations, activeSequence, setActiveSequence } = useWater();
  const navigate = useNavigate();

  const handleOpenInSimulator = () => {
    if (recommendations) {
      setActiveSequence(recommendations.recommended_sequence.map((s) => s.id));
    }
    navigate('/simulator');
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Treatment Recommendations Engine</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Algorithmic sequencing based on contaminant interactions, chemical kinetics, and standard unit operations
          </p>
        </div>

        {recommendations && (
          <button
            onClick={handleOpenInSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all"
          >
            <Network className="w-4 h-4" />
            <span>Load in Virtual Plant Simulator</span>
          </button>
        )}
      </div>

      {recommendations ? (
        <div className="space-y-8">
          {/* Sequenced Treatment Train */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>Recommended Multi-Stage Treatment Sequence</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Arranged according to physical clarification, demineralization, and terminal disinfection hierarchy
                </p>
              </div>

              <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30">
                {recommendations.recommended_sequence.length} Ordered Stages
              </span>
            </div>

            <div className="space-y-4">
              {recommendations.recommended_sequence.map((stage, idx) => (
                <Card key={stage.id} glow={idx === 0} className="hover:border-cyan-500/40 transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Index & Identity */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-ocean-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold font-mono text-base flex items-center justify-center shrink-0">
                        {stage.order}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-base text-white">{stage.name}</h3>
                          <Badge variant="info" size="sm">{stage.stage_category}</Badge>
                        </div>
                        <p className="text-xs text-cyan-300/90 leading-relaxed font-medium">
                          {stage.rationale}
                        </p>
                      </div>
                    </div>

                    {/* Target Contaminants */}
                    <div className="shrink-0 flex flex-wrap gap-1 md:justify-end">
                      {stage.target_contaminants.map((tc) => (
                        <span
                          key={tc}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300"
                        >
                          {tc.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chemistry & Engineering Specifics */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Chemistry Principle</span>
                      <p className="text-slate-300 leading-snug font-mono text-[11px]">
                        {stage.chemistry_principle}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Prerequisites</span>
                      <p className="text-slate-300 leading-snug">
                        {stage.prerequisites}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Secondary Effects / Notes</span>
                      <p className="text-slate-300 leading-snug">
                        {stage.secondary_effects}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Alternative Treatment Options */}
          {recommendations.alternative_options.length > 0 && (
            <Card
              title="Alternative Treatment Technologies"
              subtitle="Process substitutions evaluated by the recommendation rules"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.alternative_options.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-navy-950/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Split className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-sm text-slate-200">{alt.name}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {alt.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Engineering Advisories */}
          {recommendations.engineering_notes.length > 0 && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Process Sequencing Notes</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {recommendations.engineering_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <Card className="text-center py-12 space-y-4">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="font-bold text-lg text-white">No Recommendations Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please submit water measurements on the Water Analysis page first. The engine will automatically evaluate the data and generate sequenced treatment unit operations.
          </p>
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all"
          >
            <span>Go to Water Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      )}
    </div>
  );
};
