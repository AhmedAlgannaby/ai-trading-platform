import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { fetchKlines as fetchRawKlines } from "@/api/marketData";

async function fetchKlines(symbol, interval = "4h", limit = 100) {
  const raw = await fetchRawKlines(symbol, interval, limit);
  return raw.map(k => ({
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

function calcLevels(candles) {
  if (!candles.length) return { levels: [], fib: [] };

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const current = candles[candles.length - 1].close;
  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);

  // مستويات دعم ومقاومة بسيطة مبنية على أعلى/أدنى نقاط
  const range = swingHigh - swingLow;
  const r3 = parseFloat((swingHigh + range * 0.1).toFixed(2));
  const r2 = parseFloat((swingHigh).toFixed(2));
  const r1 = parseFloat((swingHigh - range * 0.2).toFixed(2));
  const s1 = parseFloat((swingLow + range * 0.2).toFixed(2));
  const s2 = parseFloat((swingLow).toFixed(2));
  const s3 = parseFloat((swingLow - range * 0.1).toFixed(2));

  const levels = [
    { price: r3, type: "resistance", strength: 3, label: "R3" },
    { price: r2, type: "resistance", strength: 2, label: "R2" },
    { price: r1, type: "resistance", strength: 1, label: "R1" },
    { price: current, type: "current", strength: 0, label: "السعر الحالي" },
    { price: s1, type: "support", strength: 1, label: "S1" },
    { price: s2, type: "support", strength: 2, label: "S2" },
    { price: s3, type: "support", strength: 3, label: "S3" },
  ].sort((a, b) => b.price - a.price);

  // مستويات فيبوناتشي
  const fib = [
    { level: "0.0%", price: parseFloat(swingHigh.toFixed(2)) },
    { level: "23.6%", price: parseFloat((swingHigh - range * 0.236).toFixed(2)) },
    { level: "38.2%", price: parseFloat((swingHigh - range * 0.382).toFixed(2)) },
    { level: "50.0%", price: parseFloat((swingHigh - range * 0.5).toFixed(2)) },
    { level: "61.8%", price: parseFloat((swingHigh - range * 0.618).toFixed(2)) },
    { level: "78.6%", price: parseFloat((swingHigh - range * 0.786).toFixed(2)) },
    { level: "100%", price: parseFloat(swingLow.toFixed(2)) },
  ];

  return { levels, fib };
}

export default function SupportResistance({ pair = "BTC/USDT" }) {
  const [levels, setLevels] = useState([]);
  const [fib, setFib] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const symbol = pair.replace("/", "");
      const candles = await fetchKlines(symbol, "4h", 100);
      const result = calcLevels(candles);
      setLevels(result.levels);
      setFib(result.fib);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [pair]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60_000); // تحديث كل 5 دقائق
    return () => clearInterval(t);
  }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">الدعم والمقاومة</h3>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => <div key={i} className="h-8 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="space-y-1.5 mb-6">
            {levels.map((level) => (
              <div
                key={level.label}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  level.type === "current"
                    ? "bg-primary/10 border border-primary/30"
                    : level.type === "resistance"
                    ? "bg-trading-red/5"
                    : "bg-trading-green/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    level.type === "current" ? "text-primary" :
                    level.type === "resistance" ? "text-trading-red" : "text-trading-green"
                  }`}>{level.label}</span>
                  {level.strength > 0 && (
                    <div className="flex gap-0.5">
                      {Array(level.strength).fill(0).map((_, j) => (
                        <span key={j} className={`w-1.5 h-1.5 rounded-full ${
                          level.type === "resistance" ? "bg-trading-red/60" : "bg-trading-green/60"
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-mono font-medium">${level.price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-medium text-muted-foreground mb-2">مستويات فيبوناتشي</h4>
          <div className="space-y-1">
            {fib.map((f) => (
              <div key={f.level} className="flex items-center justify-between p-1.5 text-[11px]">
                <span className="text-trading-purple font-medium">{f.level}</span>
                <div className="flex-1 mx-3 border-t border-dashed border-border/50" />
                <span className="font-mono text-muted-foreground">${f.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}