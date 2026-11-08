import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Zap, TrendingUp, TrendingDown, Shield, Target,
  CheckCircle2, AlertTriangle, Info, Sparkles, ArrowRight
} from "lucide-react";

export default function AIOptimalParams({ suggestions, onApply }) {
  if (!suggestions) return null;

  const { optimal_risk, optimal_stop_loss, optimal_take_profit, optimal_tp_sl_ratio,
          score, ai_lessons, best_conditions, avoid_conditions, market_regime,
          confidence_to_enter, recommended_timeframe, parameter_reasoning } = suggestions;

  const scoreColor = score >= 70 ? "text-trading-green" : score >= 50 ? "text-trading-yellow" : "text-trading-red";
  const scoreBg = score >= 70 ? "bg-trading-green/10 border-trading-green/30" : score >= 50 ? "bg-trading-yellow/10 border-trading-yellow/30" : "bg-trading-red/10 border-trading-red/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Score Banner */}
      <div className={`glass-card p-5 border ${scoreBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-trading-yellow" />
                توصيات الذكاء الاصطناعي المحسّنة
              </h3>
              <p className="text-[11px] text-muted-foreground">مستخلصة من تحليل نتائج الـ Backtest</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">تقييم الاستراتيجية</p>
            <p className={`text-3xl font-bold font-mono ${scoreColor}`}>{score}<span className="text-sm">/100</span></p>
          </div>
        </div>
      </div>

      {/* Optimal Parameters */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-trading-yellow" />
            المعاملات المثلى المقترحة
          </h4>
          {onApply && (
            <Button
              size="sm"
              onClick={() => onApply({ optimal_risk, optimal_stop_loss, optimal_take_profit })}
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs h-7 px-3"
            >
              <CheckCircle2 className="w-3 h-3 ml-1" />
              تطبيق الآن
              <ArrowRight className="w-3 h-3 mr-1" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ParamCard
            label="المخاطرة لكل صفقة"
            value={`${optimal_risk?.toFixed(1)}%`}
            icon={Shield}
            color="cyan"
            hint="معدل المخاطرة الأمثل"
          />
          <ParamCard
            label="وقف الخسارة"
            value={`${optimal_stop_loss?.toFixed(1)}%`}
            icon={TrendingDown}
            color="red"
            hint="حماية رأس المال"
          />
          <ParamCard
            label="أخذ الربح"
            value={`${optimal_take_profit?.toFixed(1)}%`}
            icon={TrendingUp}
            color="green"
            hint="هدف الربح المثالي"
          />
          <ParamCard
            label="نسبة TP/SL"
            value={`${optimal_tp_sl_ratio?.toFixed(1)}x`}
            icon={Target}
            color="purple"
            hint="نسبة المخاطرة للعائد"
          />
        </div>
        {parameter_reasoning && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/30 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{parameter_reasoning}</p>
          </div>
        )}
      </div>

      {/* Market Conditions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Favorable Conditions */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-trading-green flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            الظروف المواتية للدخول
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{best_conditions || "—"}</p>
          {market_regime && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">النظام السوقي المفضل:</span>
              <Badge className="text-[9px] bg-trading-green/10 text-trading-green border-0">{market_regime}</Badge>
            </div>
          )}
        </div>

        {/* Unfavorable Conditions */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-trading-red flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            الظروف التي يجب تجنبها
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{avoid_conditions || "—"}</p>
          {recommended_timeframe && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">الإطار الزمني الأمثل:</span>
              <Badge className="text-[9px] bg-primary/10 text-primary border-0">{recommended_timeframe}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* AI Lessons */}
      {ai_lessons && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            ما تعلمه الذكاء الاصطناعي
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{ai_lessons}</p>
          {confidence_to_enter != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">الحد الأدنى للثقة للدخول</span>
                <span className="text-[11px] font-mono text-primary">{confidence_to_enter}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${confidence_to_enter}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ParamCard({ label, value, icon: Icon, color, hint }) {
  const colorMap = {
    cyan: { text: "text-primary", bg: "bg-primary/5 border-primary/15" },
    red: { text: "text-trading-red", bg: "bg-trading-red/5 border-trading-red/15" },
    green: { text: "text-trading-green", bg: "bg-trading-green/5 border-trading-green/15" },
    purple: { text: "text-trading-purple bg-trading-purple/5 border-trading-purple/15" },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <div className={`p-3 rounded-lg border ${c.bg}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3 h-3 ${c.text}`} />
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${c.text}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}