import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { BarChart3, Play, Loader2, TrendingUp, TrendingDown, Target, Shield, Brain, BookOpen, CheckCircle2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import AIOptimalParams from "@/components/backtesting/AIOptimalParams";
import AISignalBacktest from "@/components/backtesting/AISignalBacktest";
import { TRADING_PAIRS } from "@/lib/pairs";

const STRATEGIES = [
  { id: "ema_cross", name: "EMA Crossover", desc: "تقاطع EMA 9/21" },
  { id: "rsi_bb", name: "RSI + Bollinger Bands", desc: "RSI مع نطاقات بولينجر" },
  { id: "macd_trend", name: "MACD Trend Following", desc: "تتبع الاتجاه عبر MACD" },
  { id: "smc", name: "Smart Money Concepts", desc: "مفاهيم الأموال الذكية" },
  { id: "ai_ensemble", name: "AI Ensemble", desc: "دمج نماذج الذكاء الاصطناعي" },
];

export default function Backtesting() {
  const [config, setConfig] = useState({
    pair: "BTC/USDT",
    strategy: "ema_cross",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialBalance: 10000,
    riskPerTrade: 2,
    stopLossPercent: 2,
    takeProfitPercent: 6,
  });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [learning, setLearning] = useState(false);
  const [learnDone, setLearnDone] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const { data: pastResults } = useQuery({
    queryKey: ["backtest_results"],
    queryFn: () => base44.entities.BacktestResult.list("-created_date", 5),
    initialData: [],
  });

  const runBacktest = async () => {
    setRunning(true);
    setLearnDone(false);
    try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت محاكي تداول. قم بمحاكاة backtest لاستراتيجية ${config.strategy} على زوج ${config.pair}
      من ${config.startDate} إلى ${config.endDate} برأسمال $${config.initialBalance}.
      مخاطرة ${config.riskPerTrade}% لكل صفقة.
      وقف خسارة: ${config.stopLossPercent}%، أخذ ربح: ${config.takeProfitPercent}%.
      أعطني نتائج واقعية تشمل: العائد، نسبة النجاح، شارب، أقصى سحب، عدد الصفقات، ومنحنى رأس المال (12 نقطة شهرية).`,
      response_json_schema: {
        type: "object",
        properties: {
          total_return_percent: { type: "number" },
          total_return_usd: { type: "number" },
          win_rate: { type: "number" },
          total_trades: { type: "number" },
          winning_trades: { type: "number" },
          losing_trades: { type: "number" },
          sharpe_ratio: { type: "number" },
          max_drawdown: { type: "number" },
          profit_factor: { type: "number" },
          avg_win: { type: "number" },
          avg_loss: { type: "number" },
          best_trade: { type: "number" },
          worst_trade: { type: "number" },
          equity_curve: { type: "array", items: { type: "object", properties: { month: { type: "string" }, value: { type: "number" } } } },
          monthly_returns: { type: "array", items: { type: "object", properties: { month: { type: "string" }, return_pct: { type: "number" } } } }
        }
      }
    });

    setResults(res);
    setRunning(false);

    // 🧠 AI يتعلم ويستخلص المعاملات المثلى
    setLearning(true);
    setAiSuggestions(null);
    const lessons = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت نظام تعلم آلي متقدم متخصص في تحسين استراتيجيات التداول. حلّل نتائج الـ Backtest التالية واستخلص توصيات دقيقة:

معطيات الاختبار:
- الاستراتيجية: ${config.strategy} | الزوج: ${config.pair}
- العائد الإجمالي: ${res.total_return_percent?.toFixed(2)}%
- نسبة النجاح: ${res.win_rate?.toFixed(1)}%
- Sharpe Ratio: ${res.sharpe_ratio?.toFixed(2)}
- أقصى سحب: ${res.max_drawdown?.toFixed(1)}%
- معامل الربح: ${res.profit_factor?.toFixed(2)}
- متوسط الربح/الخسارة: ${res.avg_win?.toFixed(2)}% / ${res.avg_loss?.toFixed(2)}%
- أفضل صفقة: ${res.best_trade?.toFixed(2)}% | أسوأ صفقة: ${res.worst_trade?.toFixed(2)}%
- المعاملات المستخدمة: مخاطرة ${config.riskPerTrade}% | SL: ${config.stopLossPercent}% | TP: ${config.takeProfitPercent}%

المطلوب:
1. احسب المعاملات المثلى (risk, stop_loss, take_profit) لتحسين الأداء
2. حدد ظروف السوق المواتية وغير المواتية بدقة
3. اقترح الإطار الزمني الأنسب
4. حدد الحد الأدنى للثقة (confidence) الذي يجب أن تتوفر قبل الدخول
5. اشرح منطق اختيار هذه المعاملات`,
      response_json_schema: {
        type: "object",
        properties: {
          ai_lessons: { type: "string" },
          best_conditions: { type: "string" },
          avoid_conditions: { type: "string" },
          market_regime: { type: "string" },
          optimal_risk: { type: "number" },
          optimal_stop_loss: { type: "number" },
          optimal_take_profit: { type: "number" },
          optimal_tp_sl_ratio: { type: "number" },
          confidence_to_enter: { type: "number" },
          recommended_timeframe: { type: "string" },
          parameter_reasoning: { type: "string" },
          score: { type: "number" }
        }
      }
    });

    setAiSuggestions(lessons);

    await base44.entities.BacktestResult.create({
      pair: config.pair,
      strategy: config.strategy,
      start_date: config.startDate,
      end_date: config.endDate,
      initial_balance: config.initialBalance,
      risk_per_trade: config.riskPerTrade,
      stop_loss_percent: config.stopLossPercent,
      take_profit_percent: config.takeProfitPercent,
      total_return_percent: res.total_return_percent,
      win_rate: res.win_rate,
      total_trades: res.total_trades,
      sharpe_ratio: res.sharpe_ratio,
      max_drawdown: res.max_drawdown,
      profit_factor: res.profit_factor,
      avg_win: res.avg_win,
      avg_loss: res.avg_loss,
      ...lessons,
    });

    setLearnDone(true);
    } catch (e) {
      console.error("runBacktest failed:", e);
    } finally {
      setRunning(false);
      setLearning(false);
    }
  };

  const applyOptimalParams = ({ optimal_risk, optimal_stop_loss, optimal_take_profit }) => {
    setConfig(prev => ({
      ...prev,
      riskPerTrade: optimal_risk ?? prev.riskPerTrade,
      stopLossPercent: optimal_stop_loss ?? prev.stopLossPercent,
      takeProfitPercent: optimal_take_profit ?? prev.takeProfitPercent,
    }));
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <Tabs defaultValue="ai_real">
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="ai_real" className="gap-2">
            <Zap className="w-3.5 h-3.5" /> محاكاة AI الحقيقية
          </TabsTrigger>
          <TabsTrigger value="classic" className="gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> الاختبار الكلاسيكي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai_real">
          <AISignalBacktest />
        </TabsContent>

        <TabsContent value="classic">
        <div className="space-y-6">
      {/* Config */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">الاختبار الخلفي</h2>
            <p className="text-xs text-muted-foreground">اختبر استراتيجيتك على البيانات التاريخية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-xs">زوج العملة</Label>
            <Select value={config.pair} onValueChange={(v) => setConfig({...config, pair: v})}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRADING_PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">الاستراتيجية</Label>
            <Select value={config.strategy} onValueChange={(v) => setConfig({...config, strategy: v})}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={config.startDate} onChange={(e) => setConfig({...config, startDate: e.target.value})} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={config.endDate} onChange={(e) => setConfig({...config, endDate: e.target.value})} className="bg-secondary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs">رأس المال ($)</Label>
            <Input type="number" value={config.initialBalance} onChange={(e) => setConfig({...config, initialBalance: parseInt(e.target.value)})} className="bg-secondary" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">المخاطرة لكل صفقة: {config.riskPerTrade}%</Label>
            <Slider value={[config.riskPerTrade]} onValueChange={([v]) => setConfig({...config, riskPerTrade: v})} min={0.5} max={10} step={0.5} />
          </div>
          <div>
            <Label className="text-xs mb-2 block">وقف الخسارة: {config.stopLossPercent}% | أخذ ربح: {config.takeProfitPercent}%</Label>
            <div className="flex gap-2">
              <Slider value={[config.stopLossPercent]} onValueChange={([v]) => setConfig({...config, stopLossPercent: v})} min={0.5} max={10} step={0.5} className="flex-1" />
              <Slider value={[config.takeProfitPercent]} onValueChange={([v]) => setConfig({...config, takeProfitPercent: v})} min={1} max={20} step={0.5} className="flex-1" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={runBacktest} disabled={running || learning} className="bg-primary hover:bg-primary/90">
            {running ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري المحاكاة...</> :
             learning ? <><Brain className="w-4 h-4 ml-2 animate-pulse" /> الذكاء الاصطناعي يتعلم...</> :
             <><Play className="w-4 h-4 ml-2" /> تشغيل Backtest</>}
          </Button>
          {learnDone && (
            <div className="flex items-center gap-2 text-trading-green text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              تم التعلم وحفظ المعرفة
            </div>
          )}
        </div>
      </div>

      {/* AI Knowledge Base */}
      {pastResults.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">قاعدة معرفة الذكاء الاصطناعي</h3>
            <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{pastResults.length} تجارب مخزنة</Badge>
          </div>
          <div className="space-y-3">
            {pastResults.slice(0, 3).map((r, i) => (
              <div key={r.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{r.pair}</span>
                    <Badge variant="outline" className="text-[9px] py-0">{r.strategy}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className={r.total_return_percent >= 0 ? "text-trading-green" : "text-trading-red"}>
                      {r.total_return_percent >= 0 ? "+" : ""}{r.total_return_percent?.toFixed(1)}%
                    </span>
                    {r.score && <span className="text-primary font-mono">نقاط: {r.score}/100</span>}
                  </div>
                </div>
                {r.ai_lessons && <p className="text-[10px] text-muted-foreground leading-relaxed">{r.ai_lessons}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions && (
        <AIOptimalParams suggestions={aiSuggestions} onApply={applyOptimalParams} />
      )}

      {/* Results */}
      {results && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultStat icon={TrendingUp} label="العائد الإجمالي" value={`${results.total_return_percent?.toFixed(1)}%`} sub={`$${results.total_return_usd?.toFixed(0)}`} color="green" />
            <ResultStat icon={Target} label="نسبة النجاح" value={`${results.win_rate?.toFixed(1)}%`} sub={`${results.winning_trades}W / ${results.losing_trades}L`} color="cyan" />
            <ResultStat icon={Shield} label="Sharpe Ratio" value={results.sharpe_ratio?.toFixed(2)} sub={`PF: ${results.profit_factor?.toFixed(2)}`} color="purple" />
            <ResultStat icon={TrendingDown} label="أقصى سحب" value={`${results.max_drawdown?.toFixed(1)}%`} sub={`أسوأ صفقة: ${results.worst_trade?.toFixed(1)}%`} color="red" />
          </div>

          {/* Equity Curve */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">منحنى رأس المال</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.equity_curve || []}>
                  <defs>
                    <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#btGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Returns */}
          {results.monthly_returns && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4">العوائد الشهرية</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.monthly_returns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ background: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: '8px' }} />
                    <Bar dataKey="return_pct" radius={[4, 4, 0, 0]}>
                      {(results.monthly_returns || []).map((entry, i) => (
                        <Cell key={i} fill={entry.return_pct >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      )}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultStat({ icon: Icon, label, value, sub, color }) {
  const colors = {
    green: "text-trading-green bg-trading-green/5",
    red: "text-trading-red bg-trading-red/5",
    cyan: "text-primary bg-primary/5",
    purple: "text-trading-purple bg-trading-purple/5",
  };
  return (
    <div className={`glass-card p-4 border-t-2`} style={{ borderTopColor: `hsl(var(--trading-${color}))` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: `hsl(var(--trading-${color}))` }} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}