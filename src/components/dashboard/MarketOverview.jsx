import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { fetchTickers } from "@/api/marketData";

const COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin", abbr: "BTC", color: "#F7931A" },
  { symbol: "ETHUSDT", name: "Ethereum", abbr: "ETH", color: "#627EEA" },
  { symbol: "BNBUSDT", name: "BNB", abbr: "BNB", color: "#F3BA2F" },
  { symbol: "SOLUSDT", name: "Solana", abbr: "SOL", color: "#9945FF" },
  { symbol: "XRPUSDT", name: "Ripple", abbr: "XRP", color: "#23292F" },
  { symbol: "ADAUSDT", name: "Cardano", abbr: "ADA", color: "#0033AD" },
];

export default function MarketOverview() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = async () => {
    try {
      const data = await fetchTickers(COINS.map(c => c.symbol));
      const map = {};
      data.forEach(t => { map[t.symbol] = t; });
      setPrices(map);
      setLastUpdated(new Date());
    } catch {
      // إذا فشل، نبقى على القيم السابقة
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">نظرة عامة على السوق</h3>
        <div className="flex items-center gap-2">
          {loading ? (
            <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-trading-green animate-pulse" />
              <span className="text-[10px] text-trading-green font-medium">بيانات حية</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {COINS.map((coin) => {
          const ticker = prices[coin.symbol];
          const price = ticker ? parseFloat(ticker.lastPrice) : null;
          const change = ticker ? parseFloat(ticker.priceChangePercent) : null;

          return (
            <div
              key={coin.symbol}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: coin.color }}
                >
                  {coin.abbr.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{coin.abbr}/USDT</p>
                  <p className="text-[11px] text-muted-foreground">{coin.name}</p>
                </div>
              </div>
              <div className="text-left">
                {price !== null ? (
                  <>
                    <p className="text-sm font-mono font-medium text-foreground">
                      ${price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${
                      change >= 0 ? 'text-trading-green' : 'text-trading-red'
                    }`}>
                      {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{change >= 0 ? '+' : ''}{change?.toFixed(2)}%</span>
                    </div>
                  </>
                ) : (
                  <div className="w-16 h-4 bg-secondary rounded animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
        </p>
      )}
    </motion.div>
  );
}