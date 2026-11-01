import React from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  ArrowRight,
  Beaker,
  ShieldCheck,
  Network,
  Atom,
  Sparkles,
  GitCompare,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';

export const LandingPage: React.FC = () => {
  const { demoSamples, loadDemoSample } = useWater();

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-navy-900 via-navy-950 to-navy-950 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Ambient Glowing Background Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-ocean-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Environmental Chemistry Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Analyze Water. <br className="hidden sm:inline" />
            <span className="water-gradient-text">Understand Chemistry.</span> <br className="hidden sm:inline" />
            Explore Solutions.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            AquaSolve transforms raw water-quality measurements into rigorous environmental chemistry insights, personalized multi-stage treatment trains, and an interactive virtual treatment plant.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/analysis"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <span>Start Water Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/simulator"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-navy-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold text-sm transition-all"
            >
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Explore Treatment Simulator</span>
            </Link>
          </div>

          {/* Quick Demo Previews */}
          <div className="pt-8 border-t border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
              Or instant test with real-world scenarios:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {demoSamples.map((demo) => (
                <Link
                  key={demo.id}
                  to="/analysis"
                  onClick={() => loadDemoSample(demo.id)}
                  className="px-3 py-1.5 rounded-lg bg-navy-950/80 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
                >
                  {demo.title.split('—')[0]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section: 9-Step Process */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How AquaSolve Works</h2>
          <p className="text-sm text-slate-400">
            A scientifically responsible end-to-end environmental engineering pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Input Data', desc: 'Enter 10+ physical, chemical & heavy metal parameters', icon: Beaker },
            { step: '02', title: 'Validate & Diagnose', desc: 'Compare against BIS IS 10500, WHO & US EPA standards', icon: ShieldCheck },
            { step: '03', title: 'Explain Chemistry', desc: 'Examine ionic equilibria, Ksp, and speciation models', icon: Atom },
            { step: '04', title: 'Virtual Simulation', desc: 'Assemble unit operations in the interactive plant', icon: Network },
            { step: '05', title: 'Generate Report', desc: 'Download publication-ready PDF & CSV deliverables', icon: FileCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="glass-panel p-5 rounded-2xl relative space-y-3 group hover:border-cyan-500/40 transition-all">
                <span className="text-3xl font-black text-slate-800 group-hover:text-cyan-500/20 transition-colors">
                  {item.step}
                </span>
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Icon className="w-4 h-4" />
                  <h4>{item.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Key Platform Capabilities</h2>
          <p className="text-sm text-slate-400">
            Engineered to replace generic calculators with rigorous environmental technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-cyan-500/20">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Interactive Virtual Plant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag, reorder, and inspect 14 treatment stages (Coagulation, Sedimentation, Sand Filter, Activated Carbon, Ion Exchange, RO, Aeration, Disinfection). Watch simulated water move through the sequence.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-teal-500/20">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Atom className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Non-Linear Chemistry Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simulates two-film gas transfer for dissolved oxygen, carbonic acid shifts, hydroxide precipitation Ksp, and double-layer colloidal destabilization rather than naive percentage drops.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-ocean-500/20">
            <div className="w-12 h-12 rounded-xl bg-ocean-500/10 border border-ocean-500/30 flex items-center justify-center text-ocean-400">
              <GitCompare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">What-If Alternative Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly compare Scenario A vs Scenario B. Test removing a stage, swapping Ion Exchange for Reverse Osmosis, or omitting pre-filtration to observe membrane fouling alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Regulatory & Safety Notice */}
      <section className="glass-panel rounded-2xl p-6 border border-amber-500/30 bg-amber-950/20">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">Public Health and Engineering Transparency</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              AquaSolve is designed for educational exploration and preliminary engineering decision-support. Simulated treatment calculations reflect theoretical literature assumptions and do not certify water as potable. Physical chemical and microbiological laboratory testing of treated effluents is strictly mandatory before human consumption.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
