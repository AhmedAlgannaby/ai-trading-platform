import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot, Zap, Play, Square, AlertCircle, Shield, Settings2, Activity, ArrowUpCircle, ArrowDownCircle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { calcPositionSize } from "@/lib/tradeMath";
import { TRADING_PAIRS, DEFAULT_BOT_PAIRS } from "@/lib/pairs";
import {
  isMicroBalance, microRiskPct, MICRO_PAIRS, MICRO_MAX_POSITIONS,
  MICRO_MAX_LEVERAGE, MICRO_MIN_NOTIONAL, MICRO_DAILY_LOSS_PCT,
  MICRO_MAX_TRADES_PER_DAY, MICRO_MIN_CONFIDENCE, MICRO_TAKER_FEE,
} from "@/lib/microStrategy";

const PAIRS = TRADING_PAIRS;

const MIN_CONFIDENCE_OPTIONS = [50, 60, 65, 70, 75, 80, 85];

export default function AutoTrading() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    pairs: DEFAULT_BOT_PAIRS,
    min_confidence: 70,
    max_trades_per_run: 3,
    auto_execute: true,
    interval_minutes: 15,
  });
  const intervalRef = useRef(null);
  const logsEndRef = useRef(null);
  const cycleCountRef = useRef(0);

  const { data: settings } = useQuery({
    queryKey: ["risk_settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1).then(d => d[0] || {}),
    initialData: {},
    initialDataUpdatedAt: 0,
  });

  const { data: openTrades } = useQuery({
    queryKey: ["open_trades_auto"],
    queryFn: () => base44.entities.Trade.filter({ status: "open" }),
    initialData: [],
    initialDataUpdatedAt: 0,
    refetchInterval: isRunning ? 10000 : false,
  });

  const { data: recentExecutions } = useQuery({
    queryKey: ["auto_executions"],
    queryFn: () => base44.entities.Trade.list("-created_date", 10),
    initialData: [],
    initialDataUpdatedAt: 0,
    refetchInterval: isRunning ? 15000 : false,
  });

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("ar-SA");
    setLogs(prev => [...prev.slice(-49), { message, type, timestamp, id: Date.now() }]);
  };

  const runCycle = async () => {
    cycleCountRef.current += 1;
    const cycleNum = cycleCountRef.current;
    addLog(`🔄 بدء دورة التحليل #${cycleNum}...`, "info");

    const balance = settings?.paper_balance || 10000;
    const micro = isMicroBalance(balance);
    const maxOpen = micro ? MICRO_MAX_POSITIONS : (settings?.max_open_positions || 5);
    const currentOpen = openTrades.length;
    const openPairSet = new Set(openTrades.map(t => t.pair));

    let openedToday = 0;
    if (micro) {
      addLog(`🛡️ وضع الرصيد الصغير مفعّل: رصيد $${balance} — صفقة واحدة، مخاطرة ${microRiskPct(balance)}%، رافعة ≤ ${MICRO_MAX_LEVERAGE}x`, "info");
      const day = new Date().toISOString().slice(0, 10);
      const paperTrades = await base44.entities.Trade.filter({ mode: "paper" }, "-created_date", 200);
      const microCap = balance * MICRO_MAX_LEVERAGE;
      const microTrades = paperTrades.filter(t => (Number(t.position_size) || 0) <= microCap + 0.01);
      openedToday = microTrades.filter(t => (t.created_date || "").slice(0, 10) === day).length;
      if (openedToday >= MICRO_MAX_TRADES_PER_DAY) {
        addLog(`⏸️ الحد اليومي للرصيد الصغير (${openedToday}/${MICRO_MAX_TRADES_PER_DAY} صفقات) — توقف لليوم`, "warning");
        return;
      }
      const realizedToday = microTrades
        .filter(t => t.status === "closed" && (t.closed_at || t.updated_date || "").slice(0, 10) === day)
        .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
      if (realizedToday <= -(balance * MICRO_DAILY_LOSS_PCT / 100)) {
        addLog(`🛑 حد الخسارة اليومي (-${MICRO_DAILY_LOSS_PCT}%) بلغ ${realizedToday.toFixed(2)}$ — توقف لليوم`, "warning");
        return;
      }
    }

    if (currentOpen >= maxOpen) {
      addLog(`⏸️ تم الوصول للحد الأقصى من الصفقات المفتوحة (${currentOpen}/${maxOpen})`, "warning");
      return;
    }

    const configuredPairs = micro
      ? config.pairs.filter(p => MICRO_PAIRS.includes(p))
      : config.pairs;
    const pairs = micro && configuredPairs.length === 0 ? MICRO_PAIRS : configuredPairs;
    const maxPerRun = micro
      ? Math.max(0, Math.min(config.max_trades_per_run, MICRO_MAX_TRADES_PER_DAY - openedToday, MICRO_MAX_POSITIONS - currentOpen))
      : config.max_trades_per_run;
    const minConfidence = micro ? Math.max(config.min_confidence, MICRO_MIN_CONFIDENCE) : config.min_confidence;
    const effectiveLeverage = micro
      ? Math.min(settings?.default_leverage || 1, MICRO_MAX_LEVERAGE)
      : (settings?.default_leverage || 1);
    const effectiveRiskPct = micro ? microRiskPct(balance) : (settings?.max_risk_per_trade || 2);

    let executedCount = 0;

    for (const pair of pairs) {
      if (executedCount >= maxPerRun) break;
      if (openPairSet.has(pair)) {
        addLog(`⏭️ ${pair}: لديك صفقة مفتوحة بالفعل — تم التخطي`, "warning");
        continue;
      }

      addLog(`📡 تحليل ${pair}...`, "info");

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `أنت محلل أسواق متخصص. حلل زوج ${pair} الآن وأعطني إشارة تداول دقيقة.
قيّم الوضع الحالي بناءً على المؤشرات الفنية ومستويات الدعم والمقاومة.
أعطني توصية واضحة مع درجة ثقة عالية فقط إذا كانت هناك فرصة واضحة.${micro ? "\nاستخدم استراتيجية Micro Growth على الإطار اليومي 1D: السعر فوق EMA20 وفوق EMA50 مع MACD إيجابي للشراء (والعكس للبيع)، وارفض أي فرصة أقل من 70% ثقة، وهدف أول 3R على الأقل." : ""}`,
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
            }
          }
        });

        // حفظ الإشارة — نعلّمها إن كان التنفيذ التلقائي مطلوباً كي لا ينفذها
        // الخادم إذا أطفأ المستخدم زر التنفيذ التلقائي في الروبوت.
        const signalData = {
          pair,
          ...result,
          strategy: micro ? "Micro Growth" : (result.strategy || "AutoBot"),
          status: "pending",
          timeframe: micro ? "1D" : "1H",
          suggested_size_percent: effectiveRiskPct,
          auto_execute: config.auto_execute === true,
          origin: "browser_bot",
        };

        if (result.confidence < minConfidence || result.direction === "hold") {
          addLog(`⏭️ ${pair}: ثقة ${result.confidence}% (أقل من ${minConfidence}%) — تم التخطي`, "warning");
          await base44.entities.Signal.create({ ...signalData, status: "expired" });
          continue;
        }

        // السبوت شراء فقط — إشارة البيع تُحفظ منتهية بدل صفقة وهمية
        const market = settings?.market_type === "futures" ? "futures" : "spot";
        if (result.direction === "sell" && market !== "futures") {
          addLog(`⏭️ ${pair}: إشارة بيع تُخطت — السبوت لا يدعم الشورت (لا تملك الأصل)`, "warning");
          await base44.entities.Signal.create({ ...signalData, status: "expired" });
          continue;
        }

        addLog(`✅ ${pair}: إشارة ${result.direction === "buy" ? "شراء" : "بيع"} بثقة ${result.confidence}%`, "success");
        const savedSignal = await base44.entities.Signal.create(signalData);

        // في وضع "auto": الخادم هو من ينفذ الإشارة عند إنشائها (executeSignal hook).
        // ننتظر قليلاً ثم نتحقق من الحالة — ولا ننشئ صفقة هنا كي لا تتكرر مرتين.
        const serverExecutes = settings?.execution_mode === "auto";

        if (config.auto_execute && serverExecutes) {
          let fresh = null;
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 700));
            fresh = await base44.entities.Signal.get(savedSignal.id).catch(() => null);
            if (fresh && fresh.status !== "pending") break;
          }
          if (fresh?.status === "executed") {
            addLog(`🚀 نفّذ الخادم صفقة ${pair} وفق إعدادات المخاطرة`, "success");
            executedCount++;
          } else {
            addLog(`⏳ ${pair}: الإشارة محفوظة (${fresh?.status || "pending"}) — لم ينفذها الخادم (تحقق من حدود المخاطرة والصفقات المفتوحة)`, "warning");
          }
        } else if (config.auto_execute && result.entry_price) {
          const conf = Number(result.confidence);
          if (!isFinite(conf)) {
            addLog(`⏭️ ${pair}: ثقة غير صالحة — تم التخطي`, "warning");
            continue;
          }
          let size;
          try {
            size = calcPositionSize({
              balance,
              riskPct: effectiveRiskPct,
              entry: result.entry_price,
              sl: result.stop_loss,
              leverage: effectiveLeverage,
            });
          } catch {
            addLog(`⏭️ ${pair}: وقف غير صالح للحجم — تم التخطي`, "warning");
            continue;
          }

          if (micro) {
            if (size < MICRO_MIN_NOTIONAL) {
              addLog(`⏭️ ${pair}: الحجم $${size} أقل من الحد الأدنى $${MICRO_MIN_NOTIONAL} — تم التخطي`, "warning");
              await base44.entities.Signal.update(savedSignal.id, { status: "expired" });
              continue;
            }
            const tp1Pct = Math.abs(Number(result.take_profit_1) - Number(result.entry_price)) / Number(result.entry_price);
            const fees = size * MICRO_TAKER_FEE * 2;
            if (!(Number.isFinite(tp1Pct) && size * tp1Pct > fees)) {
              addLog(`⏭️ ${pair}: الهدف لا يغطي الرسوم — تم التخطي`, "warning");
              await base44.entities.Signal.update(savedSignal.id, { status: "expired" });
              continue;
            }
          }

          await base44.entities.Trade.create({
            pair,
            type: result.direction === "buy" ? "long" : "short",
            entry_price: result.entry_price,
            current_price: result.entry_price,
            stop_loss: result.stop_loss,
            take_profit_1: result.take_profit_1,
            take_profit_2: result.take_profit_2,
            take_profit_3: result.take_profit_3,
            position_size: size,
            leverage: effectiveLeverage,
            confidence: result.confidence,
            strategy: micro ? "Micro Growth" : (result.strategy || "AutoBot"),
            timeframe: micro ? "1D" : "1H",
            status: "open",
            // صفقات المتصفح ورقية دائماً — الحي عبر executeSignal على السيرفر فقط
            mode: "paper",
            market_type: market,
            pnl: 0,
            pnl_percent: 0,
            entry_reason: `[أتمتة] ${result.analysis_summary?.slice(0, 200)}`,
          });

          await base44.entities.Signal.update(savedSignal.id, { status: "executed" });
          openPairSet.add(pair);
          addLog(`🚀 تم تنفيذ صفقة ${pair} بحجم $${size}`, "success");
          executedCount++;
        } else if (!config.auto_execute) {
          addLog(`📝 ${pair}: حُفظت الإشارة بانتظار موافقتك (التنفيذ التلقائي مغلق)`, "info");
        }

        queryClient.invalidateQueries({ queryKey: ["signals"] });
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["open_trades_auto"] });
        queryClient.invalidateQueries({ queryKey: ["auto_executions"] });

      } catch (err) {
        // 429 من السيرفر المحلي (أو من Binance) — لا نكمل بقية الأزواج كي لا نزيد الحظر
        if (err?.status === 429) {
          addLog(`⏸️ حد الطلبات (429) — أُوقفت الدورة الحالية وستستأنف في الدورة القادمة`, "warning");
          break;
        }
        addLog(`❌ خطأ في تحليل ${pair}: ${err.message}`, "error");
      }
    }

    addLog(`✔️ انتهت الدورة #${cycleNum} — تم تنفيذ ${executedCount} صفقة`, "info");
  };

  const startBot = () => {
    setIsRunning(true);
    setLogs([]);
    cycleCountRef.current = 0;
    addLog("🤖 بدأ الروبوت — يعمل الآن في الخلفية", "success");
    runCycle();
    intervalRef.current = setInterval(runCycle, config.interval_minutes * 60 * 1000);
  };

  const stopBot = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    addLog("🛑 تم إيقاف الروبوت", "warning");
  };

  const logColors = { info: "text-muted-foreground", success: "text-trading-green", warning: "text-trading-yellow", error: "text-trading-red" };

  const paperBalance = settings?.paper_balance || 10000;
  const microMode = isMicroBalance(paperBalance);
  const displayMaxOpen = microMode ? MICRO_MAX_POSITIONS : (settings?.max_open_positions || 5);
  const displayRisk = microMode ? microRiskPct(paperBalance) : (settings?.max_risk_per_trade || 2);
  const displayLeverage = microMode
    ? Math.min(settings?.default_leverage || 1, MICRO_MAX_LEVERAGE)
    : (settings?.default_leverage || 1);
  const displayMinConfidence = microMode ? Math.max(config.min_confidence, MICRO_MIN_CONFIDENCE) : config.min_confidence;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRunning ? "bg-trading-green/20 animate-pulse" : "bg-primary/10"}`}>
              <Bot className={`w-6 h-6 ${isRunning ? "text-trading-green" : "text-primary"}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">روبوت التداول الآلي</h2>
              <p className="text-xs text-muted-foreground">يحلل السوق وينفذ الصفقات تلقائياً</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {microMode && (
              <Badge className="text-xs border-0 px-3 py-1 bg-trading-yellow/20 text-trading-yellow">
                <Shield className="w-3 h-3 ml-1" /> Micro Growth
              </Badge>
            )}
            <Badge className={`text-xs border-0 px-3 py-1 ${isRunning ? "bg-trading-green/20 text-trading-green" : "bg-secondary text-muted-foreground"}`}>
              {isRunning ? (
                <><Activity className="w-3 h-3 ml-1 animate-pulse" /> يعمل</>
              ) : (
                <><Square className="w-3 h-3 ml-1" /> متوقف</>
              )}
            </Badge>

            {isRunning ? (
              <Button onClick={stopBot} variant="destructive" className="gap-2">
                <Square className="w-4 h-4" /> إيقاف الروبوت
              </Button>
            ) : (
              <Button onClick={startBot} className="gap-2 bg-trading-green hover:bg-trading-green/90 text-black">
                <Play className="w-4 h-4" /> تشغيل الروبوت
              </Button>
            )}
          </div>
        </div>

        {/* Mode Warning */}
        {settings?.trading_mode === "live" && (
          <div className="mt-4 p-3 rounded-lg bg-trading-red/10 border border-trading-red/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-trading-red flex-shrink-0" />
            <span className="text-xs text-trading-red">تحذير: وضع التداول الحقيقي مفعّل — الصفقات ستُنفَّذ بأموال حقيقية!</span>
          </div>
        )}

        {microMode && (
          <div className="mt-4 p-3 rounded-lg bg-trading-yellow/10 border border-trading-yellow/20 flex items-start gap-2">
            <Shield className="w-4 h-4 text-trading-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-trading-yellow">وضع الرصيد الصغير مفعّل (Micro Growth)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                صفقة واحدة مفتوحة، مخاطرة {displayRisk}%، رافعة {displayLeverage}x، حد يومي {MICRO_MAX_TRADES_PER_DAY} صفقات ووقف خسارة {MICRO_DAILY_LOSS_PCT}% — والأزواج محدودة بـ BTC / ETH / SOL / BNB.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> إعدادات الروبوت
            </h3>

            <div className="space-y-5">
              {/* Pairs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">أزواج التداول</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => !isRunning && setConfig(prev => ({ ...prev, pairs: [...PAIRS] }))}
                      className={`text-[10px] text-primary hover:underline ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      تحديد الكل
                    </button>
                    <button
                      onClick={() => !isRunning && setConfig(prev => ({ ...prev, pairs: [] }))}
                      className={`text-[10px] text-muted-foreground hover:underline ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      مسح
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PAIRS.map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        if (isRunning) return;
                        setConfig(prev => ({
                          ...prev,
                          pairs: prev.pairs.includes(p)
                            ? prev.pairs.filter(x => x !== p)
                            : [...prev.pairs, p]
                        }));
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        config.pairs.includes(p)
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
                      } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {microMode && (
                  <p className="text-[10px] text-trading-yellow/80 mt-2">
                    وضع الرصيد الصغير يتداول فقط BTC / ETH / SOL / BNB — أي أزواج أخرى ستُتجاهل.
                  </p>
                )}
              </div>

              {/* Min Confidence */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">الحد الأدنى للثقة</Label>
                <Select
                  value={String(config.min_confidence)}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, min_confidence: +v }))}
                  disabled={isRunning}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MIN_CONFIDENCE_OPTIONS.map(v => (
                      <SelectItem key={v} value={String(v)}>{v}%+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {microMode && displayMinConfidence !== config.min_confidence && (
                  <p className="text-[10px] text-trading-yellow/80 mt-1">
                    الحد الفعلي في وضع الرصيد الصغير: {displayMinConfidence}%
                  </p>
                )}
              </div>

              {/* Interval */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">فترة التحليل</Label>
                <Select
                  value={String(config.interval_minutes)}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, interval_minutes: +v }))}
                  disabled={isRunning}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">كل 5 دقائق</SelectItem>
                    <SelectItem value="15">كل 15 دقيقة</SelectItem>
                    <SelectItem value="30">كل 30 دقيقة</SelectItem>
                    <SelectItem value="60">كل ساعة</SelectItem>
                    <SelectItem value="240">كل 4 ساعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max Trades */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">أقصى صفقات لكل دورة</Label>
                <Select
                  value={String(config.max_trades_per_run)}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, max_trades_per_run: +v }))}
                  disabled={isRunning}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v} صفقات</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {microMode && (
                  <p className="text-[10px] text-trading-yellow/80 mt-1">
                    في وضع الرصيد الصغير: صفقة واحدة لكل دورة، وبحد أقصى {MICRO_MAX_TRADES_PER_DAY} صفقات يومياً.
                  </p>
                )}
              </div>

              {/* Auto Execute Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs font-medium">تنفيذ تلقائي فوري</p>
                  <p className="text-[10px] text-muted-foreground">بدون موافقة يدوية</p>
                </div>
                <Switch
                  checked={config.auto_execute}
                  onCheckedChange={(v) => !isRunning && setConfig(prev => ({ ...prev, auto_execute: v }))}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Risk Summary */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-trading-yellow" /> إعدادات المخاطرة
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرصيد التجريبي</span>
                <span className="font-mono font-medium">${paperBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مخاطرة لكل صفقة</span>
                <span className="font-mono font-medium text-trading-yellow">{displayRisk}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرافعة الافتراضية</span>
                <span className="font-mono font-medium">{displayLeverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الصفقات المفتوحة</span>
                <span className={`font-mono font-medium ${openTrades.length >= displayMaxOpen ? "text-trading-red" : "text-trading-green"}`}>
                  {openTrades.length} / {displayMaxOpen}
                </span>
              </div>
              {microMode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">حد الخسارة اليومي</span>
                  <span className="font-mono font-medium text-trading-red">{MICRO_DAILY_LOSS_PCT}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضع التداول</span>
                <Badge className={`text-[10px] border-0 ${settings?.trading_mode === "live" ? "bg-trading-red/10 text-trading-red" : "bg-trading-green/10 text-trading-green"}`}>
                  {settings?.trading_mode === "live" ? "حقيقي 🔴" : "تجريبي"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Logs + Trades */}
        <div className="lg:col-span-2 space-y-4">

          {/* Activity Log */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> سجل النشاط
              </h3>
              <button onClick={() => setLogs([])} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                مسح
              </button>
            </div>

            <div className="h-52 overflow-y-auto scrollbar-thin font-mono text-[11px] space-y-1 bg-secondary/20 rounded-lg p-3">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center mt-16">اضغط "تشغيل الروبوت" لبدء الأتمتة</p>
              ) : (
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 ${logColors[log.type]}`}
                    >
                      <span className="text-muted-foreground/50 flex-shrink-0">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Recent Auto Executions */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-trading-yellow" /> آخر الصفقات المنفذة
              </h3>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ["auto_executions"] })} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {recentExecutions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد صفقات بعد</p>
              ) : (
                recentExecutions.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {trade.type === "long" ? (
                        <ArrowUpCircle className="w-4 h-4 text-trading-green" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-trading-red" />
                      )}
                      <div>
                        <p className="text-xs font-semibold">{trade.pair}</p>
                        <p className="text-[10px] text-muted-foreground">{trade.strategy}</p>
                      </div>
                    </div>
                    <div className="text-left flex items-center gap-3">
                      <div>
                        <p className="text-xs font-mono">${trade.entry_price?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">حجم: ${trade.position_size?.toLocaleString()}</p>
                      </div>
                      <Badge className={`text-[10px] border-0 ${trade.status === "open" ? "bg-trading-green/10 text-trading-green" : "bg-secondary text-muted-foreground"}`}>
                        {trade.status === "open" ? "مفتوح" : "مغلق"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}