import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingDown, TrendingUp } from "lucide-react";

export default function LearningInsights() {
  const { data: lessons } = useQuery({
    queryKey: ["trade-lessons"],
    queryFn: () => base44.entities.TradeLesson.list("-created_date", 100),
    initialData: [],
    refetchInterval: 30000,
  });

  const losses = lessons.filter(l => l.outcome === "loss");
  const wins = lessons.length - losses.length;

  // الأنماط الأكثر خسارة (زوج + اتجاه)
  const combos = {};
  lessons.forEach(l => {
    const k = `${l.pair} ${l.direction === "long" ? "شراء" : "بيع"}`;
    combos[k] = combos[k] || { w: 0, l: 0 };
    combos[k][l.outcome === "win" ? "w" : "l"]++;
  });
  const weak = Object.entries(combos)
    .filter(([, v]) => v.l > 0 && v.l >= v.w)
    .sort((a, b) => b[1].l - a[1].l)
    .slice(0, 3);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-trading-purple/20 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-trading-purple" />
        </div>
        <h3 className="text-sm font-semibold">التعلّم من الصفقات</h3>
      </div>

      {lessons.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          سيبدأ النظام بالتعلّم بعد إغلاق أول صفقة
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-trading-green/5">
              <TrendingUp className="w-3.5 h-3.5 text-trading-green mx-auto mb-1" />
              <p className="text-xs font-bold">{wins}</p>
              <p className="text-[10px] text-muted-foreground">دروس نجاح</p>
            </div>
            <div className="p-2 rounded-lg bg-trading-red/5">
              <TrendingDown className="w-3.5 h-3.5 text-trading-red mx-auto mb-1" />
              <p className="text-xs font-bold">{losses.length}</p>
              <p className="text-[10px] text-muted-foreground">دروس خسارة</p>
            </div>
          </div>

          {weak.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">أنماط يتجنّبها النظام أو يخفض ثقتها</p>
              {weak.map(([name, v]) => (
                <div key={name} className="flex justify-between text-[11px] py-1">
                  <span>{name}</span>
                  <span className="font-mono text-trading-red">{v.l} خسارة / {v.w} ربح</span>
                </div>
              ))}
            </div>
          )}

          {losses[0] && (
            <p className="text-[10px] text-muted-foreground leading-relaxed p-2 rounded-lg bg-secondary/30">
              آخر درس: {losses[0].lesson}
            </p>
          )}
        </div>
      )}
    </div>
  );
}