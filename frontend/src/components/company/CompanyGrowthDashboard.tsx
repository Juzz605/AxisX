import type {
  CEOProductPlan,
  CompanyRevenuePoint,
  CustomerDemandInsight,
  ProductPerformance,
  ProductTelemetryRecord
} from '../../types/types';
import RevenueGrowthChart from './RevenueGrowthChart';

interface CompanyGrowthDashboardProps {
  revenueTimeline: CompanyRevenuePoint[];
  products: ProductPerformance[];
  insight: CustomerDemandInsight;
  visionaryPlan: CEOProductPlan;
  conservativePlan: CEOProductPlan;
  cashReservePct: number;
  telemetry: ProductTelemetryRecord[];
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel2 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-textSub">{label}</p>
      <p className="mt-1 text-base font-semibold text-textMain">{value}</p>
    </div>
  );
}

function ProductCard({ product }: { product: ProductPerformance }) {
  return (
    <article className="rounded-lg border border-border bg-panel2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-textMain">{product.product}</p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-textSub">{product.buying_window}</p>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
            product.production_focus === 'increase'
              ? 'bg-emerald-500/20 text-emerald-300'
              : product.production_focus === 'reduce'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-slate-500/20 text-slate-300'
          }`}
        >
          {product.production_focus}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border bg-bg px-2 py-1.5">
          <p className="text-textSub">Monthly Sold</p>
          <p className="mt-1 font-semibold">{product.monthly_units_sold.toLocaleString()}</p>
        </div>
        <div className="rounded border border-border bg-bg px-2 py-1.5">
          <p className="text-textSub">YTD Sold</p>
          <p className="mt-1 font-semibold">{product.yearly_units_sold.toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-textSub">Why they buy: {product.why_customers_buy}</p>
      <p className="mt-2 text-xs text-textSub">Top color: {product.primary_color}</p>
    </article>
  );
}

function PlanCard({ title, plan }: { title: string; plan: CEOProductPlan }) {
  return (
    <article className="rounded-lg border border-border bg-panel2 p-3">
      <h4 className="text-sm font-semibold text-textMain">{title}</h4>
      <p className="mt-2 text-xs text-textSub">Market this quarter: {plan.product_to_market}</p>
      <p className="mt-1 text-xs text-textSub">Scale production: {plan.product_to_scale}</p>
      <p className="mt-1 text-xs text-textSub">Reduce spend: {plan.product_to_reduce}</p>
      <p className="mt-2 text-xs text-textMain">{plan.rationale}</p>
    </article>
  );
}

export default function CompanyGrowthDashboard({
  revenueTimeline,
  products,
  insight,
  visionaryPlan,
  conservativePlan,
  cashReservePct,
  telemetry
}: CompanyGrowthDashboardProps) {
  const latest = revenueTimeline[revenueTimeline.length - 1];
  const annualized = latest ? latest.revenue * 4 : 0;
  const topProduct = [...products].sort((a, b) => b.monthly_units_sold - a.monthly_units_sold)[0];
  const recentTelemetry = telemetry.slice(0, 8);
  const telemetryRevenue = recentTelemetry.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-panel p-5 shadow-glow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-textMain">Apple Product Growth Dashboard</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-textSub">Demand Forecasting • Inventory Optimization • Dynamic Supply Chain</p>
        </div>
        <span className="rounded-md border border-border bg-panel2 px-3 py-1 text-xs text-textSub">Company Twin</span>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Kpi label="Quarter Revenue" value={latest ? `$${latest.revenue.toLocaleString()}` : 'n/a'} />
        <Kpi label="QoQ Growth" value={latest ? `${(latest.growth_rate * 100).toFixed(2)}%` : 'n/a'} />
        <Kpi label="Annualized Revenue" value={latest ? `$${annualized.toLocaleString()}` : 'n/a'} />
        <Kpi label="Cash Reserve" value={`${Math.round(cashReservePct * 100)}%`} />
      </div>

      <div className="rounded-lg border border-border bg-panel2 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-textSub">Current Top Seller</h4>
        {topProduct ? (
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <Kpi label="Product" value={topProduct.product} />
            <Kpi label="Units Sold" value={topProduct.monthly_units_sold.toLocaleString()} />
            <Kpi label="Top Color" value={topProduct.primary_color} />
            <Kpi label="Reason" value={topProduct.why_customers_buy} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-textSub">No product data yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-[#0B1220] p-3">
        <RevenueGrowthChart points={revenueTimeline} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-textSub">Product Portfolio Performance</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.product} product={p} />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-panel p-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-textSub">Customer Demand Insights</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <Kpi label="Top Reason" value={insight.top_reason} />
            <Kpi label="Top Segment" value={insight.top_segment} />
            <Kpi label="Top Region" value={insight.top_region} />
            <Kpi label="Top Color" value={insight.top_color_preference} />
          </div>
          <p className="text-xs text-textSub">Seasonal driver: {insight.seasonal_driver}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <PlanCard title="Visionary CEO Plan" plan={visionaryPlan} />
            <PlanCard title="Conservative CEO Plan" plan={conservativePlan} />
          </div>

          <div className="rounded-lg border border-border bg-panel2 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-textSub">Saved Product Pattern (MongoDB)</h4>
              <span className="text-xs text-textSub">${Math.round(telemetryRevenue).toLocaleString()} tracked</span>
            </div>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {recentTelemetry.length === 0 ? (
                <p className="text-xs text-textSub">No persisted product telemetry yet.</p>
              ) : (
                recentTelemetry.map((row, idx) => (
                  <div key={`${row.timestamp}-${row.product}-${idx}`} className="rounded border border-border bg-bg px-2 py-1.5 text-xs">
                    <span className="font-semibold text-textMain">{row.product}</span>
                    <span className="text-textSub"> • {row.monthly_units_sold.toLocaleString()} units • </span>
                    <span className="text-textMain">${Math.round(row.revenue).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
