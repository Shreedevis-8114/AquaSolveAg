import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Droplets, Activity, Beaker, FileSpreadsheet, ShieldAlert, Microscope } from 'lucide-react';
import { useWater } from '../../contexts/WaterContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { analysisResult, simulationResult } = useWater();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/10 bg-navy-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-ocean-500 p-0.5 shadow-glow-cyan flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-navy-900 rounded-[10px] flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-400 group-hover:animate-bounce" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">Aqua<span className="text-cyan-400">Solve</span></span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Chemistry v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Environmental Chemistry Analysis & Virtual Plant</p>
            </div>
          </Link>
        </div>

        {/* Status Indicators & Fast Navigation */}
        <div className="flex items-center gap-3">
          {/* Telemetry pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-900/90 border border-slate-700/50 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-mono">Engine: Operational</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">IS 10500 • WHO • EPA</span>
          </div>

          {analysisResult && (
            <Link
              to="/analysis#diagnostic-results"
              onClick={(e) => {
                if (location.pathname === '/analysis') {
                  e.preventDefault();
                  const el = document.getElementById('diagnostic-results');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }}
              title="Click to view Diagnostic Analysis Results"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 hover:border-rose-400 text-rose-300 text-xs font-semibold shadow-glow-cyan transition-all cursor-pointer group"
            >
              <Beaker className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>{analysisResult.summary.outside_reference_count} Concerns</span>
            </Link>
          )}

          <Link
            to="/research-lab"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-500/40 text-teal-300 font-medium text-xs shadow-glow-cyan transition-all"
          >
            <Microscope className="w-3.5 h-3.5 text-teal-400" />
            <span>Research Lab</span>
          </Link>

          <Link
            to="/simulator"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-ocean-600 hover:from-cyan-500 hover:to-ocean-500 text-white font-medium text-xs shadow-glow-cyan transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Virtual Plant</span>
          </Link>

          <Link
            to="/reports"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden xs:inline">Report</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
