import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Copy, Star, Target, Shield, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function SignalCard({ signal, index, isOwn, highlighted, onCopy }) {
  const isBuy = signal.direction === "buy";
  const rr = signal.take_profit_1 && signal.stop_loss && signal.entry_price
    ? (Math.abs(signal.take_profit_1 - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss)).toFixed(2)
    : null;

  const timeAgo = signal.created_date
    ? (() => {
        const diff = Date.now() - new Date(signal.created_date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `منذ ${mins} دقيقة`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `منذ ${hrs} ساعة`;
        return `منذ ${Math.floor(hrs / 24)} يوم`;
      })()
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass-card p-4 flex flex-col gap-3 border ${
        highlighted ? "border-primary/30" : isBuy ? "border-trading-green/15" : "border-trading-red/15"
      } hover:border-primary/30 transition-colors`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBuy ? "bg-trading-green/10" : "bg-trading-red/10"}`}>
            {isBuy ? <TrendingUp className="w-4 h-4 text-trading-green" /> : <TrendingDown className="w-4 h-4 text-trading-red" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{signal.pair}</p>
            <p className="text-[10px] text-muted-foreground">{signal.strategy || "AI Auto"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`text-[10px] border-0 px-2 ${isBuy ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"}`}>
            {isBuy ? "شراء" : "بيع"}
          </Badge>
          {isOwn && <Badge className="text-[9px] border-0 px-1.5 bg-primary/10 text-primary">إشارتي</Badge>}
          {highlighted && <Star className="w-3.5 h-3.5 text-trading-yellow fill-trading-yellow" />}
        </div>
      </div>

      {/* ثقة */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>الثقة</span>
          <span className={`font-mono font-medium ${signal.confidence >= 75 ? "text-trading-green" : signal.confidence >= 60 ? "text-trading-yellow" : "text-muted-foreground"}`}>
            {signal.confidence}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${signal.confidence >= 75 ? "bg-trading-green" : signal.confidence >= 60 ? "bg-trading-yellow" : "bg-muted-foreground"}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* الأسعار */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 rounded-lg bg-secondary/40">
          <p className="text-[9px] text-muted-foreground mb-0.5">دخول</p>
          <p className="text-[11px] font-mono font-medium">${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "—"}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-trading-red/5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
            <Shield className="w-2.5 h-2.5" /> SL
          </p>
          <p className="text-[11px] font-mono font-medium text-trading-red">${signal.stop_loss?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "—"}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-trading-green/5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
            <Target className="w-2.5 h-2.5" /> TP
          </p>
          <p className="text-[11px] font-mono font-medium text-trading-green">${signal.take_profit_1?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "—"}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/40">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
          {rr && <Badge variant="outline" className="text-[9px] px-1 py-0">R:R {rr}</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={onCopy}
          className="h-7 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary px-2">
          <Copy className="w-3 h-3" /> نسخ
        </Button>
      </div>
    </motion.div>
  );
}