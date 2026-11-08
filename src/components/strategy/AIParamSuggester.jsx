import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIParamSuggester({ strategy, pair, onApply }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const suggest = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت خبير تداول متخصص في تحليل العملات الرقمية.

الاستراتيجية: ${strategy.name}
الوصف: ${strategy.description}
الفئة: ${strategy.category}
الزوج: ${pair}
المؤشرات المستخدمة: ${strategy.indicators?.join(", ")}
الإطارات الزمنية المتاحة: ${strategy.timeframes?.join(", ")}

بناءً على طبيعة هذه الاستراتيجية وسلوك زوج ${pair} التاريخي:
1. ما هي المعاملات الأمثل لتحقيق أعلى ربحية مع إدارة مخاطر جيدة؟
2. ما هو أفضل إطار زمني؟
3. ما نسبة المخاطرة المناسبة لكل صفقة؟
4. ما نسبة وقف الخسارة وجني الربح المثلى؟
5. ما الظروف السوقية الأنسب لهذه الاستراتيجية مع هذا الزوج؟

قدّم توصية واضحة ومبررة بالأرقام.`,
      response_json_schema: {
        type: "object",
        properties: {
          timeframe: { type: "string" },
          risk_per_trade: { type: "number" },
          stop_loss: { type: "number" },
          take_profit: { type: "number" },
          rr_ratio: { type: "number" },
          best_market_condition: { type: "string" },
          expected_win_rate: { type: "number" },
          reasoning: { type: "string" },
          warnings: { type: "string" }
        }
      }
    });
    setResult(res);
    setLoading(false);
    setExpanded(true);
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
        onClick={suggest}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? "جارٍ تحليل السوق..." : `اقتراح أفضل معاملات لـ ${pair}`}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> اقتراح AI المثالي
                </span>
                <button onClick={() => setExpanded(v => !v)}>
                  {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {expanded && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "الإطار الزمني", value: result.timeframe, color: "text-trading-cyan" },
                      { label: "خطر / صفقة", value: `${result.risk_per_trade}%`, color: "text-trading-yellow" },
                      { label: "وقف الخسارة", value: `${result.stop_loss}%`, color: "text-trading-red" },
                      { label: "جني الربح", value: `${result.take_profit}%`, color: "text-trading-green" },
                      { label: "نسبة RR", value: `1:${result.rr_ratio}`, color: "text-primary" },
                      { label: "Win Rate متوقع", value: `${result.expected_win_rate}%`, color: "text-trading-green" },
                    ].map(item => (
                      <div key={item.label} className="bg-secondary/60 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">ظروف السوق المثلى: </span>
                      <span className="text-trading-green">{result.best_market_condition}</span>
                    </div>
                    {result.reasoning && (
                      <p className="text-muted-foreground leading-relaxed">{result.reasoning}</p>
                    )}
                    {result.warnings && (
                      <p className="text-trading-yellow text-[11px]">⚠️ {result.warnings}</p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => onApply?.(result)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    تطبيق هذه المعاملات
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}