import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompanyRevenuePoint } from '../../types/types';

interface RevenueGrowthChartProps {
  points: CompanyRevenuePoint[];
}

export default function RevenueGrowthChart({ points }: RevenueGrowthChartProps) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 10, left: 10, bottom: 4 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.15)" />
          <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1F2937' }}
            formatter={(value: number, name: string) => {
              if (name === 'revenue') return [`$${value.toLocaleString()}`, 'Revenue'];
              return [`${(value * 100).toFixed(2)}%`, 'Market Share'];
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="market_share" stroke="#38BDF8" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
