import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bot, TrendingUp, TrendingDown, Activity, DollarSign, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PaperTradingEngine from "./PaperTradingEngine";

export default function PaperTradingStatus() {
  const [closedAlerts, setClosedAlerts] = useState([]);

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => base44.entities.Trade.filter({ mode: "paper" }, "-created_date", 50),
    initialData: [],
    refetchInterval: 15000,
  });

  const { data: settings } = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
    initialData: [],
  });

  const handleTradeClose = useCallback((info) => {
    const alert = {
      id: Date.now(),
      trade: info.trade,
      reason: info.reason,
      pnl: info.pnl,
      isProfit: info.pnl >= 0,
    };
    setClosedAlerts(prev => [alert, ...prev.slice(0, 2)]);
    setTimeout(() => {
      setClosedAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 8000);
  }, []);

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");
  const paperBalance = settings[0]?.paper_balance || 10000;
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const openPnl = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winCount = closedTrades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : 0;

  return (
    <>
      <PaperTradingEngine onTradeClose={handleTradeClose} />

      {/* إشعارات إغلاق الصفقات */}
      <div className="fixed bottom-6 left-6 z-50 space-y-2 max-w-[300px]">
        <AnimatePresence>
          {closedAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`glass-card p-3 border ${alert.isProfit ? "border-trading-green/40 bg-trading-green/5" : "border-trading-red/40 bg-trading-red/5"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">محرك التداول الافتراضي</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {alert.trade.pair} — {alert.reason}
              </p>
              <p className={`text-sm font-bold font-mono mt-0.5 ${alert.isProfit ? "text-trading-green" : "text-trading-red"}`}>
                {alert.isProfit ? "+" : ""}{alert.pnl?.toFixed(2)}$
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* بطاقة الحالة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">التداول الافتراضي</h3>
            <Badge className="bg-trading-green/10 text-trading-green border-0 text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-trading-green animate-pulse ml-1" />
              نشط
            </Badge>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">الرصيد التجريبي</p>
            <p className="text-sm font-mono font-bold">${(paperBalance + totalPnl).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
            <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs font-bold">{openTrades.length}</p>
            <p className="text-[10px] text-muted-foreground">مفتوحة</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
            <Target className="w-4 h-4 text-trading-yellow mx-auto mb-1" />
            <p className="text-xs font-bold">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">معدل الفوز</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
            <DollarSign className={`w-4 h-4 mx-auto mb-1 ${openPnl >= 0 ? "text-trading-green" : "text-trading-red"}`} />
            <p className={`text-xs font-bold font-mono ${openPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
              {openPnl >= 0 ? "+" : ""}{openPnl.toFixed(1)}$
            </p>
            <p className="text-[10px] text-muted-foreground">PnL مفتوح</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
            <DollarSign className={`w-4 h-4 mx-auto mb-1 ${totalPnl >= 0 ? "text-trading-green" : "text-trading-red"}`} />
            <p className={`text-xs font-bold font-mono ${totalPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}$
            </p>
            <p className="text-[10px] text-muted-foreground">PnL محقق</p>
          </div>
        </div>

        {/* الصفقات المفتوحة */}
        {openTrades.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium mb-2">الصفقات المراقَبة</p>
            {openTrades.slice(0, 4).map(trade => {
              const isProfit = (trade.pnl || 0) >= 0;
              return (
                <div key={trade.id} className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                  isProfit ? "bg-trading-green/5 border-trading-green/20" : "bg-trading-red/5 border-trading-red/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {isProfit ? (
                      <TrendingUp className="w-3 h-3 text-trading-green" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-trading-red" />
                    )}
                    <span className="font-medium">{trade.pair}</span>
                    <Badge className={`text-[9px] border-0 px-1 py-0 h-3.5 ${
                      trade.type === "long" ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"
                    }`}>
                      {trade.type === "long" ? "L" : "S"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">${trade.current_price?.toLocaleString() || "-"}</span>
                    <span className={`font-mono font-bold ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
                      {isProfit ? "+" : ""}{trade.pnl_percent?.toFixed(2) || "0.00"}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          ⚡ يتم تحديث الأسعار كل 15 ثانية — محاكاة كاملة بأسعار Binance الحقيقية
        </p>
      </motion.div>
    </>
  );
}