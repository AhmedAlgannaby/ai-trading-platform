import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Store, Star, Zap, BarChart3 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import StrategyCard from "@/components/strategy/StrategyCard";
import BacktestModal from "@/components/strategy/BacktestModal";

const CATEGORIES = [
  { value: "all", label: "الكل" },
  { value: "trend_following", label: "📈 اتجاه السوق" },
  { value: "mean_reversion", label: "🔄 الارتداد" },
  { value: "breakout", label: "⚡ الاختراق" },
  { value: "scalping", label: "⚡ سكالبينج" },
  { value: "swing", label: "🌊 سوينج" },
  { value: "ai_hybrid", label: "🤖 AI هجين" },
];

const SEED_STRATEGIES = [
  {
    name: "EMA Crossover Pro",
    spec_id: "ema_cross_pro",
    description: "استراتيجية تقاطع المتوسطات المتحركة الأسية مع تأكيد من مؤشر RSI وحجم التداول. تعمل بشكل ممتاز في أسواق الاتجاه الواضح.",
    category: "trend_following",
    timeframes: ["1h","4h","1d"],
    indicators: ["EMA 20","EMA 50","RSI","Volume"],
    default_params: { risk: 2, sl: 2, tp: 6 },
    risk_level: "medium",
    avg_win_rate: 62,
    avg_return: 34,
    times_used: 847,
    is_featured: true,
    tags: ["trending","popular"]
  },
  {
    name: "RSI Divergence Hunter",
    spec_id: "rsi_divergence",
    description: "يكتشف الاختلافات بين السعر ومؤشر RSI للتنبؤ بانعكاسات الاتجاه. فعّال جداً في نقاط الذروة.",
    category: "mean_reversion",
    timeframes: ["4h","1d"],
    indicators: ["RSI","MACD","Bollinger Bands"],
    default_params: { risk: 1.5, sl: 3, tp: 9 },
    risk_level: "medium",
    avg_win_rate: 58,
    avg_return: 41,
    times_used: 623,
    is_featured: true,
    tags: ["divergence","reversal"]
  },
  {
    name: "Breakout Sniper",
    spec_id: "breakout_sniper",
    description: "يرصد اختراقات مستويات الدعم والمقاومة مع تأكيد من الحجم والزخم. يستهدف تحركات كبيرة بعد فترات تداول ضيقة.",
    category: "breakout",
    timeframes: ["15m","1h","4h"],
    indicators: ["Support/Resistance","Volume","ATR","Momentum"],
    default_params: { risk: 2, sl: 1.5, tp: 7.5 },
    risk_level: "high",
    avg_win_rate: 54,
    avg_return: 52,
    times_used: 512,
    is_featured: false,
    tags: ["breakout","volatile"]
  },
  {
    name: "Scalping Lightning",
    spec_id: "stoch_scalper",
    description: "استراتيجية سكالبينج سريعة تعتمد على مؤشر Stochastic و VWAP في إطارات زمنية قصيرة. تناسب المتداولين النشطين.",
    category: "scalping",
    timeframes: ["1m","5m","15m"],
    indicators: ["Stochastic","VWAP","EMA 9","EMA 21"],
    default_params: { risk: 0.5, sl: 0.8, tp: 1.6 },
    risk_level: "high",
    avg_win_rate: 67,
    avg_return: 28,
    times_used: 1203,
    is_featured: false,
    tags: ["scalping","fast","active"]
  },
  {
    name: "Swing Master AI",
    spec_id: "swing_master",
    description: "يجمع بين تحليل الموجات ومستويات فيبوناتشي ومؤشرات الزخم لتحديد نقاط الدخول المثلى في صفقات السوينج.",
    category: "swing",
    timeframes: ["4h","1d","3d"],
    indicators: ["Fibonacci","Elliott Waves","MACD","Ichimoku"],
    default_params: { risk: 2, sl: 4, tp: 12 },
    risk_level: "medium",
    avg_win_rate: 60,
    avg_return: 67,
    times_used: 389,
    is_featured: true,
    tags: ["swing","fibonacci","long-term"]
  },
  {
    name: "AI Sentiment Trader",
    spec_id: "ai_sentiment_hybrid",
    description: "يدمج تحليل المشاعر من وسائل التواصل الاجتماعي مع التحليل الفني للحصول على إشارات عالية الدقة.",
    category: "ai_hybrid",
    timeframes: ["1h","4h"],
    indicators: ["Sentiment Score","RSI","MACD","On-Chain Data"],
    default_params: { risk: 2, sl: 3, tp: 9 },
    risk_level: "medium",
    avg_win_rate: 71,
    avg_return: 89,
    times_used: 234,
    is_featured: true,
    tags: ["ai","sentiment","hybrid"]
  },
  {
    name: "Bollinger Squeeze",
    spec_id: "bb_squeeze",
    description: "يستغل ضغط نطاقات بولينجر للدخول قبيل الانفجارات السعرية الكبيرة. عائد ممتاز مع مخاطر منضبطة.",
    category: "breakout",
    timeframes: ["1h","4h","1d"],
    indicators: ["Bollinger Bands","Keltner Channel","ATR","Volume"],
    default_params: { risk: 1.5, sl: 2, tp: 8 },
    risk_level: "medium",
    avg_win_rate: 56,
    avg_return: 45,
    times_used: 445,
    is_featured: false,
    tags: ["volatility","squeeze"]
  },
  {
    name: "MACD Momentum Wave",
    spec_id: "macd_wave",
    description: "يتابع زخم السوق بدقة عبر MACD المُعدَّل مع فلترة إضافية للإشارات الضعيفة. ممتاز للأسواق المتأرجحة.",
    category: "trend_following",
    timeframes: ["4h","1d"],
    indicators: ["MACD","Signal Line","Histogram","Volume MA"],
    default_params: { risk: 2, sl: 2.5, tp: 7.5 },
    risk_level: "low",
    avg_win_rate: 64,
    avg_return: 38,
    times_used: 678,
    is_featured: false,
    tags: ["momentum","macd","reliable"]
  },
];

export default function StrategyMarketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const qc = useQueryClient();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ["strategy_templates"],
    queryFn: async () => {
      const list = await base44.entities.StrategyTemplate.list("-times_used");
      return list;
    },
  });

  const { data: backtestResults = [] } = useQuery({
    queryKey: ["backtest_results_count"],
    queryFn: () => base44.entities.BacktestResult.list("-created_date", 5),
  });

  // Phase 5: النتائج المقاسة حقيقياً (walk-forward) بدل الأرقام التسويقية
  const { data: measuredScores = [] } = useQuery({
    queryKey: ["strategy_scores"],
    queryFn: () => base44.entities.StrategyScore.list("-created_date", 200),
  });
  const measuredBySpec = {};
  for (const row of measuredScores) {
    if (row.strategy_id && !measuredBySpec[row.strategy_id]) {
      measuredBySpec[row.strategy_id] = {
        win_rate: row.oos_win_rate,
        oos_return: row.oos_return_percent,
        oos_trades: row.oos_trades,
        score: row.score,
      };
    }
  }

  // Seed default strategies if empty
  const seedStrategies = async () => {
    setSeeded(true);
    await base44.entities.StrategyTemplate.bulkCreate(SEED_STRATEGIES);
    qc.invalidateQueries({ queryKey: ["strategy_templates"] });
  };

  const filtered = strategies.filter(s => {
    const matchCat = category === "all" || s.category === category;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.includes(search) || s.tags?.some(t => t.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(s => s.is_featured);
  const others = filtered.filter(s => !s.is_featured);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Strategy Marketplace
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            اختر استراتيجية واختبرها على بيانات تاريخية مع اقتراح AI للمعاملات المثلى
          </p>
        </div>
        <div className="flex items-center gap-2">
          {backtestResults.length > 0 && (
            <Badge className="bg-primary/20 text-primary border-0 gap-1.5">
              <BarChart3 className="w-3 h-3" />
              {backtestResults.length} اختبار مكتمل
            </Badge>
          )}
          {strategies.length === 0 && !isLoading && (
            <Button size="sm" onClick={seedStrategies} disabled={seeded} className="gap-2">
              <Zap className="w-3.5 h-3.5" />
              تحميل الاستراتيجيات
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن استراتيجية..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 bg-secondary border-0 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                category === c.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-64 animate-pulse bg-secondary/30 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد استراتيجيات. اضغط "تحميل الاستراتيجيات" لإضافة الاستراتيجيات الجاهزة.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Featured */}
          {featured.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-trading-yellow">
                <Star className="w-4 h-4 fill-trading-yellow" /> المميزة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {featured.map((s, i) => (
                  <StrategyCard key={s.id} strategy={s} measured={measuredBySpec[s.spec_id]} index={i} onBacktest={setSelectedStrategy} />
                ))}
              </div>
            </div>
          )}

          {/* Others */}
          {others.length > 0 && (
            <div className="space-y-3">
              {featured.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground">باقي الاستراتيجيات</h3>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {others.map((s, i) => (
                  <StrategyCard key={s.id} strategy={s} measured={measuredBySpec[s.spec_id]} index={i + featured.length} onBacktest={setSelectedStrategy} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backtest Modal */}
      <AnimatePresence>
        {selectedStrategy && (
          <BacktestModal
            strategy={selectedStrategy}
            onClose={() => setSelectedStrategy(null)}
            onComplete={() => qc.invalidateQueries({ queryKey: ["backtest_results_count"] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}