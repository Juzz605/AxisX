import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { MarketCandle } from '../../types/types';

interface Props {
  candles: MarketCandle[];
}

export default function MarketCandleChart({ candles }: Props) {
  const data = candles.slice(-40).map((candle) => ({
    ...candle,
    wickBase: candle.low,
    wickHeight: Math.max(0.01, candle.high - candle.low),
    bodyBase: Math.min(candle.open, candle.close),
    bodyHeight: Math.max(0.01, Math.abs(candle.close - candle.open)),
    direction: candle.close >= candle.open ? 'up' : 'down'
  }));

  return (
    <div className="h-[330px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.13)" />
          <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis stroke="#94A3B8" domain={['dataMin - 8', 'dataMax + 8']} tick={{ fontSize: 11 }} width={58} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1F2937' }}
            formatter={(value: number, name: string) => [Number(value).toFixed(2), name]}
          />

          <Bar dataKey="wickBase" stackId="wick" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="wickHeight" stackId="wick" fill="#94A3B8" barSize={2} isAnimationActive={false} />

          <Bar dataKey="bodyBase" stackId="body" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="bodyHeight" stackId="body" barSize={10} radius={[2, 2, 2, 2]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`body-${entry.label}-${index}`} fill={entry.direction === 'up' ? '#22C55E' : '#EF4444'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
