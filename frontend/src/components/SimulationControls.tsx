interface SimulationControlsProps {
  onSimulate: () => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

export default function SimulationControls({ onSimulate, onReset, loading }: SimulationControlsProps) {
  const buttonClass = 'rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Simulation Controls</h2>
      <div className="mt-4 rounded-lg border border-border bg-panel2 p-4">
        <p className="text-sm font-semibold text-textMain">Single CEO Agent</p>
        <p className="mt-1 text-xs text-textSub">
          Unified executive policy that balances growth and stability for EV Battery Module manufacturing.
        </p>
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
