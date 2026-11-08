import React from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, StopCircle, Play } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_CONFIG = {
  active:  { label: "نشط", color: "text-trading-green", bg: "bg-trading-green/10" },
  paused:  { label: "متوقف مؤقتاً", color: "text-trading-yellow", bg: "bg-trading-yellow/10" },
  stopped: { label: "موقوف", color: "text-muted-foreground", bg: "bg-secondary" },
  pending: { label: "معلّق", color: "text-trading-yellow", bg: "bg-trading-yellow/10" },
};

export default function MyFollowings({ followings, onUpdate }) {
  const toggleStatus = async (f) => {
    const newStatus = f.status === "active" ? "paused" : "active";
    await base44.entities.CopyFollow.update(f.id, { status: newStatus });
    onUpdate?.();
  };

  const stopFollow = async (f) => {
    await base44.entities.CopyFollow.update(f.id, { status: "stopped" });
    onUpdate?.();
  };

  if (!followings.length) {
    return (
      <div className="glass-card p-10 text-center text-muted-foreground">
        <p className="text-sm">لا تتابع أي متداول حتى الآن.</p>
        <p className="text-xs mt-1">اختر متداولاً من القائمة وابدأ بنسخ صفقاته.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {followings.map((f, i) => {
        const isProfit = f.total_pnl >= 0;
        const st = STATUS_CONFIG[f.status] || STATUS_CONFIG.active;
        return (
          <motion.div key={f.id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex flex-wrap items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {f.trader_name?.[0]?.toUpperCase() || "T"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{f.trader_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>
                  {st.label}
                </span>
                {f.auto_approve && (
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] h-4 px-1.5">تلقائي</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span>مبلغ النسخ: <span className="text-foreground">${f.copy_amount?.toLocaleString()}</span></span>
                <span>المضاعف: <span className="text-foreground">{f.risk_multiplier}x</span></span>
                <span>الصفقات المنسوخة: <span className="text-foreground">{f.copied_trades_count || 0}</span></span>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold font-mono ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
                {isProfit ? "+" : ""}{f.total_pnl?.toFixed(2)} $
              </p>
              <p className={`text-xs ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
                {isProfit ? "+" : ""}{f.total_pnl_percent?.toFixed(2)}%
              </p>
            </div>
            <div className="flex gap-2">
              {f.status !== "stopped" && (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleStatus(f)}>
                    {f.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-trading-red hover:text-trading-red" onClick={() => stopFollow(f)}>
                    <StopCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}