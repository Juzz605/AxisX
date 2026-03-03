import type { Archetype } from '../types/types';

interface SimulationControlsProps {
  selectedArchetype: Archetype;
  onArchetypeChange: (archetype: Archetype) => void;
  onSimulate: () => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

export default function SimulationControls({
  selectedArchetype,
  onArchetypeChange,
  onSimulate,
  onReset,
  loading
}: SimulationControlsProps) {
  const buttonClass = 'rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Simulation Controls</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onArchetypeChange('VisionaryInnovator')}
          className={`rounded-lg border p-4 text-left transition ${
            selectedArchetype === 'VisionaryInnovator'
              ? 'border-accent bg-accentSoft/30'
              : 'border-border bg-panel2 hover:border-slate-500'
          }`}
        >
          <p className="text-sm font-semibold">Visionary Innovator</p>
          <p className="mt-1 text-xs text-textSub">High growth bias, higher strategic variance.</p>
        </button>

        <button
          onClick={() => onArchetypeChange('ConservativeStabilizer')}
          className={`rounded-lg border p-4 text-left transition ${
            selectedArchetype === 'ConservativeStabilizer'
              ? 'border-accent bg-accentSoft/30'
              : 'border-border bg-panel2 hover:border-slate-500'
          }`}
        >
          <p className="text-sm font-semibold">Conservative Stabilizer</p>
          <p className="mt-1 text-xs text-textSub">Liquidity-first approach with operational rigor.</p>
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => void onSimulate()} disabled={loading} className={`${buttonClass} bg-accent text-white hover:bg-blue-700`}>
          {loading ? 'Running...' : 'Simulate Economic Shock'}
        </button>
        <button onClick={() => void onReset()} disabled={loading} className={`${buttonClass} border border-border bg-panel2 text-textMain hover:bg-slate-800`}>
          Reset Simulation
        </button>
      </div>
    </section>
  );
}
