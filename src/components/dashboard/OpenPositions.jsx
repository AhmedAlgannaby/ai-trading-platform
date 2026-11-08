import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, X, Edit3 } from "lucide-react";

export default function OpenPositions({ trades }) {
  const openTrades = trades?.filter(t => t.status === "open") || [];

  if (openTrades.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">الصفقات المفتوحة</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">لا توجد صفقات مفتوحة حالياً</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">الصفقات المفتوحة</h3>
        <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
          {openTrades.length} صفقة
        </Badge>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
        {openTrades.map((trade) => {
          const isProfit = (trade.pnl || 0) >= 0;
          return (
            <div
              key={trade.id}
              className={`p-3 rounded-lg border transition-colors ${
                isProfit
                  ? "bg-trading-green/5 border-trading-green/10 hover:border-trading-green/30"
                  : "bg-trading-red/5 border-trading-red/10 hover:border-trading-red/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${
                    trade.type === "long"
                      ? "bg-trading-green/20 text-trading-green"
                      : "bg-trading-red/20 text-trading-red"
                  }`}>
                    {trade.type === "long" ? "LONG" : "SHORT"}
                  </Badge>
                  <span className="text-sm font-semibold">{trade.pair}</span>
                  {trade.leverage > 1 && (
                    <span className="text-[10px] text-trading-yellow font-mono">{trade.leverage}x</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">الدخول</span>
                  <p className="font-mono font-medium">${trade.entry_price?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالي</span>
                  <p className="font-mono font-medium">${trade.current_price?.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <span className="text-muted-foreground">الربح/الخسارة</span>
                  <p className={`font-mono font-bold ${isProfit ? 'text-trading-green' : 'text-trading-red'}`}>
                    {isProfit ? '+' : ''}{trade.pnl_percent?.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}