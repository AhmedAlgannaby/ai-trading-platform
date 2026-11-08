import React from "react";
import { motion } from "framer-motion";

export default function MarketSentiment() {
  const fearGreedValue = 65;
  const btcDominance = 52.3;
  const totalMarketCap = "2.1T";
  const volume24h = "89.5B";

  const getLabel = (v) => {
    if (v <= 25) return { text: "خوف شديد", color: "text-trading-red" };
    if (v <= 45) return { text: "خوف", color: "text-trading-red" };
    if (v <= 55) return { text: "محايد", color: "text-trading-yellow" };
    if (v <= 75) return { text: "طمع", color: "text-trading-green" };
    return { text: "طمع شديد", color: "text-trading-green" };
  };

  const label = getLabel(fearGreedValue);
  const rotation = (fearGreedValue / 100) * 180 - 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">مشاعر السوق</h3>
      
      {/* Fear & Greed Gauge */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-32 h-16 overflow-hidden mb-2">
          <svg viewBox="0 0 120 60" className="w-full h-full">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(0, 84%, 60%)" />
                <stop offset="25%" stopColor="hsl(30, 90%, 55%)" />
                <stop offset="50%" stopColor="hsl(45, 93%, 58%)" />
                <stop offset="75%" stopColor="hsl(100, 60%, 50%)" />
                <stop offset="100%" stopColor="hsl(142, 71%, 45%)" />
              </linearGradient>
            </defs>
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <line
              x1="60" y1="55"
              x2="60" y2="20"
              stroke="hsl(210, 40%, 96%)"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${rotation}, 60, 55)`}
            />
            <circle cx="60" cy="55" r="4" fill="hsl(210, 40%, 96%)" />
          </svg>
        </div>
        <p className="text-2xl font-bold font-mono">{fearGreedValue}</p>
        <p className={`text-xs font-medium ${label.color}`}>{label.text}</p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 rounded-lg bg-secondary/30">
          <p className="text-[10px] text-muted-foreground">هيمنة BTC</p>
          <p className="text-sm font-mono font-semibold">{btcDominance}%</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30">
          <p className="text-[10px] text-muted-foreground">القيمة السوقية</p>
          <p className="text-sm font-mono font-semibold">${totalMarketCap}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30 col-span-2">
          <p className="text-[10px] text-muted-foreground">حجم التداول 24h</p>
          <p className="text-sm font-mono font-semibold">${volume24h}</p>
        </div>
      </div>
    </motion.div>
  );
}