/** حساب المؤشرات الفنية وسمات النموذج من شموع Binance */
import { fetchKlines } from "../../api/marketData.js";

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

export function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

/** سلسلة EMA كاملة — تُستخدم لحساب MACD */
function emaSeries(values, period) {
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(values[0] || 0);
  for (let i = 1; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k);
  return out;
}

/** MACD histogram عند آخر شمعة (12/26/9) */
export function calcMACDHist(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return 0;
  const f = emaSeries(closes, fast);
  const s = emaSeries(closes, slow);
  const dif = closes.map((_, i) => f[i] - s[i]);
  const dea = emaSeries(dif, signal);
  return dif[dif.length - 1] - dea[dea.length - 1];
}

export function calcATR(candles, period = 14) {
  const slice = candles.slice(-(period + 1));
  let sum = 0;
  for (let i = 1; i < slice.length; i++) {
    const c = slice[i], prev = slice[i - 1];
    sum += Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  }
  return sum / Math.max(1, slice.length - 1);
}

/** يحسب كل المؤشرات من مصفوفة شموع (الأخيرة = الحالية) */
export function computeIndicators(candles) {
  const closes = candles.map(c => c.close);
  const price = closes[closes.length - 1];
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const atr = calcATR(candles);
  const back = closes[Math.max(0, closes.length - 6)];
  return {
    price, ema20, ema50, atr,
    rsi: calcRSI(closes),
    macdHist: calcMACDHist(closes),
    distEma20: (price - ema20) / price,
    distEma50: (price - ema50) / price,
    atrPct: atr / price,
    momentum: (price - back) / back,
  };
}

export async function fetchCandles(pair, { limit = 100, endTime, interval = '1h' } = {}) {
  const symbol = pair.replace("/", "");
  const klines = await fetchKlines(symbol, interval, limit, endTime ? { endTime } : {});
  if (!Array.isArray(klines)) return null;
  return klines.map(k => ({ high: +k[2], low: +k[3], close: +k[4] }));
}