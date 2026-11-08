/**
 * مستشار الخروج — قبل إغلاق أي صفقة يعرض تحليل النظام (انتظار/إغلاق + الأسباب)
 * ثم ينفذ الإغلاق المؤكد بسعر لحظي من السيرفر (البيع = تحويل الأصل إلى USDT).
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, Hourglass, X } from "lucide-react";

export default function ExitConfirm({ trade, onDismiss, onClosed }) {
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);
  const [advice, setAdvice] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    base44.functions.invoke("close_trade", { id: trade.id })
      .then((res) => { if (alive) setAdvice(res); })
      .catch((e) => { if (alive) setError(e.message || "تعذر جلب النصيحة"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [trade.id]);

  const handleConfirm = async () => {
    setClosing(true);
    setError(null);
    try {
      await base44.functions.invoke("close_trade", { id: trade.id, confirmed: true });
      onClosed?.();
    } catch (e) {
      setError(e.message || "فشل الإغلاق");
    } finally {
      setClosing(false);
    }
  };

  const verdict = advice?.advice;
  const isClose = verdict?.verdict === "close";
  const preview = advice?.preview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onDismiss?.()}>
      <div className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">إغلاق صفقة {trade.pair}</h3>
          <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="إلغاء">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحليل الصفقة...
          </div>
        )}

        {error && (
          <p className="text-xs text-trading-red bg-trading-red/10 border border-trading-red/30 rounded-lg px-3 py-2" role="alert">{error}</p>
        )}

        {verdict && (
          <div className={`p-4 rounded-lg border text-sm space-y-2 ${
            isClose
              ? "bg-trading-red/10 border-trading-red/30"
              : "bg-trading-green/10 border-trading-green/30"
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {isClose ? <AlertTriangle className="w-4 h-4 text-trading-red" /> : <Hourglass className="w-4 h-4 text-trading-green" />}
              <span>النصيحة: {isClose ? "أغلق الآن" : "انتظر"}</span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {(verdict.reasons || []).map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
            {preview && (
              <div className="text-xs font-mono pt-1">
                السعر اللحظي: ${preview.exitPrice?.toLocaleString()} — المتوقع: {preview.estPnl >= 0 ? "+" : ""}${preview.estPnl} ({preview.estPnlPercent}%) → USDT
              </div>
            )}
          </div>
        )}

        {trade.mode === "live" && (
          <p className="text-xs text-trading-yellow bg-trading-yellow/10 border border-trading-yellow/30 rounded-lg px-3 py-2">
            ⚠️ صفقة حقيقية — الإغلاق ينفذ بيع سوق فعلي ونهائي.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={loading || closing}
            className="flex-1 bg-trading-red hover:bg-trading-red/90 text-white font-bold"
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : "إغلاق الآن → USDT"}
          </Button>
          <Button variant="outline" onClick={onDismiss} className="flex-1">
            <TrendingUp className="w-4 h-4 ml-1" /> انتظار
          </Button>
        </div>
      </div>
    </div>
  );
}
