import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Wind,
  Beaker,
  Combine,
  ArrowDownToDot,
  Layers,
  Filter,
  Boxes,
  Repeat,
  FlaskConical,
  ShieldCheck,
  Pipette,
  SlidersHorizontal,
  Microscope,
  Sparkles,
  Droplets,
  CheckCircle2,
  Trash2,
  Power
} from 'lucide-react';

export interface TreatmentNodeData {
  stageId: string;
  name: string;
  category: string;
  targetContaminants: string[];
  isDisabled?: boolean;
  isFixed?: boolean;
  effectSummary?: string;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  [key: string]: unknown;
}

const ICON_MAP: Record<string, React.ElementType> = {
  aeration: Wind,
  coagulation: Beaker,
  flocculation: Combine,
  sedimentation: ArrowDownToDot,
  sand_filtration: Layers,
  ultrafiltration: Filter,
  activated_carbon: Boxes,
  ion_exchange: Repeat,
  lime_soda_softening: FlaskConical,
  reverse_osmosis: ShieldCheck,
  chemical_precipitation: Pipette,
  neutralization: SlidersHorizontal,
  biological_nitrate_treatment: Microscope,
  disinfection: Sparkles,
  raw_input: Droplets,
  treated_output: CheckCircle2,
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  'Raw Water': { bg: 'bg-blue-950/80', border: 'border-blue-500/50', text: 'text-blue-300', glow: 'shadow-glow-cyan' },
  'Pre-Treatment': { bg: 'bg-sky-950/80', border: 'border-sky-500/50', text: 'text-sky-300', glow: 'shadow-glow-cyan' },
  'Clarification': { bg: 'bg-teal-950/80', border: 'border-teal-500/50', text: 'text-teal-300', glow: 'shadow-glow-teal' },
  'Filtration': { bg: 'bg-emerald-950/80', border: 'border-emerald-500/50', text: 'text-emerald-300', glow: 'shadow-glow-teal' },
  'Adsorption': { bg: 'bg-slate-900/90', border: 'border-slate-500/50', text: 'text-slate-300', glow: '' },
  'Ion Exchange': { bg: 'bg-indigo-950/80', border: 'border-indigo-500/50', text: 'text-indigo-300', glow: '' },
  'Membrane Separation': { bg: 'bg-cyan-950/80', border: 'border-cyan-500/50', text: 'text-cyan-300', glow: 'shadow-glow-cyan' },
  'Membrane Desalination': { bg: 'bg-cyan-950/80', border: 'border-cyan-400/60', text: 'text-cyan-300', glow: 'shadow-glow-cyan' },
  'Chemical Precipitation': { bg: 'bg-amber-950/80', border: 'border-amber-500/50', text: 'text-amber-300', glow: '' },
  'Stabilization': { bg: 'bg-violet-950/80', border: 'border-violet-500/50', text: 'text-violet-300', glow: '' },
  'Biological Treatment': { bg: 'bg-green-950/80', border: 'border-green-500/50', text: 'text-green-300', glow: '' },
  'Final Disinfection': { bg: 'bg-purple-950/80', border: 'border-purple-500/50', text: 'text-purple-300', glow: '' },
  'Treated Water': { bg: 'bg-emerald-950/90', border: 'border-emerald-400', text: 'text-emerald-300', glow: 'shadow-glow-teal' },
};

export const TreatmentNode = memo(({ data, selected }: { data: any; selected?: boolean }) => {
  const nodeData = data as TreatmentNodeData;
  const stageId = String(nodeData.stageId || '');
  const stageName = String(nodeData.name || '');
  const category = String(nodeData.category || 'Process');
  const targetContaminants = Array.isArray(nodeData.targetContaminants) ? nodeData.targetContaminants : [];
  const isDisabled = Boolean(nodeData.isDisabled);
  const isFixed = Boolean(nodeData.isFixed);

  const IconComponent = ICON_MAP[stageId] || Droplets;
  const theme = CATEGORY_COLORS[category] || {
    bg: 'bg-navy-900',
    border: 'border-slate-700',
    text: 'text-slate-200',
    glow: '',
  };

  return (
    <div
      className={`relative min-w-[210px] max-w-[240px] rounded-xl backdrop-blur-md p-3.5 transition-all cursor-pointer ${
        theme.bg
      } ${
        isDisabled
          ? 'opacity-40 grayscale border border-dashed border-slate-700'
          : `border ${theme.border} ${selected ? 'ring-2 ring-cyan-400 shadow-glow-cyan scale-105' : 'hover:border-cyan-400/60'}`
      }`}
    >
      {/* React Flow Handles */}
      {!isFixed || stageId !== 'raw_input' ? (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-cyan-400 !border-2 !border-navy-950"
        />
      ) : null}
      {!isFixed || stageId !== 'treated_output' ? (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-cyan-400 !border-2 !border-navy-950"
        />
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${theme.text}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              {category}
            </span>
            <h4 className="text-xs font-bold text-slate-100 truncate max-w-[120px]">{stageName}</h4>
          </div>
        </div>

        {/* Action icons if not fixed */}
        {!isFixed && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {nodeData.onToggle && (
              <button
                type="button"
                onClick={() => nodeData.onToggle && nodeData.onToggle(stageId)}
                title={isDisabled ? 'Enable Stage' : 'Disable Stage'}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${
                  isDisabled ? 'text-slate-500' : 'text-emerald-400'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            )}
            {nodeData.onRemove && (
              <button
                type="button"
                onClick={() => nodeData.onRemove && nodeData.onRemove(stageId)}
                title="Remove Stage"
                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Target Contaminants */}
      {targetContaminants.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {targetContaminants.map((tc) => (
            <span
              key={tc}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/20"
            >
              {tc.toUpperCase()}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 mt-1 italic">
          {stageId === 'disinfection' ? 'Pathogen Inactivation' : 'Physical Transport'}
        </p>
      )}

      {/* Applied change preview if available */}
      {nodeData.effectSummary && (
        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-emerald-400 font-mono">
          {String(nodeData.effectSummary)}
        </div>
      )}
    </div>
  );
});
