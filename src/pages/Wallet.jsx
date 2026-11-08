import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CircleDollarSign, ExternalLink, LockKeyhole,
  RefreshCw, Search, Wallet as WalletIcon,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calcPortfolioFromAccount, fetchBinanceAccount, fetchBinanceTicker } from "@/components/binanceService";
import usePerformanceData from "@/components/performance/usePerformanceData";

const money = (value, digits = 2) => `$${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
})}`;

function SummaryCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold font-mono">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return <div className="glass-card h-40 animate-pulse bg-primary/5" role="status" aria-label="جاري تحميل المحفظة" />;
}

export default function Wallet() {
  const [search, setSearch] = useState("");
  const settingsQuery = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => base44.entities.RiskSettings.list("-created_date", 1),
  });
  const tradingMode = settingsQuery.data?.[0]?.trading_mode;
  const isLive = tradingMode === "live";
  const performance = usePerformanceData();
  const accountQuery = useQuery({
    queryKey: ["wallet-account"],
    enabled: isLive,
    refetchInterval: 60_000,
    queryFn: async () => {
      const account = await fetchBinanceAccount();
      const symbols = [...new Set((account?.balances || [])
        .filter((balance) => Number(balance.free) + Number(balance.locked) > 0 && balance.asset !== "USDT")
        .map((balance) => `${balance.asset}USDT`))]
        .slice(0, 20);
      const tickers = symbols.length ? await fetchBinanceTicker(symbols) : [];
      return calcPortfolioFromAccount(account, tickers);
    },
  });

  const assets = useMemo(() => {
    const portfolio = accountQuery.data;
    if (!portfolio) return [];
    return portfolio.assets.map((balance) => {
      const free = Number(balance.free) || 0;
      const locked = Number(balance.locked) || 0;
      const amount = free + locked;
      const price = balance.asset === "USDT" ? 1 : Number(portfolio.priceMap?.[`${balance.asset}USDT`]);
      return {
        asset: balance.asset,
        free,
        locked,
        amount,
        price: Number.isFinite(price) && price > 0 ? price : null,
        value: Number.isFinite(price) && price > 0 ? amount * price : null,
      };
    }).sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  }, [accountQuery.data]);

  const visibleAssets = assets.filter(({ asset }) => asset.toLowerCase().includes(search.trim().toLowerCase()));
  const unpricedCount = assets.filter((asset) => asset.value === null).length;
  const openTrades = performance.open || [];
  const reserved = openTrades.reduce((total, trade) => {
    const leverage = Math.max(Number(trade.leverage) || 1, 1);
    return total + (Number(trade.position_size) || 0) / leverage;
  }, 0);
  const paperAvailable = performance.balance - reserved;

  if (settingsQuery.isLoading) return <LoadingPanel />;
  if (settingsQuery.isError) {
    return (
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
        <p className="text-sm text-trading-red">تعذر تحميل وضع المحفظة وإعداداتها.</p>
        <Button variant="outline" size="sm" onClick={() => settingsQuery.refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }
  if (!tradingMode) {
    return (
      <div className="glass-card p-5 text-sm text-muted-foreground" role="status">
        لم يتم إعداد وضع التداول بعد. اضبطه من <Link className="text-primary underline" to="/RiskManagement">إدارة المخاطر</Link>.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">إدارة المحفظة</h2>
            <p className="text-xs text-muted-foreground">
              {isLive ? "عرض للقراءة فقط لأرصدة Binance" : "إدارة رصيد التداول التجريبي ومراكزه"}
            </p>
          </div>
        </div>
        {isLive ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/AppSettings">إعدادات Binance <ExternalLink className="h-3.5 w-3.5" /></Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => accountQuery.refetch()} disabled={accountQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${accountQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث الأرصدة
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/RiskManagement">إعدادات الرصيد التجريبي <ExternalLink className="h-3.5 w-3.5" /></Link>
          </Button>
        )}
      </section>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        هذه الصفحة للمتابعة فقط؛ لا تنفّذ إيداعاً أو سحباً أو تحويلاً ولا تغيّر إعدادات التداول.
        {isLive && <> يتم جلب الأسعار مقابل USDT، وقد لا تتوفر قيمة تقديرية لبعض الأصول.</>}
      </div>

      {isLive ? (
        accountQuery.isPending ? (
          <LoadingPanel />
        ) : accountQuery.isError ? (
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
            <p className="text-sm text-trading-red">تعذر تحميل محفظة Binance: {accountQuery.error?.message || "خطأ غير معروف"}</p>
            <Button variant="outline" size="sm" onClick={() => accountQuery.refetch()} disabled={accountQuery.isFetching}>إعادة المحاولة</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryCard
                label="قيمة الأصول المقدّرة"
                value={money(accountQuery.data.total_balance)}
                detail={unpricedCount ? `قيمة ${unpricedCount} من الأصول غير متاحة` : "القيمة محسوبة من الأرصدة وأسعار USDT"}
                icon={CircleDollarSign}
              />
              <SummaryCard
                label="USDT متاح"
                value={money(accountQuery.data.available_balance)}
                detail="الرصيد الحر فقط، ولا يشمل العملات الأخرى"
                icon={WalletIcon}
              />
            </div>

            <section className="glass-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <h3 className="text-sm font-semibold">الأصول</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{assets.length} أصل في الحساب</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="ابحث عن أصل"
                    placeholder="ابحث عن أصل..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="bg-secondary pr-9"
                  />
                </div>
              </div>
              {visibleAssets.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-secondary/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="p-3 text-right font-medium">الأصل</th>
                        <th className="p-3 text-right font-medium">الإجمالي</th>
                        <th className="p-3 text-right font-medium">متاح</th>
                        <th className="p-3 text-right font-medium">مقيّد</th>
                        <th className="p-3 text-right font-medium">السعر التقريبي</th>
                        <th className="p-3 text-right font-medium">القيمة التقريبية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAssets.map((asset) => (
                        <tr key={asset.asset} className="border-t border-border/70">
                          <td className="p-3 font-semibold">{asset.asset}</td>
                          <td className="p-3 font-mono">{asset.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                          <td className="p-3 font-mono">{asset.free.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                          <td className="p-3 font-mono">{asset.locked.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                          <td className="p-3 font-mono">{asset.price === null ? "غير متاح" : money(asset.price, asset.price < 1 ? 6 : 2)}</td>
                          <td className="p-3 font-mono text-primary">{asset.value === null ? "غير متاح" : money(asset.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {assets.length ? "لا توجد أصول تطابق البحث." : "لا توجد أرصدة موجبة في الحساب."}
                </div>
              )}
            </section>
          </>
        )
      ) : performance.isLoading ? (
        <LoadingPanel />
      ) : performance.isError ? (
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
          <p className="text-sm text-trading-red">تعذر تحميل أرصدة التداول التجريبي.</p>
          <Button variant="outline" size="sm" onClick={() => performance.refetch()}>إعادة المحاولة</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="قيمة المحفظة" value={money(performance.balance)} detail="الرصيد الابتدائي مع الربح/الخسارة" icon={CircleDollarSign} />
            <SummaryCard label="المتاح للتداول" value={money(paperAvailable)} detail="بعد خصم الهامش المستخدم تقديرياً" icon={WalletIcon} />
            <SummaryCard label="الهامش المستخدم" value={money(reserved)} detail={`${openTrades.length} مركز مفتوح`} icon={LockKeyhole} />
          </div>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold">المراكز المفتوحة</h3>
              <p className="mt-1 text-xs text-muted-foreground">الرصيد التجريبي يمكن تعديله من إعدادات المخاطر.</p>
            </div>
            {openTrades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3 text-right font-medium">الزوج</th>
                      <th className="p-3 text-right font-medium">الاتجاه</th>
                      <th className="p-3 text-right font-medium">حجم المركز</th>
                      <th className="p-3 text-right font-medium">الهامش</th>
                      <th className="p-3 text-right font-medium">الربح/الخسارة العائمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map((trade) => {
                      const margin = (Number(trade.position_size) || 0) / Math.max(Number(trade.leverage) || 1, 1);
                      const pnl = Number(trade.pnl) || 0;
                      return (
                        <tr key={trade.id} className="border-t border-border/70">
                          <td className="p-3 font-semibold">{trade.pair}</td>
                          <td className="p-3">{trade.type === "short" ? "بيع" : "شراء"}</td>
                          <td className="p-3 font-mono">{money(trade.position_size)}</td>
                          <td className="p-3 font-mono">{money(margin)}</td>
                          <td className={`p-3 font-mono ${pnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                            {trade.pnl_accounting_version === 2 ? `${pnl >= 0 ? "+" : "-"}${money(Math.abs(pnl))}` : "غير متاح بعد"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">لا توجد مراكز مفتوحة حالياً.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
