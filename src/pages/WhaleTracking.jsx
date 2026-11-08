import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Loader2, Fish, ArrowUpRight, ArrowDownRight, Eye, DollarSign, Activity, RefreshCw } from "lucide-react";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function WhaleTracking() {
  const [pair, setPair] = useState("BTC/USDT");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchWhaleData = async () => {
    setLoading(true);
    setData(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت محلل بلوكتشين متخصص في تتبع حركات الحيتان (Whale Tracking) لزوج ${pair}.

قدّم تقريراً شاملاً يشمل:
1. آخر 6 تحويلات ضخمة للحيتان (أكثر من مليون دولار) مع التفاصيل
2. توزيع الحيازات حسب حجم المحفظة (top 10, 11-50, 51-100, retail)
3. نشاط التبادلات (inflows vs outflows) في آخر 24 ساعة
4. مخطط تراكم/توزيع الحيتان آخر 7 أيام (7 نقاط)
5. تفسير شامل: هل الحيتان تتراكم أم تبيع؟
6. تأثير متوقع على السعر خلال 48 ساعة
7. مؤشر smart money (0-100) يقيس قوة المؤسسيين`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          smart_money_index: { type: "number" },
          whale_sentiment: { type: "string", enum: ["accumulating", "distributing", "neutral"] },
          price_impact_48h: { type: "string" },
          summary: { type: "string" },
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                amount_usd: { type: "number" },
                amount_coin: { type: "number" },
                type: { type: "string" },
                direction: { type: "string" },
                time_ago: { type: "string" }
              }
            }
          },
          holdings_distribution: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                percent: { type: "number" },
                usd_value: { type: "string" }
              }
            }
          },
          exchange_flows: {
            type: "object",
            properties: {
              inflow_24h: { type: "number" },
              outflow_24h: { type: "number" },
              net_flow: { type: "number" },
              trend: { type: "string" }
            }
          },
          accumulation_chart: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                accumulation: { type: "number" },
                distribution: { type: "number" }
              }
            }
          }
        }
      }
    });
    setData(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-trading-purple/10 flex items-center justify-center">
              <Fish className="w-6 h-6 text-trading-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">تتبع الحيتان (Whale Tracking)</h2>
              <p className="text-xs text-muted-foreground">مراقبة تحركات الأموال الكبيرة والمؤسسية</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="w-[150px] bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={fetchWhaleData} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التحليل...</>
                : <><RefreshCw className="w-4 h-4 ml-2" />تحليل الحيتان</>
              }
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-12 text-center">
          <Fish className="w-12 h-12 text-primary/30 mx-auto mb-3 animate-bounce" />
          <p className="text-muted-foreground text-sm">تحليل بيانات البلوكتشين والتحركات الكبيرة...</p>
        </div>
      )}

      <AnimatePresence>
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SmartMoneyCard value={data.smart_money_index} />
              <WhaleFlowCard flows={data.exchange_flows} />
              <SentimentCard sentiment={data.whale_sentiment} />
              <ImpactCard impact={data.price_impact_48h} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Accumulation Chart */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> تراكم / توزيع (7 أيام)
                </h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.accumulation_chart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,14%)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(222,30%,16%)", borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="accumulation" name="تراكم" fill="hsl(142,71%,45%)" radius={[3,3,0,0]} />
                      <Bar dataKey="distribution" name="توزيع" fill="hsl(0,84%,60%)" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Holdings Distribution */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-trading-yellow" /> توزيع الحيازات
                </h3>
                <div className="space-y-3">
                  {(data.holdings_distribution || []).map((h, i) => {
                    const colors = ["hsl(262,83%,58%)", "hsl(199,89%,48%)", "hsl(142,71%,45%)", "hsl(45,93%,58%)"];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{h.label}</span>
                          <div className="flex gap-3">
                            <span className="font-mono">{h.usd_value}</span>
                            <span className="font-bold" style={{ color: colors[i % colors.length] }}>{h.percent}%</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${h.percent}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Whale Transactions */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> آخر التحركات الكبيرة
              </h3>
              <div className="space-y-2">
                {(data.transactions || []).map((tx, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      tx.direction === "exchange_inflow" || tx.type === "sell"
                        ? "bg-trading-red/5 border-trading-red/10"
                        : "bg-trading-green/5 border-trading-green/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {tx.direction === "exchange_inflow" || tx.type === "sell"
                        ? <ArrowDownRight className="w-5 h-5 text-trading-red flex-shrink-0" />
                        : <ArrowUpRight className="w-5 h-5 text-trading-green flex-shrink-0" />
                      }
                      <div>
                        <p className="text-xs font-medium">{tx.from} → {tx.to}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.time_ago}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-mono font-bold">${(tx.amount_usd / 1e6).toFixed(2)}M</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{tx.amount_coin?.toLocaleString()} {pair.split("/")[0]}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-2">تفسير الحركة</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!data && !loading && (
        <div className="glass-card p-16 text-center">
          <Fish className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">اضغط "تحليل الحيتان" لمراقبة التحركات المؤسسية الكبيرة</p>
        </div>
      )}
    </div>
  );
}

function SmartMoneyCard({ value }) {
  const pct = value ?? 0;
  const color = pct >= 70 ? "text-trading-green" : pct >= 40 ? "text-trading-yellow" : "text-trading-red";
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">Smart Money Index</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{pct}</p>
      <div className="h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
        <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WhaleFlowCard({ flows }) {
  const net = flows?.net_flow ?? 0;
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">صافي التدفق 24h</p>
      <p className={`text-xl font-bold font-mono mt-1 ${net >= 0 ? "text-trading-red" : "text-trading-green"}`}>
        {net >= 0 ? "+" : ""}{net?.toFixed(0)}M
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{net >= 0 ? "تدفق للبورصات (بيع)" : "خروج من البورصات (تراكم)"}</p>
    </div>
  );
}

function SentimentCard({ sentiment }) {
  const map = {
    accumulating: { label: "تراكم 🐋", color: "text-trading-green" },
    distributing:  { label: "توزيع / بيع", color: "text-trading-red" },
    neutral:       { label: "محايد", color: "text-trading-yellow" },
  };
  const cfg = map[sentiment] || map.neutral;
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">سلوك الحيتان</p>
      <p className={`text-xl font-bold mt-1 ${cfg.color}`}>{cfg.label}</p>
    </div>
  );
}

function ImpactCard({ impact }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] text-muted-foreground">التأثير المتوقع 48h</p>
      <p className="text-sm font-medium mt-1 text-foreground leading-snug">{impact || "—"}</p>
    </div>
  );
}