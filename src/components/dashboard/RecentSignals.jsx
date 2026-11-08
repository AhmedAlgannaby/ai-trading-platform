import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowUpCircle, ArrowDownCircle, Minus, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentSignals({ signals }) {
  const recentSignals = (signals || []).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">إشارات AI الأخيرة</h3>
        </div>
        <Link to={createPageUrl("AISignals")} className="text-xs text-primary hover:underline flex items-center gap-1">
          عرض الكل <ChevronLeft className="w-3 h-3" />
        </Link>
      </div>

      {recentSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Brain className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">لا توجد إشارات حالياً</p>
          <p className="text-xs mt-1">اضغط لتوليد تحليل جديد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentSignals.map((signal) => (
            <div
              key={signal.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {signal.direction === "buy" ? (
                  <ArrowUpCircle className="w-5 h-5 text-trading-green" />
                ) : signal.direction === "sell" ? (
                  <ArrowDownCircle className="w-5 h-5 text-trading-red" />
                ) : (
                  <Minus className="w-5 h-5 text-trading-yellow" />
                )}
                <div>
                  <p className="text-sm font-medium">{signal.pair}</p>
                  <p className="text-[10px] text-muted-foreground">{signal.strategy || "AI Ensemble"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          signal.confidence >= 70 ? 'bg-trading-green' :
                          signal.confidence >= 50 ? 'bg-trading-yellow' : 'bg-trading-red'
                        }`}
                        style={{ width: `${signal.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground">
                      {signal.confidence}%
                    </span>
                  </div>
                </div>
                <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${
                  signal.status === "pending" ? "bg-trading-yellow/10 text-trading-yellow" :
                  signal.status === "executed" ? "bg-trading-green/10 text-trading-green" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {signal.status === "pending" ? "معلق" :
                   signal.status === "executed" ? "مُنفذ" : "منتهي"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}