import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, BarChart2, Star } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_CONFIG = {
  trend_following: { label: "اتجاه السوق", color: "text-trading-cyan", bg: "bg-trading-cyan/10", icon: "📈" },
  mean_reversion:  { label: "الارتداد", color: "text-trading-yellow", bg: "bg-trading-yellow/10", icon: "🔄" },
  breakout:        { label: "الاختراق", color: "text-trading-red", bg: "bg-trading-red/10", icon: "⚡" },
  scalping:        { label: "سكالبينج", color: "text-trading-purple", bg: "bg-purple-500/10", icon: "⚡" },
  swing:           { label: "سوينج", color: "text-trading-green", bg: "bg-trading-green/10", icon: "🌊" },
  ai_hybrid:       { label: "AI هجين", color: "text-primary", bg: "bg-primary/10", icon: "🤖" },
};

const RISK_CONFIG = {
  low:    { label: "منخفض", color: "text-trading-green" },
  medium: { label: "متوسط", color: "text-trading-yellow" },
  high:   { label: "مرتفع", color: "text-trading-red" },
};

export default function StrategyCard({ strategy, measured, onBacktest, index }) {
  const cat = CATEGORY_CONFIG[strategy.category] || CATEGORY_CONFIG.trend_following;
  const risk = RISK_CONFIG[strategy.risk_level] || RISK_CONFIG.medium;
  // Phase 5: الأرقام التسويقية الثابتة لا تُعرض — فقط المقاس حقيقياً أو "—"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${cat.bg} flex-shrink-0`}>
            {cat.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{strategy.name}</h3>
              {strategy.is_featured && <Star className="w-3.5 h-3.5 text-trading-yellow fill-trading-yellow" />}
              {measured && (
                <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 bg-trading-green/10 text-trading-green">
                  مقاس حقيقياً ({measured.oos_trades} صفقة)
                </Badge>
              )}
            </div>
            <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 mt-1 ${cat.bg} ${cat.color}`}>
              {cat.label}
            </Badge>
          </div>
        </div>
        <span className={`text-xs font-medium ${risk.color}`}>{risk.label} المخاطر</span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{strategy.description}</p>

      {/* Stats — مقاس فقط، وإلا شرطة صريحة */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Win Rate {measured ? "(OOS)" : ""}</p>
          <p className="text-sm font-bold text-trading-green">{measured ? `${measured.win_rate}%` : "—"}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">العائد {measured ? "(OOS)" : ""}</p>
          <p className="text-sm font-bold text-trading-cyan">{measured ? `${measured.oos_return >= 0 ? "+" : ""}${measured.oos_return}%` : "—"}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">مستخدم</p>
          <p className="text-sm font-bold">{strategy.times_used || 0}</p>
        </div>
      </div>

      {/* Indicators */}
      {strategy.indicators?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {strategy.indicators.slice(0, 4).map(ind => (
            <span key={ind} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">{ind}</span>
          ))}
          {strategy.indicators.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{strategy.indicators.length - 4}</span>
          )}
        </div>
      )}

      {/* Timeframes */}
      {strategy.timeframes?.length > 0 && (
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3 h-3 text-muted-foreground" />
          <div className="flex gap-1">
            {strategy.timeframes.map(tf => (
              <Badge key={tf} variant="outline" className="text-[10px] px-1.5 py-0 h-4">{tf}</Badge>
            ))}
          </div>
        </div>
      )}

      <Button size="sm" className="w-full gap-2 mt-auto" onClick={() => onBacktest(strategy)}>
        <Zap className="w-3.5 h-3.5" />
        اختبار هذه الاستراتيجية
      </Button>
    </motion.div>
  );
}