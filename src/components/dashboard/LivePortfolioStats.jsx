import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Wallet, Target, BarChart3, RefreshCw, Zap, WifiOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchBinanceAccount,
  fetchBinanceTicker,
  calcPortfolioFromAccount,
} from "@/components/binanceService";

const StatCard = ({ icon: Icon, label, value, subValue, breakdown, color, delay, live }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card p-4 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: `hsl(var(--trading-${color}))` }} />
    {live && (
      <span className="absolute top-2 right-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-trading-green animate-pulse" />
        <span className="text-[9px] text-trading-green font-medium">LIVE</span>
      </span>
    )}
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold font-mono">{value}</p>
        {subValue && (
          <p className={`text-xs font-medium mt-1 ${
            subValue.startsWith('+') ? 'text-trading-green' : subValue.startsWith('-') ? 'text-trading-red' : 'text-muted-foreground'
          }`}>
            {subValue}
          </p>
        )}
        {breakdown && (
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{breakdown}</p>
        )}
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--trading-${color}) / 0.1)` }}>
        <Icon className="w-4 h-4" style={{ color: `hsl(var(--trading-${color}))` }} />
      </div>
    </div>
  </motion.div>
);

const signedMoney = (v) => {
  const n = Number(v) || 0;
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`;
};

export default function LivePortfolioStats({ portfolio: fallbackPortfolio }) {
  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // التفعيل التلقائي حسب وضع التداول (المفاتيح تبقى على السيرفر)
    loadRiskSettings();
  }, []);

  const loadRiskSettings = async () => {
    try {
      const list = await base44.entities.RiskSettings.list("-created_date", 1);
      const mode = list[0]?.trading_mode;
      if (mode === "live") {
        setIsLive(true);
        fetchLiveData();
      }
    } catch {}
  };

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [account, tickers] = await Promise.all([
        fetchBinanceAccount(),
        fetchBinanceTicker(["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","ADAUSDT","XRPUSDT"]),
      ]);
      const portfolio = calcPortfolioFromAccount(account, tickers);
      setLiveData({ ...portfolio, tickers });
    } catch (e) {
      setError(e.message || "خطأ في الاتصال بـ Binance");
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleLive = async () => {
    if (!isLive) {
      setIsLive(true);
      await fetchLiveData();
    } else {
      setIsLive(false);
      setLiveData(null);
      setError(null);
    }
  };

  const portfolio = isLive && liveData
    ? {
        total_balance: liveData.total_balance,
        available_balance: liveData.available_balance,
        total_pnl: fallbackPortfolio?.total_pnl || 0,
        total_pnl_percent: fallbackPortfolio?.total_pnl_percent || 0,
        daily_pnl: fallbackPortfolio?.daily_pnl || 0,
        daily_pnl_percent: fallbackPortfolio?.daily_pnl_percent || 0,
        win_rate: fallbackPortfolio?.win_rate || 0,
        winning_trades: fallbackPortfolio?.winning_trades || 0,
        losing_trades: fallbackPortfolio?.losing_trades || 0,
        max_drawdown: fallbackPortfolio?.max_drawdown || 0,
        sharpe_ratio: fallbackPortfolio?.sharpe_ratio || 0,
      }
    : fallbackPortfolio;

  const stats = [
    {
      icon: Wallet,
      label: isLive ? "الرصيد الحقيقي (Binance)" : "إجمالي الرصيد",
      value: `$${(portfolio?.total_balance || 0).toLocaleString()}`,
      subValue: isLive
        ? `متاح: $${(portfolio?.available_balance || 0).toLocaleString()}`
        : `${(portfolio?.total_pnl_percent || 0) >= 0 ? '+' : ''}${(portfolio?.total_pnl_percent || 0).toFixed(2)}%`,
      color: "cyan",
      live: isLive,
    },
    {
      icon: (portfolio?.daily_pnl || 0) >= 0 ? TrendingUp : TrendingDown,
      label: "الربح اليومي",
      value: `${(portfolio?.daily_pnl || 0) >= 0 ? '+' : '-'}$${Math.abs(portfolio?.daily_pnl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      subValue: `${(portfolio?.daily_pnl || 0) >= 0 ? '+' : '-'}${Math.abs(portfolio?.daily_pnl_percent || 0).toFixed(2)}%`,
      breakdown: `محقق ${signedMoney(portfolio?.daily_realized)} • عائم ${signedMoney(portfolio?.daily_unrealized)}`,
      color: (portfolio?.daily_pnl || 0) >= 0 ? "green" : "red",
    },
    {
      icon: Target,
      label: "نسبة النجاح",
      value: `${(portfolio?.win_rate || 0).toFixed(1)}%`,
      subValue: `${portfolio?.winning_trades || 0}W / ${portfolio?.losing_trades || 0}L`,
      color: "yellow",
    },
    {
      icon: BarChart3,
      label: "Sharpe Ratio",
      value: (portfolio?.sharpe_ratio || 0).toFixed(2),
      subValue: `Max DD: ${(portfolio?.max_drawdown || 0).toFixed(1)}%`,
      color: "purple",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Live Toggle Bar */}
      <div className="flex items-center justify-between glass-card px-4 py-3">
        <div className="flex items-center gap-3">
          {isLive ? (
            <div className="flex items-center gap-2 text-trading-green">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">بيانات حقيقية من Binance</span>
              <Badge className="bg-trading-green/20 text-trading-green border-0 text-[10px]">LIVE</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">بيانات تجريبية</span>
              <Badge variant="outline" className="text-[10px]">PAPER</Badge>
            </div>
          )}
          {error && <span className="text-xs text-trading-red">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchLiveData()}
              disabled={loading}
              className="h-7 text-xs gap-1.5"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              تحديث
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{isLive ? "Live" : "Paper"}</span>
            <button
              onClick={handleToggleLive}
              disabled={loading}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                isLive ? 'bg-trading-green' : 'bg-secondary'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                isLive ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 0.05} />
        ))}
      </div>

      {/* Live Assets Breakdown */}
      {isLive && liveData?.assets && liveData.assets.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">الأصول الحقيقية في المحفظة</p>
          <div className="flex flex-wrap gap-2">
            {liveData.assets.slice(0, 12).map(b => {
              const amount = parseFloat(b.free) + parseFloat(b.locked);
              const price = liveData.priceMap?.[`${b.asset}USDT`] || (b.asset === 'USDT' ? 1 : 0);
              const usdtVal = (amount * price).toFixed(2);
              return (
                <div key={b.asset} className="flex items-center gap-1.5 bg-secondary px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="font-semibold text-foreground">{b.asset}</span>
                  <span className="text-muted-foreground">{parseFloat(amount.toFixed(6))}</span>
                  <span className="text-trading-cyan">≈ ${usdtVal}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}