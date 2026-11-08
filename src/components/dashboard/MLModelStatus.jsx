import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { loadModel } from "@/components/ml/modelTrainer";
import { FEATURE_NAMES } from "@/components/ml/signalModel";

const LABELS = {
  rsi: "RSI", dist_ema20: "البعد عن EMA20", dist_ema50: "البعد عن EMA50", ema_trend: "اتجاه EMA",
  atr_pct: "التذبذب ATR", is_long: "اتجاه الصفقة", rsi_extreme: "تشبع RSI", momentum: "الزخم",
};

export default function MLModelStatus() {
  const { data: model } = useQuery({
    queryKey: ["ml-model"],
    queryFn: loadModel,
    refetchInterval: 30000,
  });

  if (!model) return null;
  const validationHistory = (model.history || []).filter(point => Number.isFinite(point.loss) && point.validation_samples >= 1);
  const top = (model.weights || [])
    .map((w, i) => ({ name: FEATURE_NAMES[i], w }))
    .filter(f => f.name !== "bias")
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
    .slice(0, 3);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">نموذج التنبؤ (ML)</h3>
        </div>
        <span className="text-[10px] font-mono text-primary">v{model.version}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <Stat label="عينات" value={model.trained_samples} />
        <Stat label="تحديثات خسارة" value={model.loss_updates} />
        <Stat
          label="دقة خارج العينة"
          value={model.validation_method === "prequential-walk-forward" && model.validation_samples >= 5
            ? `${model.accuracy}%` : "غير كافية"}
        />
      </div>

      {validationHistory.length > 1 && (
        <div className="h-[50px] mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={validationHistory}>
              <Tooltip contentStyle={{ fontSize: 11, background: "hsl(222,47%,9%)", border: "1px solid hsl(222,30%,16%)" }}
                formatter={(v) => [`${v}`, "خطأ خارج العينة"]} labelFormatter={() => ""} />
              <Line type="monotone" dataKey="loss" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[9px] text-muted-foreground text-center">
            خطأ التنبؤ المتتابع ({model.validation_samples} اختبار) — لا يُعرض كمقياس موثوق قبل 5 اختبارات
          </p>
        </div>
      )}

      {model.trained_samples > 0 ? (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">أهم العوامل التي تعلّمها</p>
          {top.map(f => (
            <div key={f.name} className="flex justify-between text-[11px] py-0.5">
              <span>{LABELS[f.name]}</span>
              <span className={`font-mono ${f.w >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                {f.w >= 0 ? "+" : ""}{f.w.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center">سيتدرّب النموذج بعد إغلاق أول صفقة</p>
      )}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="p-2 rounded-lg bg-secondary/30">
    <p className="text-xs font-bold font-mono">{value}</p>
    <p className="text-[9px] text-muted-foreground">{label}</p>
  </div>
);