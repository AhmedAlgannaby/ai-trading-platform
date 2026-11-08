import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, Copy } from "lucide-react";
import { motion } from "framer-motion";

const STYLE_LABELS = {
  scalping: "سكالبينج",
  swing: "سوينج",
  day_trading: "يومي",
  position: "موقفي",
};

export default function TraderCard({ trader, onFollow, isFollowing, index }) {
  const isProfit = trader.total_return_percent >= 0;
  const monthProfit = trader.monthly_return_percent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
            {trader.display_name?.[0]?.toUpperCase() || "T"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{trader.display_name}</span>
              {trader.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-trading-cyan" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {trader.trading_style && (
                <Badge className="bg-secondary text-muted-foreground border-0 text-[10px] px-1.5 py-0 h-4">
                  {STYLE_LABELS[trader.trading_style] || trader.trading_style}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {trader.followers_count || 0}
              </span>
            </div>
          </div>
        </div>
        <div className={`text-xl font-bold font-mono ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
          {isProfit ? "+" : ""}{trader.total_return_percent?.toFixed(1)}%
        </div>
      </div>

      {/* Bio */}
      {trader.bio && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{trader.bio}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Win Rate</p>
          <p className="text-sm font-bold text-trading-green">{trader.win_rate?.toFixed(0) || "—"}%</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">هذا الشهر</p>
          <p className={`text-sm font-bold font-mono ${monthProfit ? "text-trading-green" : "text-trading-red"}`}>
            {monthProfit ? "+" : ""}{trader.monthly_return_percent?.toFixed(1) || "—"}%
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Max DD</p>
          <p className="text-sm font-bold text-trading-red">-{trader.max_drawdown?.toFixed(1) || "—"}%</p>
        </div>
      </div>

      {/* Pairs */}
      {trader.preferred_pairs?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trader.preferred_pairs.slice(0, 4).map(p => (
            <span key={p} className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground">{p}</span>
          ))}
        </div>
      )}

      {/* Fee + Button */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="text-xs text-muted-foreground">
          الحد الأدنى: <span className="text-foreground font-medium">${trader.min_copy_amount || 100}</span>
          {trader.copy_fee_percent > 0 && (
            <span className="mr-2">· عمولة: <span className="text-trading-yellow">{trader.copy_fee_percent}%</span></span>
          )}
        </div>
        <Button
          size="sm"
          variant={isFollowing ? "secondary" : "default"}
          className="gap-1.5 text-xs h-8"
          onClick={() => onFollow(trader)}
        >
          <Copy className="w-3 h-3" />
          {isFollowing ? "تتابعه" : "متابعة"}
        </Button>
      </div>
    </motion.div>
  );
}