import React, { useState } from 'react';
import {
  Atom,
  Search,
  BookOpen,
  FlaskConical,
  Activity,
  AlertTriangle,
  Flame,
  Droplet
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const ChemistryPage: React.FC = () => {
  const { parameters } = useWater();
  const [selectedId, setSelectedId] = useState<string>('ph');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParams = parameters.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeParam = parameters.find((p) => p.id === selectedId) || parameters[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Environmental Chemistry Knowledge Base</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Fundamental principles, aqueous speciation, colloidal kinetics, and chemical equilibrium equations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search parameters or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredParams.map((param) => {
              const isSelected = param.id === selectedId;
              return (
                <button
                  key={param.id}
                  onClick={() => setSelectedId(param.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-ocean-500/10 border-cyan-500/50 shadow-glow-cyan'
                      : 'bg-navy-900/50 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{param.name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">[{param.symbol}]</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{param.category}</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {param.unit}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Chemistry Dossier (8 cols) */}
        {activeParam && (
          <div className="lg:col-span-8 space-y-6">
            <Card glow className="bg-navy-900/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono text-lg">
                    {activeParam.symbol}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{activeParam.name}</h2>
                    <span className="text-xs text-cyan-400 font-mono">Canonical Unit: {activeParam.unit}</span>
                  </div>
                </div>

                <Badge variant="info" size="md">{activeParam.category}</Badge>
              </div>

              {/* Scientific Definition */}
              <div className="mt-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scientific Definition</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-navy-950/60 p-3.5 rounded-xl border border-slate-800">
                    {activeParam.scientific_definition}
                  </p>
                </div>

                {/* Relevant Chemistry & Reaction Equations */}
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                    <span>Aqueous Chemical Reactions & Mechanisms</span>
                  </h3>
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-cyan-500/20 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto">
                    {activeParam.relevant_chemistry}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Environmental Significance */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-navy-950/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Environmental Significance</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeParam.environmental_significance}
                    </p>
                  </div>

                  {/* Common Natural & Anthropogenic Sources */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-navy-950/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-ocean-300 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-ocean-400" />
                      <span>Common Sources</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeParam.common_sources}
                    </p>
                  </div>
                </div>

                {/* Potential Ecological and Human Consequences */}
                <div className="space-y-1.5 p-4 rounded-xl bg-rose-950/20 border border-rose-500/25">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Potential Consequences of Deviation</span>
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {activeParam.potential_consequences}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
