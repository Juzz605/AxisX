import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { MarketCandle } from '../../types/types';

interface Props {
  candles: MarketCandle[];
}

export default function MarketCandleChart({ candles }: Props) {
  const data = candles.slice(-80).map((candle) => ({
    ...candle,
    move: candle.close - candle.open,
    direction: candle.close >= candle.open ? 'up' : 'down'
  }));
  const lastClose = data.length > 0 ? data[data.length - 1].close : 0;

  return (
    <div className="h-[330px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.13)" />
          <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis yAxisId="price" stroke="#94A3B8" domain={['dataMin - 30', 'dataMax + 30']} tick={{ fontSize: 11 }} width={72} />
          <YAxis yAxisId="volume" hide domain={[0, 'dataMax']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1F2937' }}
            formatter={(value: number, name: string) => [Number(value).toFixed(2), name]}
          />

          <Line yAxisId="price" type="monotone" dataKey="close" stroke="#84CC16" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <ReferenceLine yAxisId="price" y={lastClose} stroke="#84CC16" strokeDasharray="4 4" />
          <Bar yAxisId="volume" dataKey="volume" barSize={3} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`vol-${entry.label}-${index}`} fill={entry.direction === 'up' ? 'rgba(132,204,22,0.35)' : 'rgba(248,113,113,0.35)'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
