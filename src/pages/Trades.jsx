import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { validateTradeInput } from "@/lib/tradeMath";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExitConfirm from "@/components/trading/ExitConfirm";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function Trades() {
  const [showForm, setShowForm] = useState(false);
  const [exitTrade, setExitTrade] = useState(null);
  const queryClient = useQueryClient();

  const { data: trades = [], isError: tradesError } = useQuery({
    queryKey: ["trades"],
    queryFn: () => base44.entities.Trade.list("-created_date", 50),
    initialData: [],
  });

  const openTrades = (trades || []).filter(t => t.status === "open");

  const handleClosed = () => {
    setExitTrade(null);
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["trades-closed"] });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">إدارة الصفقات</h2>
          <p className="text-xs text-muted-foreground">{openTrades.length} صفقة مفتوحة</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 ml-2" /> صفقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>فتح صفقة جديدة</DialogTitle>
            </DialogHeader>
            <TradeForm
              onSubmit={async (data) => {
                try {
                  await base44.entities.Trade.create(data);
                  queryClient.invalidateQueries({ queryKey: ["trades"] });
                  setShowForm(false);
                } catch (e) {
                  console.error("create trade failed:", e);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {tradesError && (
        <div className="glass-card p-4 text-center text-sm text-trading-red" role="alert">
          تعذر تحميل الصفقات — تحقق من اتصال الخادم.
        </div>
      )}
      {/* Open Trades */}
      <AnimatePresence>
        {openTrades.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد صفقات مفتوحة</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {openTrades.map((trade, i) => {
              const isProfit = (trade.pnl_percent || 0) >= 0;
              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card p-5 border-s-2 ${
                    isProfit ? "border-s-trading-green" : "border-s-trading-red"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-[10px] border-0 ${
                        trade.type === "long" ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"
                      }`}>
                        {trade.type === "long" ? "LONG ↑" : "SHORT ↓"}
                      </Badge>
                      <span className="font-semibold">{trade.pair}</span>
                      {trade.leverage > 1 && (
                        <Badge variant="outline" className="text-[9px] text-trading-yellow border-trading-yellow/30">
                          {trade.leverage}x
                        </Badge>
                      )}
                      <Badge className="text-[9px] bg-secondary border-0 text-muted-foreground">
                        {trade.mode === "live" ? "حقيقي" : "تجريبي"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold font-mono ${isProfit ? "text-trading-green" : "text-trading-red"}`}>
                        {isProfit ? "+" : ""}{trade.pnl_percent?.toFixed(2) || "0.00"}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setExitTrade(trade)}
                      >
                        إغلاق
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">الدخول</span>
                      <p className="font-mono font-medium">${trade.entry_price?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحالي</span>
                      <p className="font-mono font-medium">${trade.current_price?.toLocaleString() || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">وقف الخسارة</span>
                      <p className="font-mono font-medium text-trading-red">${trade.stop_loss?.toLocaleString() || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">أخذ الربح</span>
                      <p className="font-mono font-medium text-trading-green">${trade.take_profit_1?.toLocaleString() || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحجم</span>
                      <p className="font-mono font-medium">${trade.position_size?.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
      {exitTrade && (
        <ExitConfirm
          trade={exitTrade}
          onDismiss={() => setExitTrade(null)}
          onClosed={handleClosed}
        />
      )}
    </div>
  );
}

function TradeForm({ onSubmit }) {
  const [form, setForm] = useState({
    pair: "BTC/USDT",
    type: "long",
    entry_price: "",
    stop_loss: "",
    take_profit_1: "",
    position_size: "",
    leverage: 1,
    market_type: "spot",
    mode: "paper",
    status: "open",
    confidence: 75,
    strategy: "Manual",
    current_price: "",
    pnl: 0,
    pnl_percent: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateTradeInput({
      entry: form.entry_price,
      size: form.position_size,
      sl: form.stop_loss,
      tp: form.take_profit_1,
      direction: form.type,
      leverage: form.market_type === "spot" ? 1 : form.leverage,
      marketType: form.market_type,
    });
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        entry_price: parseFloat(form.entry_price),
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,
        take_profit_1: form.take_profit_1 ? parseFloat(form.take_profit_1) : undefined,
        position_size: parseFloat(form.position_size),
        leverage: form.market_type === "spot" ? 1 : parseInt(form.leverage),
        current_price: form.entry_price ? parseFloat(form.entry_price) : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">زوج العملة</Label>
          <Select value={form.pair} onValueChange={(v) => setForm({...form, pair: v})}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">الاتجاه</Label>
          <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long (شراء)</SelectItem>
              <SelectItem value="short">Short (بيع)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">سعر الدخول</Label>
          <Input type="number" step="any" value={form.entry_price} onChange={(e) => setForm({...form, entry_price: e.target.value})} className="bg-secondary" />
        </div>
        <div>
          <Label className="text-xs">حجم الصفقة ($)</Label>
          <Input type="number" step="any" value={form.position_size} onChange={(e) => setForm({...form, position_size: e.target.value})} className="bg-secondary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">وقف الخسارة</Label>
          <Input type="number" step="any" value={form.stop_loss} onChange={(e) => setForm({...form, stop_loss: e.target.value})} className="bg-secondary" />
        </div>
        <div>
          <Label className="text-xs">أخذ الربح</Label>
          <Input type="number" step="any" value={form.take_profit_1} onChange={(e) => setForm({...form, take_profit_1: e.target.value})} className="bg-secondary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الرافعة المالية</Label>
          <Input type="number" min="1" max="125" value={form.leverage} onChange={(e) => setForm({...form, leverage: e.target.value})} className="bg-secondary" />
        </div>
        <div>
          <Label className="text-xs">النوع</Label>
          <Select value={form.market_type} onValueChange={(v) => setForm({...form, market_type: v})}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spot">Spot</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={submitting || !form.entry_price || !form.position_size} className="w-full bg-primary hover:bg-primary/90">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "فتح الصفقة"}
      </Button>
      {formError && (
        <p className="text-xs text-trading-red bg-trading-red/10 border border-trading-red/30 rounded-lg px-3 py-2" role="alert">{formError}</p>
      )}
    </form>
  );
}