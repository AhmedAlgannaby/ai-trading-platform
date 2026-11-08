import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import AdvancedFilters from "@/components/history/AdvancedFilters";
import StrategyComparison from "@/components/history/StrategyComparison";
import { DEFAULT_FILTERS, applyFilters, strategyOf, strategyStats } from "@/components/history/tradeFilters";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { format } from "date-fns";

export default function TradeHistory() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => base44.entities.Trade.list("-created_date", 100),
    initialData: [],
  });

  const allClosed = trades.filter(t => t.status === "closed");
  const closedTrades = applyFilters(allClosed, filters);
  const strategyList = [...new Set(allClosed.map(strategyOf))];
  const comparison = strategyStats(applyFilters(allClosed, { ...filters, strategy: "all" }));

  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = closedTrades.length ? (winningTrades.length / closedTrades.length * 100) : 0;
  const avgWin = winningTrades.length ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length ? losingTrades.reduce((s, t) => s + Math.abs(t.pnl), 0) / losingTrades.length : 0;

  const pairSet = [...new Set(allClosed.map(t => t.pair))];

  const pnlData = closedTrades.slice(0, 20).reverse().map((t, i) => ({
    name: `#${i + 1}`,
    pnl: t.pnl || 0,
  }));

  const pieData = [
    { name: "رابحة", value: winningTrades.length, color: "hsl(142, 71%, 45%)" },
    { name: "خاسرة", value: losingTrades.length, color: "hsl(0, 84%, 60%)" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdvancedFilters filters={filters} onChange={setFilters} pairs={pairSet} strategies={strategyList} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="إجمالي الصفقات" value={closedTrades.length} />
        <StatBox label="صافي الربح" value={`$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? "green" : "red"} />
        <StatBox label="نسبة النجاح" value={`${winRate.toFixed(1)}%`} color={winRate >= 50 ? "green" : "red"} />
        <StatBox label="متوسط الربح/الخسارة" value={`$${avgWin.toFixed(0)} / -$${avgLoss.toFixed(0)}`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">الأرباح والخسائر</h3>
          <div className="h-[250px]">
            {pnlData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(210, 40%, 96%)' }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {pnlData.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">توزيع النتائج</h3>
          <div className="h-[200px]">
            {closedTrades.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-trading-green" /> رابحة ({winningTrades.length})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-trading-red" /> خاسرة ({losingTrades.length})</span>
          </div>
        </motion.div>
      </div>

      <StrategyComparison
        stats={comparison}
        active={filters.strategy}
        onSelect={(strategy) => setFilters({ ...filters, strategy })}
      />

      {/* Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">سجل الصفقات</h3>
          <span className="text-[10px] text-muted-foreground">{closedTrades.length} من {allClosed.length} صفقة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                <th className="py-2 px-3 text-right font-medium">الزوج</th>
                <th className="py-2 px-3 text-right font-medium">النوع</th>
                <th className="py-2 px-3 text-right font-medium">الاستراتيجية</th>
                <th className="py-2 px-3 text-right font-medium">الدخول</th>
                <th className="py-2 px-3 text-right font-medium">الخروج</th>
                <th className="py-2 px-3 text-right font-medium">P&L</th>
                <th className="py-2 px-3 text-right font-medium">%</th>
                <th className="py-2 px-3 text-right font-medium">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {closedTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">
                    {trade.closed_at ? format(new Date(trade.closed_at), "yyyy-MM-dd") : format(new Date(trade.created_date), "yyyy-MM-dd")}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{trade.pair}</td>
                  <td className="py-2.5 px-3">
                    <Badge className={`text-[9px] border-0 ${
                      trade.type === "long" ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"
                    }`}>
                      {trade.type === "long" ? "LONG" : "SHORT"}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{strategyOf(trade)}</td>
                  <td className="py-2.5 px-3 font-mono">${trade.entry_price?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono">${trade.exit_price?.toLocaleString() || "-"}</td>
                  <td className={`py-2.5 px-3 font-mono font-medium ${(trade.pnl || 0) >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                    {(trade.pnl || 0) >= 0 ? "+" : ""}{trade.pnl?.toFixed(2) || "0.00"}
                  </td>
                  <td className={`py-2.5 px-3 font-mono ${(trade.pnl_percent || 0) >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                    {(trade.pnl_percent || 0) >= 0 ? "+" : ""}{(trade.pnl_percent || 0).toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3">
                    {(trade.pnl || 0) >= 0 ? (
                      <span className="text-trading-green">✅</span>
                    ) : (
                      <span className="text-trading-red">❌</span>
                    )}
                  </td>
                </tr>
              ))}
              {closedTrades.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">لا توجد صفقات مغلقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${
        color === "green" ? "text-trading-green" : color === "red" ? "text-trading-red" : "text-foreground"
      }`}>{value}</p>
    </div>
  );
}