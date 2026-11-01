import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Play,
  RotateCcw,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sliders,
  X,
  Droplets,
  Layers,
  Sparkles,
  ArrowRight,
  Microscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWater } from '../contexts/WaterContext';
import { TreatmentNode } from '../components/simulator/TreatmentNode';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

const nodeTypes = {
  treatmentNode: TreatmentNode,
};

export const SimulatorPage: React.FC = () => {
  const {
    treatments,
    recommendations,
    activeSequence,
    setActiveSequence,
    measurements,
    runSimulation,
    simulationResult
  } = useWater();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [disabledStages, setDisabledStages] = useState<Record<string, boolean>>({});
  const [simulating, setSimulating] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Toggle stage enabled/disabled
  const handleToggleStage = useCallback((stageId: string) => {
    setDisabledStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }, []);

  // Remove stage from sequence
  const handleRemoveStage = useCallback((stageId: string) => {
    setActiveSequence(activeSequence.filter((s) => s !== stageId));
    if (selectedStageId === stageId) {
      setSelectedStageId(null);
    }
  }, [activeSequence, selectedStageId, setActiveSequence]);

  // Add stage to sequence
  const handleAddStage = (stageId: string) => {
    if (!activeSequence.includes(stageId)) {
      setActiveSequence([...activeSequence, stageId]);
    }
    setShowAddMenu(false);
  };

  // Reset to recommended sequence
  const handleResetToRecommended = () => {
    if (recommendations) {
      setActiveSequence(recommendations.recommended_sequence.map((s) => s.id));
    }
    setDisabledStages({});
  };

  // Run the simulation
  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const enabledSequence = activeSequence.filter((sid) => !disabledStages[sid]);
      await runSimulation(enabledSequence);
    } finally {
      setSimulating(false);
    }
  };

  // Auto-run simulation on sequence change if not done
  useEffect(() => {
    if (activeSequence.length > 0 && !simulationResult) {
      handleRunSimulation();
    }
  }, [activeSequence]);

  // Construct React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [];
    let xOffset = 50;
    const yPos = 120;
    const xSpacing = 280;

    // 1. Raw Water Node
    list.push({
      id: 'raw_water',
      type: 'treatmentNode',
      position: { x: xOffset, y: yPos },
      data: {
        stageId: 'raw_input',
        name: 'Raw Water Input',
        category: 'Raw Water',
        isFixed: true,
        targetContaminants: Object.keys(measurements),
      },
    });

    xOffset += xSpacing;

    // 2. Dynamic Treatment Stages
    activeSequence.forEach((stageId) => {
      const tInfo = treatments.find((t) => t.id === stageId);
      const stepRes = simulationResult?.stage_steps.find((s) => s.stage_id === stageId);
      const effectSummary = stepRes && Object.keys(stepRes.applied_effects).length > 0
        ? `${Object.keys(stepRes.applied_effects).length} parameters modified`
        : undefined;

      list.push({
        id: stageId,
        type: 'treatmentNode',
        position: { x: xOffset, y: yPos },
        selected: selectedStageId === stageId,
        data: {
          stageId,
          name: tInfo?.name || stageId,
          category: tInfo?.stage_category || 'Process',
          targetContaminants: tInfo?.target_contaminants || [],
          isDisabled: disabledStages[stageId],
          isFixed: false,
          effectSummary,
          onToggle: handleToggleStage,
          onRemove: handleRemoveStage,
        },
      });

      xOffset += xSpacing;
    });

    // 3. Treated Effluent Node
    list.push({
      id: 'treated_water',
      type: 'treatmentNode',
      position: { x: xOffset, y: yPos },
      data: {
        stageId: 'treated_output',
        name: 'Simulated Treated Water',
        category: 'Treated Water',
        isFixed: true,
        targetContaminants: [],
      },
    });

    return list;
  }, [activeSequence, treatments, disabledStages, selectedStageId, simulationResult, measurements, handleToggleStage, handleRemoveStage]);

  // Construct React Flow Edges
  const edges: Edge[] = useMemo(() => {
    const list: Edge[] = [];
    const sequenceNodeIds = ['raw_water', ...activeSequence, 'treated_water'];

    for (let i = 0; i < sequenceNodeIds.length - 1; i++) {
      const source = sequenceNodeIds[i];
      const target = sequenceNodeIds[i + 1];
      const isNextDisabled = disabledStages[target];

      list.push({
        id: `e-${source}-${target}`,
        source,
        target,
        animated: !isNextDisabled,
        style: {
          stroke: isNextDisabled ? '#475569' : '#00fff0',
          strokeWidth: isNextDisabled ? 1.5 : 2.5,
          strokeDasharray: isNextDisabled ? '5,5' : undefined,
        },
      });
    }

    return list;
  }, [activeSequence, disabledStages]);

  const [flowNodes, setFlowNodes] = useState<Node[]>(nodes);
  const [flowEdges, setFlowEdges] = useState<Edge[]>(edges);

  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setFlowEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: any, node: Node) => {
    if (!node.data.isFixed) {
      setSelectedStageId(node.data.stageId as string);
    }
  };

  const selectedTreatment = treatments.find((t) => t.id === selectedStageId);
  const selectedStepResult = simulationResult?.stage_steps.find((s) => s.stage_id === selectedStageId);

  return (
    <div className="space-y-6">
      {/* Title & Virtual Plant Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Interactive Virtual Treatment Plant</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reorder, toggle, or add chemical stages. Observe simulated hydrochemical transformation in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Stage Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Unit Process</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-navy-900 border border-slate-700 shadow-2xl p-2 z-50">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Treatment Technology
                </p>
                {treatments.map((t) => {
                  const alreadyAdded = activeSequence.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      disabled={alreadyAdded}
                      onClick={() => handleAddStage(t.id)}
                      className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : 'hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300'
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{t.stage_category}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleResetToRecommended}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Recommended</span>
          </button>

          <Link
            to="/research-lab"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-950/70 hover:bg-teal-900/80 border border-teal-500/40 text-teal-300 text-xs font-semibold transition-colors shadow-sm"
            title="Benchmark simulated results against actual laboratory experiments"
          >
            <Microscope className="w-3.5 h-3.5 text-teal-400" />
            <span>Research Lab Benchmarks</span>
          </Link>

          <button
            onClick={handleRunSimulation}
            disabled={simulating || activeSequence.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-500 hover:from-cyan-400 hover:to-ocean-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{simulating ? 'Simulating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Sequence Warnings Banner (if any) */}
      {simulationResult && simulationResult.sequence_warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Environmental Engineering Sequence Warnings</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90 leading-relaxed">
            {simulationResult.sequence_warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="relative h-[480px] w-full rounded-2xl border border-cyan-500/20 bg-navy-950/90 overflow-hidden shadow-2xl">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-navy-950"
        >
          <Background color="#1e3e62" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-navy-900 !border !border-slate-800 !rounded-xl !text-slate-200 overflow-hidden" />
        </ReactFlow>

        {/* Ambient Flow Legend */}
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-navy-900/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 space-y-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-cyan-400"></span>
            <span>Cyan Line: Active Hydraulic Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full border border-dashed border-slate-500"></span>
            <span>Click stage node to inspect chemistry</span>
          </div>
        </div>
      </div>

      {/* Selected Stage Chemistry Inspector Drawer */}
      {selectedTreatment && (
        <Card glow className="bg-navy-900/90 relative">
          <button
            onClick={() => setSelectedStageId(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Unit Operation Chemical Dossier
                </span>
                <h3 className="text-lg font-bold text-white">{selectedTreatment.name}</h3>
              </div>
              <Badge variant="info">{selectedTreatment.stage_category}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1 p-3.5 rounded-xl bg-navy-950/70 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Scientific Principle</span>
                <p className="text-slate-200 leading-snug">{selectedTreatment.chemistry_principle}</p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl bg-navy-950/70 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Target Contaminants</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTreatment.target_contaminants.map((tc) => (
                    <span key={tc} className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                      {tc.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl bg-navy-950/70 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Prerequisites</span>
                <p className="text-slate-200 leading-snug">{selectedTreatment.prerequisites}</p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl bg-navy-950/70 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Limitations</span>
                <p className="text-slate-200 leading-snug">{selectedTreatment.limitations}</p>
              </div>
            </div>

            {/* Stage Applied Modifications in Simulation */}
            {selectedStepResult && Object.keys(selectedStepResult.applied_effects).length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Applied Chemical Shift at this Stage:
                </span>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  {Object.entries(selectedStepResult.applied_effects).map(([param, eff]) => (
                    <span key={param} className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                      <b>{param.toUpperCase()}:</b> {eff}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
