import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Copy, Loader2, TrendingUp, TrendingDown, CheckCircle2, Target, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function CopySignalModal({ signal, onClose, onCopied }) {
  const [positionSize, setPositionSize] = useState("100");
  const [leverage, setLeverage] = useState("1");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const isBuy = signal.direction === "buy";
  const rr = signal.take_profit_1 && signal.stop_loss && signal.entry_price
    ? (Math.abs(signal.take_profit_1 - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss)).toFixed(2)
    : null;

  const handleCopy = async () => {
    setSaving(true);
    // الشورت أو الرافعة >1 = فيوتشر (السبوت شراء برافعة 1 فقط)
    const lev = parseFloat(leverage) || 1;
    const market = (signal.direction !== "buy" || lev > 1) ? "futures" : "spot";
    await base44.entities.Trade.create({
      pair: signal.pair,
      type: signal.direction === "buy" ? "long" : "short",
      entry_price: signal.entry_price,
      stop_loss: signal.stop_loss,
      take_profit_1: signal.take_profit_1,
      take_profit_2: signal.take_profit_2,
      position_size: parseFloat(positionSize),
      leverage: lev,
      confidence: signal.confidence,
      strategy: `Copy: ${signal.strategy || "AI Signal"}`,
      timeframe: signal.timeframe,
      entry_reason: signal.analysis_summary || `نسخ إشارة ${signal.pair}`,
      status: "open",
      mode: "paper",
      market_type: market,
    });
    setSaving(false);
    setDone(true);
    setTimeout(onCopied, 1200);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">نسخ الإشارة</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ملخص الإشارة */}
        <div className={`p-4 rounded-xl border ${isBuy ? "bg-trading-green/5 border-trading-green/20" : "bg-trading-red/5 border-trading-red/20"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isBuy ? <TrendingUp className="w-4 h-4 text-trading-green" /> : <TrendingDown className="w-4 h-4 text-trading-red" />}
              <span className="font-semibold">{signal.pair}</span>
              <Badge className={`text-[10px] border-0 ${isBuy ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"}`}>
                {isBuy ? "شراء" : "بيع"}
              </Badge>
            </div>
            <Badge variant="outline" className="text-[10px]">ثقة: {signal.confidence}%</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div>
              <p className="text-muted-foreground">دخول</p>
              <p className="font-mono font-medium">${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center justify-center gap-0.5"><Shield className="w-2.5 h-2.5" /> SL</p>
              <p className="font-mono font-medium text-trading-red">${signal.stop_loss?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center justify-center gap-0.5"><Target className="w-2.5 h-2.5" /> TP</p>
              <p className="font-mono font-medium text-trading-green">${signal.take_profit_1?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {rr && <p className="text-center text-[10px] text-muted-foreground mt-2">نسبة R:R — <strong className="text-foreground">{rr}</strong></p>}
        </div>

        {/* إعدادات النسخ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">حجم الصفقة (USDT)</Label>
            <Input className="bg-secondary mt-1" type="number" value={positionSize} onChange={e => setPositionSize(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">الرافعة المالية</Label>
            <Input className="bg-secondary mt-1" type="number" value={leverage} onChange={e => setLeverage(e.target.value)} min="1" max="20" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-secondary/40 text-[11px] text-muted-foreground">
          ⚠️ ستُفتح هذه الصفقة في وضع <strong className="text-foreground">التداول التجريبي (Paper)</strong>. يمكنك تغيير الوضع من إعدادات المخاطر.
        </div>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-trading-green py-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">تم نسخ الصفقة بنجاح!</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
            <Button onClick={handleCopy} disabled={saving} className="flex-1 bg-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
              {saving ? "جاري النسخ..." : "نسخ الصفقة"}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}