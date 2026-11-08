/**
 * AISignalBacktest — يحاكي أداء إشارات AI على بيانات Binance التاريخية الحقيقية
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { Play, Loader2, TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, Brain, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchKlines } from "@/api/marketData";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;
const PERIODS = [
  { label: "آخر أسبوع", days: 7, interval: "1h", limit: 168 },
  { label: "آخر شهر", days: 30, interval: "4h", limit: 180 },
  { label: "آخر 3 أشهر", days: 90, interval: "1d", limit: 90 },
  { label: "آخر 6 أشهر", days: 180, interval: "1d", limit: 180 },
];

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgG = gains / period, avgL = losses / period;
  if (avgL === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgG / avgL)).toFixed(1));
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  closes.forEach((c, i) => { if (i > 0) ema = c * k + ema * (1 - k); });
  return ema;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  return ema12 - ema26;
}

// توليد إشارة من البيانات الفنية
function generateSignalFromCandles(candles) {
  if (candles.length < 30) return null;
  const closes = candles.map(c => c.close);
  const rsi = calcRSI(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes.length >= 50 ? closes : closes, Math.min(50, closes.length));
  const macd = calcMACD(closes);
  const price = closes[closes.length - 1];

  let score = 0;
  let reasons = [];

  // RSI
  if (rsi < 35) { score += 30; reasons.push("RSI ذعر بيع"); }
  else if (rsi > 65) { score -= 30; reasons.push("RSI ذعر شراء"); }
  else if (rsi < 45) { score += 15; reasons.push("RSI منخفض"); }
  else if (rsi > 55) { score -= 15; reasons.push("RSI مرتفع"); }

  // EMA
  if (price > ema20 && ema20 > ema50) { score += 25; reasons.push("السعر فوق EMA20 > EMA50"); }
  else if (price < ema20 && ema20 < ema50) { score -= 25; reasons.push("السعر تحت EMA20 < EMA50"); }

  // MACD
  if (macd > 0) { score += 15; reasons.push("MACD إيجابي"); }
  else { score -= 15; reasons.push("MACD سلبي"); }

  // الزخم الأخير
  const recentChange = (closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4] * 100;
  if (recentChange > 2) { score += 10; reasons.push("زخم صاعد"); }
  else if (recentChange < -2) { score -= 10; reasons.push("زخم هابط"); }

  const confidence = Math.min(95, Math.max(40, 50 + Math.abs(score)));
  const direction = score > 10 ? "buy" : score < -10 ? "sell" : null;
  if (!direction || confidence < 55) return null;

  const atr = candles.slice(-14).reduce((acc, c, i, arr) => {
    if (i === 0) return acc;
    return acc + Math.max(c.high - c.low, Math.abs(c.high - arr[i - 1].close), Math.abs(c.low - arr[i - 1].close));
  }, 0) / 13;

  const slPct = direction === "buy" ? -(1.5 + atr / price * 100) : (1.5 + atr / price * 100);
  const tp1Pct = direction === "buy" ? (3 + atr / price * 100 * 1.5) : -(3 + atr / price * 100 * 1.5);

  return {
    direction,
    confidence: Math.round(confidence),
    entry: price,
    stop_loss: price * (1 + slPct / 100),
    take_profit: price * (1 + tp1Pct / 100),
    reasons,
    rsi,
    macd: macd.toFixed(4),
  };
}

// تقييم نتيجة الإشارة على الشمعات التالية
function evaluateSignal(signal, futureCandles) {
  if (!futureCandles.length) return "expired";
  for (const candle of futureCandles.slice(0, 10)) {
    if (signal.direction === "buy") {
      if (candle.low <= signal.stop_loss) return "loss";
      if (candle.high >= signal.take_profit) return "win";
    } else {
      if (candle.high >= signal.stop_loss) return "loss";
      if (candle.low <= signal.take_profit) return "win";
    }
  }
  const lastClose = futureCandles[Math.min(9, futureCandles.length - 1)].close;
  if (signal.direction === "buy") return lastClose > signal.entry ? "win" : "loss";
  return lastClose < signal.entry ? "win" : "loss";
}

export default function AISignalBacktest() {
  const [pair, setPair] = useState("BTC/USDT");
  const [period, setPeriod] = useState(PERIODS[1]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runBacktest = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    setProgress(5);

    try {
      const symbol = pair.replace("/", "");
      // جلب البيانات التاريخية من Binance (عبر السيرفر المحلي)
      const raw = await fetchKlines(
        symbol,
        period.interval,
        Math.min(period.limit + 20, 1000)
      );
      setProgress(30);

      const candles = raw.map(k => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      // محاكاة الإشارات على نوافذ متحركة
      const signals = [];
      const minWindow = 30;
      const step = Math.max(1, Math.floor(candles.length / 40)); // حوالي 40 إشارة محتملة

      setProgress(50);

      for (let i = minWindow; i < candles.length - 5; i += step) {
        const window = candles.slice(Math.max(0, i - minWindow), i);
        const signal = generateSignalFromCandles(window);
        if (!signal) continue;

        const futureCandles = candles.slice(i, i + 10);
        const outcome = evaluateSignal(signal, futureCandles);
        const pnl = outcome === "win"
          ? Math.abs(signal.take_profit - signal.entry) / signal.entry * 100
          : outcome === "loss"
            ? -Math.abs(signal.entry - signal.stop_loss) / signal.entry * 100
            : 0;

        const date = new Date(candles[i].time).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
        signals.push({ ...signal, outcome, pnl, date, price: signal.entry, index: i });
      }

      setProgress(80);

      if (!signals.length) {
        setError("لم يتم اكتشاف إشارات كافية في هذه الفترة. جرب فترة أطول.");
        setRunning(false);
        return;
      }

      // حساب الإحصائيات
      const wins = signals.filter(s => s.outcome === "win");
      const losses = signals.filter(s => s.outcome === "loss");
      const winRate = (wins.length / signals.length) * 100;
      const avgWin = wins.length ? wins.reduce((a, s) => a + s.pnl, 0) / wins.length : 0;
      const avgLoss = losses.length ? Math.abs(losses.reduce((a, s) => a + s.pnl, 0) / losses.length) : 0;
      const totalPnl = signals.reduce((a, s) => a + s.pnl, 0);
      const profitFactor = avgLoss > 0 ? (wins.length * avgWin) / (losses.length * avgLoss) : 999;

      // منحنى رأس المال
      let balance = 10000;
      const equityCurve = signals.map(s => {
        balance += balance * (s.pnl / 100) * 0.02; // 2% مخاطرة لكل صفقة
        return { date: s.date, value: Math.round(balance) };
      });

      // توزيع الإشارات حسب الاتجاه
      const buySignals = signals.filter(s => s.direction === "buy");
      const sellSignals = signals.filter(s => s.direction === "sell");

      setProgress(100);
      setResults({
        signals, wins, losses, winRate, avgWin, avgLoss, totalPnl,
        profitFactor, equityCurve, buySignals, sellSignals,
        totalReturn: (balance - 10000) / 10000 * 100,
        maxDrawdown: calculateMaxDrawdown(equityCurve),
      });

    } catch (e) {
      setError("فشل في جلب البيانات من Binance. تأكد من اتصالك بالإنترنت.");
    }
    setRunning(false);
  };

  function calculateMaxDrawdown(curve) {
    let max = 0, peak = curve[0]?.value || 10000;
    for (const p of curve) {
      if (p.value > peak) peak = p.value;
      const dd = (peak - p.value) / peak * 100;
      if (dd > max) max = dd;
    }
    return max;
  }

  return (
    <div className="space-y-5">
      {/* إعدادات */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-trading-green/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-trading-green" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">محاكاة إشارات AI الحقيقية</h3>
            <p className="text-[11px] text-muted-foreground">يحلل بيانات Binance التاريخية ويحاكي أداء إشارات الذكاء الاصطناعي</p>
          </div>
          <Badge className="mr-auto bg-trading-green/10 text-trading-green border-0 text-[10px]">
            <Zap className="w-3 h-3 ml-1" /> بيانات حقيقية
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs">زوج العملة</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">الفترة الزمنية</Label>
            <Select value={period.label} onValueChange={v => setPeriod(PERIODS.find(p => p.label === v))}>
              <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={runBacktest} disabled={running} className="w-full bg-trading-green/80 hover:bg-trading-green text-black">
              {running
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التحليل... {progress}%</>
                : <><Play className="w-4 h-4 ml-2" /> تشغيل المحاكاة</>}
            </Button>
          </div>
        </div>

        {running && (
          <Progress value={progress} className="h-1.5" />
        )}

        {error && (
          <div className="flex items-center gap-2 text-trading-red text-xs mt-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* النتائج */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={Target}
                label="نسبة النجاح"
                value={`${results.winRate.toFixed(1)}%`}
                sub={`${results.wins.length} فوز / ${results.losses.length} خسارة`}
                color={results.winRate >= 55 ? "green" : "red"}
              />
              <StatCard
                icon={TrendingUp}
                label="إجمالي العائد"
                value={`${results.totalReturn >= 0 ? "+" : ""}${results.totalReturn.toFixed(1)}%`}
                sub={`PnL: ${results.totalPnl.toFixed(2)}%`}
                color={results.totalReturn >= 0 ? "green" : "red"}
              />
              <StatCard
                icon={TrendingDown}
                label="أقصى سحب"
                value={`${results.maxDrawdown.toFixed(1)}%`}
                sub={`معامل الربح: ${results.profitFactor.toFixed(2)}`}
                color="yellow"
              />
              <StatCard
                icon={Brain}
                label="إجمالي الإشارات"
                value={results.signals.length}
                sub={`متوسط ربح: ${results.avgWin.toFixed(2)}% | خسارة: ${results.avgLoss.toFixed(2)}%`}
                color="cyan"
              />
            </div>

            {/* منحنى رأس المال */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4">منحنى رأس المال (برأس مال $10,000)</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.equityCurve}>
                    <defs>
                      <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={results.totalReturn >= 0 ? "hsl(142,71%,45%)" : "hsl(0,84%,60%)"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={results.totalReturn >= 0 ? "hsl(142,71%,45%)" : "hsl(0,84%,60%)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215,20%,55%)' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(215,20%,55%)' }} tickFormatter={v => `$${(v / 1000).toFixed(1)}K`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,30%,16%)', borderRadius: '8px', fontSize: '11px' }}
                      formatter={v => [`$${v.toLocaleString()}`, "الرصيد"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={results.totalReturn >= 0 ? "hsl(142,71%,45%)" : "hsl(0,84%,60%)"} strokeWidth={2} fill="url(#aiGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* قائمة الإشارات */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">سجل الإشارات المحاكاة</h3>
                <div className="flex gap-2">
                  <Badge className="bg-trading-green/10 text-trading-green border-0 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 ml-1" />{results.wins.length} ناجحة
                  </Badge>
                  <Badge className="bg-trading-red/10 text-trading-red border-0 text-[10px]">
                    <XCircle className="w-3 h-3 ml-1" />{results.losses.length} فاشلة
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                {results.signals.map((sig, i) => (
                  <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-[11px] border ${
                    sig.outcome === "win"
                      ? "bg-trading-green/5 border-trading-green/20"
                      : "bg-trading-red/5 border-trading-red/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      {sig.outcome === "win"
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-trading-green" />
                        : <XCircle className="w-3.5 h-3.5 text-trading-red" />}
                      <span className="text-muted-foreground">{sig.date}</span>
                      <Badge className={`text-[9px] px-1.5 py-0 border-0 ${sig.direction === "buy" ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"}`}>
                        {sig.direction === "buy" ? "شراء" : "بيع"}
                      </Badge>
                      <span className="text-muted-foreground">ثقة: {sig.confidence}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono">${sig.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className={`font-mono font-medium ${sig.pnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                        {sig.pnl >= 0 ? "+" : ""}{sig.pnl.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    green: "hsl(142,71%,45%)",
    red: "hsl(0,84%,60%)",
    yellow: "hsl(45,93%,58%)",
    cyan: "hsl(199,89%,48%)",
  };
  return (
    <div className="glass-card p-4" style={{ borderTop: `2px solid ${colorMap[color]}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: colorMap[color] }} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}