import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Play, Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIParamSuggester from "./AIParamSuggester";
import { TRADING_SYMBOLS } from "@/lib/pairs";

const PAIRS = TRADING_SYMBOLS;

export default function BacktestModal({ strategy, onClose, onComplete }) {
  const [params, setParams] = useState({
    pair: "BTCUSDT",
    timeframe: strategy?.timeframes?.[0] || "4h",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    initial_balance: 10000,
    risk_per_trade: 2,
    stop_loss_percent: 2,
    take_profit_percent: 6,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const applyAISuggestion = (ai) => {
    setParams(p => ({
      ...p,
      timeframe: ai.timeframe || p.timeframe,
      risk_per_trade: ai.risk_per_trade ?? p.risk_per_trade,
      stop_loss_percent: ai.stop_loss ?? p.stop_loss_percent,
      take_profit_percent: ai.take_profit ?? p.take_profit_percent,
    }));
  };

  // ربط فئة القالب القديم (بلا spec_id) بعائلة قابلة للتنفيذ
  const specForCategory = (cat) => ({
    trend_following: 'macd_wave', mean_reversion: 'rsi_divergence',
    breakout: 'breakout_sniper', scalping: 'stoch_scalper',
    swing: 'swing_master', ai_hybrid: 'ai_sentiment_hybrid',
  }[cat] || 'quant_hybrid');

  const runBacktest = async () => {
    setRunning(true);
    setResult(null);
    try {
    // محرك حقيقي (Phase 3) — كان سابقاً تأليف LLM لأرقام وهمية
    const apiPair = params.pair.includes('/') ? params.pair : params.pair.replace(/(USDT|BTC|ETH|BNB)$/, '/$1');
    const res = await fetch('/api/brain/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pair: apiPair,
        interval: params.timeframe,
        limit: 1000,
        initialBalance: params.initialBalance,
        riskPerTrade: params.riskPerTrade,
        stopLossPercent: params.stopLossPercent,
        takeProfitPercent: params.takeProfitPercent,
        strategy: strategy.name,
        strategyId: strategy.spec_id || specForCategory(strategy.category),
        save: false,
      }),
    }).then((r) => r.json());
    if (res.error) throw new Error(res.error);
    // توافق أسماء العرض القديم مع حقول المحرك
    res.avg_win_percent = res.avg_win;
    res.avg_loss_percent = res.avg_loss;
    res.summary = res.ai_lessons;
    res.strengths = res.best_conditions ? [res.best_conditions] : [];
    res.weaknesses = res.avoid_conditions ? [res.avoid_conditions] : [];
    setResult(res);

    // Save to BacktestResult entity (مصدر حقيقي: engine — ليست أرقام LLM)
    await base44.entities.BacktestResult.create({
      pair: apiPair,
      strategy: strategy.name,
      strategy_id: res.strategy_id || strategy.spec_id || null,
      source: 'engine',
      start_date: params.start_date,
      end_date: params.end_date,
      initial_balance: params.initialBalance,
      risk_per_trade: params.riskPerTrade,
      stop_loss_percent: params.stopLossPercent,
      take_profit_percent: params.takeProfitPercent,
      total_return_percent: res.total_return_percent,
      win_rate: res.win_rate,
      total_trades: res.total_trades,
      sharpe_ratio: res.sharpe_ratio,
      max_drawdown: res.max_drawdown,
      profit_factor: res.profit_factor,
      avg_win: res.avg_win,
      avg_loss: res.avg_loss,
      ai_lessons: res.ai_lessons,
      best_conditions: res.best_conditions,
      avoid_conditions: res.avoid_conditions,
      score: res.score,
    });

    // Increment usage
    await base44.entities.StrategyTemplate.update(strategy.id, {
      times_used: (strategy.times_used || 0) + 1,
    });

    } catch (e) {
      console.error("engine backtest failed:", e);
    } finally {
      setRunning(false);
    }
    onComplete?.();
  };

  const isProfit = result?.total_return_percent > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-base">🧪 اختبار: {strategy.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{strategy.description}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {!result ? (
          <>
            {/* AI Suggester */}
            <AIParamSuggester strategy={strategy} pair={params.pair} onApply={applyAISuggestion} />

            {/* Params */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الزوج</Label>
                <Select value={params.pair} onValueChange={v => set("pair", v)}>
                  <SelectTrigger className="bg-secondary border-0 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الإطار الزمني</Label>
                <Select value={params.timeframe} onValueChange={v => set("timeframe", v)}>
                  <SelectTrigger className="bg-secondary border-0 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(strategy.timeframes?.length ? strategy.timeframes : ["15m","1h","4h","1d"]).map(tf => (
                      <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ البداية</Label>
                <Input type="date" value={params.start_date} onChange={e => set("start_date", e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ النهاية</Label>
                <Input type="date" value={params.end_date} onChange={e => set("end_date", e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الرصيد الأولي ($)</Label>
                <Input type="number" value={params.initial_balance} onChange={e => set("initial_balance", +e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">خطر / صفقة (%)</Label>
                <Input type="number" value={params.risk_per_trade} onChange={e => set("risk_per_trade", +e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">وقف الخسارة (%)</Label>
                <Input type="number" value={params.stop_loss_percent} onChange={e => set("stop_loss_percent", +e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">جني الربح (%)</Label>
                <Input type="number" value={params.take_profit_percent} onChange={e => set("take_profit_percent", +e.target.value)}
                  className="bg-secondary border-0 h-9 text-sm" />
              </div>
            </div>

            <Button className="w-full gap-2" onClick={runBacktest} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "جارٍ تشغيل الـ Backtest..." : "تشغيل الاختبار"}
            </Button>
          </>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Score */}
              <div className={`rounded-xl p-4 text-center ${isProfit ? 'bg-trading-green/10 border border-trading-green/20' : 'bg-trading-red/10 border border-trading-red/20'}`}>
                <p className="text-xs text-muted-foreground mb-1">إجمالي العائد</p>
                <p className={`text-4xl font-bold font-mono ${isProfit ? 'text-trading-green' : 'text-trading-red'}`}>
                  {isProfit ? '+' : ''}{result.total_return_percent?.toFixed(2)}%
                </p>
                <p className="text-sm mt-1">
                  ${params.initial_balance.toLocaleString()} → <span className="font-bold">${result.final_balance?.toLocaleString()}</span>
                </p>
                <Badge className="mt-2 bg-secondary text-foreground border-0">نقاط الاستراتيجية: {result.score}/100</Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Win Rate", value: `${result.win_rate?.toFixed(1)}%`, color: "text-trading-green" },
                  { label: "الصفقات", value: result.total_trades, color: "text-foreground" },
                  { label: "Profit Factor", value: result.profit_factor?.toFixed(2), color: "text-trading-cyan" },
                  { label: "Max Drawdown", value: `-${result.max_drawdown?.toFixed(1)}%`, color: "text-trading-red" },
                  { label: "Sharpe Ratio", value: result.sharpe_ratio?.toFixed(2), color: "text-trading-yellow" },
                  { label: "متوسط الربح", value: `+${result.avg_win_percent?.toFixed(1)}%`, color: "text-trading-green" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary/60 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {result.summary && <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/40 rounded-lg p-3">{result.summary}</p>}

              {/* Strengths / Weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                {result.strengths?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-trading-green flex items-center gap-1"><TrendingUp className="w-3 h-3" /> نقاط قوة</p>
                    {result.strengths.map((s, i) => <p key={i} className="text-[11px] text-muted-foreground">✓ {s}</p>)}
                  </div>
                )}
                {result.weaknesses?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-trading-red flex items-center gap-1"><TrendingDown className="w-3 h-3" /> نقاط ضعف</p>
                    {result.weaknesses.map((w, i) => <p key={i} className="text-[11px] text-muted-foreground">✗ {w}</p>)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setResult(null)}>
                  تعديل المعاملات
                </Button>
                <Button size="sm" className="flex-1" onClick={onClose}>
                  <BarChart3 className="w-4 h-4 mr-1" /> حفظ وإغلاق
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}