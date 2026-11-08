import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Rocket, CheckCircle2 } from "lucide-react";
import { TRADING_SYMBOLS } from "@/lib/pairs";

const PAIRS = TRADING_SYMBOLS;

export default function PublishProfileForm({ existing, onSaved }) {
  const [form, setForm] = useState({
    display_name: existing?.display_name || "",
    bio: existing?.bio || "",
    trading_style: existing?.trading_style || "swing",
    preferred_pairs: existing?.preferred_pairs || ["BTCUSDT","ETHUSDT"],
    min_copy_amount: existing?.min_copy_amount || 100,
    copy_fee_percent: existing?.copy_fee_percent || 0,
    is_published: existing?.is_published ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePair = (p) => {
    setForm(f => ({
      ...f,
      preferred_pairs: f.preferred_pairs.includes(p)
        ? f.preferred_pairs.filter(x => x !== p)
        : [...f.preferred_pairs, p],
    }));
  };

  const save = async () => {
    setLoading(true);
    if (existing?.id) {
      await base44.entities.TraderProfile.update(existing.id, form);
    } else {
      await base44.entities.TraderProfile.create({
        ...form,
        win_rate: 0,
        total_return_percent: 0,
        monthly_return_percent: 0,
        total_trades: 0,
        followers_count: 0,
        max_drawdown: 0,
      });
    }
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="font-semibold flex items-center gap-2 text-sm">
        <Rocket className="w-4 h-4 text-primary" />
        {existing ? "تعديل ملفك الاحترافي" : "نشر ملفك كمتداول محترف"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">الاسم المعروض</Label>
          <Input value={form.display_name} onChange={e => set("display_name", e.target.value)}
            placeholder="اسمك التداولي" className="bg-secondary border-0 h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">أسلوب التداول</Label>
          <Select value={form.trading_style} onValueChange={v => set("trading_style", v)}>
            <SelectTrigger className="bg-secondary border-0 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scalping">سكالبينج</SelectItem>
              <SelectItem value="swing">سوينج</SelectItem>
              <SelectItem value="day_trading">تداول يومي</SelectItem>
              <SelectItem value="position">موقفي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">نبذة عنك</Label>
          <Input value={form.bio} onChange={e => set("bio", e.target.value)}
            placeholder="اشرح استراتيجيتك وأسلوبك في التداول..." className="bg-secondary border-0 h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">الحد الأدنى للنسخ ($)</Label>
          <Input type="number" value={form.min_copy_amount} onChange={e => set("min_copy_amount", +e.target.value)}
            className="bg-secondary border-0 h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">عمولة النسخ (%)</Label>
          <Input type="number" value={form.copy_fee_percent} onChange={e => set("copy_fee_percent", +e.target.value)}
            className="bg-secondary border-0 h-9 text-sm" min={0} max={30} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">أزواج التداول المفضلة</Label>
        <div className="flex flex-wrap gap-2">
          {PAIRS.map(p => (
            <button key={p} onClick={() => togglePair(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                form.preferred_pairs.includes(p)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
        <div>
          <p className="text-sm font-medium">نشر الملف للعموم</p>
          <p className="text-xs text-muted-foreground">يمكن للمستخدمين الآخرين رؤية ملفك ومتابعتك</p>
        </div>
        <Switch checked={form.is_published} onCheckedChange={v => set("is_published", v)} />
      </div>

      <Button className="w-full gap-2" onClick={save} disabled={loading || !form.display_name}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
         saved ? <CheckCircle2 className="w-4 h-4 text-trading-green" /> : <Rocket className="w-4 h-4" />}
        {saved ? "تم الحفظ!" : existing ? "حفظ التعديلات" : "نشر ملفي"}
      </Button>
    </div>
  );
}