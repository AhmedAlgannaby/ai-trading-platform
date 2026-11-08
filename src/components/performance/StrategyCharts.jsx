import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import ChartCard, { EmptyChart, axisTick, gridStroke, tooltipStyle } from "@/components/performance/ChartCard";

const colorFor = (v) => (v >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)");

function HBar({ data, dataKey, unit, domain }) {
  return (
    <div style={{ height: Math.max(180, data.length * 42) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} domain={domain}
            tickFormatter={(v) => `${unit === "$" ? "$" : ""}${v}${unit === "%" ? "%" : ""}`} />
          <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={110} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v) => [`${unit === "$" ? "$" : ""}${v}${unit === "%" ? "%" : ""}`]} />
          <ReferenceLine x={unit === "%" ? 50 : 0} stroke="hsl(215, 20%, 35%)" />
          <Bar dataKey={dataKey} radius={4}>
            {data.map((d, i) => (
              <Cell key={i} fill={dataKey === "winRate" ? (d.winRate >= 50 ? colorFor(1) : colorFor(-1)) : colorFor(d[dataKey])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StrategyCharts({ strategies, pairs }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ChartCard title="معدل نجاح كل استراتيجية" subtitle="الخط = 50%">
        {strategies.length === 0 ? <EmptyChart /> : <HBar data={strategies} dataKey="winRate" unit="%" domain={[0, 100]} />}
      </ChartCard>
      <ChartCard title="ربح/خسارة كل استراتيجية" subtitle="صافي PnL بالدولار">
        {strategies.length === 0 ? <EmptyChart /> : <HBar data={strategies} dataKey="pnl" unit="$" />}
      </ChartCard>
      <ChartCard title="الأداء حسب الزوج" subtitle="صافي PnL لكل عملة">
        {pairs.length === 0 ? <EmptyChart /> : <HBar data={pairs} dataKey="pnl" unit="$" />}
      </ChartCard>
    </div>
  );
}