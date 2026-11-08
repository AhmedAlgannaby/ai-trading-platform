import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import LivePortfolioStats from "@/components/dashboard/LivePortfolioStats";
import MarketOverview from "@/components/dashboard/MarketOverview";
import EquityCurve from "@/components/dashboard/EquityCurve";
import OpenPositions from "@/components/dashboard/OpenPositions";
import RecentSignals from "@/components/dashboard/RecentSignals";
import MarketSentiment from "@/components/dashboard/MarketSentiment";
import AlertMonitor from "@/components/alerts/AlertMonitor";
import InAppNotificationToast from "@/components/alerts/InAppNotificationToast";
import OpportunityToast from "@/components/alerts/OpportunityToast";
import EconomicCalendar from "@/components/dashboard/EconomicCalendar";
import PaperTradingStatus from "@/components/dashboard/PaperTradingStatus";
import PositionSizeCalculator from "@/components/dashboard/PositionSizeCalculator";
import AutoPaperTrader from "@/components/dashboard/AutoPaperTrader";
import LearningInsights from "@/components/dashboard/LearningInsights";
import usePerformanceData from "@/components/performance/usePerformanceData";
import MLModelStatus from "@/components/dashboard/MLModelStatus";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [notifications, setNotifications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const handleNotification = useCallback((notif) => {
    setNotifications(prev => [...prev, { ...notif, id: notif.id || Date.now() }]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleOpportunity = useCallback((opp) => {
    setOpportunities(prev => {
      // لا تكرار لنفس الزوج
      const filtered = prev.filter(o => o.pair !== opp.pair);
      return [...filtered, opp];
    });
  }, []);

  const dismissOpportunity = useCallback((id) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
  }, []);

  const tradesQuery = useQuery({
    queryKey: ["trades"],
    queryFn: () => base44.entities.Trade.list("-created_date", 50),
  });

  const signalsQuery = useQuery({
    queryKey: ["signals"],
    queryFn: () => base44.entities.Signal.list("-created_date", 10),
  });

  const portfoliosQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => base44.entities.PortfolioSnapshot.list("-created_date", 1),
  });

  const riskSettingsQuery = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
  });

  const trades = tradesQuery.data || [];
  const signals = signalsQuery.data || [];
  const portfolios = portfoliosQuery.data || [];
  const riskSettings = riskSettingsQuery.data || [];
  const perf = usePerformanceData();
  const failedData = [
    tradesQuery.isError && "الصفقات",
    signalsQuery.isError && "الإشارات",
    portfoliosQuery.isError && "ملخص المحفظة",
    perf.isError && "مؤشرات الأداء",
    riskSettingsQuery.isError && "وضع التداول",
  ].filter(Boolean);
  const retryDashboard = () => Promise.all([
    tradesQuery.refetch(),
    signalsQuery.refetch(),
    portfoliosQuery.refetch(),
    riskSettingsQuery.refetch(),
    perf.refetch(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  // المحقق = صفقات أُغلقت اليوم | العائم = ربح/خسارة الصفقات المفتوحة الآن
  const realizedToday = perf.closed
    .filter(t => (t.closed_at || t.updated_date || "").slice(0, 10) === today)
    .reduce((s, t) => s + (t.pnl || 0), 0);
  const unrealizedPnl = perf.unrealized || 0;
  const dailyPnl = realizedToday + unrealizedPnl;

  // رصيد حقيقي محسوب من الصفقات الفعلية (وليس قيمة ثابتة)
  const portfolio = {
    ...(portfolios[0] || {}),
    total_balance: Math.round(perf.balance * 100) / 100,
    available_balance: Math.round((perf.balance - perf.open.reduce((s, t) =>
      s + (Number(t.position_size) || 0) / Math.max(Number(t.leverage) || 1, 1), 0)) * 100) / 100,
    total_pnl: perf.realized + perf.unrealized,
    total_pnl_percent: perf.totalReturnPct,
    daily_pnl: dailyPnl,
    daily_pnl_percent: perf.initial ? (dailyPnl / perf.initial) * 100 : 0,
    daily_realized: realizedToday,
    daily_unrealized: unrealizedPnl,
    win_rate: perf.winRate,
    total_trades: perf.closed.length,
    winning_trades: perf.winsCount,
    losing_trades: perf.lossesCount,
    max_drawdown: perf.maxDD,
    sharpe_ratio: portfolios[0]?.sharpe_ratio || 0,
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* مراقب التنبيهات - يعمل في الخلفية */}
      <AlertMonitor onNotification={handleNotification} onOpportunity={handleOpportunity} />
      <AutoPaperTrader />
      <InAppNotificationToast notifications={notifications} onDismiss={dismissNotification} />
      <OpportunityToast opportunities={opportunities} onDismiss={dismissOpportunity} />
      {failedData.length > 0 && (
        <div className="glass-card flex flex-col gap-3 border border-trading-red/30 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="text-sm text-trading-red">
            تعذر تحميل: {failedData.join("، ")}. قد لا تكون بعض الأرقام محدثة.
          </div>
          <Button variant="outline" size="sm" onClick={retryDashboard}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      {perf.legacyClosedCount > 0 && (
        <p className="glass-card p-3 text-xs text-muted-foreground" role="status">
          تُستبعد {perf.legacyClosedCount} صفقة مغلقة قديمة من الرصيد ومؤشرات الأداء لأنها غير موسومة بصيغة PnL الحالية.
          تظهر تفاصيلها في سجل الصفقات.
        </p>
      )}
      <LivePortfolioStats
        portfolio={portfolio}
        tradingMode={riskSettings[0]?.trading_mode}
        loading={perf.isLoading || riskSettingsQuery.isLoading}
        unavailable={perf.tradesIsError || perf.settingsIsError || riskSettingsQuery.isError || !riskSettings[0]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <EquityCurve
            equity={perf.equity}
            closedCount={perf.closed.length}
            loading={perf.isLoading}
            error={perf.tradesIsError}
            onRetry={retryDashboard}
          />
          <OpenPositions
            trades={trades}
            loading={tradesQuery.isLoading}
            error={tradesQuery.isError}
            onRetry={tradesQuery.refetch}
          />
        </div>
        <div className="space-y-6">
          <PaperTradingStatus />
          <MLModelStatus />
          <LearningInsights />
          <PositionSizeCalculator />
          <MarketSentiment />
          <EconomicCalendar />
          <MarketOverview />
          <RecentSignals
            signals={signals}
            loading={signalsQuery.isLoading}
            error={signalsQuery.isError}
            onRetry={signalsQuery.refetch}
          />
        </div>
      </div>
    </div>
  );
}