import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Edit3, Loader2, TrendingUp, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExitConfirm from "@/components/trading/ExitConfirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function OpenPositions({ trades, loading = false, error = false, onRetry }) {
  const queryClient = useQueryClient();
  const [editTrade, setEditTrade] = useState(null);
  const [exitTrade, setExitTrade] = useState(null);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const openTrades = trades?.filter((trade) => trade.status === "open") || [];

  const startEditing = (trade) => {
    setEditTrade(trade);
    setStopLoss(trade.stop_loss ?? "");
    setTakeProfit(trade.take_profit_1 ?? "");
    setEditError("");
  };

  const saveLevels = async (event) => {
    event.preventDefault();
    const sl = Number(stopLoss);
    const tp = Number(takeProfit);
    const entry = Number(editTrade?.entry_price);
    if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(sl) || sl <= 0 || !Number.isFinite(tp) || tp <= 0) {
      setEditError("أدخل سعراً صحيحاً للدخول ووقف الخسارة والهدف.");
      return;
    }

    const isLong = editTrade.type === "long";
    if ((isLong && (sl >= entry || tp <= entry)) || (!isLong && (sl <= entry || tp >= entry))) {
      setEditError(isLong
        ? "للشراء، يجب أن يكون وقف الخسارة تحت الدخول والهدف فوقه."
        : "للبيع، يجب أن يكون وقف الخسارة فوق الدخول والهدف تحته.");
      return;
    }
    const previousStop = Number(editTrade.stop_loss);
    if (previousStop > 0 && ((isLong && sl < previousStop) || (!isLong && sl > previousStop))) {
      setEditError("لا يمكن توسيع وقف الخسارة لزيادة المخاطرة. حرّكه نحو سعر الدخول فقط.");
      return;
    }

    setSaving(true);
    setEditError("");
    try {
      await base44.entities.Trade.update(editTrade.id, { stop_loss: sl, take_profit_1: tp });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trades"] }),
        queryClient.invalidateQueries({ queryKey: ["perf-trades"] }),
      ]);
      setEditTrade(null);
    } catch (e) {
      setEditError(e.message || "تعذر حفظ مستويات الصفقة.");
    } finally {
      setSaving(false);
    }
  };

  const handleClosed = () => {
    setExitTrade(null);
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["perf-trades"] });
  };

  return (
    <>
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

        {error && (
          <div className="mb-3 text-center text-sm text-trading-red" role="alert">
            تعذر تحديث الصفقات. المعروض قد يكون قديماً.
            {onRetry && <button className="mr-2 text-primary hover:underline" onClick={onRetry}>إعادة المحاولة</button>}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20 w-full" />)}</div>
        ) : openTrades.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">لا توجد صفقات مفتوحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
            {openTrades.map((trade) => {
              const isProfit = (trade.pnl || 0) >= 0;
              const liveShort = trade.mode === "live" && trade.type !== "long";
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
                      {trade.mode === "live" && <Badge className="bg-trading-red/10 text-trading-red border-0 text-[9px]">LIVE</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={`تعديل وقف الخسارة والهدف لـ ${trade.pair}`}
                        title={trade.mode === "live" ? "تعديل مستويات الصفقة الحقيقية غير متاح قبل مزامنتها مع Binance" : "تعديل وقف الخسارة والهدف"}
                        disabled={trade.mode === "live"}
                        onClick={() => startEditing(trade)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`إغلاق صفقة ${trade.pair}`}
                        title={liveShort ? "إغلاق الصفقات القصيرة الحقيقية غير مدعوم من التطبيق" : "مراجعة وإغلاق الصفقة"}
                        disabled={liveShort}
                        onClick={() => setExitTrade(trade)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {trade.mode === "live" && (
                    <p className="mb-2 flex items-center gap-1 text-[10px] text-trading-yellow">
                      <AlertTriangle className="h-3 w-3" />
                      {liveShort ? "أغلق هذا المركز من منصة Binance؛ الإغلاق المباشر غير مدعوم." : "الإغلاق سيرسل أمر سوق حقيقياً إلى Binance."}
                    </p>
                  )}
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
                      <p className={`font-mono font-bold ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
                        {isProfit ? "+" : ""}{trade.pnl_percent?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={!!editTrade} onOpenChange={(open) => { if (!open && !saving) setEditTrade(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل مستويات {editTrade?.pair}</DialogTitle>
            <DialogDescription>يمكن تقريب وقف الخسارة باتجاه الدخول، ولا يمكن توسيع المخاطرة.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLevels} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position-stop-loss">وقف الخسارة</Label>
              <Input id="position-stop-loss" type="number" step="any" min="0" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-take-profit">الهدف الأول</Label>
              <Input id="position-take-profit" type="number" step="any" min="0" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} required />
            </div>
            {editError && <p className="text-sm text-trading-red" role="alert">{editError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ المستويات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {exitTrade && (
        <ExitConfirm trade={exitTrade} onDismiss={() => setExitTrade(null)} onClosed={handleClosed} />
      )}
    </>
  );
}
