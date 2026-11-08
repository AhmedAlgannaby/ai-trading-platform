import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import ExitConfirm from "@/components/trading/ExitConfirm";
import LearningInsights from "@/components/dashboard/LearningInsights";
import usePerformanceData from "@/components/performance/usePerformanceData";
import MLModelStatus from "@/components/dashboard/MLModelStatus";

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

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => base44.entities.Trade.list("-created_date", 50),
    initialData: [],
  });

  const { data: signals } = useQuery({
    queryKey: ["signals"],
    queryFn: () => base44.entities.Signal.list("-created_date", 10),
    initialData: [],
  });

  const { data: portfolios } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => base44.entities.PortfolioSnapshot.list("-created_date", 1),
    initialData: [],
  });

  const perf = usePerformanceData();
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
    available_balance: Math.round((perf.balance - perf.open.reduce((s, t) => s + (t.position_size || 0), 0)) * 100) / 100,
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
      <LivePortfolioStats portfolio={portfolio} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <EquityCurve />
          <OpenPositions trades={trades} />
        </div>
        <div className="space-y-6">
          <PaperTradingStatus />
          <MLModelStatus />
          <LearningInsights />
          <PositionSizeCalculator />
          <MarketSentiment />
          <EconomicCalendar />
          <MarketOverview />
          <RecentSignals signals={signals} />
        </div>
      </div>
    </div>
  );
}