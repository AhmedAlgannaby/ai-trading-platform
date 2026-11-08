import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Copy, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FollowModal({ trader, onClose, onSuccess }) {
  const [form, setForm] = useState({
    copy_amount: trader.min_copy_amount || 100,
    risk_multiplier: 1,
    max_loss_limit: 20,
    auto_approve: false,
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFollow = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.CopyFollow.create({
      trader_id: trader.id,
      trader_name: trader.display_name,
      follower_email: user.email,
      status: "active",
      copy_amount: form.copy_amount,
      risk_multiplier: form.risk_multiplier,
      max_loss_limit: form.max_loss_limit,
      auto_approve: form.auto_approve,
      total_pnl: 0,
      total_pnl_percent: 0,
      copied_trades_count: 0,
      started_at: new Date().toISOString(),
    });
    await base44.entities.TraderProfile.update(trader.id, {
      followers_count: (trader.followers_count || 0) + 1,
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" /> متابعة {trader.display_name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              سيتم نسخ صفقاته تلقائياً وفق الإعدادات أدناه
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* Trader summary */}
        <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
            {trader.display_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {trader.display_name}
              {trader.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-trading-cyan" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Win Rate: {trader.win_rate?.toFixed(0)}% · العائد: +{trader.total_return_percent?.toFixed(1)}%
            </p>
          </div>
          <span className="text-lg font-bold text-trading-green">+{trader.total_return_percent?.toFixed(1)}%</span>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">مبلغ النسخ ($)</Label>
            <Input type="number" value={form.copy_amount} onChange={e => set("copy_amount", +e.target.value)}
              className="bg-secondary border-0 h-9 text-sm" min={trader.min_copy_amount} />
            <p className="text-[11px] text-muted-foreground">الحد الأدنى ${trader.min_copy_amount}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">مضاعف المخاطرة (0.5 = نصف المخاطرة)</Label>
            <div className="flex gap-2">
              {[0.5, 1, 1.5, 2].map(v => (
                <button key={v} onClick={() => set("risk_multiplier", v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.risk_multiplier === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}>{v}x</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">حد الخسارة الأقصى (%)</Label>
            <Input type="number" value={form.max_loss_limit} onChange={e => set("max_loss_limit", +e.target.value)}
              className="bg-secondary border-0 h-9 text-sm" />
            <p className="text-[11px] text-muted-foreground">سيتوقف النسخ تلقائياً إذا بلغت الخسارة هذه النسبة</p>
          </div>

          <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium">موافقة تلقائية</p>
              <p className="text-xs text-muted-foreground">نسخ الصفقات دون الحاجة للموافقة اليدوية</p>
            </div>
            <Switch checked={form.auto_approve} onCheckedChange={v => set("auto_approve", v)} />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-trading-yellow/10 border border-trading-yellow/20 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-trading-yellow flex-shrink-0 mt-0.5" />
          <p className="text-xs text-trading-yellow leading-relaxed">
            نسخ التداول لا يضمن الأرباح. الأداء السابق ليس ضماناً للأداء المستقبلي. استثمر فقط ما يمكنك تحمّل خسارته.
          </p>
        </div>

        <Button className="w-full gap-2" onClick={handleFollow} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          {loading ? "جارٍ الإعداد..." : "بدء متابعة الصفقات"}
        </Button>
      </motion.div>
    </div>
  );
}