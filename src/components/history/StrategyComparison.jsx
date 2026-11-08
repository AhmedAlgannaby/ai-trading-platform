import React from "react";

export default function StrategyComparison({ stats, active, onSelect }) {
  if (stats.length === 0) return null;
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-1">مقارنة الاستراتيجيات</h3>
      <p className="text-[10px] text-muted-foreground mb-3">حسب الفلاتر الحالية — اضغط على صف لتصفية الجدول به</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 px-3 text-right font-medium">الاستراتيجية</th>
              <th className="py-2 px-3 text-right font-medium">الصفقات</th>
              <th className="py-2 px-3 text-right font-medium">نسبة النجاح</th>
              <th className="py-2 px-3 text-right font-medium">متوسط %</th>
              <th className="py-2 px-3 text-right font-medium">صافي P&L</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr
                key={s.name}
                onClick={() => onSelect(active === s.name ? "all" : s.name)}
                className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/30 ${
                  active === s.name ? "bg-primary/10" : ""
                }`}
              >
                <td className="py-2.5 px-3 font-medium">{s.name}</td>
                <td className="py-2.5 px-3 font-mono">{s.count}</td>
                <td className={`py-2.5 px-3 font-mono ${s.winRate >= 50 ? "text-trading-green" : "text-trading-red"}`}>
                  {s.winRate.toFixed(1)}%
                </td>
                <td className={`py-2.5 px-3 font-mono ${s.avgPct >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                  {s.avgPct >= 0 ? "+" : ""}{s.avgPct.toFixed(2)}%
                </td>
                <td className={`py-2.5 px-3 font-mono font-medium ${s.pnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                  {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}