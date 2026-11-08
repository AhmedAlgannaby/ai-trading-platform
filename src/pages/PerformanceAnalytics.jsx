import React from "react";
import { Loader2 } from "lucide-react";
import usePerformanceData from "@/components/performance/usePerformanceData";
import PerformanceKpis from "@/components/performance/PerformanceKpis";
import EquityDrawdownChart from "@/components/performance/EquityDrawdownChart";
import ProfitLossCharts from "@/components/performance/ProfitLossCharts";
import StrategyCharts from "@/components/performance/StrategyCharts";

export default function PerformanceAnalytics() {
  const m = usePerformanceData();

  if (m.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PerformanceKpis m={m} initial={m.initial} />
      <EquityDrawdownChart equity={m.equity} />
      <ProfitLossCharts
        daily={m.daily}
        winsCount={m.winsCount}
        lossesCount={m.lossesCount}
        grossWin={m.grossWin}
        grossLoss={m.grossLoss}
      />
      <StrategyCharts strategies={m.strategies} pairs={m.pairs} />
    </div>
  );
}