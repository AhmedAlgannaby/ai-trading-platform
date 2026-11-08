import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, ArrowUpCircle, ArrowDownCircle, Minus, Loader2, Target, Shield, TrendingUp, BookOpen, Play, CheckCircle2 } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { calcPositionSize } from "@/lib/tradeMath";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function AISignals() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: signals = [], isError: signalsError } = useQuery({
    queryKey: ["signals"],
    queryFn: () => base44.entities.Signal.list("-created_date", 20),
    initialData: [],
  });

  const { data: backtestKnowledge = [] } = useQuery({
    queryKey: ["backtest_knowledge", selectedPair],
    queryFn: () => base44.entities.BacktestResult.filter({ pair: selectedPair }, "-score", 3),
    initialData: [],
  });

  const generateSignal = async () => {
    setGenerating(true);
    try {

    // بناء سياق المعرفة المكتسبة من Backtest
    const knowledgeContext = backtestKnowledge.length > 0
      ? `\n\n🧠 معرفة مكتسبة من ${backtestKnowledge.length} اختبار تاريخي على ${selectedPair}:\n` +
        backtestKnowledge.map(r =>
          `- استراتيجية "${r.strategy}" حققت ${r.total_return_percent?.toFixed(1)}% بنسبة نجاح ${r.win_rate?.toFixed(0)}%.\n  الدروس: ${r.ai_lessons || "-"}\n  أفضل الظروف: ${r.best_conditions || "-"}\n  تجنب: ${r.avoid_conditions || "-"}`
        ).join("\n")
      : "";

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت محلل أسواق مالية متخصص في العملات الرقمية. قم بتحليل زوج ${selectedPair} وأعطني إشارة تداول.
${knowledgeContext}
      
أعطني تحليلاً يتضمن:
1. اتجاه التوصية (buy أو sell أو hold)
2. درجة الثقة (0-100)
3. سعر الدخول المقترح
4. وقف الخسارة
5. 3 أهداف لأخذ الربح
6. نسبة المخاطرة للعائد
7. ملخص التحليل (مع الإشارة لما تعلمته من الـ Backtest إن وجد)
8. المؤشرات الداعمة
9. الأنماط المكتشفة
10. الاستراتيجية المستخدمة`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["buy", "sell", "hold"] },
          confidence: { type: "number" },
          entry_price: { type: "number" },
          stop_loss: { type: "number" },
          take_profit_1: { type: "number" },
          take_profit_2: { type: "number" },
          take_profit_3: { type: "number" },
          risk_reward: { type: "string" },
          analysis_summary: { type: "string" },
          strategy: { type: "string" },
          indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "string" },
                signal: { type: "string" }
              }
            }
          },
          patterns_detected: { type: "array", items: { type: "string" } }
        }
      }
    });

    await base44.entities.Signal.create({
      pair: selectedPair,
      ...result,
      status: result?.direction === "hold" ? "expired" : "pending",
      suggested_size_percent: 5,
      timeframe: "4H",
    });

    queryClient.invalidateQueries({ queryKey: ["signals"] });
    } catch (e) {
      console.error("generateSignal failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Generate Signal */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">توليد إشارة AI</h2>
              <p className="text-xs text-muted-foreground">تحليل ذكي باستخدام بيانات السوق الحية</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {backtestKnowledge.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">مدعوم بـ {backtestKnowledge.length} تجربة تعلم</span>
              </div>
            )}
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-[160px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={generateSignal} disabled={generating} className="bg-primary hover:bg-primary/90">
              {generating ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التحليل...</>
              ) : (
                <><Zap className="w-4 h-4 ml-2" /> تحليل الآن</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {signalsError && (
        <div className="glass-card p-4 text-center text-sm text-trading-red" role="alert">
          تعذر تحميل الإشارات — تحقق من اتصال الخادم ثم أعد المحاولة.
        </div>
      )}
      {/* Signals List */}
      <AnimatePresence>
        {(signals || []).map((signal, i) => (
          <SignalCard key={signal.id} signal={signal} delay={i * 0.1} />
        ))}
      </AnimatePresence>

      {signals.length === 0 && !generating && (
        <div className="glass-card p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لم يتم توليد أي إشارات بعد</p>
          <p className="text-xs text-muted-foreground/60 mt-1">اختر زوج عملة واضغط "تحليل الآن"</p>
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal, delay }) {
  const isOpen = signal.status === "pending";
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(signal.status === "executed");
  const queryClient = useQueryClient();

  const executeTrade = async () => {
    if (!signal.entry_price || signal.direction === "hold") return;
    setExecuting(true);
    try {
      const fresh = await base44.entities.Signal.get(signal.id).catch(() => signal);
      if (fresh?.status === "executed" || fresh?.status === "expired") {
        setExecuted(fresh.status === "executed");
        return;
      }
      const { data: settings } = await base44.entities.RiskSettings.list("-created_date", 1).then(d => ({ data: d[0] })).catch(() => ({ data: null }));
      const mode = "paper"; // صفقات المتصفح ورقية دائماً — الحي عبر executeSignal فقط
      const market = settings?.market_type === "futures" ? "futures" : "spot";
      const maxLeverage = Math.min(Math.max(Number(settings?.max_leverage) || 5, 1), 125);
      const leverage = market === "futures"
        ? Math.min(Math.max(Number(settings?.default_leverage) || 1, 1), maxLeverage)
        : 1;
      if (signal.direction === "sell" && market !== "futures") {
        console.warn("sell skipped — spot cannot short");
        return;
      }
      // Size by SL distance (موحدة عبر calcPositionSize).
      const size = calcPositionSize({
        balance: settings?.paper_balance || 10000,
        riskPct: settings?.max_risk_per_trade || 2,
        entry: signal.entry_price,
        sl: signal.stop_loss,
        leverage,
      });

      await base44.entities.Trade.create({
        pair: signal.pair,
        type: signal.direction === "buy" ? "long" : "short",
        entry_price: signal.entry_price,
        current_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit_1: signal.take_profit_1,
        take_profit_2: signal.take_profit_2,
        take_profit_3: signal.take_profit_3,
        position_size: Math.round(size),
        leverage,
        confidence: signal.confidence,
        strategy: signal.strategy || "AI Signal",
        timeframe: signal.timeframe || "4H",
        status: "open",
        mode,
        market_type: market,
        pnl: 0,
        pnl_percent: 0,
        entry_reason: signal.analysis_summary?.slice(0, 200),
      });
      await base44.entities.Signal.update(signal.id, { status: "executed" });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["riskSettings"] });
      setExecuted(true);
    } catch (e) {
      console.error("executeTrade failed:", e);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass-card p-6 ${
        signal.direction === "buy" ? "glow-green" :
        signal.direction === "sell" ? "glow-red" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {signal.direction === "buy" ? (
            <div className="w-10 h-10 rounded-xl bg-trading-green/10 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-trading-green" />
            </div>
          ) : signal.direction === "sell" ? (
            <div className="w-10 h-10 rounded-xl bg-trading-red/10 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-trading-red" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-trading-yellow/10 flex items-center justify-center">
              <Minus className="w-5 h-5 text-trading-yellow" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{signal.pair}</span>
              <Badge className={`text-[10px] border-0 ${
                signal.direction === "buy" ? "bg-trading-green/10 text-trading-green" :
                signal.direction === "sell" ? "bg-trading-red/10 text-trading-red" :
                "bg-trading-yellow/10 text-trading-yellow"
              }`}>
                {signal.direction === "buy" ? "شراء" : signal.direction === "sell" ? "بيع" : "انتظار"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{signal.strategy}</span>
          </div>
        </div>

        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">الثقة</span>
            <span className={`text-lg font-bold font-mono ${
              signal.confidence >= 70 ? "text-trading-green" :
              signal.confidence >= 50 ? "text-trading-yellow" : "text-trading-red"
            }`}>
              {signal.confidence}%
            </span>
          </div>
          <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                signal.confidence >= 70 ? "bg-trading-green" :
                signal.confidence >= 50 ? "bg-trading-yellow" : "bg-trading-red"
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trade Details */}
      {signal.direction !== "hold" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <DetailBox icon={TrendingUp} label="الدخول" value={`$${signal.entry_price?.toLocaleString()}`} color="primary" />
          <DetailBox icon={Shield} label="وقف الخسارة" value={`$${signal.stop_loss?.toLocaleString()}`} color="red" />
          <DetailBox icon={Target} label="الهدف 1" value={`$${signal.take_profit_1?.toLocaleString()}`} color="green" />
          <DetailBox icon={Target} label="R:R" value={signal.risk_reward} color="cyan" />
        </div>
      )}

      {/* Analysis */}
      {signal.analysis_summary && (
        <div className="p-3 rounded-lg bg-secondary/30 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{signal.analysis_summary}</p>
        </div>
      )}

      {/* Indicators & Patterns */}
      <div className="flex flex-wrap gap-2 mb-4">
        {signal.indicators?.slice(0, 4).map((ind, j) => (
          <Badge key={j} variant="outline" className="text-[10px] py-0.5">
            {ind.name}: {ind.value}
          </Badge>
        ))}
        {signal.patterns_detected?.map((pat, j) => (
          <Badge key={`p-${j}`} className="text-[10px] py-0.5 bg-trading-purple/10 text-trading-purple border-0">
            {pat}
          </Badge>
        ))}
      </div>

      {/* Execute Button */}
      {signal.direction !== "hold" && (
        <div className="border-t border-border/30 pt-3">
          {executed ? (
            <div className="flex items-center gap-2 text-trading-green text-xs">
              <CheckCircle2 className="w-4 h-4" /> تم تنفيذ الصفقة بنجاح
            </div>
          ) : (
            <Button
              size="sm"
              className={`gap-2 ${signal.direction === "buy" ? "bg-trading-green/20 text-trading-green hover:bg-trading-green/30 border border-trading-green/30" : "bg-trading-red/20 text-trading-red hover:bg-trading-red/30 border border-trading-red/30"}`}
              onClick={executeTrade}
              disabled={executing}
            >
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {executing ? "جارٍ التنفيذ..." : `تنفيذ ${signal.direction === "buy" ? "شراء" : "بيع"} الآن`}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function DetailBox({ icon: Icon, label, value, color }) {
  const colorMap = {
    primary: "text-primary bg-primary/5",
    green: "text-trading-green bg-trading-green/5",
    red: "text-trading-red bg-trading-red/5",
    cyan: "text-trading-cyan bg-primary/5",
  };
  return (
    <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.primary}`}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] opacity-70">{label}</span>
      </div>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}