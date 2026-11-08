/**
 * PortfolioRiskAnalysis
 * يحسب معامل بيتا، ارتباط الأصول، ويقترح توزيعاً مثالياً للمحفظة
 * بناءً على بيانات Binance الحقيقية
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";
import { Activity, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchKlines } from "@/api/marketData";

const ASSETS = [
  { symbol: "BTCUSDT", name: "BTC", color: "#F7931A" },
  { symbol: "ETHUSDT", name: "ETH", color: "#627EEA" },
  { symbol: "SOLUSDT", name: "SOL", color: "#9945FF" },
  { symbol: "BNBUSDT", name: "BNB", color: "#F0B90B" },
  { symbol: "XRPUSDT", name: "XRP", color: "#00AAE4" },
  { symbol: "ADAUSDT", name: "ADA", color: "#0033AD" },
];

async function fetchReturns(symbol) {
  const data = await fetchKlines(symbol, '1d', 60);
  const closes = data.map(k => parseFloat(k[4]));
  // حساب العوائد اليومية
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return { returns, price: closes[closes.length - 1], closes };
}

function calcCorrelation(a, b) {
  const n = Math.min(a.length, b.length);
  const ax = a.slice(-n), bx = b.slice(-n);
  const meanA = ax.reduce((s, v) => s + v, 0) / n;
  const meanB = bx.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ax[i] - meanA) * (bx[i] - meanB);
    da += (ax[i] - meanA) ** 2;
    db += (bx[i] - meanB) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

function calcBeta(assetReturns, marketReturns) {
  const corr = calcCorrelation(assetReturns, marketReturns);
  const stdAsset = Math.sqrt(assetReturns.reduce((s, v) => s + v ** 2, 0) / assetReturns.length);
  const stdMarket = Math.sqrt(marketReturns.reduce((s, v) => s + v ** 2, 0) / marketReturns.length);
  return stdMarket > 0 ? corr * (stdAsset / stdMarket) : 1;
}

function calcVolatility(returns) {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(365) * 100; // تحويل لتقلب سنوي %
}

function calcSharpe(returns) {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length * 365;
  const vol = calcVolatility(returns) / 100;
  const rf = 0.05; // معدل خالٍ من المخاطر 5%
  return vol > 0 ? ((mean - rf) / vol).toFixed(2) : "0";
}

// توزيع مثالي بناءً على نسبة Sharpe (Inverse Volatility Weighting)
function calcOptimalAllocation(assets) {
  const invVols = assets.map(a => a.volatility > 0 ? 1 / a.volatility : 0);
  const total = invVols.reduce((s, v) => s + v, 0);
  return invVols.map(v => total > 0 ? Math.round(v / total * 100) : Math.round(100 / assets.length));
}

export default function PortfolioRiskAnalysis() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(0);

  const analyze = async () => {
    setLoading(true);
    setData(null);
    setProgress(10);

    // جلب بيانات جميع الأصول
    const results = await Promise.all(ASSETS.map(a => fetchReturns(a.symbol)));
    setProgress(60);

    const btcReturns = results[0].returns; // BTC كمرجع السوق

    const assets = ASSETS.map((asset, i) => {
      const { returns, price } = results[i];
      const beta = i === 0 ? 1.0 : parseFloat(calcBeta(returns, btcReturns).toFixed(2));
      const volatility = parseFloat(calcVolatility(returns).toFixed(1));
      const sharpe = parseFloat(calcSharpe(returns));
      const avgReturn = parseFloat((returns.reduce((s, v) => s + v, 0) / returns.length * 365 * 100).toFixed(1));
      return { ...asset, returns, price, beta, volatility, sharpe, avgReturn };
    });

    // مصفوفة الارتباط
    const corrMatrix = ASSETS.map((_, i) =>
      ASSETS.map((_, j) => parseFloat(calcCorrelation(results[i].returns, results[j].returns).toFixed(2)))
    );

    // التوزيع المثالي
    const optimalWeights = calcOptimalAllocation(assets);

    setProgress(90);

    // تقييم مخاطر المحفظة الحالية (توزيع متساوٍ)
    const equalWeights = assets.map(() => Math.round(100 / assets.length));
    const portfolioBeta = assets.reduce((s, a, i) => s + a.beta * equalWeights[i] / 100, 0);
    const portfolioVol = Math.sqrt(
      assets.reduce((s, a, i) =>
        s + (equalWeights[i] / 100) ** 2 * (a.volatility / 100) ** 2, 0)
    ) * 100;

    const optPortfolioBeta = assets.reduce((s, a, i) => s + a.beta * optimalWeights[i] / 100, 0);
    const optPortfolioVol = Math.sqrt(
      assets.reduce((s, a, i) =>
        s + (optimalWeights[i] / 100) ** 2 * (a.volatility / 100) ** 2, 0)
    ) * 100;

    setData({ assets, corrMatrix, optimalWeights, equalWeights, portfolioBeta, portfolioVol, optPortfolioBeta, optPortfolioVol });
    setProgress(100);
    setLoading(false);
  };

  const getCorrColor = (val) => {
    if (val >= 0.8) return "text-trading-red";
    if (val >= 0.5) return "text-trading-yellow";
    return "text-trading-green";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-trading-purple/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-trading-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">تحليل مخاطر المحفظة</h3>
              <p className="text-[11px] text-muted-foreground">معامل بيتا · ارتباط الأصول · التوزيع الأمثل</p>
            </div>
          </div>
          <Button onClick={analyze} disabled={loading} size="sm" className="bg-trading-purple/80 hover:bg-trading-purple text-white gap-2">
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> تحليل... {progress}%</>
              : <><RefreshCw className="w-3.5 h-3.5" /> تحليل المحفظة</>}
          </Button>
        </div>
        {loading && <Progress value={progress} className="h-1 mt-3" />}
      </div>

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* مقارنة المحفظة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-trading-yellow" /> المحفظة الحالية (توزيع متساوٍ)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-secondary/40">
                    <p className="text-[10px] text-muted-foreground">معامل بيتا</p>
                    <p className={`text-2xl font-bold font-mono ${data.portfolioBeta > 1.2 ? "text-trading-red" : data.portfolioBeta > 0.8 ? "text-trading-yellow" : "text-trading-green"}`}>
                      {data.portfolioBeta.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/40">
                    <p className="text-[10px] text-muted-foreground">التقلب السنوي</p>
                    <p className="text-2xl font-bold font-mono text-trading-yellow">{data.portfolioVol.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4 border border-trading-green/20">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-trading-green" /> المحفظة المثلى (مقترح AI)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-trading-green/5">
                    <p className="text-[10px] text-muted-foreground">معامل بيتا</p>
                    <p className={`text-2xl font-bold font-mono text-trading-green`}>
                      {data.optPortfolioBeta.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-trading-green/5">
                    <p className="text-[10px] text-muted-foreground">التقلب السنوي</p>
                    <p className="text-2xl font-bold font-mono text-trading-green">{data.optPortfolioVol.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* بيتا وبيانات الأصول */}
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold mb-4">معامل بيتا والتقلب لكل أصل</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.assets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(222,30%,16%)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v, name) => [v, name === "beta" ? "معامل بيتا" : "تقلب %"]}
                    />
                    <Bar dataKey="beta" name="beta" radius={[4, 4, 0, 0]}>
                      {data.assets.map((a, i) => (
                        <Cell key={i} fill={a.beta > 1.2 ? "hsl(0,84%,60%)" : a.beta > 0.8 ? "hsl(45,93%,58%)" : "hsl(142,71%,45%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {data.assets.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-[11px]">
                    <span className="w-10 font-medium" style={{ color: a.color }}>{a.name}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-muted-foreground w-12">β={a.beta}</span>
                      <div className="flex-1 bg-secondary rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(a.volatility, 150) / 1.5}%`, backgroundColor: a.color }} />
                      </div>
                      <span className="text-muted-foreground w-14 text-left">vol: {a.volatility}%</span>
                    </div>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 ${a.sharpe > 1 ? "bg-trading-green/20 text-trading-green" : a.sharpe > 0 ? "bg-trading-yellow/20 text-trading-yellow" : "bg-trading-red/20 text-trading-red"}`}>
                      Sharpe: {a.sharpe}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* مصفوفة الارتباط */}
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold mb-4">مصفوفة ارتباط الأصول</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-muted-foreground text-right"></th>
                      {ASSETS.map(a => (
                        <th key={a.symbol} className="p-1.5 text-center font-medium" style={{ color: a.color }}>{a.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ASSETS.map((rowAsset, i) => (
                      <tr key={i}>
                        <td className="p-1.5 font-medium" style={{ color: rowAsset.color }}>{rowAsset.name}</td>
                        {data.corrMatrix[i].map((corr, j) => (
                          <td key={j} className={`p-1.5 text-center font-mono font-medium ${i === j ? "text-muted-foreground" : getCorrColor(corr)}`}
                            style={{ background: i === j ? "transparent" : `rgba(${corr > 0.7 ? "239,68,68" : corr > 0.4 ? "234,179,8" : "34,197,94"}, ${Math.abs(corr) * 0.12})` }}>
                            {i === j ? "—" : corr.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-trading-green inline-block" /> ارتباط منخفض (جيد)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-trading-yellow inline-block" /> ارتباط متوسط</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-trading-red inline-block" /> ارتباط مرتفع (خطر)</span>
              </div>
            </div>

            {/* التوزيع الأمثل */}
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold mb-1">التوزيع الأمثل المقترح</h4>
              <p className="text-[11px] text-muted-foreground mb-4">بناءً على نموذج Inverse Volatility Weighting لتقليل المخاطر</p>
              <div className="space-y-3">
                {data.assets.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] font-medium w-10" style={{ color: a.color }}>{a.name}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>حالي: {data.equalWeights[i]}%</span>
                        <span className="text-trading-green font-medium">مقترح: {data.optimalWeights[i]}%</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="absolute h-full rounded-full bg-secondary-foreground/20" style={{ width: `${data.equalWeights[i]}%` }} />
                        <div className="absolute h-full rounded-full transition-all duration-700" style={{ width: `${data.optimalWeights[i]}%`, backgroundColor: a.color, opacity: 0.8 }} />
                      </div>
                    </div>
                    <Badge className={`text-[9px] px-1.5 border-0 ${data.optimalWeights[i] > data.equalWeights[i] ? "bg-trading-green/20 text-trading-green" : data.optimalWeights[i] < data.equalWeights[i] ? "bg-trading-red/20 text-trading-red" : "bg-secondary text-muted-foreground"}`}>
                      {data.optimalWeights[i] > data.equalWeights[i] ? "▲ زيادة" : data.optimalWeights[i] < data.equalWeights[i] ? "▼ تقليل" : "= ثابت"}
                    </Badge>
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