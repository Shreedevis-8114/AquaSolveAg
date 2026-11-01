import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube2,
  Atom,
  Sparkles,
  Network,
  GitCompare,
  ArrowUpDown,
  FileText,
  History,
  Info,
  Home,
  Microscope
} from 'lucide-react';
import { useWater } from '../../contexts/WaterContext';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: Home, exact: true },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analysis', label: 'Water Analysis', icon: TestTube2, badgeKey: 'analysis' },
  { path: '/chemistry', label: 'Chemistry Insights', icon: Atom },
  { path: '/recommendations', label: 'Recommendations', icon: Sparkles, badgeKey: 'recommendations' },
  { path: '/simulator', label: 'Treatment Simulator', icon: Network },
  { path: '/research-lab', label: 'Research Lab', icon: Microscope, highlight: true },
  { path: '/what-if', label: 'What-If Scenarios', icon: GitCompare },
  { path: '/comparison', label: 'Before & After', icon: ArrowUpDown },
  { path: '/reports', label: 'Reports & Export', icon: FileText },
  { path: '/history', label: 'Analysis History', icon: History },
  { path: '/about', label: 'About & Standards', icon: Info },
];

export const Sidebar: React.FC = () => {
  const { analysisResult, recommendations } = useWater();

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-800 bg-navy-900/60 backdrop-blur-md p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400/80 mb-2">
            Modules & Workflows
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-ocean-500/10 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    } ${item.highlight ? 'border border-cyan-500/20' : ''}`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>

                  {item.badgeKey === 'analysis' && analysisResult && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {analysisResult.summary.outside_reference_count}
                    </span>
                  )}
                  {item.badgeKey === 'recommendations' && recommendations && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {recommendations.recommended_sequence.length}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Informational Widget */}
        <div className="p-3.5 rounded-xl bg-navy-950/70 border border-cyan-500/15">
          <div className="flex items-center gap-2 mb-1.5 text-cyan-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Chemistry Principles</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AquaSolve simulates mass transfer, precipitation Ksp, ionic equilibria, and double-layer coagulation rather than generic arbitrary percentages.
          </p>
        </div>
      </div>
    </aside>
  );
};
