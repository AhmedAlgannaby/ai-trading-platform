import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Bell } from "lucide-react";
import { TRADING_SYMBOLS } from "@/lib/pairs";

const PAIRS = TRADING_SYMBOLS;

const ALERT_TYPES = [
  { value: "price_above", label: "📈 السعر يتجاوز مستوى معين" },
  { value: "price_below", label: "📉 السعر ينخفض تحت مستوى" },
  { value: "stop_loss_near", label: "🛑 قريب من وقف الخسارة (0.5%)" },
  { value: "take_profit_near", label: "🎯 قريب من هدف الربح (0.5%)" },
  { value: "new_signal", label: "🤖 إشارة AI جديدة" },
  { value: "trade_opened", label: "✅ صفقة تم فتحها" },
  { value: "trade_closed", label: "🔐 صفقة تم إغلاقها" },
];

const NEEDS_THRESHOLD = ["price_above","price_below","stop_loss_near","take_profit_near"];

export default function AlertForm({ onSaved, onClose, editAlert = null }) {
  const [form, setForm] = useState({
    name: editAlert?.name || "",
    pair: editAlert?.pair || "BTCUSDT",
    alert_type: editAlert?.alert_type || "price_above",
    threshold: editAlert?.threshold || "",
    telegram_enabled: editAlert?.telegram_enabled ?? true,
    in_app_enabled: editAlert?.in_app_enabled ?? true,
    cooldown_minutes: editAlert?.cooldown_minutes || 60,
    is_active: editAlert?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const needsThreshold = NEEDS_THRESHOLD.includes(form.alert_type);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = {
      ...form,
      threshold: form.threshold ? parseFloat(form.threshold) : undefined,
    };
    if (editAlert) {
      await base44.entities.AlertConfig.update(editAlert.id, data);
    } else {
      await base44.entities.AlertConfig.create(data);
    }
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{editAlert ? "تعديل التنبيه" : "إنشاء تنبيه جديد"}</h3>
        </div>
        {onClose && <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">اسم التنبيه</Label>
          <Input placeholder="مثال: BTC فوق 70K" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="bg-secondary border-0 h-9 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">الزوج</Label>
          <Select value={form.pair} onValueChange={v => setForm(f => ({ ...f, pair: v }))}>
            <SelectTrigger className="bg-secondary border-0 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">نوع التنبيه</Label>
          <Select value={form.alert_type} onValueChange={v => setForm(f => ({ ...f, alert_type: v }))}>
            <SelectTrigger className="bg-secondary border-0 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALERT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {needsThreshold && (
          <div className="space-y-1.5">
            <Label className="text-xs">السعر المستهدف ($)</Label>
            <Input type="number" placeholder="مثال: 70000" value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              className="bg-secondary border-0 h-9 text-sm" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">وقت الانتظار (دقائق)</Label>
          <Input type="number" value={form.cooldown_minutes}
            onChange={e => setForm(f => ({ ...f, cooldown_minutes: parseInt(e.target.value) || 60 }))}
            className="bg-secondary border-0 h-9 text-sm" />
        </div>
      </div>

      <div className="flex gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={form.telegram_enabled}
            onCheckedChange={v => setForm(f => ({ ...f, telegram_enabled: v }))} />
          <span className="text-xs text-muted-foreground">تلغرام</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={form.in_app_enabled}
            onCheckedChange={v => setForm(f => ({ ...f, in_app_enabled: v }))} />
          <span className="text-xs text-muted-foreground">داخل التطبيق</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={form.is_active}
            onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          <span className="text-xs text-muted-foreground">مفعّل</span>
        </label>
      </div>

      <Button onClick={handleSave} disabled={saving || !form.name} size="sm" className="w-full">
        {saving ? "جارٍ الحفظ..." : editAlert ? "حفظ التعديلات" : "إنشاء التنبيه"}
      </Button>
    </div>
  );
}