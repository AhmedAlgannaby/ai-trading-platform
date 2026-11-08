import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartCard, { EmptyChart, axisTick, gridStroke, tooltipStyle } from "@/components/performance/ChartCard";

export default function EquityDrawdownChart({ equity }) {
  const empty = equity.length < 2;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ChartCard title="منحنى رأس المال" subtitle="الرصيد بعد كل صفقة مغلقة" className="lg:col-span-2">
        {empty ? <EmptyChart /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={["auto", "auto"]}
                  tickFormatter={(v) => `$${v.toLocaleString()}`} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v.toLocaleString()}`, "الرصيد"]} />
                <Area type="monotone" dataKey="balance" stroke="hsl(199, 89%, 48%)" strokeWidth={2} fill="url(#eqFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="السحب (Drawdown)" subtitle="الانخفاض عن أعلى رصيد %">
        {empty ? <EmptyChart /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "السحب"]} />
                <Area type="monotone" dataKey="drawdown" stroke="hsl(0, 84%, 60%)" strokeWidth={2}
                  fill="hsl(0, 84%, 60%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}