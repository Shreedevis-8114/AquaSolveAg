import React from 'react';
import {
  Info,
  Droplets,
  BookOpen,
  Code2,
  ShieldAlert,
  Award,
  CheckCircle2,
  Atom
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { useWater } from '../contexts/WaterContext';

export const AboutPage: React.FC = () => {
  const { standards } = useWater();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-slate-800 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">About AquaSolve</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          An Interactive Environmental Chemistry-Based Water Quality Analysis and Treatment Recommendation System
        </p>
      </div>

      {/* Mission & Architectural Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base">
            <Droplets className="w-5 h-5" />
            <h2>Platform Mission & Scientific Objective</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            AquaSolve was created to bridge the critical gap between basic numerical water testing and practical environmental chemistry engineering. Instead of treating water quality as an arbitrary monolithic score, AquaSolve decomposes aqueous chemistry into individual parameters—analyzing ionic speciation, colloidal stability, pH carbonate buffering, gas solubility, and multivalent heavy metal toxicity.
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            By coupling standard regulatory benchmarks with a 14-stage virtual treatment plant simulator, the platform enables students, researchers, and water engineers to test real-world scenarios, understand why specific unit operations are sequenced, and observe simulated hydrochemical transformations.
          </p>
        </Card>

        <Card className="space-y-4 bg-navy-900/60">
          <div className="flex items-center gap-2 text-ocean-400 font-bold text-sm">
            <Code2 className="w-4 h-4" />
            <h3>Technology Architecture</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 font-mono">
            <li><b className="text-cyan-400">Frontend:</b> React 18, Vite, TypeScript, Tailwind CSS</li>
            <li><b className="text-cyan-400">Plant Engine:</b> React Flow (@xyflow/react)</li>
            <li><b className="text-cyan-400">Visualization:</b> Recharts & Lucide React</li>
            <li><b className="text-cyan-400">Backend:</b> Python 3.13, FastAPI, Pydantic v2</li>
            <li><b className="text-cyan-400">Database:</b> SQLAlchemy & SQLite</li>
            <li><b className="text-cyan-400">Reports:</b> ReportLab PDF & CSV Streaming</li>
          </ul>
        </Card>
      </div>

      {/* Reference Standards Supported */}
      <Card title="Configured Regulatory & Guideline Standards">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {standards.map((std) => (
            <div key={std.id} className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                {std.jurisdiction} • {std.publication_year}
              </span>
              <h4 className="font-bold text-sm text-white">{std.name}</h4>
              <p className="text-xs text-slate-400 leading-snug">{std.description}</p>
              <span className="text-[10px] text-slate-500 font-mono block pt-1 border-t border-slate-800">
                Source: {std.source}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Literature & Engineering Citations */}
      <Card title="Key Environmental Chemistry & Engineering References">
        <ul className="divide-y divide-slate-800 text-xs text-slate-300 font-sans space-y-1">
          <li className="py-2.5">
            <span className="font-bold text-white">American Water Works Association (AWWA):</span> <i>Water Quality and Treatment: A Handbook on Drinking Water Supplies</i>, 6th Edition. McGraw-Hill.
          </li>
          <li className="py-2.5">
            <span className="font-bold text-white">World Health Organization (WHO):</span> <i>Guidelines for Drinking-water Quality</i>, 4th edition incorporating the 1st and 2nd addenda, Geneva, 2022.
          </li>
          <li className="py-2.5">
            <span className="font-bold text-white">Bureau of Indian Standards:</span> <i>IS 10500 : 2012 Drinking Water — Specification (Second Revision)</i>, New Delhi.
          </li>
          <li className="py-2.5">
            <span className="font-bold text-white">Bratby, J. (2016):</span> <i>Coagulation and Flocculation in Water and Wastewater Treatment</i>, 3rd Edition, IWA Publishing.
          </li>
          <li className="py-2.5">
            <span className="font-bold text-white">Malaeb, L., & Ayoub, G. M.:</span> Reverse osmosis technology for water treatment: State of the art review. <i>Desalination</i>, 267(1), 1-8.
          </li>
        </ul>
      </Card>

      {/* Public Health & Transparency Warning */}
      <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-300 text-sm">Regulatory Notice & Disclaimer</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            AquaSolve is strictly an educational simulation and preliminary engineering decision-support tool. It does <u>not</u> provide legal or official certification that any water sample is safe for human consumption. Physical, chemical, and microbiological laboratory testing performed by accredited water testing laboratories is required prior to consuming any treated water.
          </p>
        </div>
      </div>
    </div>
  );
};
