export const DEFAULT_FILTERS = {
  pair: "all",
  strategy: "all",
  outcome: "all", // all | win | loss
  type: "all", // all | long | short
  minPnl: "",
  maxPnl: "",
  sort: "date_desc",
};

export const strategyOf = (t) => t.strategy || "بدون استراتيجية";

export function applyFilters(trades, f) {
  const min = f.minPnl === "" ? null : Number(f.minPnl);
  const max = f.maxPnl === "" ? null : Number(f.maxPnl);
  const out = trades.filter((t) => {
    const pct = t.pnl_percent || 0;
    if (f.pair !== "all" && t.pair !== f.pair) return false;
    if (f.strategy !== "all" && strategyOf(t) !== f.strategy) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.outcome === "win" && (t.pnl || 0) <= 0) return false;
    if (f.outcome === "loss" && (t.pnl || 0) > 0) return false;
    if (min !== null && pct < min) return false;
    if (max !== null && pct > max) return false;
    return true;
  });
  const sorters = {
    date_desc: (a, b) => new Date(b.closed_at || b.created_date) - new Date(a.closed_at || a.created_date),
    date_asc: (a, b) => new Date(a.closed_at || a.created_date) - new Date(b.closed_at || b.created_date),
    pct_desc: (a, b) => (b.pnl_percent || 0) - (a.pnl_percent || 0),
    pct_asc: (a, b) => (a.pnl_percent || 0) - (b.pnl_percent || 0),
    pnl_desc: (a, b) => (b.pnl || 0) - (a.pnl || 0),
    pnl_asc: (a, b) => (a.pnl || 0) - (b.pnl || 0),
  };
  return out.sort(sorters[f.sort] || sorters.date_desc);
}

export function strategyStats(trades) {
  const map = {};
  trades.forEach((t) => {
    const k = strategyOf(t);
    if (!map[k]) map[k] = { name: k, count: 0, wins: 0, pnl: 0, pctSum: 0 };
    map[k].count++;
    if ((t.pnl || 0) > 0) map[k].wins++;
    map[k].pnl += t.pnl || 0;
    map[k].pctSum += t.pnl_percent || 0;
  });
  return Object.values(map)
    .map((s) => ({ ...s, winRate: (s.wins / s.count) * 100, avgPct: s.pctSum / s.count }))
    .sort((a, b) => b.pnl - a.pnl);
}