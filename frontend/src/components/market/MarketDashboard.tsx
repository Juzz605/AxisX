import MarketCandleChart from './MarketCandleChart';
import type { MarketCandle, MarketInstrumentSnapshot, MarketLearningSignal } from '../../types/types';

interface Props {
  candles: MarketCandle[];
  instruments: MarketInstrumentSnapshot[];
  learning: MarketLearningSignal | null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-textSub">{label}</p>
      <p className="mt-1 text-sm font-semibold text-textMain">{value}</p>
    </div>
  );
}

function formatPrice(value: number, currency: 'INR' | 'USD'): string {
  if (currency === 'INR') return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function MarketDashboard({ candles, instruments, learning }: Props) {
  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const lastPrice = latest?.close ?? 24765.9;
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
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-textMain">Stock Market Twin</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-textSub">Digital Twin • AI Pattern Learning • Live Stream</p>
        </div>
        <span className="rounded-md border border-border bg-panel2 px-3 py-1 text-xs text-textSub">March 5</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {instruments.map((instrument) => (
          <article key={instrument.symbol} className="rounded-lg border border-border bg-panel2 px-4 py-3">
            <p className="text-sm font-semibold text-textMain">{instrument.symbol}</p>
            <p className="text-xs text-textSub">{instrument.name}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-xl font-semibold">{formatPrice(instrument.price, instrument.currency)}</p>
              <p className={`text-sm font-medium ${instrument.change_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                {instrument.change >= 0 ? '+' : ''}
                {instrument.change.toFixed(2)} ({instrument.change_percent.toFixed(2)}%)
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Metric label="Twin Index" value={lastPrice.toFixed(2)} />
        <Metric label="Change" value={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`} />
        <Metric label="Volume" value={volume.toLocaleString()} />
        <Metric label="Regime" value={regime} />
      </div>

      <div className="rounded-lg border border-border bg-[#0B1220] p-3">
        <div className="mb-3 flex items-center gap-2">
          {['1D', '5D', '1M', '6M', '1Y'].map((chip) => (
            <span key={chip} className={`rounded-md border px-2.5 py-1 text-xs ${chip === '1D' ? 'border-accent text-accent' : 'border-border text-textSub'}`}>
              {chip}
            </span>
          ))}
        </div>
        <MarketCandleChart candles={candles} />
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Metric label="Volatility(20)" value={`${(volatility * 100).toFixed(2)}%`} />
        <Metric label="Learned Trend" value={learning?.trend ?? 'n/a'} />
        <Metric label="Predicted Next" value={learning ? learning.predicted_price.toFixed(2) : 'n/a'} />
        <Metric label="Prediction Confidence" value={learning ? `${(learning.confidence * 100).toFixed(1)}%` : 'n/a'} />
      </div>
    </section>
  );
}
