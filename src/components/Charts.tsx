import { CalculatorOutputs } from '@/types/calculator';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, LineChart, Line
} from 'recharts';

interface ChartsProps {
  outputs: CalculatorOutputs;
  appreciationRate: number;
}

const fmt = (v: number) => {
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
};

const pctFmt = (v: number) => v.toFixed(1) + '%';

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-[280px]">{children}</div>
    </div>
  );
}

export function Charts({ outputs, appreciationRate }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut */}
      <ChartCard title="Income Breakdown">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={outputs.donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {outputs.donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend
              verticalAlign="bottom"
              formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Equity Over Time */}
      <ChartCard title="Property Equity Over Time" subtitle={`${appreciationRate}% annual appreciation`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={outputs.equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="equity" fill="hsl(var(--chart-green))" fillOpacity={0.2} stroke="hsl(var(--chart-green))" strokeWidth={2} name="Equity" />
            <Line type="monotone" dataKey="propertyValue" stroke="hsl(var(--chart-indigo))" strokeWidth={2} dot={false} name="Property Value" />
            <Line type="monotone" dataKey="remainingDebt" stroke="hsl(var(--chart-gray))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Remaining Debt" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cash Flow Projection */}
      <ChartCard title="Cash Flow Projection — 10 Years">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={outputs.cashFlowProjection}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="cashFlow" name="Cash Flow" radius={[4, 4, 0, 0]}>
              {outputs.cashFlowProjection.map((entry, i) => (
                <Cell key={i} fill={entry.cashFlow >= 0 ? 'hsl(var(--chart-green))' : 'hsl(var(--chart-red))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Amortization */}
      <ChartCard title="Amortization Schedule">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={outputs.amortizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="principal" name="Principal" stackId="a" fill="hsl(var(--chart-green))" />
            <Bar dataKey="interest" name="Interest" stackId="a" fill="hsl(var(--chart-red))" radius={[4, 4, 0, 0]} />
            <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ROI Comparison */}
      <ChartCard title="ROI Comparison — 10 Years" subtitle="Cumulative returns including appreciation">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={outputs.roiComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={pctFmt} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => pctFmt(v)} />
            <Area type="monotone" dataKey="totalROI" fill="hsl(var(--chart-green))" fillOpacity={0.15} stroke="hsl(var(--chart-green))" strokeWidth={2} name="Total ROI" />
            <Area type="monotone" dataKey="cocROI" fill="hsl(var(--chart-indigo))" fillOpacity={0.15} stroke="hsl(var(--chart-indigo))" strokeWidth={2} name="CoC ROI" />
            <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
