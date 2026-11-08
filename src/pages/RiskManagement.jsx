import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Save, AlertTriangle, Loader2, CheckCircle2, Zap, TrendingUp, DollarSign, BarChart2, Info, Activity } from "lucide-react";
import { motion } from "framer-motion";
import PortfolioRiskAnalysis from "@/components/risk/PortfolioRiskAnalysis";

export default function RiskManagement() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmLiveOpen, setConfirmLiveOpen] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: settings, isLoading: settingsLoading, isError: settingsError, refetch: refetchSettings } = useQuery({
    queryKey: ["riskSettings"],
    queryFn: async () => {
      const list = await base44.entities.RiskSettings.list("-created_date", 1);
      return list[0] || null;
    },
  });

  const [form, setForm] = useState({
    max_risk_per_trade: 2,
    max_daily_loss: 5,
    max_weekly_loss: 10,
    max_drawdown: 15,
    max_open_positions: 5,
    default_leverage: 1,
    max_leverage: 10,
    default_stop_loss_percent: 2,
    default_take_profit_percent: 6,
    risk_reward_min: 2,
    trailing_stop_enabled: true,
    circuit_breaker_losses: 3,
    execution_mode: "semi_auto",
    trading_mode: "paper",
    paper_balance: 10000,
  });

  const [dirty, setDirty] = useState(false);
  const setField = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  useEffect(() => {
    // Only sync from server on first load (or when not editing) — was
    // clobbering user input on every refetch.
    if (settings && !dirty) {
      setForm({
        max_risk_per_trade: settings.max_risk_per_trade ?? 2,
        max_daily_loss: settings.max_daily_loss ?? 5,
        max_weekly_loss: settings.max_weekly_loss ?? 10,
        max_drawdown: settings.max_drawdown ?? 15,
        max_open_positions: settings.max_open_positions ?? 5,
        default_leverage: settings.default_leverage ?? 1,
        max_leverage: settings.max_leverage ?? 10,
        default_stop_loss_percent: settings.default_stop_loss_percent ?? 2,
        default_take_profit_percent: settings.default_take_profit_percent ?? 6,
        risk_reward_min: settings.risk_reward_min ?? 2,
        trailing_stop_enabled: settings.trailing_stop_enabled ?? true,
        circuit_breaker_losses: settings.circuit_breaker_losses ?? 3,
        execution_mode: settings.execution_mode ?? "semi_auto",
        trading_mode: settings.trading_mode ?? "paper",
        paper_balance: settings.paper_balance ?? 10000,
      });
    }
  }, [settings, dirty]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveError("");
    try {
      if (settings?.id) {
        await base44.entities.RiskSettings.update(settings.id, form);
      } else {
        await base44.entities.RiskSettings.create(form);
      }
      setDirty(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["riskSettings"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["risk_settings"] }),
      ]);
      setSaved(true);
      setConfirmLiveOpen(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e.message || "تعذر حفظ إعدادات المخاطر.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const enablingLiveExecution = form.trading_mode === "live" && (
      settings?.trading_mode !== "live"
      || (form.execution_mode === "auto" && settings.execution_mode !== "auto")
    );
    if (enablingLiveExecution) {
      setConfirmLiveOpen(true);
      return;
    }
    void saveSettings();
  };

  return (
    <>
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {settingsLoading && (
        <div className="glass-card p-4 text-center text-sm text-muted-foreground">جاري تحميل الإعدادات...</div>
      )}
      {settingsError && (
        <div className="glass-card flex flex-wrap items-center justify-center gap-3 p-4 text-sm text-trading-red" role="alert">
          <span>تعذر تحميل الإعدادات الحالية. أعد المحاولة قبل الحفظ لتجنب استبدال إعدادات موجودة.</span>
          <Button variant="outline" size="sm" onClick={() => refetchSettings()}>إعادة المحاولة</Button>
        </div>
      )}
      <Tabs defaultValue="settings">
        <TabsList className="bg-secondary mb-2">
          <TabsTrigger value="settings" className="gap-2 text-xs">
            <Shield className="w-3.5 h-3.5" /> إعدادات المخاطر
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2 text-xs">
            <Activity className="w-3.5 h-3.5" /> تحليل المحفظة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          <PortfolioRiskAnalysis />
        </TabsContent>

        <TabsContent value="settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-trading-yellow/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-trading-yellow" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">إدارة المخاطر</h2>
            <p className="text-xs text-muted-foreground">ضبط قواعد حماية رأس المال</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || settingsLoading || settingsError} className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 ml-2" /> : <Save className="w-4 h-4 ml-2" />}
          {saved ? "تم الحفظ" : "حفظ الإعدادات"}
        </Button>
      </div>
      {saveError && <p className="text-sm text-trading-red" role="alert">{saveError}</p>}

      {/* Trading Mode */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">وضع التداول</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">نمط التداول</Label>
            <Select value={form.trading_mode} onValueChange={(v) => setField({ trading_mode: v})}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">تداول تجريبي (Paper)</SelectItem>
                <SelectItem value="live">تداول حقيقي (Live)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">وضع التنفيذ</Label>
            <Select value={form.execution_mode} onValueChange={(v) => setField({ execution_mode: v})}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">تلقائي كامل</SelectItem>
                <SelectItem value="semi_auto">شبه تلقائي (بموافقتك)</SelectItem>
                <SelectItem value="manual">إشارات فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.trading_mode === "paper" && (
            <div>
              <Label className="text-xs">الرصيد التجريبي ($)</Label>
              <Input type="number" value={form.paper_balance} onChange={(e) => setField({ paper_balance: parseInt(e.target.value)})} className="bg-secondary" />
            </div>
          )}
        </div>
        {form.trading_mode === "live" && (
          <div className="mt-3 p-3 rounded-lg bg-trading-red/5 border border-trading-red/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-trading-red flex-shrink-0" />
            <p className="text-xs text-trading-red">تحذير: التداول الحقيقي ينطوي على مخاطر خسارة رأس المال</p>
          </div>
        )}
      </motion.div>

      {/* Position Risk */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">مخاطرة الصفقة</h3>
        <div className="space-y-5">
          <SliderField label="المخاطرة لكل صفقة" value={form.max_risk_per_trade} onChange={(v) => setField({ max_risk_per_trade: v})} min={0.5} max={10} step={0.5} unit="%" />
          <SliderField label="وقف الخسارة الافتراضي" value={form.default_stop_loss_percent} onChange={(v) => setField({ default_stop_loss_percent: v})} min={0.5} max={10} step={0.5} unit="%" />
          <SliderField label="أخذ الربح الافتراضي" value={form.default_take_profit_percent} onChange={(v) => setField({ default_take_profit_percent: v})} min={1} max={20} step={0.5} unit="%" />
          <SliderField label="الحد الأدنى R:R" value={form.risk_reward_min} onChange={(v) => setField({ risk_reward_min: v})} min={1} max={5} step={0.5} unit=":1" />
          
          <div className="flex items-center justify-between">
            <Label className="text-xs">وقف خسارة متحرك (Trailing Stop)</Label>
            <Switch checked={form.trailing_stop_enabled} onCheckedChange={(v) => setField({ trailing_stop_enabled: v})} />
          </div>
        </div>
      </motion.div>

      {/* Portfolio Risk */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">مخاطرة المحفظة</h3>
        <div className="space-y-5">
          <SliderField label="أقصى خسارة يومية" value={form.max_daily_loss} onChange={(v) => setField({ max_daily_loss: v})} min={1} max={20} step={1} unit="%" />
          <SliderField label="أقصى خسارة أسبوعية" value={form.max_weekly_loss} onChange={(v) => setField({ max_weekly_loss: v})} min={5} max={30} step={1} unit="%" />
          <SliderField label="أقصى سحب (Max Drawdown)" value={form.max_drawdown} onChange={(v) => setField({ max_drawdown: v})} min={5} max={50} step={1} unit="%" />
          <SliderField label="أقصى عدد صفقات مفتوحة" value={form.max_open_positions} onChange={(v) => setField({ max_open_positions: v})} min={1} max={20} step={1} unit="" />
          <SliderField label="إيقاف بعد خسائر متتالية (Circuit Breaker)" value={form.circuit_breaker_losses} onChange={(v) => setField({ circuit_breaker_losses: v})} min={1} max={10} step={1} unit=" خسائر" />
        </div>
      </motion.div>

      {/* Leverage */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">الرافعة المالية</h3>
        <div className="space-y-5">
          <SliderField label="الرافعة الافتراضية" value={form.default_leverage} onChange={(v) => setField({ default_leverage: v})} min={1} max={50} step={1} unit="x" />
          <SliderField label="أقصى رافعة" value={form.max_leverage} onChange={(v) => setField({ max_leverage: v})} min={1} max={125} step={1} unit="x" />
        </div>
      </motion.div>

      {/* Live Trade Preview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 border border-primary/20">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> معاينة الصفقة التلقائية
        </h3>
        <p className="text-[11px] text-muted-foreground mb-5">هكذا ستُفتح الصفقة التالية بناءً على إعداداتك الحالية</p>

        {(() => {
          const balance = form.trading_mode === "paper" ? (form.paper_balance || 10000) : 10000;
          const riskAmount = +(balance * form.max_risk_per_trade / 100).toFixed(2);
          const stopDistancePct = Math.max(Number(form.default_stop_loss_percent) || 0, 0.1) / 100;
          const effectiveLeverage = Math.min(
            Math.max(Number(form.default_leverage) || 1, 1),
            Math.max(Number(form.max_leverage) || 1, 1),
          );
          const positionSize = +Math.min(
            riskAmount / stopDistancePct,
            balance * effectiveLeverage,
          ).toFixed(2);
          const exampleEntry = 65000;
          const stopLossPrice = +(exampleEntry * (1 - form.default_stop_loss_percent / 100)).toFixed(2);
          const tp1Price = +(exampleEntry * (1 + form.default_take_profit_percent / 100)).toFixed(2);
          const rrRatio = +(form.default_take_profit_percent / form.default_stop_loss_percent).toFixed(2);
          const isValid = rrRatio >= form.risk_reward_min;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <PreviewBox icon={DollarSign} label="حجم المركز الاسمي" value={`$${positionSize.toLocaleString()}`} color="primary" />
                <PreviewBox icon={Shield} label="الخسارة عند الوقف" value={`$${Math.min(riskAmount, positionSize * stopDistancePct).toFixed(2)}`} color="yellow" />
                <PreviewBox icon={TrendingUp} label="وقف الخسارة" value={`$${stopLossPrice.toLocaleString()}`} color="red" />
                <PreviewBox icon={BarChart2} label="الهدف 1" value={`$${tp1Price.toLocaleString()}`} color="green" />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                  <span>نسبة العائد/مخاطرة:</span>
                  <span className={`font-mono font-bold ${isValid ? "text-trading-green" : "text-trading-red"}`}>
                    {rrRatio}:1
                  </span>
                  {!isValid && <span className="text-trading-red">(أقل من الحد الأدنى {form.risk_reward_min}:1)</span>}
                </div>
                <Badge className={`text-[10px] border-0 ${form.trading_mode === "paper" ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"}`}>
                  {form.trading_mode === "paper" ? "تجريبي" : "حقيقي 🔴"}
                </Badge>
                <Badge className="text-[10px] border-0 bg-primary/10 text-primary">
                  {form.execution_mode === "auto" ? "تنفيذ تلقائي" : form.execution_mode === "semi_auto" ? "بموافقتك" : "إشارات فقط"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  رافعة {form.default_leverage}x
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 text-[11px] text-muted-foreground leading-relaxed">
                📌 مثال: عند فتح صفقة شراء BTC/USDT بسعر ${exampleEntry.toLocaleString()} — حجم المركز الاسمي <strong className="text-foreground">${positionSize.toLocaleString()}</strong>، والخسارة النظرية عند الوقف <strong className="text-foreground">${Math.min(riskAmount, positionSize * stopDistancePct).toFixed(2)}</strong> قبل الرسوم والانزلاق. وقف الخسارة عند <strong className="text-trading-red">${stopLossPrice.toLocaleString()}</strong> والهدف الأول عند <strong className="text-trading-green">${tp1Price.toLocaleString()}</strong>.
              </div>
            </div>
          );
        })()}
      </motion.div>
        </TabsContent>
      </Tabs>
    </div>
    <AlertDialog open={confirmLiveOpen} onOpenChange={(open) => { if (!saving) setConfirmLiveOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد تفعيل التداول الحقيقي</AlertDialogTitle>
          <AlertDialogDescription>
            {form.execution_mode === "auto"
              ? "أنت تفعّل التنفيذ التلقائي الحقيقي. قد يرسل التطبيق أوامر شراء فعلية إلى Binance دون موافقة لكل صفقة. قد تخسر رأس المال."
              : "أنت تفعّل وضع التداول الحقيقي. إغلاق صفقات Live قد يرسل أوامر سوق فعلية إلى Binance. قد تخسر رأس المال."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => { event.preventDefault(); void saveSettings(); }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد وحفظ الوضع الحقيقي
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function PreviewBox({ icon: Icon, label, value, color }) {
  const colorMap = {
    primary: "text-primary bg-primary/5 border-primary/10",
    yellow: "text-trading-yellow bg-trading-yellow/5 border-trading-yellow/10",
    red: "text-trading-red bg-trading-red/5 border-trading-red/10",
    green: "text-trading-green bg-trading-green/5 border-trading-green/10",
  };
  return (
    <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
      <div className="flex items-center gap-1 mb-1 opacity-70">
        <Icon className="w-3 h-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-mono font-bold">{value}</p>
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, unit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs">{label}</Label>
        <Badge variant="outline" className="text-xs font-mono">{value}{unit}</Badge>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}