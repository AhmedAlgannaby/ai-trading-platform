import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border/50">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold font-mono text-primary">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function EquityCurve({ equity = [], closedCount = 0, loading = false, error = false, onRetry }) {
  const data = useMemo(
    () => equity.map(point => ({ date: point.date || point.label, value: point.balance })),
    [equity],
  );

  const startVal = data[0]?.value || 0;
  const endVal = data[data.length - 1]?.value || startVal;
  const totalPnl = endVal - startVal;
  const totalPct = startVal ? ((totalPnl / startVal) * 100).toFixed(2) : "0.00";
  const isProfit = totalPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">منحنى رأس المال التجريبي</h3>
          <p className={`text-xs font-mono mt-0.5 ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
            {isProfit ? "+" : ""}{totalPnl.toFixed(2)}$ ({isProfit ? "+" : ""}{totalPct}%)
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {closedCount} صفقة مغلقة
        </div>
      </div>

      {error ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground" role="alert">
          <p>تعذر تحميل بيانات منحنى رأس المال.</p>
          {onRetry && <button className="text-primary hover:underline" onClick={onRetry}>إعادة المحاولة</button>}
        </div>
      ) : loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : data.length < 2 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          لا توجد صفقات مغلقة لعرض المنحنى بعد
        </div>
      ) : (
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isProfit ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isProfit ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isProfit ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
              strokeWidth={2}
              fill="url(#equityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  );
}