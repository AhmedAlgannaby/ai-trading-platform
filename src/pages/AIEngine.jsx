import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { calcPositionSize } from "@/lib/tradeMath";
import {
  Brain, Zap, Loader2, Target,
  Shield, Cpu, Activity, Layers, Play, CheckCircle2
} from "lucide-react";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;
const MODELS = [
  { id: "ensemble", name: "AI Ensemble (كل النماذج)", desc: "LSTM + XGBoost + Transformer" },
  { id: "lstm", name: "LSTM Deep Learning", desc: "شبكة عصبية تكرارية" },
  { id: "transformer", name: "Transformer Model", desc: "نموذج الانتباه المتعدد" },
  { id: "xgboost", name: "XGBoost + Features", desc: "تعلم آلي كلاسيكي" },
  { id: "rl", name: "Reinforcement Learning", desc: "وكيل Q-Learning" },
];

export default function AIEngine() {
  const [pair, setPair] = useState("BTC/USDT");
  const [model, setModel] = useState("ensemble");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت نظام AI تداول متقدم. قم بتحليل شامل لزوج ${pair} باستخدام نموذج ${model}.

قدّم تحليلاً يشمل:
1. توقع السعر خلال 24 ساعة و 7 أيام
2. تقييم كل نموذج على حدة (LSTM, Transformer, XGBoost, RL) بدرجة من 100
3. مؤشرات الثقة لكل بُعد (trend, momentum, volume, sentiment, on_chain)
4. أقوى 5 signals مدعومة بالبيانات
5. تحليل المخاطر (high/medium/low) مع السبب
6. توصية نهائية بالدخول أو الانتظار مع مستويات دقيقة`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_signal: { type: "string", enum: ["strong_buy", "buy", "hold", "sell", "strong_sell"] },
          overall_confidence: { type: "number" },
          price_24h: { type: "number" },
          price_7d: { type: "number" },
          current_price: { type: "number" },
          price_24h_change_pct: { type: "number" },
          price_7d_change_pct: { type: "number" },
          models: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                signal: { type: "string" },
                confidence: { type: "number" },
                weight: { type: "number" }
              }
            }
          },
          dimensions: {
            type: "object",
            properties: {
              trend: { type: "number" },
              momentum: { type: "number" },
              volume: { type: "number" },
              sentiment: { type: "number" },
              on_chain: { type: "number" },
              risk: { type: "number" }
            }
          },
          top_signals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                signal: { type: "string" },
                strength: { type: "number" },
                type: { type: "string" }
              }
            }
          },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          risk_reason: { type: "string" },
          entry_price: { type: "number" },
          stop_loss: { type: "number" },
          take_profit_1: { type: "number" },
          take_profit_2: { type: "number" },
          summary: { type: "string" }
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Controls */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">محرك AI المتقدم</h2>
              <p className="text-xs text-muted-foreground">تحليل متعدد النماذج • LSTM • Transformer • XGBoost • RL</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="w-[150px] bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[220px] bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div>
                      <p className="text-xs font-medium">{m.name}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAnalysis} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التحليل...</>
                : <><Cpu className="w-4 h-4 ml-2" />تشغيل AI</>
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: "0.3s" }} />
              <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">تحليل البيانات عبر نماذج AI متعددة...</p>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              {["LSTM", "Transformer", "XGBoost", "RL"].map((m, i) => (
                <span key={m} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Signal Banner */}
            <SignalBanner result={result} pair={pair} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <DimensionsRadar dimensions={result.dimensions} />
              {/* Models Breakdown */}
              <ModelsBreakdown models={result.models} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Signals */}
              <TopSignals signals={result.top_signals} />
              {/* Entry Plan */}
              <EntryPlan result={result} pair={pair} />
            </div>

            {/* Summary */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">ملخص التحليل</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <div className="glass-card p-16 text-center">
          <Brain className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">اختر زوجاً ونموذجاً ثم اضغط "تشغيل AI" للحصول على تحليل متعدد النماذج</p>
        </div>
      )}
    </div>
  );
}

function SignalBanner({ result, pair }) {
  const signalConfig = {
    strong_buy:  { label: "شراء قوي جداً",  color: "text-trading-green", bg: "bg-trading-green/10 border-trading-green/30" },
    buy:         { label: "شراء",            color: "text-trading-green", bg: "bg-trading-green/5 border-trading-green/20" },
    hold:        { label: "انتظار",          color: "text-trading-yellow", bg: "bg-trading-yellow/5 border-trading-yellow/20" },
    sell:        { label: "بيع",             color: "text-trading-red",   bg: "bg-trading-red/5 border-trading-red/20" },
    strong_sell: { label: "بيع قوي جداً",   color: "text-trading-red",   bg: "bg-trading-red/10 border-trading-red/30" },
  };
  const cfg = signalConfig[result.overall_signal] || signalConfig.hold;

  return (
    <div className={`glass-card p-6 border ${cfg.bg}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
        <div>
          <p className="text-xs text-muted-foreground mb-1">الإشارة النهائية</p>
          <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{pair}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">الثقة الكلية</p>
          <p className="text-2xl font-bold font-mono">{result.overall_confidence}%</p>
          <div className="w-full h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${cfg.color.replace("text-", "bg-")}`} style={{ width: `${result.overall_confidence}%` }} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">توقع 24 ساعة</p>
          <p className={`text-xl font-bold font-mono ${result.price_24h_change_pct >= 0 ? "text-trading-green" : "text-trading-red"}`}>
            {result.price_24h_change_pct >= 0 ? "+" : ""}{result.price_24h_change_pct?.toFixed(2)}%
          </p>
          <p className="text-xs font-mono text-muted-foreground">${result.price_24h?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">توقع 7 أيام</p>
          <p className={`text-xl font-bold font-mono ${result.price_7d_change_pct >= 0 ? "text-trading-green" : "text-trading-red"}`}>
            {result.price_7d_change_pct >= 0 ? "+" : ""}{result.price_7d_change_pct?.toFixed(2)}%
          </p>
          <p className="text-xs font-mono text-muted-foreground">${result.price_7d?.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function DimensionsRadar({ dimensions }) {
  if (!dimensions) return null;
  const data = [
    { dim: "الاتجاه", value: dimensions.trend },
    { dim: "الزخم", value: dimensions.momentum },
    { dim: "الحجم", value: dimensions.volume },
    { dim: "المشاعر", value: dimensions.sentiment },
    { dim: "On-Chain", value: dimensions.on_chain },
    { dim: "المخاطر", value: 100 - dimensions.risk },
  ];
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" /> أبعاد التحليل
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(222,30%,16%)" />
            <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "hsl(215,20%,65%)" }} />
            <Radar dataKey="value" stroke="hsl(199,89%,48%)" fill="hsl(199,89%,48%)" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ModelsBreakdown({ models }) {
  if (!models?.length) return null;
  const signalColor = (s) => {
    if (s?.includes("buy") || s === "long") return "text-trading-green";
    if (s?.includes("sell") || s === "short") return "text-trading-red";
    return "text-trading-yellow";
  };
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" /> أداء النماذج
      </h3>
      <div className="space-y-3">
        {models.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-xs text-muted-foreground truncate">{m.name}</div>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${m.confidence}%` }}
              />
            </div>
            <span className="text-[11px] font-mono w-10 text-right">{m.confidence}%</span>
            <span className={`text-[10px] font-medium w-14 text-right ${signalColor(m.signal)}`}>{m.signal}</span>
          </div>
        ))}
      </div>
      <div className="h-[120px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={models} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="hsl(222,30%,14%)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(215,20%,50%)" }} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(215,20%,50%)" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(222,30%,16%)", borderRadius: "8px", fontSize: "11px" }} />
            <Bar dataKey="confidence" radius={[3, 3, 0, 0]}>
              {models.map((m, i) => (
                <Cell key={i} fill={m.confidence >= 70 ? "hsl(142,71%,45%)" : m.confidence >= 50 ? "hsl(45,93%,58%)" : "hsl(0,84%,60%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopSignals({ signals }) {
  if (!signals?.length) return null;
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-trading-yellow" /> أقوى الإشارات
      </h3>
      <div className="space-y-2">
        {signals.map((s, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
            s.type === "bullish" ? "bg-trading-green/5 border border-trading-green/10" :
            s.type === "bearish" ? "bg-trading-red/5 border border-trading-red/10" :
            "bg-secondary/30"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : "🥉"}</span>
              <span className="text-xs font-medium">{s.signal}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.type === "bullish" ? "bg-trading-green" : s.type === "bearish" ? "bg-trading-red" : "bg-trading-yellow"}`}
                  style={{ width: `${s.strength}%` }}
                />
              </div>
              <span className="text-[10px] font-mono">{s.strength}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryPlan({ result, pair }) {
  const [executing, setExecuting] = React.useState(false);
  const [executed, setExecuted] = React.useState(false);
  const riskColors = { low: "text-trading-green", medium: "text-trading-yellow", high: "text-trading-red" };
  const isBuy = ["strong_buy","buy"].includes(result.overall_signal);
  const isSell = ["strong_sell","sell"].includes(result.overall_signal);

  const executeTrade = async () => {
    if (!result.entry_price || (!isBuy && !isSell)) return;
    setExecuting(true);
    try {
      const settings = await base44.entities.RiskSettings.list("-created_date", 1).then(d => d[0]).catch(() => null);
      // صفقات المتصفح ورقية دائماً — الحي عبر executeSignal على السيرفر فقط
      const market = settings?.market_type === "futures" ? "futures" : "spot";
      if (isSell && market !== "futures") {
        console.error("executeTrade refused: spot cannot short");
        return;
      }
      const size = calcPositionSize({
        balance: settings?.paper_balance || 10000,
        riskPct: settings?.max_risk_per_trade || 2,
        entry: result.entry_price,
        sl: result.stop_loss,
        leverage: settings?.default_leverage || 1,
      });
      await base44.entities.Trade.create({
        pair,
        type: isBuy ? "long" : "short",
        entry_price: result.entry_price,
        current_price: result.entry_price,
        stop_loss: result.stop_loss,
        take_profit_1: result.take_profit_1,
        take_profit_2: result.take_profit_2,
        position_size: Math.round(size),
        leverage: settings?.default_leverage || 1,
        confidence: result.overall_confidence,
        strategy: "AI Engine",
        status: "open",
        mode: "paper",
        market_type: market,
        pnl: 0, pnl_percent: 0,
        entry_reason: result.summary?.slice(0, 200),
      });
      setExecuted(true);
    } catch (e) {
      console.error("executeTrade failed:", e.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Target className="w-4 h-4 text-trading-green" /> خطة الدخول
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-[10px] text-muted-foreground">سعر الدخول</p>
          <p className="text-sm font-mono font-bold text-primary">${result.entry_price?.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-trading-red/5 border border-trading-red/10">
          <p className="text-[10px] text-muted-foreground">وقف الخسارة</p>
          <p className="text-sm font-mono font-bold text-trading-red">${result.stop_loss?.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-trading-green/5 border border-trading-green/10">
          <p className="text-[10px] text-muted-foreground">الهدف 1</p>
          <p className="text-sm font-mono font-bold text-trading-green">${result.take_profit_1?.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-trading-green/5 border border-trading-green/10">
          <p className="text-[10px] text-muted-foreground">الهدف 2</p>
          <p className="text-sm font-mono font-bold text-trading-green">${result.take_profit_2?.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-3 p-3 rounded-lg bg-secondary/30 flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground">مستوى المخاطرة</p>
          <p className={`text-xs font-medium ${riskColors[result.risk_level]}`}>{result.risk_level === "low" ? "منخفض" : result.risk_level === "medium" ? "متوسط" : "مرتفع"} — {result.risk_reason}</p>
        </div>
      </div>
      {(isBuy || isSell) && (
        <div className="mt-3 border-t border-border/30 pt-3">
          {executed ? (
            <div className="flex items-center gap-2 text-trading-green text-xs">
              <CheckCircle2 className="w-4 h-4" /> تم فتح الصفقة بنجاح في الصفقات
            </div>
          ) : (
            <Button
              size="sm" className={`w-full gap-2 ${isBuy ? "bg-trading-green/20 text-trading-green hover:bg-trading-green/30 border border-trading-green/30" : "bg-trading-red/20 text-trading-red hover:bg-trading-red/30 border border-trading-red/30"}`}
              onClick={executeTrade} disabled={executing}
            >
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {executing ? "جارٍ التنفيذ..." : `تنفيذ ${isBuy ? "شراء" : "بيع"} الآن`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}