import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBlockDef, COLOR_MAP, BLOCK_CATEGORIES } from "./blockDefinitions";
import { CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";
import { useState } from "react";

function validate(blocks) {
  const issues = [];
  const cats = {};
  for (const b of blocks) {
    const cat = BLOCK_CATEGORIES.find(c => c.blocks.some(bl => bl.type === b.type));
    if (cat) cats[cat.id] = (cats[cat.id] || 0) + 1;
  }
  if (!cats.entry) issues.push("لم تضف شرط دخول");
  if (!cats.exit) issues.push("لم تضف شرط خروج (وقف خسارة / جني ربح)");
  if (!cats.indicators) issues.push("لم تضف أي مؤشر فني");
  if (!cats.risk) issues.push("يُنصح بإضافة إدارة مخاطر");
  return issues;
}

export default function StrategySummary({ blocks, strategyName, pair, timeframe, onTest, onSave, isSaving }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const issues = validate(blocks);
  const isValid = issues.filter(i => !i.includes("يُنصح")).length === 0;

  const runQuickTest = async () => {
    if (!isValid || blocks.length === 0) return;
    setTesting(true);
    setTestResult(null);
    const blocksSummary = blocks.map(b => {
      const def = getBlockDef(b.type);
      return `${def?.label}: ${JSON.stringify(b.params || {})}`;
    }).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `قيّم هذه الاستراتيجية المبنية بالمكوّنات التالية:
الاسم: ${strategyName}
الزوج: ${pair}
الإطار الزمني: ${timeframe}
المكوّنات:
${blocksSummary}

بناءً على هذه المكوّنات وتفاعلها مع بعض، قدّم تقييماً سريعاً للاستراتيجية.`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          estimated_win_rate: { type: "number" },
          estimated_return: { type: "number" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
          recommendation: { type: "string" }
        }
      }
    });
    setTestResult(res);
    setTesting(false);
    onTest?.(res);
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground">ملخص الاستراتيجية</p>

      {/* Block count by category */}
      <div className="space-y-2">
        {BLOCK_CATEGORIES.map(cat => {
          const count = blocks.filter(b => cat.blocks.some(bl => bl.type === b.type)).length;
          const colors = COLOR_MAP[cat.color];
          return (
            <div key={cat.id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span>{cat.icon}</span> {cat.label}
              </span>
              <span className={`font-bold font-mono ${count > 0 ? colors.text : "text-muted-foreground/40"}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Validation */}
      <div className="space-y-1.5">
        {issues.map((issue, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] ${issue.includes("يُنصح") ? "text-trading-yellow" : "text-trading-red"}`}>
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {issue}
          </div>
        ))}
        {isValid && (
          <div className="flex items-center gap-1.5 text-[11px] text-trading-green">
            <CheckCircle2 className="w-3 h-3" /> الاستراتيجية مكتملة
          </div>
        )}
      </div>

      {/* Quick Test Result */}
      {testResult && (
        <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">نتيجة التقييم السريع</span>
            <Badge className="bg-primary/20 text-primary border-0 text-[10px]">{testResult.score}/100</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
              <p className="text-sm font-bold text-trading-green">{testResult.estimated_win_rate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">عائد متوقع</p>
              <p className="text-sm font-bold text-trading-cyan">+{testResult.estimated_return}%</p>
            </div>
          </div>
          {testResult.recommendation && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{testResult.recommendation}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Button
          size="sm" variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
          onClick={runQuickTest} disabled={testing || !isValid || blocks.length === 0}
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {testing ? "جارٍ التقييم..." : "تقييم AI سريع"}
        </Button>
        <Button
          size="sm" className="w-full gap-2"
          onClick={onSave} disabled={isSaving || !strategyName || blocks.length === 0}
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          حفظ الاستراتيجية
        </Button>
      </div>
    </div>
  );
}