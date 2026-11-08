import React from "react";
import { Wallet, Target, TrendingUp, TrendingDown, Scale, ArrowDownRight } from "lucide-react";

const fmt = (n) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Kpi({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>
      <p className="text-xl font-bold font-mono">{value}</p>
      {sub && <p className={`text-xs mt-1 ${tone}`}>{sub}</p>}
    </div>
  );
}

export default function PerformanceKpis({ m, initial }) {
  const up = m.realized + m.unrealized >= 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <Kpi icon={Wallet} label="إجمالي الرصيد" tone="text-primary"
        value={`$${m.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
        sub={`البداية $${initial.toLocaleString()}`} />
      <Kpi icon={up ? TrendingUp : TrendingDown} label="العائد الكلي"
        tone={up ? "text-trading-green" : "text-trading-red"}
        value={`${m.totalReturnPct >= 0 ? "+" : ""}${m.totalReturnPct.toFixed(2)}%`}
        sub={fmt(m.realized + m.unrealized)} />
      <Kpi icon={Target} label="معدل النجاح" tone="text-trading-yellow"
        value={`${m.winRate.toFixed(1)}%`} sub={`${m.winsCount}W / ${m.lossesCount}L`} />
      <Kpi icon={Scale} label="Profit Factor" tone="text-trading-purple"
        value={m.profitFactor.toFixed(2)} sub={`متوسط ربح ${fmt(m.avgWin)}`} />
      <Kpi icon={ArrowDownRight} label="أقصى سحب" tone="text-trading-red"
        value={`${m.maxDD.toFixed(2)}%`} sub={`متوسط خسارة ${fmt(m.avgLoss)}`} />
      <Kpi icon={TrendingUp} label="صفقات مفتوحة" tone="text-trading-green"
        value={m.open.length} sub={`غير محقق ${fmt(m.unrealized)}`} />
    </div>
  );
}