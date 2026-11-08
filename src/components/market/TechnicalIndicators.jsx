import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { fetchKlines as fetchRawKlines } from "@/api/marketData";

async function fetchKlines(symbol, interval = "1h", limit = 100) {
  const raw = await fetchRawKlines(symbol, interval, limit);
  return raw.map(k => ({
    close: parseFloat(k[4]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    volume: parseFloat(k[5]),
  }));
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  closes.forEach((c, i) => { if (i > 0) ema = c * k + ema * (1 - k); });
  return ema;
}

function calcMACD(closes) {
  if (closes.length < 26) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  return parseFloat((ema12 - ema26).toFixed(4));
}

function calcBollingerBands(closes, period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return {
    upper: parseFloat((mean + 2 * std).toFixed(2)),
    lower: parseFloat((mean - 2 * std).toFixed(2)),
    current: closes[closes.length - 1],
  };
}

function calcStochRSI(closes, period = 14) {
  const rsiValues = [];
  for (let i = period; i <= closes.length; i++) {
    const r = calcRSI(closes.slice(0, i), period);
    if (r !== null) rsiValues.push(r);
  }
  if (rsiValues.length < period) return null;
  const slice = rsiValues.slice(-period);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  if (max === min) return 50;
  return parseFloat(((rsiValues[rsiValues.length - 1] - min) / (max - min) * 100).toFixed(2));
}

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const slice = trs.slice(-period);
  return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
}

function buildIndicators(candles) {
  const closes = candles.map(c => c.close);
  const last = closes[closes.length - 1];

  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const bb = calcBollingerBands(closes);
  const stochRsi = calcStochRSI(closes);
  const atr = calcATR(candles);
  const ema50 = calcEMA(closes, 50);
  const ema200 = closes.length >= 200 ? calcEMA(closes.slice(-200), 200) : null;
  const avgVol = candles.slice(-20).reduce((a, c) => a + c.volume, 0) / 20;
  const lastVol = candles[candles.length - 1].volume;

  return [
    {
      name: "RSI (14)",
      value: rsi !== null ? rsi.toFixed(1) : "—",
      signal: rsi !== null ? (rsi < 30 ? "تشبع بيعي" : rsi > 70 ? "تشبع شرائي" : "محايد") : "—",
      type: rsi !== null ? (rsi < 35 ? "buy" : rsi > 65 ? "sell" : "neutral") : "neutral",
    },
    {
      name: "MACD",
      value: macd !== null ? (macd > 0 ? "إيجابي ▲" : "سلبي ▼") : "—",
      signal: macd !== null ? (macd > 0 ? "شراء" : "بيع") : "—",
      type: macd !== null ? (macd > 0 ? "buy" : "sell") : "neutral",
    },
    {
      name: "EMA (50/200)",
      value: ema200 ? (ema50 > ema200 ? "Golden Cross" : "Death Cross") : `EMA50: $${ema50.toFixed(0)}`,
      signal: ema200 ? (ema50 > ema200 ? "شراء" : "بيع") : (last > ema50 ? "فوق EMA50" : "تحت EMA50"),
      type: ema200 ? (ema50 > ema200 ? "buy" : "sell") : (last > ema50 ? "buy" : "sell"),
    },
    {
      name: "Bollinger Bands",
      value: bb ? (last < bb.lower ? "تحت الباند السفلي" : last > bb.upper ? "فوق الباند العلوي" : "داخل النطاق") : "—",
      signal: bb ? (last < bb.lower ? "شراء" : last > bb.upper ? "بيع" : "محايد") : "—",
      type: bb ? (last < bb.lower ? "buy" : last > bb.upper ? "sell" : "neutral") : "neutral",
    },
    {
      name: "Stochastic RSI",
      value: stochRsi !== null ? stochRsi.toFixed(1) : "—",
      signal: stochRsi !== null ? (stochRsi < 20 ? "تشبع بيعي" : stochRsi > 80 ? "تشبع شرائي" : "محايد") : "—",
      type: stochRsi !== null ? (stochRsi < 25 ? "buy" : stochRsi > 75 ? "sell" : "neutral") : "neutral",
    },
    {
      name: "ATR (14)",
      value: atr !== null ? `$${atr.toLocaleString()}` : "—",
      signal: atr !== null ? (atr > last * 0.03 ? "تقلب عالي" : "تقلب متوسط") : "—",
      type: "neutral",
    },
    {
      name: "Volume",
      value: lastVol > avgVol ? "فوق المتوسط" : "تحت المتوسط",
      signal: lastVol > avgVol * 1.5 ? "نشاط عالي" : "طبيعي",
      type: lastVol > avgVol ? "buy" : "neutral",
    },
  ];
}

export default function TechnicalIndicators({ pair = "BTC/USDT" }) {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const symbol = pair.replace("/", "");
      // نجلب 200 شمعة للحصول على EMA200
      const candles = await fetchKlines(symbol, "1h", 200);
      setIndicators(buildIndicators(candles));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [pair]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const buyCount = indicators.filter(i => i.type === "buy").length;
  const sellCount = indicators.filter(i => i.type === "sell").length;
  const neutralCount = indicators.filter(i => i.type === "neutral").length;
  const total = indicators.length || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">المؤشرات الفنية</h3>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>

      {/* Summary Bar */}
      {!loading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
            <div className="bg-trading-green h-full transition-all" style={{ width: `${(buyCount / total) * 100}%` }} />
            <div className="bg-trading-yellow h-full transition-all" style={{ width: `${(neutralCount / total) * 100}%` }} />
            <div className="bg-trading-red h-full transition-all" style={{ width: `${(sellCount / total) * 100}%` }} />
          </div>
          <div className="flex gap-2 text-[10px] font-mono">
            <span className="text-trading-green">{buyCount} شراء</span>
            <span className="text-trading-yellow">{neutralCount} محايد</span>
            <span className="text-trading-red">{sellCount} بيع</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin">
          {indicators.map((ind) => (
            <div key={ind.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-2">
                {ind.type === "buy" ? (
                  <TrendingUp className="w-3.5 h-3.5 text-trading-green" />
                ) : ind.type === "sell" ? (
                  <TrendingDown className="w-3.5 h-3.5 text-trading-red" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-trading-yellow" />
                )}
                <span className="text-xs font-medium">{ind.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">{ind.value}</span>
                <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${
                  ind.type === "buy" ? "bg-trading-green/10 text-trading-green" :
                  ind.type === "sell" ? "bg-trading-red/10 text-trading-red" :
                  "bg-trading-yellow/10 text-trading-yellow"
                }`}>
                  {ind.signal}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}