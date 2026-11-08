/**
 * MicroStrategyCard — بطاقة استراتيجية الرصيد الصغير ($10 أو أقل)
 * تعرض القواعد، حاسبة حجم الصفقة، وتفعيل ملف $10 بعد تأكيد المستخدم.
 * التفعيل يرفض العمل إذا كانت هناك صفقات ورقية مفتوحة (حجمها محسوب لرصيد أكبر).
 */
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins, ShieldCheck, Calculator, AlertTriangle, CheckCircle2, Loader2, Info,
} from "lucide-react";
import {
  MICRO_PAIRS, MICRO_MAX_POSITIONS, MICRO_MAX_LEVERAGE, MICRO_MIN_NOTIONAL,
  MICRO_DAILY_LOSS_PCT, MICRO_MAX_TRADES_PER_DAY, MICRO_RULES,
  isMicroBalance, microRiskPct, microPositionSize,
} from "@/lib/microStrategy";

const fmt = (n, digits = 2) => Number(n || 0).toFixed(digits);

export default function MicroStrategyCard() {
  const queryClient = useQueryClient();
  const [balanceInput, setBalanceInput] = useState("10");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: settings = {} } = useQuery({
    queryKey: ["risk_settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1).then(d => d[0] || {}),
    initialData: {},
    initialDataUpdatedAt: 0,
  });

  const { data: openPaper = [] } = useQuery({
    queryKey: ["micro_open_paper"],
    queryFn: () => base44.entities.Trade.filter({ status: "open", mode: "paper" }),
    initialData: [],
    initialDataUpdatedAt: 0,
    refetchInterval: 30000,
  });

  const currentBalance = Number(settings?.paper_balance) || 10000;
  const active = isMicroBalance(currentBalance);
  const balance = Math.max(0, Number(balanceInput) || 0);
  const riskPct = microRiskPct(balance);
  const sizing = microPositionSize({
    balance, entry: 100, stop: 98.5, riskPct, leverage: MICRO_MAX_LEVERAGE,
  });
  const maxLossUsd = (balance * riskPct) / 100;
  const dailyLossUsd = (balance * MICRO_DAILY_LOSS_PCT) / 100;
  const canApply = openPaper.length === 0 && balance >= MICRO_MIN_NOTIONAL && !sizing.reason;

  const applyProfile = useMutation({
    mutationFn: async () => {
      const patch = {
        paper_balance: balance,
        max_open_positions: MICRO_MAX_POSITIONS,
        max_risk_per_trade: riskPct,
        default_leverage: MICRO_MAX_LEVERAGE,
        max_leverage: MICRO_MAX_LEVERAGE,
        default_stop_loss_percent: 1.5,
        default_take_profit_percent: 4.5,
        risk_reward_min: 3,
        max_daily_loss: MICRO_DAILY_LOSS_PCT,
        max_weekly_loss: MICRO_DAILY_LOSS_PCT * 2,
        circuit_breaker_losses: 2,
        min_confidence: 70,
        confidence_to_enter: 70,
        execution_mode: "auto",
        trading_mode: "paper",
        market_type: "futures",
      };
      if (settings?.id) return base44.entities.RiskSettings.update(settings.id, patch);
      const existing = await base44.entities.RiskSettings.list("-created_date", 1);
      if (existing[0]?.id) return base44.entities.RiskSettings.update(existing[0].id, patch);
      return base44.entities.RiskSettings.create(patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk_settings"] });
      queryClient.invalidateQueries({ queryKey: ["risk-settings"] });
      queryClient.invalidateQueries({ queryKey: ["perf-trades"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["open_trades_auto"] });
      setConfirmOpen(false);
      setMessage("تم تفعيل وضع الرصيد الصغير. شغّل الروبوت من صفحة التداول الآلي.");
    },
    onError: (err) => setMessage(`تعذر التفعيل: ${err.message}`),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card p-5 border border-trading-yellow/30 bg-trading-yellow/5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-trading-yellow/15 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-trading-yellow" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">استراتيجية الرصيد الصغير</h3>
              <Badge className="text-[9px] border-0 bg-trading-yellow/20 text-trading-yellow">Micro Growth</Badge>
              <Badge className="text-[9px] border-0 bg-secondary text-muted-foreground">مدمجة في المحرك</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-2xl">
              لرصيد $10 أو أقل: صفقة واحدة فقط، أزواج رئيسية عالية السيولة، ومخاطرة صغيرة تحمي رأس المال.
              الهدف ربح بطيء ومضاعف — وليس دخلًا سريعًا.
            </p>
          </div>
        </div>
        {active && (
          <Badge className="text-[10px] border-0 bg-trading-green/15 text-trading-green flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> مفعّلة الآن على الحساب
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-trading-green" /> قواعد الحماية
          </h4>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            {MICRO_RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-trading-yellow mt-1.5 flex-shrink-0" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MICRO_PAIRS.map(p => (
              <Badge key={p} className="text-[9px] border-0 bg-secondary text-foreground/80">{p}</Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-secondary/30 p-3 space-y-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-primary" /> حاسبة $10
          </h4>
          <div>
            <Label className="text-[10px] text-muted-foreground">رصيد الحساب ($)</Label>
            <Input
              type="number"
              min={MICRO_MIN_NOTIONAL}
              step="1"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="mt-1 h-8 bg-secondary border-border font-mono"
            />
            <p className="text-[9px] text-muted-foreground mt-1">
              الحد الأدنى العملي ${MICRO_MIN_NOTIONAL} بسبب حد Binance للعقود. الأفضل $10 لتغطية الحد والرسوم.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-background/40 p-2">
              <p className="text-[9px] text-muted-foreground">مخاطرة الصفقة</p>
              <p className="font-mono font-semibold text-trading-yellow">${fmt(maxLossUsd)} <span className="text-[9px] text-muted-foreground">({riskPct}%)</span></p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <p className="text-[9px] text-muted-foreground">حجم الصفقة (وقف 1.5%)</p>
              <p className="font-mono font-semibold">${fmt(sizing.size)} <span className="text-[9px] text-muted-foreground">({fmt(sizing.leverageUsed, 1)}x)</span></p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <p className="text-[9px] text-muted-foreground">ربح TP1 بعد الرسوم</p>
              <p className="font-mono font-semibold text-trading-green">${fmt(sizing.netTp)}</p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <p className="text-[9px] text-muted-foreground">حد الخسارة اليومي</p>
              <p className="font-mono font-semibold text-trading-red">${fmt(dailyLossUsd)}</p>
            </div>
          </div>

          {sizing.reason && (
            <p className="text-[10px] text-trading-red flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {sizing.reason}
            </p>
          )}

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canApply}
            className="w-full h-8 text-[11px] bg-trading-yellow hover:bg-trading-yellow/90 text-black gap-1.5"
          >
            <Coins className="w-3.5 h-3.5" /> تفعيل ملف الرصيد الصغير
          </Button>

          {openPaper.length > 0 && (
            <p className="text-[10px] text-trading-red flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              لديك {openPaper.length} صفقة ورقية مفتوحة بحجم قديم. أغلقها أولًا من صفحة الصفقات ثم فعّل الملف.
            </p>
          )}
          {message && (
            <p className="text-[10px] text-trading-green flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" /> {message}
            </p>
          )}

          <p className="text-[9px] text-muted-foreground leading-relaxed">
            على $10، ربح 2–4% شهريًا = $0.20–$0.40 فقط. الرسوم والحد الأدنى للصفقة يجعلان $10 غير كافٍ للدخل؛
            الهدف هنا هو الانضباط والحفاظ على رأس المال مع نمو بطيء. لا توجد استراتيجية تضمن الربح.
          </p>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-trading-yellow" /> تفعيل ملف الرصيد الصغير
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              سيتم تحويل الحساب <span className="font-semibold text-foreground">التجريبي</span> إلى رصيد
              <span className="font-mono font-semibold text-foreground"> ${fmt(balance, 0)}</span> وتطبيق القيود التالية.
              لا يمكن التراجع تلقائيًا، وسجل الصفقات القديم سيبقى في التقارير.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-secondary/40 p-3 text-[11px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">الرصيد التجريبي</span><span className="font-mono">${fmt(balance, 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">أقصى صفقات مفتوحة</span><span className="font-mono">{MICRO_MAX_POSITIONS}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">مخاطرة لكل صفقة</span><span className="font-mono">{riskPct}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">أقصى رافعة</span><span className="font-mono">{MICRO_MAX_LEVERAGE}x</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">حد الخسارة اليومي</span><span className="font-mono">{MICRO_DAILY_LOSS_PCT}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">أقصى صفقات يوميًا</span><span className="font-mono">{MICRO_MAX_TRADES_PER_DAY}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">وضع التنفيذ</span><span className="font-mono">تجريبي / تلقائي</span></div>
          </div>

          <div className="rounded-lg bg-trading-yellow/10 border border-trading-yellow/20 p-2.5 text-[10px] text-trading-yellow flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              تأكد من إغلاق كل الصفقات الورقية المفتوحة. الصفقات الحالية محسوبة لرصيد $10,000 وقد تتجاوز
              حدود الحساب الجديد.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="text-xs">إلغاء</Button>
            <Button
              onClick={() => applyProfile.mutate()}
              disabled={applyProfile.isPending}
              className="text-xs bg-trading-yellow hover:bg-trading-yellow/90 text-black gap-1.5"
            >
              {applyProfile.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              تأكيد التفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
