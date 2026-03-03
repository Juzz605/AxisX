interface MetricCardProps {
  label: string;
  value: string;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-border bg-panel2 px-4 py-3 shadow-glow">
      <p className="text-xs uppercase tracking-wide text-textSub">{label}</p>
      <p className="mt-2 text-lg font-semibold text-textMain">{value}</p>
    </article>
  );
}
