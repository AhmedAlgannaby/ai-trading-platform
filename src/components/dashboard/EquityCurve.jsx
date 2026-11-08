import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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

export default function EquityCurve() {
  const { data: trades } = useQuery({
    queryKey: ["trades-closed"],
    queryFn: () => base44.entities.Trade.filter({ status: "closed", mode: "paper" }, "-closed_at", 200),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
    initialData: [],
  });

  const paperBalance = settings[0]?.paper_balance || 10000;

  // بناء منحنى رأس المال من الصفقات المغلقة الفعلية
  const data = useMemo(() => {
    if (!trades.length) {
      // إذا لا توجد صفقات - نعرض رصيد البداية فقط
      const today = new Date().toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      return [{ date: today, value: paperBalance }];
    }

    // ترتيب الصفقات حسب تاريخ الإغلاق
    const sorted = [...trades]
      .filter(t => t.closed_at)
      .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));

    let balance = paperBalance;
    const points = [{ date: "البداية", value: paperBalance }];

    sorted.forEach(t => {
      balance += (t.pnl || 0);
      points.push({
        date: new Date(t.closed_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        value: Math.round(balance),
      });
    });

    return points;
  }, [trades, paperBalance]);

  const startVal = data[0]?.value || paperBalance;
  const endVal = data[data.length - 1]?.value || paperBalance;
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
          <h3 className="text-sm font-semibold text-foreground">منحنى رأس المال</h3>
          <p className={`text-xs font-mono mt-0.5 ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
            {isProfit ? "+" : ""}{totalPnl.toFixed(2)}$ ({isProfit ? "+" : ""}{totalPct}%)
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {trades.length} صفقة مغلقة
        </div>
      </div>

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
    </motion.div>
  );
}