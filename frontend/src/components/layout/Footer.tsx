import React from 'react';
import { ShieldAlert, Droplets, BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-navy-950 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Branding & Tagline */}
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 text-sm">AquaSolve™ Environmental Technologies</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Interactive environmental chemistry analysis, treatment sequence optimizer, and virtual plant simulator.
          </p>
        </div>

        {/* Center: Standards Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">BIS IS 10500:2012</span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">WHO 4th Ed.</span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">US EPA Safe Water</span>
        </div>

        {/* Right: Disclaimer note */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] leading-tight text-slate-400 max-w-xs text-center md:text-right">
            Educational & preliminary decision-support tool. Not a drinking water potability certification.
          </span>
        </div>
      </div>
    </footer>
  );
};
