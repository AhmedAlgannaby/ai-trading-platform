import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Target, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

function OpportunityCard({ opp, onDismiss }) {
  const isBuy = opp.direction === "buy";
  const color = isBuy ? "trading-green" : "trading-red";
  const Icon = isBuy ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      className={`glass-card border ${
        isBuy ? "border-trading-green/40 bg-trading-green/5" : "border-trading-red/40 bg-trading-red/5"
      } p-4 rounded-xl shadow-2xl w-80`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isBuy ? "bg-trading-green/20" : "bg-trading-red/20"
          }`}>
            <Icon className={`w-4 h-4 ${isBuy ? "text-trading-green" : "text-trading-red"}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">{opp.pair}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isBuy ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"
              }`}>
                {isBuy ? "شراء" : "بيع"}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 text-trading-yellow" />
              <span className="text-[10px] text-trading-yellow font-medium">فرصة تداول مكتشفة</span>
            </div>
          </div>
        </div>
        <button onClick={() => onDismiss(opp.id)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>الثقة</span>
          <span className="font-bold text-foreground">{opp.confidence}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isBuy ? "bg-trading-green" : "bg-trading-red"}`}
            style={{ width: `${opp.confidence}%` }}
          />
        </div>
      </div>

      {/* Entry / TP / SL */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">دخول</p>
          <p className="text-[11px] font-mono font-bold text-foreground">
            ${opp.entry?.toLocaleString()}
          </p>
        </div>
        <div className="bg-trading-green/10 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-0.5">
            <Target className="w-2.5 h-2.5 text-trading-green" />
            <p className="text-[9px] text-trading-green">TP</p>
          </div>
          <p className="text-[11px] font-mono font-bold text-trading-green">
            ${opp.tp1?.toLocaleString()}
          </p>
        </div>
        <div className="bg-trading-red/10 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-0.5">
            <Shield className="w-2.5 h-2.5 text-trading-red" />
            <p className="text-[9px] text-trading-red">SL</p>
          </div>
          <p className="text-[11px] font-mono font-bold text-trading-red">
            ${opp.sl?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* R:R */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
        <span>نسبة المخاطرة/العائد</span>
        <span className="font-bold text-trading-yellow">1:{opp.rr}</span>
      </div>

      {/* Reasons */}
      {opp.reasons?.length > 0 && (
        <div className="space-y-1 mb-3">
          {opp.reasons.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isBuy ? "bg-trading-green" : "bg-trading-red"}`} />
              {r}
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        className={`w-full text-xs h-7 font-bold ${
          isBuy
            ? "bg-trading-green hover:bg-trading-green/90 text-white"
            : "bg-trading-red hover:bg-trading-red/90 text-white"
        }`}
        onClick={() => onDismiss(opp.id)}
      >
        حسناً
      </Button>
    </motion.div>
  );
}

export default function OpportunityToast({ opportunities, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {opportunities.map(opp => (
          <div key={opp.id} className="pointer-events-auto">
            <OpportunityCard opp={opp} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}