import React, { useEffect, useState, useRef, useCallback } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw } from "lucide-react";
import { fetchKlines as fetchRawKlines } from "@/api/marketData";

async function fetchKlines(symbol, interval, limit = 100) {
  const raw = await fetchRawKlines(symbol, interval, limit);
  return raw.map(k => ({
    time: new Date(k[0]).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    price: parseFloat(k[4]),
  }));
}

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0]?.close || 0;
  return data.map((d, i) => {
    if (i === 0) { ema = d.close; return parseFloat(ema.toFixed(4)); }
    ema = d.close * k + ema * (1 - k);
    return parseFloat(ema.toFixed(4));
  });
}

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];
const INTERVAL_LABELS = ["1م", "5م", "15م", "1س", "4س", "1ي"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="glass-card p-3 border border-border/50 text-[11px]">
      <p className="text-muted-foreground mb-1">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">الافتتاح:</span>
        <span className="font-mono">${d?.open?.toLocaleString()}</span>
        <span className="text-muted-foreground">الأعلى:</span>
        <span className="font-mono text-trading-green">${d?.high?.toLocaleString()}</span>
        <span className="text-muted-foreground">الأدنى:</span>
        <span className="font-mono text-trading-red">${d?.low?.toLocaleString()}</span>
        <span className="text-muted-foreground">الإغلاق:</span>
        <span className="font-mono font-bold">${d?.close?.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default function PriceChart({ pair = "BTC/USDT", onPriceUpdate }) {
  const [data, setData] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  // نحفظ آخر قيمة أرسلناها لـ parent لمنع infinite loop
  const lastSentPrice = useRef(null);

  const symbol = pair.replace("/", "");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchKlines(symbol, selectedInterval, 100);
      const ema20 = calcEMA(raw, 20);
      const ema50 = calcEMA(raw, 50);
      const processed = raw.map((d, i) => ({ ...d, ema20: ema20[i], ema50: ema50[i] }));
      setData(processed);

      const lastPrice = processed[processed.length - 1]?.close;
      // أرسل السعر فقط إذا تغيّر لمنع re-render لا نهائي
      if (lastPrice && lastPrice !== lastSentPrice.current) {
        lastSentPrice.current = lastPrice;
        onPriceUpdate?.(lastPrice);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedInterval]); // onPriceUpdate مقصود إغفاله

  useEffect(() => {
    loadData();
    timerRef.current = setInterval(loadData, 60_000);
    return () => clearInterval(timerRef.current);
  }, [loadData]);

  const lastClose = data[data.length - 1]?.close;
  const firstClose = data[0]?.close;
  const changePct = firstClose && lastClose ? (((lastClose - firstClose) / firstClose) * 100).toFixed(2) : null;
  const isProfit = changePct !== null && parseFloat(changePct) >= 0;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">{pair}</h3>
          {loading ? (
            <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <>
              <span className="text-lg font-mono font-bold text-foreground">
                ${lastClose?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: lastClose < 1 ? 6 : 2 })}
              </span>
              {changePct && (
                <span className={`text-xs font-medium ${isProfit ? 'text-trading-green' : 'text-trading-red'}`}>
                  {isProfit ? '+' : ''}{changePct}%
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((tf, i) => (
            <button
              key={tf}
              onClick={() => setSelectedInterval(tf)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                selectedInterval === tf
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {INTERVAL_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 12%)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: 'hsl(215, 20%, 45%)' }}
              axisLine={false}
              tickLine={false}
              interval={15}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(215, 20%, 45%)' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fill="url(#priceGrad)"
            />
            <Line type="monotone" dataKey="ema20" stroke="hsl(45, 93%, 58%)" strokeWidth={1} dot={false} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="ema50" stroke="hsl(262, 83%, 58%)" strokeWidth={1} dot={false} strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-primary rounded" />
          <span>السعر</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, hsl(45,93%,58%) 0, hsl(45,93%,58%) 3px, transparent 3px, transparent 6px)" }} />
          <span>EMA 20</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, hsl(262,83%,58%) 0, hsl(262,83%,58%) 3px, transparent 3px, transparent 6px)" }} />
          <span>EMA 50</span>
        </div>
      </div>
    </div>
  );
}