import React from "react";
import { TrendingUp, TrendingDown, Wallet, Target, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, subValue, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card p-4 relative overflow-hidden"
  >
    <div className={`absolute top-0 left-0 w-1 h-full`} style={{ background: `hsl(var(--trading-${color}))` }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold font-mono">{value}</p>
        {subValue && (
          <p className={`text-xs font-medium mt-1 ${
            subValue.startsWith('+') ? 'text-trading-green' : subValue.startsWith('-') ? 'text-trading-red' : 'text-muted-foreground'
          }`}>
            {subValue}
          </p>
        )}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center`}
        style={{ background: `hsl(var(--trading-${color}) / 0.1)` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: `hsl(var(--trading-${color}))` }} />
      </div>
    </div>
  </motion.div>
);

export default function PortfolioStats({ portfolio }) {
  const stats = [
    {
      icon: Wallet,
      label: "إجمالي الرصيد",
      value: `$${(portfolio?.total_balance || 10000).toLocaleString()}`,
      subValue: `${portfolio?.total_pnl_percent > 0 ? '+' : ''}${(portfolio?.total_pnl_percent || 0).toFixed(2)}%`,
      color: "cyan"
    },
    {
      icon: portfolio?.daily_pnl >= 0 ? TrendingUp : TrendingDown,
      label: "الربح اليومي",
      value: `$${Math.abs(portfolio?.daily_pnl || 0).toLocaleString()}`,
      subValue: `${portfolio?.daily_pnl >= 0 ? '+' : '-'}${Math.abs(portfolio?.daily_pnl_percent || 0).toFixed(2)}%`,
      color: (portfolio?.daily_pnl || 0) >= 0 ? "green" : "red"
    },
    {
      icon: Target,
      label: "نسبة النجاح",
      value: `${(portfolio?.win_rate || 0).toFixed(1)}%`,
      subValue: `${portfolio?.winning_trades || 0}W / ${portfolio?.losing_trades || 0}L`,
      color: "yellow"
    },
    {
      icon: BarChart3,
      label: "Sharpe Ratio",
      value: (portfolio?.sharpe_ratio || 0).toFixed(2),
      subValue: `Max DD: ${(portfolio?.max_drawdown || 0).toFixed(1)}%`,
      color: "purple"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} {...stat} delay={i * 0.1} />
      ))}
    </div>
  );
}