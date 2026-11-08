import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { fetchKlines as fetchRawKlines } from "@/api/marketData";

async function fetchKlines(symbol, interval, limit = 50) {
  const raw = await fetchRawKlines(symbol, interval, limit);
  return raw.map(k => ({
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

function detectPatternsFromCandles(candles, timeframe) {
  const patterns = [];
  const n = candles.length;
  if (n < 3) return patterns;

  const c = candles[n - 1]; // آخر شمعة
  const p = candles[n - 2]; // قبل الأخيرة
  const pp = candles[n - 3]; // قبل قبل الأخيرة

  const isBullish = (x) => x.close > x.open;
  const isBearish = (x) => x.close < x.open;
  const body = (x) => Math.abs(x.close - x.open);
  const range = (x) => x.high - x.low;

  // 1. Bullish Engulfing
  if (isBearish(p) && isBullish(c) && c.open < p.close && c.close > p.open && body(c) > body(p)) {
    patterns.push({ name: "Bullish Engulfing", timeframe, confidence: 85, status: "confirmed", type: "bullish" });
  }

  // 2. Bearish Engulfing
  if (isBullish(p) && isBearish(c) && c.open > p.close && c.close < p.open && body(c) > body(p)) {
    patterns.push({ name: "Bearish Engulfing", timeframe, confidence: 83, status: "confirmed", type: "bearish" });
  }

  // 3. Doji
  if (body(c) < range(c) * 0.1 && range(c) > 0) {
    patterns.push({ name: "Doji", timeframe, confidence: 70, status: "confirmed", type: c.close >= candles[n - 5]?.close ? "bullish" : "bearish" });
  }

  // 4. Hammer
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  if (lowerWick > body(c) * 2 && upperWick < body(c) * 0.5 && isBullish(c)) {
    patterns.push({ name: "Hammer", timeframe, confidence: 75, status: "confirmed", type: "bullish" });
  }

  // 5. Shooting Star
  if (upperWick > body(c) * 2 && lowerWick < body(c) * 0.5 && isBearish(c)) {
    patterns.push({ name: "Shooting Star", timeframe, confidence: 73, status: "confirmed", type: "bearish" });
  }

  // 6. Morning Star
  if (isBearish(pp) && body(p) < body(pp) * 0.3 && isBullish(c) && c.close > (pp.open + pp.close) / 2) {
    patterns.push({ name: "Morning Star", timeframe, confidence: 82, status: "confirmed", type: "bullish" });
  }

  // 7. Evening Star
  if (isBullish(pp) && body(p) < body(pp) * 0.3 && isBearish(c) && c.close < (pp.open + pp.close) / 2) {
    patterns.push({ name: "Evening Star", timeframe, confidence: 80, status: "confirmed", type: "bearish" });
  }

  // 8. Three White Soldiers
  if (isBullish(pp) && isBullish(p) && isBullish(c) &&
    p.open > pp.open && p.close > pp.close &&
    c.open > p.open && c.close > p.close) {
    patterns.push({ name: "Three White Soldiers", timeframe, confidence: 88, status: "confirmed", type: "bullish" });
  }

  // 9. Three Black Crows
  if (isBearish(pp) && isBearish(p) && isBearish(c) &&
    p.open < pp.open && p.close < pp.close &&
    c.open < p.open && c.close < p.close) {
    patterns.push({ name: "Three Black Crows", timeframe, confidence: 86, status: "confirmed", type: "bearish" });
  }

  // 10. Double Bottom (خمسة أعمدة)
  if (n >= 10) {
    const recent = candles.slice(-10);
    const lows = recent.map(x => x.low);
    const minLow = Math.min(...lows);
    const firstBottom = lows.findIndex(l => Math.abs(l - minLow) / minLow < 0.005);
    const lastBottom = lows.lastIndexOf(Math.min(...lows.slice(firstBottom + 2)));
    if (firstBottom !== lastBottom && lastBottom > firstBottom + 2 && Math.abs(lows[firstBottom] - lows[lastBottom]) / lows[firstBottom] < 0.01) {
      patterns.push({ name: "Double Bottom", timeframe, confidence: 78, status: "forming", type: "bullish" });
    }
  }

  return patterns;
}

export default function PatternDetection({ pair = "BTC/USDT" }) {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const symbol = pair.replace("/", "");
      // فحص عدة timeframes
      const [c1h, c4h, c1d] = await Promise.all([
        fetchKlines(symbol, "1h", 20),
        fetchKlines(symbol, "4h", 20),
        fetchKlines(symbol, "1d", 20),
      ]);
      const all = [
        ...detectPatternsFromCandles(c1h, "1H"),
        ...detectPatternsFromCandles(c4h, "4H"),
        ...detectPatternsFromCandles(c1d, "1D"),
      ];
      setPatterns(all.slice(0, 6)); // أظهر أبرز 6 أنماط
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [pair]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">الأنماط المكتشفة</h3>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          {!loading && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{patterns.length} نمط</Badge>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          لا توجد أنماط واضحة حالياً
        </div>
      ) : (
        <div className="space-y-2">
          {patterns.map((pattern, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-colors ${
                pattern.type === "bullish"
                  ? "bg-trading-green/5 border-trading-green/10"
                  : "bg-trading-red/5 border-trading-red/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${pattern.type === "bullish" ? "text-trading-green" : "text-trading-red"}`}>
                    {pattern.name}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{pattern.timeframe}</Badge>
                </div>
                {pattern.status === "confirmed" ? (
                  <CheckCircle2 className="w-4 h-4 text-trading-green" />
                ) : pattern.status === "forming" ? (
                  <Clock className="w-4 h-4 text-trading-yellow" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {pattern.status === "confirmed" ? "مؤكد" : pattern.status === "forming" ? "قيد التشكل" : "مراقبة"}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pattern.confidence >= 80 ? 'bg-trading-green' :
                        pattern.confidence >= 60 ? 'bg-trading-yellow' : 'bg-trading-red'
                      }`}
                      style={{ width: `${pattern.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono">{pattern.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}