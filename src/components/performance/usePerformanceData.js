import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/** يحمّل الصفقات والإعدادات ويحسب كل مقاييس الأداء من الصفقات الفعلية */
export default function usePerformanceData() {
  const tradesQuery = useQuery({
    queryKey: ["perf-trades"],
    queryFn: () => base44.entities.Trade.filter({ mode: "paper" }, "-created_date", 500),
    refetchInterval: 30000,
  });
  const settingsQuery = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
  });

  const trades = tradesQuery.data || [];
  const settings = settingsQuery.data || [];
  const initial = settings[0]?.paper_balance || 10000;

  const metrics = useMemo(() => {
    const legacyClosedCount = trades.filter(t =>
      t.status === "closed" && t.pnl_accounting_version !== 2,
    ).length;
    const closed = trades.filter(t => t.status === "closed" && t.pnl_accounting_version === 2)
      .sort((a, b) => new Date(a.closed_at || a.updated_date) - new Date(b.closed_at || b.updated_date));
    const open = trades.filter(t => t.status === "open");
    const valuedOpen = open.filter(t => t.pnl_accounting_version === 2);

    const realized = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const unrealized = valuedOpen.reduce((s, t) => s + (t.pnl || 0), 0);
    const balance = initial + realized + unrealized;

    const wins = closed.filter(t => (t.pnl || 0) > 0);
    const losses = closed.filter(t => (t.pnl || 0) <= 0);
    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));

    // منحنى رأس المال + السحب
    let eq = initial, peak = initial, maxDD = 0;
    const equity = [{ label: "البداية", balance: initial, drawdown: 0 }];
    closed.forEach((t, i) => {
      eq += t.pnl || 0;
      peak = Math.max(peak, eq);
      const dd = peak ? ((peak - eq) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
      equity.push({
        label: `#${i + 1}`,
        date: dayKey(t.closed_at || t.updated_date),
        balance: Math.round(eq * 100) / 100,
        drawdown: -Math.round(dd * 100) / 100,
      });
    });
    if (valuedOpen.length) {
      peak = Math.max(peak, balance);
      const dd = peak ? ((peak - balance) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
      equity.push({
        label: "الآن",
        date: dayKey(new Date()),
        balance: Math.round(balance * 100) / 100,
        drawdown: -Math.round(dd * 100) / 100,
      });
    }

    // يومي: ربح/خسارة + معدل النجاح التراكمي
    const byDay = {};
    closed.forEach(t => {
      const k = dayKey(t.closed_at || t.updated_date);
      byDay[k] = byDay[k] || { date: k, profit: 0, loss: 0, pnl: 0, w: 0, n: 0 };
      const p = t.pnl || 0;
      if (p > 0) byDay[k].profit += p; else byDay[k].loss += p;
      byDay[k].pnl += p;
      byDay[k].n++;
      if (p > 0) byDay[k].w++;
    });
    let cw = 0, cn = 0;
    const daily = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map(d => {
      cw += d.w; cn += d.n;
      return {
        date: d.date.slice(5),
        profit: Math.round(d.profit * 100) / 100,
        loss: Math.round(d.loss * 100) / 100,
        pnl: Math.round(d.pnl * 100) / 100,
        winRate: Math.round((cw / cn) * 1000) / 10,
      };
    });

    // حسب الاستراتيجية
    const strat = {};
    closed.forEach(t => {
      const k = t.strategy || "غير محدد";
      strat[k] = strat[k] || { name: k, trades: 0, wins: 0, pnl: 0 };
      strat[k].trades++;
      strat[k].pnl += t.pnl || 0;
      if ((t.pnl || 0) > 0) strat[k].wins++;
    });
    const strategies = Object.values(strat).map(s => ({
      ...s,
      pnl: Math.round(s.pnl * 100) / 100,
      winRate: Math.round((s.wins / s.trades) * 1000) / 10,
    })).sort((a, b) => b.pnl - a.pnl);

    // حسب الزوج
    const pr = {};
    closed.forEach(t => {
      pr[t.pair] = pr[t.pair] || { name: t.pair, pnl: 0, trades: 0 };
      pr[t.pair].pnl += t.pnl || 0;
      pr[t.pair].trades++;
    });
    const pairs = Object.values(pr).map(p => ({ ...p, pnl: Math.round(p.pnl * 100) / 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      closed, open, legacyClosedCount, balance, realized, unrealized, equity, daily, strategies, pairs,
      totalReturnPct: initial ? ((balance - initial) / initial) * 100 : 0,
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      winsCount: wins.length,
      lossesCount: losses.length,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin > 0 ? grossWin : 0,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? -grossLoss / losses.length : 0,
      maxDD,
      grossWin, grossLoss,
    };
  }, [trades, initial]);

  return {
    ...metrics,
    initial,
    isLoading: tradesQuery.isLoading || settingsQuery.isLoading,
    isError: tradesQuery.isError || settingsQuery.isError,
    tradesIsError: tradesQuery.isError,
    settingsIsError: settingsQuery.isError,
    refetch: () => Promise.all([tradesQuery.refetch(), settingsQuery.refetch()]),
  };
}