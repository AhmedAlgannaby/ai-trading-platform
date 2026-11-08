import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
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

const executionLabels = {
  auto: "تنفيذ تلقائي",
  semi_auto: "تنفيذ بعد الموافقة",
  manual: "إشارات فقط",
};

export default function TradingSafetyBanner() {
  const queryClient = useQueryClient();
  const [confirmPause, setConfirmPause] = useState(false);
  const [pauseError, setPauseError] = useState("");
  const [pausing, setPausing] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
    refetchInterval: 30000,
  });

  const settings = settingsQuery.data?.[0];
  const isLive = settings?.trading_mode === "live";
  const isAutomatic = settings?.execution_mode === "auto";

  const pauseAutomation = async () => {
    if (!settings?.id) {
      setPauseError("لا يوجد سجل إعدادات تداول يمكن تحديثه.");
      return;
    }
    setPausing(true);
    setPauseError("");
    try {
      await base44.entities.RiskSettings.update(settings.id, { execution_mode: "manual" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["riskSettings"] }),
        queryClient.invalidateQueries({ queryKey: ["risk_settings"] }),
      ]);
      setConfirmPause(false);
    } catch (e) {
      setPauseError(e.message || "تعذر إيقاف التنفيذ التلقائي.");
    } finally {
      setPausing(false);
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground" role="status">
        جارٍ التحقق من وضع التداول...
      </div>
    );
  }

  if (settingsQuery.isError || !settings) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-trading-yellow/40 bg-trading-yellow/10 px-4 py-3 text-sm" role="alert">
        <span className="flex items-center gap-2 text-trading-yellow">
          <ShieldAlert className="h-4 w-4" />
          {settingsQuery.isError ? "تعذر التحقق من وضع التداول. لا تفترض أن التنفيذ متوقف." : "لم يتم إعداد وضع التداول بعد."}
        </span>
        <div className="flex gap-2">
          {settingsQuery.isError && <Button variant="outline" size="sm" onClick={() => settingsQuery.refetch()}>إعادة المحاولة</Button>}
          <Button asChild size="sm" variant="outline"><Link to="/RiskManagement">إعدادات المخاطر</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
        isLive ? "border-trading-red/50 bg-trading-red/10" : "border-trading-green/30 bg-trading-green/5"
      }`} role={isLive ? "alert" : "status"}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${isLive ? "text-trading-red" : "text-trading-green"}`}>
          {isLive ? <AlertTriangle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          <span>{isLive ? "التداول الحقيقي مفعّل" : "وضع التداول التجريبي (Paper)"}</span>
          <span className="rounded bg-background/70 px-2 py-0.5 text-xs">
            {executionLabels[settings.execution_mode] || "وضع تنفيذ غير معروف"}
          </span>
          {isLive && isAutomatic && <span className="font-bold">قد تُرسل أوامر حقيقية تلقائياً.</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive && isAutomatic && (
            <Button size="sm" variant="destructive" onClick={() => { setPauseError(""); setConfirmPause(true); }}>
              إيقاف التنفيذ التلقائي
            </Button>
          )}
          <Button asChild size="sm" variant="outline"><Link to="/RiskManagement">إعدادات المخاطر</Link></Button>
        </div>
        {pauseError && <p className="w-full text-xs text-trading-red" role="alert">{pauseError}</p>}
      </div>

      <AlertDialog open={confirmPause} onOpenChange={(open) => { if (!pausing) setConfirmPause(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إيقاف التنفيذ التلقائي الحقيقي؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيحوّل وضع التنفيذ إلى «إشارات فقط» لمنع فتح صفقات جديدة تلقائياً. لن يغلق هذا المراكز المفتوحة؛ راجعها في Binance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pausing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={pausing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); void pauseAutomation(); }}
            >
              {pausing && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد الإيقاف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
