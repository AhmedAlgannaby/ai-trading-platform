import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Calendar, RefreshCw, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const IMPACT_CONFIG = {
  high:   { label: "عالي", color: "text-trading-red",    bg: "bg-trading-red/10",    border: "border-trading-red/30",    icon: "🔴" },
  medium: { label: "متوسط", color: "text-trading-yellow", bg: "bg-trading-yellow/10", border: "border-trading-yellow/30", icon: "🟡" },
  low:    { label: "منخفض", color: "text-trading-green",  bg: "bg-trading-green/10",  border: "border-trading-green/30",  icon: "🟢" },
};

export default function EconomicCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [noKey, setNoKey] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `أنت محلل اقتصادي. قدم قائمة بـ 6 أحداث اقتصادية مهمة تؤثر على أسعار العملات الرقمية (Bitcoin وEthereum) هذا الأسبوع (الأسبوع الذي يحتوي على تاريخ ${new Date().toISOString().split('T')[0]}). 
        
        ركز على: قرارات الفائدة (Fed/ECB)، بيانات التضخم (CPI/PCE)، بيانات التوظيف (NFP)، تصريحات رؤساء البنوك المركزية، بيانات GDP، إعلانات ETF البيتكوين.
        
        أعد JSON مع تاريخ ووقت واقعيين لهذا الأسبوع.`,
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  title_en: { type: "string" },
                  date: { type: "string" },
                  time: { type: "string" },
                  impact: { type: "string", enum: ["high", "medium", "low"] },
                  currency: { type: "string" },
                  forecast: { type: "string" },
                  previous: { type: "string" },
                  crypto_effect: { type: "string" },
                  direction: { type: "string", enum: ["bullish", "bearish", "neutral"] }
                }
              }
            }
          }
        }
      });
      setEvents(result?.events || []);
      setLastUpdated(new Date());
    } catch {
      // Phase 5: بلا مفتاح LLM لا أحداث حقيقية — حالة صريحة بدل بيانات قديمة ملفقة
      setEvents([]);
      setNoKey(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const directionIcon = (d) => d === "bullish" ? "↑" : d === "bearish" ? "↓" : "→";
  const directionColor = (d) => d === "bullish" ? "text-trading-green" : d === "bearish" ? "text-trading-red" : "text-trading-yellow";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">التقويم الاقتصادي</h3>
        </div>
        <button
          onClick={fetchEvents}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : noKey || events.length === 0 ? (
        <div className="p-4 rounded-lg bg-secondary/30 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            لا توجد أحداث — التقويم الاقتصادي يحتاج مفتاح LLM في ملف .env
            (بلا مفتاح لا نعرض تواريخ مختلقة).
          </p>
        </div>
      ) : (
        <>
        <p className="text-[10px] text-muted-foreground mb-2 text-center">
          الأحداث مولّدة بالذكاء الاصطناعي — تحقق من التواريخ قبل الاعتماد عليها
        </p>
        <div className="space-y-2.5">
          {events.map((ev, i) => {
            const cfg = IMPACT_CONFIG[ev.impact] || IMPACT_CONFIG.medium;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px]">{cfg.icon}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{ev.title}</span>
                      <Badge className={`text-[9px] border-0 px-1.5 py-0 h-4 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{ev.date}</span>
                      <span>•</span>
                      <span>{ev.time}</span>
                      <span>•</span>
                      <span className="font-mono">{ev.currency}</span>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <div className="text-[10px] text-muted-foreground">التوقع</div>
                    <div className="text-xs font-mono font-semibold">{ev.forecast}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <span className={`font-medium ${directionColor(ev.direction)}`}>
                    {directionIcon(ev.direction)}
                  </span>
                  <span className="text-muted-foreground truncate">{ev.crypto_effect}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        </>
      )}

      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
        </p>
      )}
    </motion.div>
  );
}