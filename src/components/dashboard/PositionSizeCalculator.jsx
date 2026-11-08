import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calculator, Info, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { fetchTickers } from "@/api/marketData";
import { TRADING_PAIRS } from "@/lib/pairs";

export default function PositionSizeCalculator() {
  const [riskPercent, setRiskPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [currentPrice, setCurrentPrice] = useState(null);
  const [pair, setPair] = useState("BTC/USDT");

  const { data: settings } = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
    initialData: [],
  });

  const balance = settings[0]?.paper_balance || 10000;

  // جلب السعر الحالي لملء سعر الدخول تلقائياً
  useEffect(() => {
    const symbol = pair.replace("/", "");
    fetchTickers([symbol])
      .then(rows => {
        const price = parseFloat(rows[0]?.lastPrice);
        if (!isFinite(price)) return;
        setCurrentPrice(price);
        setEntryPrice(price.toFixed(pair.includes("BTC") ? 2 : 4));
      })
      .catch(() => {});
  }, [pair]);

  // حسابات
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const riskAmount = (balance * riskPercent) / 100;
  const slDistance = entry && sl ? Math.abs(entry - sl) : 0;
  const slPercent = entry && slDistance ? (slDistance / entry) * 100 : 0;
  const positionSize = slDistance > 0 ? riskAmount / (slDistance / entry) : 0;
  const quantity = positionSize && entry ? positionSize / entry : 0;
  const riskReward = slDistance > 0 ? (slDistance * 2) / slDistance : 0; // افتراض TP = 2x SL
  const tp1 = entry && slDistance ? entry + slDistance * 1.5 : 0;
  const tp2 = entry && slDistance ? entry + slDistance * 2.5 : 0;
  const isValid = positionSize > 0 && positionSize <= balance;

  const PAIRS = TRADING_PAIRS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-trading-yellow/20 flex items-center justify-center">
          <Calculator className="w-3.5 h-3.5 text-trading-yellow" />
        </div>
        <h3 className="text-sm font-semibold">حاسبة حجم الصفقة الأمثل</h3>
        <div className="mr-auto flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
          <Info className="w-3 h-3" />
          <span>تعليمي</span>
        </div>
      </div>

      {/* اختيار الزوج */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {PAIRS.map(p => (
          <button
            key={p}
            onClick={() => setPair(p)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              pair === p ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.split("/")[0]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* نسبة المخاطرة */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">نسبة المخاطرة من الرصيد</Label>
            <div className="flex items-center gap-1">
              <span className={`text-sm font-bold font-mono ${riskPercent <= 2 ? "text-trading-green" : riskPercent <= 5 ? "text-trading-yellow" : "text-trading-red"}`}>
                {riskPercent}%
              </span>
              <span className="text-[10px] text-muted-foreground">= ${riskAmount.toFixed(2)}</span>
            </div>
          </div>
          <Slider
            value={[riskPercent]}
            onValueChange={([v]) => setRiskPercent(v)}
            min={0.5} max={10} step={0.5}
            className="mb-1"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span className="text-trading-green">0.5% محافظ</span>
            <span className="text-trading-yellow">2% معتدل</span>
            <span className="text-trading-red">10% عالي</span>
          </div>
        </div>

        {/* الأسعار */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">سعر الدخول</Label>
            <div className="relative">
              <Input
                type="number"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                className="bg-secondary text-sm font-mono pr-7"
                placeholder="0.00"
              />
              <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
            {currentPrice && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                السعر الحالي: ${currentPrice?.toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">وقف الخسارة (SL)</Label>
            <div className="relative">
              <Input
                type="number"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                className="bg-secondary text-sm font-mono pr-7 border-trading-red/20"
                placeholder="0.00"
              />
              <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-trading-red/50" />
            </div>
            {slPercent > 0 && (
              <p className="text-[10px] text-trading-red mt-0.5">
                المسافة: {slPercent.toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* النتائج */}
        {isValid ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-trading-green/5 border border-trading-green/20 space-y-2"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-trading-green" />
              <span className="text-xs font-semibold text-trading-green">الحجم الأمثل للصفقة</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-secondary/40 rounded-md p-2">
                <p className="text-muted-foreground">حجم الصفقة</p>
                <p className="font-mono font-bold text-foreground text-sm">${positionSize.toFixed(2)}</p>
              </div>
              <div className="bg-secondary/40 rounded-md p-2">
                <p className="text-muted-foreground">الكمية ({pair.split("/")[0]})</p>
                <p className="font-mono font-bold text-foreground text-sm">
                  {quantity < 0.001 ? quantity.toFixed(6) : quantity.toFixed(4)}
                </p>
              </div>
              <div className="bg-secondary/40 rounded-md p-2">
                <p className="text-muted-foreground">TP الأول</p>
                <p className="font-mono font-bold text-trading-green">${tp1.toFixed(2)}</p>
              </div>
              <div className="bg-secondary/40 rounded-md p-2">
                <p className="text-muted-foreground">TP الثاني</p>
                <p className="font-mono font-bold text-trading-green">${tp2.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
              <span>الرصيد التجريبي: <span className="font-mono text-foreground">${balance.toLocaleString()}</span></span>
              <span>المخاطرة: <span className="font-mono text-trading-red">${riskAmount.toFixed(2)}</span></span>
              <span>R:R ≈ <span className="font-mono text-trading-yellow">1:2</span></span>
            </div>
          </motion.div>
        ) : (
          entry > 0 && sl > 0 ? (
            <div className="p-3 rounded-lg bg-trading-red/5 border border-trading-red/20 flex items-center gap-2 text-xs text-trading-red">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>الحجم المحسوب يتجاوز الرصيد أو البيانات غير صحيحة</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-secondary/30 text-center text-[11px] text-muted-foreground">
              أدخل سعر الدخول ووقف الخسارة لحساب الحجم الأمثل
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}