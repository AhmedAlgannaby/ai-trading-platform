/**
 * OpportunityScanner — يحلل السوق تلقائياً ويكشف فرص التداول
 * يستخدم تحليل RSI, EMA, حجم التداول من Binance (عبر السيرفر المحلي)
 */
import { fetchKlines as fetchRawKlines } from "@/api/marketData";

async function fetchKlines(symbol, interval = "1h", limit = 50) {
  try {
    const raw = await fetchRawKlines(symbol, interval, limit);
    return raw.map(k => ({
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch {
    return [];
  }
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export async function scanForOpportunity(pair) {
  const symbol = pair.replace("/", "");
  const candles = await fetchKlines(symbol, "1h", 60);
  if (candles.length < 20) return null;

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  const rsi = calcRSI(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);

  // حجم التداول المتوسط
  const volumes = candles.map(c => c.volume);
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const lastVol = volumes[volumes.length - 1];
  const volSpike = lastVol > avgVol * 1.5;

  // تحديد الاتجاه والفرصة
  let direction = null;
  let confidence = 0;
  let reasons = [];

  const trend = ema20 > ema50 ? "up" : "down";

  // إشارة شراء
  if (rsi !== null && rsi < 35 && trend === "up") {
    direction = "buy";
    confidence = 70 + (volSpike ? 15 : 0) + Math.max(0, 35 - rsi);
    reasons = ["RSI في منطقة ذروة البيع", "الاتجاه صاعد (EMA20 > EMA50)"];
    if (volSpike) reasons.push("ارتفاع حجم التداول");
  } else if (rsi !== null && rsi > 65 && trend === "down") {
    direction = "sell";
    confidence = 70 + (volSpike ? 15 : 0) + Math.max(0, rsi - 65);
    reasons = ["RSI في منطقة ذروة الشراء", "الاتجاه هابط (EMA20 < EMA50)"];
    if (volSpike) reasons.push("ارتفاع حجم التداول");
  } else if (rsi !== null && rsi < 30) {
    direction = "buy";
    confidence = 65 + (volSpike ? 10 : 0);
    reasons = ["RSI في ذروة البيع الشديدة"];
    if (volSpike) reasons.push("ارتفاع حجم التداول");
  } else if (rsi !== null && rsi > 70) {
    direction = "sell";
    confidence = 65 + (volSpike ? 10 : 0);
    reasons = ["RSI في ذروة الشراء الشديدة"];
    if (volSpike) reasons.push("ارتفاع حجم التداول");
  }

  if (!direction || confidence < 65) return null;

  confidence = Math.min(confidence, 95);

  // حساب نقاط الدخول والأهداف
  const atr = candles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14;

  let entry, sl, tp1, tp2;
  if (direction === "buy") {
    entry = currentPrice;
    sl = parseFloat((entry - atr * 1.5).toFixed(entry < 1 ? 6 : 2));
    tp1 = parseFloat((entry + atr * 2).toFixed(entry < 1 ? 6 : 2));
    tp2 = parseFloat((entry + atr * 3.5).toFixed(entry < 1 ? 6 : 2));
  } else {
    entry = currentPrice;
    sl = parseFloat((entry + atr * 1.5).toFixed(entry < 1 ? 6 : 2));
    tp1 = parseFloat((entry - atr * 2).toFixed(entry < 1 ? 6 : 2));
    tp2 = parseFloat((entry - atr * 3.5).toFixed(entry < 1 ? 6 : 2));
  }

  const rr = parseFloat((Math.abs(tp1 - entry) / Math.abs(sl - entry)).toFixed(2));

  return {
    pair,
    direction,
    confidence: Math.round(confidence),
    entry: parseFloat(entry.toFixed(entry < 1 ? 6 : 2)),
    sl,
    tp1,
    tp2,
    rsi,
    ema20: parseFloat(ema20.toFixed(entry < 1 ? 6 : 2)),
    ema50: parseFloat(ema50.toFixed(entry < 1 ? 6 : 2)),
    rr,
    reasons,
    timestamp: new Date().toISOString(),
  };
}