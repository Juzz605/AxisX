import MarketCandleChart from './MarketCandleChart';
import type { MarketCandle } from '../../types/types';

interface Props {
  candles: MarketCandle[];
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-textSub">{label}</p>
      <p className="mt-1 text-sm font-semibold text-textMain">{value}</p>
    </div>
  );
}

export default function MarketDashboard({ candles }: Props) {
  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const lastPrice = latest?.close ?? 1000;
  const change = prev ? ((latest.close - prev.close) / Math.max(prev.close, 1)) * 100 : 0;
  const volume = latest?.volume ?? 0;
  const regime = latest?.regime ?? 'Stable';

  const volatility =
    candles.length > 1
      ? candles
          .slice(-20)
          .reduce((acc, candle) => acc + Math.abs((candle.high - candle.low) / Math.max(candle.open, 1)), 0) /
        Math.min(20, candles.length)
      : 0;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-panel p-5 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Live Market Dashboard</h3>
        <span className="rounded-md border border-border bg-panel2 px-3 py-1 text-xs text-textSub">Synthetic OHLC Stream</span>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Metric label="AxisX Index" value={lastPrice.toFixed(2)} />
        <Metric label="Change" value={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`} />
        <Metric label="Volume" value={volume.toLocaleString()} />
        <Metric label="Regime" value={regime} />
      </div>

      <div className="rounded-lg border border-border bg-[#0B1220] p-3">
        <MarketCandleChart candles={candles} />
      </div>

      <p className="text-xs text-textSub">Volatility(20): {(volatility * 100).toFixed(2)}%</p>
    </section>
  );
}
