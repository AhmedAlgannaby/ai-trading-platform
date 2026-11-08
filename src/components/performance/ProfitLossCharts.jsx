import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import ChartCard, { EmptyChart, axisTick, gridStroke, tooltipStyle } from "@/components/performance/ChartCard";

export default function ProfitLossCharts({ daily, winsCount, lossesCount, grossWin, grossLoss }) {
  const empty = daily.length === 0;
  const pie = [
    { name: "رابحة", value: winsCount, color: "hsl(142, 71%, 45%)" },
    { name: "خاسرة", value: lossesCount, color: "hsl(0, 84%, 60%)" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ChartCard title="الأرباح والخسائر اليومية" subtitle="مجموع الربح مقابل الخسارة لكل يوم" className="lg:col-span-2">
        {empty ? <EmptyChart /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(215, 20%, 35%)" />
                <Bar dataKey="profit" name="ربح" stackId="a" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="loss" name="خسارة" stackId="a" fill="hsl(0, 84%, 60%)" radius={[0, 0, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="نسبة الأرباح والخسائر" subtitle={`ربح $${grossWin.toFixed(2)} / خسارة $${grossLoss.toFixed(2)}`}>
        {winsCount + lossesCount === 0 ? <EmptyChart /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}
                  label={({ name, value }) => `${name} ${value}`}>
                  {pie.map(p => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="معدل النجاح بمرور الوقت" subtitle="النسبة التراكمية للصفقات الرابحة" className="lg:col-span-3">
        {empty ? <EmptyChart /> : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "معدل النجاح"]} />
                <ReferenceLine y={50} stroke="hsl(215, 20%, 35%)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="winRate" stroke="hsl(45, 93%, 58%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}