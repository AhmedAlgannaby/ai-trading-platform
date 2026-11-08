import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, TrendingUp, BarChart2, Activity, Pause,
  ChevronDown, ChevronUp, CheckCircle2, Loader2, Info, Bot
} from "lucide-react";
import { TRADING_PAIRS } from "@/lib/pairs";
import MicroStrategyCard from "@/components/strategy/MicroStrategyCard";

// تعريف الاستراتيجيات المتاحة مع إعداداتها الافتراضية
const STRATEGY_DEFINITIONS = [
  {
    id: "ema_cross",
    name: "تقاطع المتوسطات المتحركة",
    name_en: "EMA Crossover",
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    description: "يشتري عند تقاطع EMA السريع فوق EMA البطيء، ويبيع عند التقاطع للأسفل.",
    tags: ["اتجاهية", "مجرّبة", "مناسبة للمبتدئين"],
    params: [
      { key: "fast_ema", label: "EMA السريع (شمعات)", type: "slider", min: 5, max: 50, step: 1, default: 9 },
      { key: "slow_ema", label: "EMA البطيء (شمعات)", type: "slider", min: 20, max: 200, step: 5, default: 21 },
      { key: "timeframe", label: "الإطار الزمني", type: "select", options: ["1m","5m","15m","1h","4h","1d"], default: "1h" },
      { key: "pair", label: "زوج العملة", type: "select", options: TRADING_PAIRS, default: "BTC/USDT" },
      { key: "risk_percent", label: "نسبة المخاطرة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2 },
      { key: "sl_percent", label: "وقف الخسارة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 1.5 },
      { key: "tp_ratio", label: "نسبة TP:SL", type: "slider", min: 1, max: 5, step: 0.5, default: 2 },
    ]
  },
  {
    id: "rsi_reversal",
    name: "انعكاس RSI",
    name_en: "RSI Reversal",
    icon: Activity,
    color: "text-trading-yellow",
    bg: "bg-trading-yellow/10",
    border: "border-trading-yellow/20",
    description: "يشتري عند تشبع البيع (RSI < 30) ويبيع عند تشبع الشراء (RSI > 70).",
    tags: ["عكسية", "تذبذب", "متوسطة المخاطر"],
    params: [
      { key: "rsi_period", label: "فترة RSI", type: "slider", min: 7, max: 21, step: 1, default: 14 },
      { key: "oversold", label: "منطقة تشبع البيع", type: "slider", min: 20, max: 40, step: 1, default: 30 },
      { key: "overbought", label: "منطقة تشبع الشراء", type: "slider", min: 60, max: 80, step: 1, default: 70 },
      { key: "timeframe", label: "الإطار الزمني", type: "select", options: ["5m","15m","1h","4h"], default: "4h" },
      { key: "pair", label: "زوج العملة", type: "select", options: TRADING_PAIRS, default: "ETH/USDT" },
      { key: "risk_percent", label: "نسبة المخاطرة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 1.5 },
      { key: "sl_percent", label: "وقف الخسارة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2 },
    ]
  },
  {
    id: "breakout",
    name: "اختراق النطاق",
    name_en: "Range Breakout",
    icon: BarChart2,
    color: "text-trading-green",
    bg: "bg-trading-green/10",
    border: "border-trading-green/20",
    description: "يراقب نطاق السعر خلال فترة محددة ويدخل عند كسر القمة أو القاع.",
    tags: ["اختراق", "مناسب للتقلبات", "ذاتي التكيف"],
    params: [
      { key: "lookback", label: "فترة النطاق (شمعات)", type: "slider", min: 10, max: 100, step: 5, default: 20 },
      { key: "confirm_candles", label: "شمعات التأكيد", type: "slider", min: 1, max: 5, step: 1, default: 2 },
      { key: "volume_filter", label: "تصفية بالحجم", type: "switch", default: true },
      { key: "timeframe", label: "الإطار الزمني", type: "select", options: ["15m","1h","4h","1d"], default: "4h" },
      { key: "pair", label: "زوج العملة", type: "select", options: TRADING_PAIRS, default: "BTC/USDT" },
      { key: "risk_percent", label: "نسبة المخاطرة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2 },
      { key: "sl_percent", label: "وقف الخسارة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 1 },
    ]
  },
  {
    id: "macd_signal",
    name: "إشارة MACD",
    name_en: "MACD Signal",
    icon: Zap,
    color: "text-trading-purple",
    bg: "bg-trading-purple/10",
    border: "border-trading-purple/20",
    description: "يتداول بناءً على تقاطع خط MACD مع خط الإشارة مع تأكيد الهيستوغرام.",
    tags: ["زخم", "شائعة", "متعددة الإشارات"],
    params: [
      { key: "fast", label: "الفترة السريعة", type: "slider", min: 5, max: 20, step: 1, default: 12 },
      { key: "slow", label: "الفترة البطيئة", type: "slider", min: 20, max: 50, step: 1, default: 26 },
      { key: "signal", label: "فترة الإشارة", type: "slider", min: 5, max: 15, step: 1, default: 9 },
      { key: "timeframe", label: "الإطار الزمني", type: "select", options: ["1h","4h","1d"], default: "4h" },
      { key: "pair", label: "زوج العملة", type: "select", options: TRADING_PAIRS, default: "BTC/USDT" },
      { key: "risk_percent", label: "نسبة المخاطرة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2 },
      { key: "sl_percent", label: "وقف الخسارة %", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2 },
    ]
  },
];

function buildDefaultParams(def) {
  const p = {};
  def.params.forEach(param => { p[param.key] = param.default; });
  return p;
}

function ParamControl({ param, value, onChange }) {
  if (param.type === "slider") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{param.label}</Label>
          <span className="text-xs font-mono font-semibold text-foreground">{value}{param.key.includes("percent") || param.key.includes("ratio") ? "" : ""}</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={param.min} max={param.max} step={param.step}
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{param.min}</span>
          <span>{param.max}</span>
        </div>
      </div>
    );
  }
  if (param.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-secondary h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (param.type === "switch") {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
        <Switch checked={value} onCheckedChange={onChange} />
      </div>
    );
  }
  return null;
}

function StrategyCard({ def, saved, onSave, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [params, setParams] = useState(saved?.params || buildDefaultParams(def));
  const [saving, setSaving] = useState(false);
  const isActive = saved?.is_active || false;
  const Icon = def.icon;

  const handleSave = async () => {
    setSaving(true);
    await onSave({ strategy_id: def.id, name: def.name, params, is_active: isActive });
    setSaving(false);
  };

  return (
    <motion.div
      layout
      className={`glass-card border ${def.border} overflow-hidden`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${def.bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${def.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{def.name}</h3>
              {saved && (
                <Badge className="text-[9px] border-0 bg-trading-green/10 text-trading-green px-1.5 py-0">محفوظة</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{def.name_en}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5">
              <Switch
                checked={isActive}
                onCheckedChange={(v) => onToggle(saved.id, v)}
              />
              <span className={`text-[10px] font-medium ${isActive ? "text-trading-green" : "text-muted-foreground"}`}>
                {isActive ? "نشطة" : "معطلة"}
              </span>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
        {def.tags.map(tag => (
          <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tag}</span>
        ))}
      </div>

      {/* Expanded Settings */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/30 pt-4 space-y-4">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 text-[11px] text-muted-foreground">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span>{def.description}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {def.params.map(param => (
                  <ParamControl
                    key={param.key}
                    param={param}
                    value={params[param.key] ?? param.default}
                    onChange={v => setParams(prev => ({ ...prev, [param.key]: v }))}
                  />
                ))}
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className={`w-full ${def.bg} ${def.color} border ${def.border} hover:opacity-90 bg-transparent`}
              >
                {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                حفظ إعدادات الاستراتيجية
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AutoStrategies() {
  const queryClient = useQueryClient();

  const { data: savedStrategies, isLoading } = useQuery({
    queryKey: ["saved-strategies"],
    queryFn: () => base44.entities.CustomStrategy.list("-created_date", 50),
    initialData: [],
  });

  const saveStrategy = useMutation({
    mutationFn: async (data) => {
      const existing = savedStrategies.find(s => s.name === data.name);
      if (existing) {
        return base44.entities.CustomStrategy.update(existing.id, {
          blocks: [data.params],
          status: data.is_active ? "active" : "draft",
        });
      }
      return base44.entities.CustomStrategy.create({
        name: data.name,
        description: `استراتيجية ${data.name} - تداول افتراضي آلي`,
        blocks: [data.params],
        status: "draft",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-strategies"] }),
  });

  const toggleStrategy = useMutation({
    mutationFn: ({ id, active }) =>
      base44.entities.CustomStrategy.update(id, { status: active ? "active" : "draft" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-strategies"] }),
  });

  const activeCount = savedStrategies.filter(s => s.status === "active").length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            استراتيجيات التداول الآلي
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            اختر وخصّص استراتيجياتك للتداول الافتراضي بأسعار Binance الحقيقية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            activeCount > 0 ? "bg-trading-green/10 border-trading-green/20 text-trading-green" : "bg-secondary border-border text-muted-foreground"
          }`}>
            {activeCount > 0 ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-trading-green animate-pulse" />{activeCount} استراتيجية نشطة</>
            ) : (
              <><Pause className="w-3.5 h-3.5" />لا توجد استراتيجيات نشطة</>
            )}
          </div>
        </div>
      </motion.div>

      {/* بطاقة تعليمية */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 border border-primary/20 bg-primary/5"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-primary mb-1">كيف يعمل التداول الآلي الافتراضي؟</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              اختر استراتيجية واضبط إعداداتها ثم احفظها. سيقوم المحرك الافتراضي بمراقبة السوق كل 15 ثانية وفتح/إغلاق صفقات تجريبية تلقائياً بناءً على الإشارات المحددة — بدون أي أموال حقيقية. مثالي لاختبار الاستراتيجيات وتعلم التداول.
            </p>
          </div>
        </div>
      </motion.div>

      {/* استراتيجية الرصيد الصغير — مدمجة في المحرّك */}
      <MicroStrategyCard />

      {/* الاستراتيجيات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {STRATEGY_DEFINITIONS.map((def, i) => {
          const saved = savedStrategies.find(s => s.name === def.name);
          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <StrategyCard
                def={def}
                saved={saved ? { ...saved, is_active: saved.status === "active", params: saved.blocks?.[0] || buildDefaultParams(def) } : null}
                onSave={(data) => saveStrategy.mutate(data)}
                onToggle={(id, active) => toggleStrategy.mutate({ id, active })}
              />
            </motion.div>
          );
        })}
      </div>

      {/* الاستراتيجيات المحفوظة */}
      {savedStrategies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-trading-green" />
            الاستراتيجيات المحفوظة ({savedStrategies.length})
          </h3>
          <div className="space-y-2">
            {savedStrategies.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.status === "active" ? "bg-trading-green animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="font-medium">{s.name}</span>
                  {s.blocks?.[0]?.pair && <span className="text-muted-foreground">• {s.blocks[0].pair}</span>}
                  {s.blocks?.[0]?.timeframe && <span className="text-muted-foreground">• {s.blocks[0].timeframe}</span>}
                </div>
                <Badge className={`text-[9px] border-0 ${s.status === "active" ? "bg-trading-green/10 text-trading-green" : "bg-secondary text-muted-foreground"}`}>
                  {s.status === "active" ? "نشطة" : "معطلة"}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}