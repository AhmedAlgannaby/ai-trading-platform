import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { Loader2, MessageSquare, Newspaper, TrendingUp, Globe, Twitter, Hash } from "lucide-react";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function SentimentAnalysis() {
  const [pair, setPair] = useState("BTC/USDT");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchSentiment = async () => {
    setLoading(true);
    setData(null);
    const coin = pair.split("/")[0];
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت محلل مشاعر متخصص في العملات الرقمية. قم بتحليل مشاعر السوق لعملة ${coin} (${pair}) وأعد النتائج بالتنسيق المطلوب.

- overall_sentiment_score: رقم 0-100 (50=محايد)
- sentiment_label: one of: very_bearish, bearish, neutral, bullish, very_bullish
- fear_greed_index: رقم 0-100
- fear_greed_label: نص مثل "خوف شديد" أو "طمع"
- positive_pct / negative_pct / neutral_pct: نسب مئوية توزيع المشاعر (المجموع 100)
- twitter_topic_1/2/3: أبرز المواضيع على تويتر
- twitter_sentiment_1/2/3: positive أو negative أو neutral
- twitter_score_1/2/3: نسبة المشاعر 0-100
- news_title_1/2/3: عناوين أخبار حديثة
- news_source_1/2/3: مصدر الخبر
- news_sentiment_1/2/3: positive أو negative أو neutral
- news_impact_1/2/3: مرتفع أو متوسط أو منخفض
- keywords: كلمات مفتاحية رائجة مفصولة بفاصلة (10 كلمات)
- history_days: أسماء الأيام السبعة الماضية مفصولة بفاصلة
- history_scores: درجات المشاعر للأيام السبعة مفصولة بفاصلة
- price_correlation: جملة واحدة عن العلاقة بين المشاعر والسعر
- recommendation: توصية قصيرة بناءً على المشاعر
- summary: ملخص التحليل في 2-3 جمل`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_sentiment_score: { type: "number" },
          sentiment_label: { type: "string" },
          fear_greed_index: { type: "number" },
          fear_greed_label: { type: "string" },
          positive_pct: { type: "number" },
          negative_pct: { type: "number" },
          neutral_pct: { type: "number" },
          twitter_topic_1: { type: "string" },
          twitter_sentiment_1: { type: "string" },
          twitter_score_1: { type: "number" },
          twitter_topic_2: { type: "string" },
          twitter_sentiment_2: { type: "string" },
          twitter_score_2: { type: "number" },
          twitter_topic_3: { type: "string" },
          twitter_sentiment_3: { type: "string" },
          twitter_score_3: { type: "number" },
          news_title_1: { type: "string" },
          news_source_1: { type: "string" },
          news_sentiment_1: { type: "string" },
          news_impact_1: { type: "string" },
          news_title_2: { type: "string" },
          news_source_2: { type: "string" },
          news_sentiment_2: { type: "string" },
          news_impact_2: { type: "string" },
          news_title_3: { type: "string" },
          news_source_3: { type: "string" },
          news_sentiment_3: { type: "string" },
          news_impact_3: { type: "string" },
          keywords: { type: "string" },
          history_days: { type: "string" },
          history_scores: { type: "string" },
          price_correlation: { type: "string" },
          recommendation: { type: "string" },
          summary: { type: "string" }
        }
      }
    });
    // Transform flat response into nested structure for UI
    const days = (res.history_days || "").split(",").map(s => s.trim()).filter(Boolean);
    const scores = (res.history_scores || "").split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const keywords = (res.keywords || "").split(",").map(s => s.trim()).filter(Boolean);

    setData({
      overall_sentiment_score: res.overall_sentiment_score,
      sentiment_label: res.sentiment_label,
      fear_greed_index: res.fear_greed_index,
      fear_greed_label: res.fear_greed_label,
      sentiment_distribution: {
        positive: res.positive_pct || 0,
        negative: res.negative_pct || 0,
        neutral: res.neutral_pct || 0,
      },
      twitter_topics: [1, 2, 3].map(i => ({
        topic: res[`twitter_topic_${i}`],
        sentiment: res[`twitter_sentiment_${i}`],
        score: res[`twitter_score_${i}`],
        // لا حجم تغريدات حقيقي متاح — لا نختلق أرقاماً (Phase 5)
      })).filter(t => t.topic),
      news: [1, 2, 3].map(i => ({
        title: res[`news_title_${i}`],
        source: res[`news_source_${i}`],
        sentiment: res[`news_sentiment_${i}`],
        impact: res[`news_impact_${i}`],
        time_ago: "منذ قليل",
      })).filter(n => n.title),
      trending_keywords: keywords,
      sentiment_history: days.map((day, i) => ({ day, score: scores[i] ?? 50 })),
      price_correlation: res.price_correlation,
      recommendation: res.recommendation,
      summary: res.summary,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-trading-yellow/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-trading-yellow" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">تحليل المشاعر</h2>
              <p className="text-xs text-muted-foreground">Twitter / X • الأخبار • المجتمع • الخوف والطمع</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="w-[150px] bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={fetchSentiment} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التحليل...</>
                : <><Globe className="w-4 h-4 ml-2" />تحليل الآن</>
              }
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Twitter className="w-5 h-5 text-primary animate-pulse" />
            <Newspaper className="w-5 h-5 text-trading-yellow animate-pulse" style={{ animationDelay: "0.3s" }} />
            <Globe className="w-5 h-5 text-trading-green animate-pulse" style={{ animationDelay: "0.6s" }} />
          </div>
          <p className="text-muted-foreground text-sm">تحليل تويتر، الأخبار، ومشاعر المجتمع...</p>
        </div>
      )}

      <AnimatePresence>
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SentimentScoreCard score={data.overall_sentiment_score} label={data.sentiment_label} />
              <FearGreedCard value={data.fear_greed_index} label={data.fear_greed_label} />
              <DistributionCard dist={data.sentiment_distribution} />
              <RecommendationCard rec={data.recommendation} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment History */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> المشاعر آخر 7 أيام
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sentiment_history || []}>
                      <defs>
                        <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(45,93%,58%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(45,93%,58%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,14%)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(222,30%,16%)", borderRadius: "8px", fontSize: "11px" }} />
                      <Area type="monotone" dataKey="score" stroke="hsl(45,93%,58%)" fill="url(#sentGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Twitter Topics */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" /> مواضيع تويتر الرائجة
                </h3>
                <div className="space-y-2">
                  {(data.twitter_topics || []).map((t, i) => (
                    <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg ${
                      t.sentiment === "positive" ? "bg-trading-green/5 border border-trading-green/10" :
                      t.sentiment === "negative" ? "bg-trading-red/5 border border-trading-red/10" :
                      "bg-secondary/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">#{t.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${t.sentiment === "positive" ? "bg-trading-green" : t.sentiment === "negative" ? "bg-trading-red" : "bg-trading-yellow"}`}
                            style={{ width: `${t.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono">{t.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-trading-yellow" /> أبرز الأخبار وتأثيرها
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(data.news || []).map((n, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-lg border ${
                      n.sentiment === "positive" ? "bg-trading-green/5 border-trading-green/10" :
                      n.sentiment === "negative" ? "bg-trading-red/5 border-trading-red/10" :
                      "bg-secondary/30 border-border/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-medium leading-snug flex-1">{n.title}</p>
                      <Badge className={`text-[9px] flex-shrink-0 border-0 ${
                        n.sentiment === "positive" ? "bg-trading-green/10 text-trading-green" :
                        n.sentiment === "negative" ? "bg-trading-red/10 text-trading-red" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {n.impact}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{n.source}</span>
                      <span>•</span>
                      <span>{n.time_ago}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Keywords & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-3">الكلمات الأكثر تداولاً</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.trending_keywords || []).map((kw, i) => {
                    const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs"];
                    const opacities = ["opacity-100", "opacity-90", "opacity-75", "opacity-60", "opacity-50"];
                    return (
                      <span key={i} className={`${sizes[i % sizes.length]} ${opacities[i % opacities.length]} font-bold text-primary cursor-default hover:opacity-100 transition-opacity`}>
                        #{kw}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-2">خلاصة التحليل</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
                {data.price_correlation && (
                  <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[11px] text-primary">{data.price_correlation}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!data && !loading && (
        <div className="glass-card p-16 text-center">
          <MessageSquare className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">اضغط "تحليل الآن" لتحليل مشاعر تويتر والأخبار</p>
        </div>
      )}
    </div>
  );
}

function SentimentScoreCard({ score, label }) {
  const labelMap = {
    very_bullish: { text: "إيجابي جداً", color: "text-trading-green" },
    bullish:      { text: "إيجابي",       color: "text-trading-green" },
    neutral:      { text: "محايد",        color: "text-trading-yellow" },
    bearish:      { text: "سلبي",         color: "text-trading-red" },
    very_bearish: { text: "سلبي جداً",    color: "text-trading-red" },
  };
  const cfg = labelMap[label] || labelMap.neutral;
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">مؤشر المشاعر</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${cfg.color}`}>{score}</p>
      <p className={`text-xs mt-0.5 ${cfg.color}`}>{cfg.text}</p>
    </div>
  );
}

function FearGreedCard({ value, label }) {
  const color = value >= 75 ? "text-trading-green" : value >= 55 ? "text-primary" : value >= 45 ? "text-trading-yellow" : value >= 25 ? "text-orange-400" : "text-trading-red";
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">الخوف والطمع</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function DistributionCard({ dist }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground mb-2">توزيع المشاعر</p>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-trading-green rounded-full" style={{ width: `${dist?.positive || 0}%` }} />
        <div className="bg-trading-yellow rounded-full" style={{ width: `${dist?.neutral || 0}%` }} />
        <div className="bg-trading-red rounded-full" style={{ width: `${dist?.negative || 0}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
        <span className="text-trading-green">{dist?.positive || 0}%</span>
        <span className="text-trading-yellow">{dist?.neutral || 0}%</span>
        <span className="text-trading-red">{dist?.negative || 0}%</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }) {
  const isBull = rec?.includes("شراء") || rec?.includes("buy") || rec?.includes("إيجابي");
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">التوصية</p>
      <p className={`text-sm font-semibold mt-1 leading-snug ${isBull ? "text-trading-green" : "text-trading-red"}`}>{rec || "—"}</p>
    </div>
  );
}