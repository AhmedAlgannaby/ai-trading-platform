/**
 * PaperTradingEngine — محرك التداول الافتراضي التلقائي
 * يراقب الصفقات المفتوحة ويحدّث PnL بأسعار حقيقية من Binance
 * ويغلق الصفقات تلقائياً عند الوصول لـ SL/TP
 */
import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPriceMap } from "@/api/marketData";

async function fetchPrices(pairs) {
  return fetchPriceMap(pairs);
}

function calcPnL(trade, currentPrice) {
  if (!currentPrice || !trade.entry_price || !trade.position_size) return { pnl: 0, pnlPercent: 0 };
  const leverage = trade.leverage || 1;
  const qty = trade.position_size / trade.entry_price;
  const pnl = trade.type === "long"
    ? (currentPrice - trade.entry_price) * qty * leverage
    : (trade.entry_price - currentPrice) * qty * leverage;
  const pnlPercent = (pnl / trade.position_size) * 100;
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
  };
}

export default function PaperTradingEngine({ onTradeClose }) {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);
  const processingRef = useRef(false);

  const runEngine = useCallback(async () => {
    if (processingRef.current) return;
    // عامل السيرفر هو المسؤول عند نشاطه — نتنحى لتجنب الإغلاق المزدوج
    try {
      const h = await fetch('/api/health').then((r) => r.json()).catch(() => null);
      if (h?.worker?.monitorActive) return;
    } catch { /* لا صحة؟ نعمل محلياً كاحتياط */ }
    processingRef.current = true;

    try {
      const trades = await base44.entities.Trade.filter({ status: "open", mode: "paper" });
      if (!trades.length) return;

      const pairs = trades.map(t => t.pair);
      const priceMap = await fetchPrices(pairs);

      const updates = [];
      const closes = [];

      for (const trade of trades) {
        const symbol = trade.pair.replace("/", "");
        const currentPrice = priceMap[symbol];
        if (!currentPrice) continue;

        const { pnl, pnlPercent } = calcPnL(trade, currentPrice);

        // تحقق من الوصول للـ SL أو TP
        let shouldClose = null;
        let closeReason = "";

        if (trade.type === "long") {
          if (trade.stop_loss && currentPrice <= trade.stop_loss) {
            shouldClose = "stop_loss";
            closeReason = "وقف الخسارة";
          } else if (trade.take_profit_1 && currentPrice >= trade.take_profit_1) {
            shouldClose = "take_profit";
            closeReason = "هدف الربح";
          }
        } else {
          if (trade.stop_loss && currentPrice >= trade.stop_loss) {
            shouldClose = "stop_loss";
            closeReason = "وقف الخسارة";
          } else if (trade.take_profit_1 && currentPrice <= trade.take_profit_1) {
            shouldClose = "take_profit";
            closeReason = "هدف الربح";
          }
        }

        if (shouldClose) {
          const finalPnl = calcPnL(trade, shouldClose === "stop_loss" ? trade.stop_loss : trade.take_profit_1);
          closes.push(base44.entities.Trade.update(trade.id, {
            status: "closed",
            current_price: currentPrice,
            exit_price: shouldClose === "stop_loss" ? trade.stop_loss : trade.take_profit_1,
            pnl: finalPnl.pnl,
            pnl_percent: finalPnl.pnlPercent,
            exit_reason: closeReason,
            closed_at: new Date().toISOString(),
          }));
          if (onTradeClose) {
            onTradeClose({ trade, reason: closeReason, pnl: finalPnl.pnl, currentPrice });
          }
        } else {
          updates.push(base44.entities.Trade.update(trade.id, {
            current_price: currentPrice,
            pnl,
            pnl_percent: pnlPercent,
          }));
        }
      }

      await Promise.all([...updates, ...closes]);

      if (updates.length > 0 || closes.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["trades-closed"] });
      }
    } catch {
      // silent
    } finally {
      processingRef.current = false;
    }
  }, [queryClient, onTradeClose]);

  useEffect(() => {
    runEngine();
    // تحديث كل 15 ثانية
    intervalRef.current = setInterval(runEngine, 15_000);
    return () => clearInterval(intervalRef.current);
  }, [runEngine]);

  return null;
}