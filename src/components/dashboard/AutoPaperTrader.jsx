/**
 * AutoPaperTrader — متداول تجريبي آلي مع تعلّم ذاتي
 * 1) يتدرّب النموذج على الصفقات المغلقة (ويتحدّث بعد كل خسارة)
 * 2) يحلل الأزواج بمؤشرات RSI/EMA/ATR من Binance
 * 3) يتنبأ النموذج باحتمال نجاح كل إشارة ويرفض الضعيفة
 * PaperTradingEngine يتولى تحديث PnL وإغلاق الصفقات عند SL/TP.
 */
import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { recordLessons, buildStats, evaluateSignal } from "@/components/dashboard/tradeLearning";
import { trainOnClosedTrades } from "@/components/ml/modelTrainer";
import { buildFeatures, predict } from "@/components/ml/signalModel";
import { computeIndicators, fetchCandles } from "@/components/ml/marketFeatures";
import { calcPositionSize } from "@/lib/tradeMath";
import { TRADING_PAIRS } from "@/lib/pairs";
import {
  isMicroBalance, microRiskPct, MICRO_PAIRS, MICRO_MAX_POSITIONS,
  MICRO_MAX_LEVERAGE, MICRO_MIN_NOTIONAL, MICRO_DAILY_LOSS_PCT,
  MICRO_MAX_TRADES_PER_DAY, MICRO_MIN_CONFIDENCE, MICRO_MIN_WIN_PROB,
  MICRO_TAKER_FEE, MICRO_SL_PCT, MICRO_TP_R,
} from "@/lib/microStrategy";

const PAIRS = TRADING_PAIRS;
const INTERVAL_MS = 5 * 60 * 1000;
const MIN_CONFIDENCE = 60;
const MIN_WIN_PROB = 0.5;
// قفل بين التبويبات يمنع تشغيل نسختين في نفس اللحظة وفتح صفقات مكررة
const LOCK_KEY = "auto_paper_trader_last_run";
const CROSS_TAB_LOCK_MS = 2 * 60 * 1000;

async function analyze(pair, { interval = "1h", micro = false } = {}) {
  const candles = await fetchCandles(pair, { interval, limit: micro ? 300 : 100 });
  if (!candles || candles.length < (micro ? 80 : 55)) return null;
  const ind = computeIndicators(candles);
  const { price, ema20, ema50, rsi, atr } = ind;

  // Micro Growth: نفس قاعدة الاختبار التاريخي (اتجاه 1D + MACD)، بلا فلاتر تعلّم قد تخالفها
  if (micro) {
    const long = price > ema20 && ema20 > ema50 && ind.macdHist > 0;
    const short = price < ema20 && ema20 < ema50 && ind.macdHist < 0;
    if (!long && !short) return null;
    const direction = long ? "buy" : "sell";
    const sign = long ? 1 : -1;
    const slPct = MICRO_SL_PCT / 100;
    return {
      pair, direction, confidence: 75, price,
      reasons: [
        long ? "السعر فوق EMA20 وفوق EMA50 (اتجاه صاعد)" : "السعر تحت EMA20 وتحت EMA50 (اتجاه هابط)",
        `MACD ${long ? "إيجابي" : "سلبي"} ${ind.macdHist.toFixed(4)}`,
        `الوقف 1.5% والهدف الأول 4.5% (3R) — ATR ${(ind.atrPct * 100).toFixed(2)}%`,
      ],
      features: buildFeatures(ind, direction),
      stop_loss: price - sign * price * slPct,
      take_profit_1: price + sign * price * slPct * MICRO_TP_R[0],
      take_profit_2: price + sign * price * slPct * MICRO_TP_R[1],
      take_profit_3: price + sign * price * slPct * MICRO_TP_R[2],
    };
  }

  let score = 0;
  const reasons = [];
  if (price > ema20) { score++; reasons.push("السعر فوق EMA20"); } else { score--; reasons.push("السعر تحت EMA20"); }
  if (ema20 > ema50) { score++; reasons.push("EMA20 فوق EMA50"); } else { score--; reasons.push("EMA20 تحت EMA50"); }
  if (rsi < 35) { score += 2; reasons.push(`RSI تشبع بيعي ${rsi.toFixed(0)}`); }
  else if (rsi > 65) { score -= 2; reasons.push(`RSI تشبع شرائي ${rsi.toFixed(0)}`); }
  else if (rsi >= 50) score++; else score--;

  if (Math.abs(score) < 2) return null;
  const direction = score > 0 ? "buy" : "sell";
  const confidence = Math.min(90, 55 + Math.abs(score) * 8);
  const sign = direction === "buy" ? 1 : -1;
  return {
    pair, direction, confidence, price, reasons,
    features: buildFeatures(ind, direction),
    stop_loss: price - sign * atr * 1.5,
    take_profit_1: price + sign * atr * 3,
    take_profit_2: price + sign * atr * 4.5,
    take_profit_3: price + sign * atr * 6,
  };
}

export default function AutoPaperTrader() {
  const queryClient = useQueryClient();
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    // StrictMode يستدعي التأثير مرتين قبل انتهاء أول await — نضع القفل فوراً
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      // تبويبان مفتوحان على اللوحة لا يجب أن يفتحا نفس الصفقات
      try {
        const last = Number(localStorage.getItem(LOCK_KEY) || 0);
        if (Date.now() - last < CROSS_TAB_LOCK_MS) return;
        localStorage.setItem(LOCK_KEY, String(Date.now()));
      } catch { /* localStorage غير متاح */ }

      // مولد السيرفر هو المسؤول عند نشاطه — نتنحى لتجنب فتح صفقات مكررة
      try {
        const h = await fetch('/api/health').then((r) => r.json()).catch(() => null);
        if (h?.worker?.generatorActive) return;
      } catch { /* لا صحة؟ نعمل محلياً كاحتياط */ }

      const settingsList = await base44.entities.RiskSettings.list("-created_date", 1);
      const settings = settingsList[0] || {};
      if ((settings.trading_mode || "paper") !== "paper") return;
      if ((settings.execution_mode || "semi_auto") === "manual") return;

      // 1) التعلّم: دروس نصية + تحديث نموذج التنبؤ بعد كل صفقة مغلقة
      const newLessons = await recordLessons();
      const { model, newSamples } = await trainOnClosedTrades();
      if (newLessons || newSamples) {
        queryClient.invalidateQueries({ queryKey: ["trade-lessons"] });
        queryClient.invalidateQueries({ queryKey: ["ml-model"] });
      }
      const stats = await buildStats();

      const balance = settings.paper_balance || 10000;
      const micro = isMicroBalance(balance);
      const maxOpen = micro ? MICRO_MAX_POSITIONS : (settings.max_open_positions || 5);
      const open = await base44.entities.Trade.filter({ status: "open", mode: "paper" });
      let openCount = open.length;
      const openPairs = new Set(open.map(t => t.pair));

      // وضع الرصيد الصغير: صفقتان يومياً كحد أقصى + وقف خسارة يومي 2%
      if (micro) {
        const day = new Date().toISOString().slice(0, 10);
        const paperTrades = await base44.entities.Trade.filter({ mode: "paper" }, "-created_date", 200);
        const microCap = balance * MICRO_MAX_LEVERAGE;
        const microTrades = paperTrades.filter(t => (Number(t.position_size) || 0) <= microCap + 0.01);
        const openedToday = microTrades.filter(t => (t.created_date || "").slice(0, 10) === day).length;
        if (openedToday >= MICRO_MAX_TRADES_PER_DAY) return;
        const realizedToday = microTrades
          .filter(t => t.status === "closed" && t.pnl_accounting_version === 2 &&
            (t.closed_at || t.updated_date || "").slice(0, 10) === day)
          .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
        if (realizedToday <= -(balance * MICRO_DAILY_LOSS_PCT / 100)) return;
      }

      const market = settings.market_type === "futures" ? "futures" : "spot";
      const maxLeverage = Math.min(Math.max(Number(settings.max_leverage) || 5, 1), 125);
      const leverage = market === "futures"
        ? Math.min(Math.max(Number(settings.default_leverage) || 1, 1), maxLeverage, micro ? MICRO_MAX_LEVERAGE : 125)
        : 1;
      const riskPct = micro ? microRiskPct(balance) : (settings.max_risk_per_trade || 2);
      const minConfidence = micro ? Math.max(MIN_CONFIDENCE, MICRO_MIN_CONFIDENCE) : MIN_CONFIDENCE;
      const minWinProb = micro ? MICRO_MIN_WIN_PROB : MIN_WIN_PROB;
      const pairs = micro ? MICRO_PAIRS : PAIRS;
      const candleInterval = micro ? "1d" : "1h";

      for (const pair of pairs) {
        if (openCount >= maxOpen) break;
        if (openPairs.has(pair)) continue;
        const s = await analyze(pair, { interval: candleInterval, micro });
        if (!s) continue;

        let prob = 0.5;
        if (micro) {
          // استراتيجية الرصيد الصغير حتمية: نموذج التعلّم للعرض فقط ولا يرفض الإشارة
          prob = predict(model.weights, s.features);
          s.reasons = [...s.reasons, `تعلّم: احتمال النموذج ${(prob * 100).toFixed(0)}% (للعرض فقط)`];
        } else {
          // 2) فلترة الأنماط الخاسرة (إحصائي)
          const verdict = evaluateSignal(stats, s);
          if (verdict.blocked || verdict.adjustedConfidence < minConfidence) continue;

          // 3) تنبؤ النموذج المتعلّم
          prob = predict(model.weights, s.features);
          if (prob < minWinProb) continue;

          s.confidence = Math.round((verdict.adjustedConfidence + prob * 100) / 2);
          if (verdict.notes.length) s.reasons = [...s.reasons, ...verdict.notes.map(n => `تعلّم: ${n}`)];
          s.reasons = [...s.reasons, `تعلّم: احتمال النجاح ${(prob * 100).toFixed(0)}% (نموذج v${model.version})`];
        }

        // السبوت شراء فقط — إشارة البيع تُحفظ منتهية بدل صفقة وهمية
        if (s.direction !== "buy" && s.direction !== "sell") continue;
        if (s.direction === "sell" && market !== "futures") continue;
        let size;
        try {
          size = calcPositionSize({
            balance, riskPct,
            entry: s.price, sl: s.stop_loss, leverage,
          });
        } catch { continue; }

        // حد Binance الأدنى + حارس الرسوم: لا صفقة صغيرة تأكلها العمولة
        if (micro) {
          if (size < MICRO_MIN_NOTIONAL) continue;
          const tp1Pct = Math.abs(s.take_profit_1 - s.price) / s.price;
          const fees = size * MICRO_TAKER_FEE * 2;
          if (size * tp1Pct <= fees) continue;
        }

        const strategyName = micro ? "Micro Growth" : "Auto Paper (Technical)";
        const timeframe = micro ? "1D" : "1H";

        await base44.entities.Signal.create({
          pair, direction: s.direction, confidence: s.confidence,
          entry_price: s.price, stop_loss: s.stop_loss,
          take_profit_1: s.take_profit_1, take_profit_2: s.take_profit_2, take_profit_3: s.take_profit_3,
          timeframe, strategy: strategyName,
          analysis_summary: s.reasons.join(" — "), status: "executed",
        });

        await base44.entities.Trade.create({
          pair, type: s.direction === "buy" ? "long" : "short",
          entry_price: s.price, current_price: s.price,
          stop_loss: s.stop_loss, take_profit_1: s.take_profit_1,
          take_profit_2: s.take_profit_2, take_profit_3: s.take_profit_3,
          position_size: size, leverage, confidence: s.confidence,
          strategy: strategyName, timeframe,
          status: "open", mode: "paper", market_type: market, pnl: 0, pnl_percent: 0,
          entry_reason: `[تلقائي] ${s.reasons.join(" — ")}`,
          ml_features: s.features,
          ml_probability: Math.round(prob * 1000) / 10,
        });
        openCount++;
        openPairs.add(pair);
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["signals"] });
      }
    } catch (e) {
      console.error("AutoPaperTrader run failed:", e);
    } finally {
      runningRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    run();
    const t = setInterval(run, INTERVAL_MS);
    return () => clearInterval(t);
  }, [run]);

  return null;
}