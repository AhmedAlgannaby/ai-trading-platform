import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Share2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function ShareSignalModal({ onClose, onShared }) {
  const [form, setForm] = useState({
    pair: "BTC/USDT",
    direction: "buy",
    confidence: 70,
    entry_price: "",
    stop_loss: "",
    take_profit_1: "",
    take_profit_2: "",
    timeframe: "1H",
    strategy: "تحليل يدوي",
    analysis_summary: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleShare = async () => {
    if (!form.entry_price || !form.stop_loss || !form.take_profit_1) return;
    setSaving(true);
    await base44.entities.Signal.create({
      ...form,
      entry_price: parseFloat(form.entry_price),
      stop_loss: parseFloat(form.stop_loss),
      take_profit_1: parseFloat(form.take_profit_1),
      take_profit_2: form.take_profit_2 ? parseFloat(form.take_profit_2) : undefined,
      status: "pending",
    });
    setSaving(false);
    onShared();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">مشاركة إشارة تداول</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">زوج العملة</Label>
            <Select value={form.pair} onValueChange={v => set("pair", v)}>
              <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">الاتجاه</Label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => set("direction", "buy")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${form.direction === "buy" ? "bg-trading-green/20 text-trading-green border border-trading-green/30" : "bg-secondary text-muted-foreground"}`}>
                <TrendingUp className="w-3.5 h-3.5" /> شراء
              </button>
              <button onClick={() => set("direction", "sell")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${form.direction === "sell" ? "bg-trading-red/20 text-trading-red border border-trading-red/30" : "bg-secondary text-muted-foreground"}`}>
                <TrendingDown className="w-3.5 h-3.5" /> بيع
              </button>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">الثقة: {form.confidence}%</Label>
          <Slider value={[form.confidence]} onValueChange={([v]) => set("confidence", v)} min={50} max={99} step={1} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">سعر الدخول *</Label>
            <Input className="bg-secondary mt-1" placeholder="e.g. 65000" value={form.entry_price} onChange={e => set("entry_price", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">وقف الخسارة *</Label>
            <Input className="bg-secondary mt-1" placeholder="e.g. 63000" value={form.stop_loss} onChange={e => set("stop_loss", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">هدف الربح 1 *</Label>
            <Input className="bg-secondary mt-1" placeholder="e.g. 68000" value={form.take_profit_1} onChange={e => set("take_profit_1", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">هدف الربح 2</Label>
            <Input className="bg-secondary mt-1" placeholder="e.g. 72000" value={form.take_profit_2} onChange={e => set("take_profit_2", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">الإطار الزمني</Label>
            <Select value={form.timeframe} onValueChange={v => set("timeframe", v)}>
              <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["15m", "30m", "1H", "4H", "1D"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">الاستراتيجية</Label>
            <Input className="bg-secondary mt-1" value={form.strategy} onChange={e => set("strategy", e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs">ملخص التحليل</Label>
          <Textarea className="bg-secondary mt-1 text-xs h-20 resize-none" placeholder="اشرح سبب هذه الإشارة..." value={form.analysis_summary} onChange={e => set("analysis_summary", e.target.value)} />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button onClick={handleShare} disabled={saving || !form.entry_price || !form.stop_loss || !form.take_profit_1}
            className="flex-1 bg-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Share2 className="w-4 h-4 ml-2" />}
            {saving ? "جاري النشر..." : "نشر الإشارة"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}