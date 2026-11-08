// Centralized react-query keys — prevents duplicate fetches / stale UI.
// Usage: queryKey: queryKeys.trades.all  /  invalidateQueries({ queryKey: queryKeys.trades.all })
export const queryKeys = {
  trades: {
    all: ['trades'],
    open: ['trades', 'open'],
    closed: ['trades', 'closed'],
  },
  signals: {
    all: ['signals'],
  },
  riskSettings: ['riskSettings'],
  backtestResults: ['backtest_results'],
  alerts: {
    configs: ['alertConfigs'],
    logs: ['alertLogs'],
  },
};
