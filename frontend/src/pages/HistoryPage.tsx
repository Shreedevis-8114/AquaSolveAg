import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  RotateCcw,
  ArrowRight,
  Droplet,
  Calendar,
  Layers,
  Database,
  Search
} from 'lucide-react';
import { useWater } from '../contexts/WaterContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {
  const { setSource, setIntendedUse, setStandardId, setMeasurements, runAnalysis } = useWater();
  const navigate = useNavigate();

  const [savedSamples, setSavedSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getSavedSamples();
      setSavedSamples(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleLoadSample = async (id: number) => {
    try {
      const sample = await api.getSavedSampleById(id);
      setSource(sample.source);
      setIntendedUse(sample.intended_use);
      setStandardId(sample.standard_id);
      setMeasurements(sample.measurements);
      navigate('/analysis');
    } catch (err) {
      console.error('Error loading sample:', err);
    }
  };

  const filtered = savedSamples.filter(
    (s) =>
      s.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.location_name && s.location_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Analysis & Sample History</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Persisted historical water samples stored locally in SQLite database
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Filter by source or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Loading history from database...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">{item.source}</h3>
                  </div>
                  <Badge variant="info" size="sm">#{item.id}</Badge>
                </div>

                <p className="text-xs text-slate-300">
                  {item.location_name || 'Standard Sample'}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{item.measurements_count} params</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] uppercase text-cyan-400 font-mono">
                  Standard: {item.standard_id.toUpperCase()}
                </span>

                <button
                  onClick={() => handleLoadSample(item.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  <span>Load Sample</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 space-y-3">
          <Database className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="font-bold text-base text-white">No Saved Samples Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When you enter measurements on the Water Analysis page, click "Save Sample" to archive it here.
          </p>
        </Card>
      )}
    </div>
  );
};
