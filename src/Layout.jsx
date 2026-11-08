import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, TrendingUp, Brain, History, Wallet,
  Shield, Settings, Bell, ChevronLeft, ChevronRight,
  BarChart3, Bot, Zap, LineChart, Cpu, Fish, MessageSquare, Store, Copy, Wand2, Radio, PieChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TradingSafetyBanner from "@/components/trading/TradingSafetyBanner";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "إدارة المحفظة", icon: Wallet, page: "Wallet" },
  { name: "تحليل السوق", icon: LineChart, page: "MarketAnalysis" },
  { name: "إشارات AI", icon: Brain, page: "AISignals" },
  { name: "محرك AI", icon: Cpu, page: "AIEngine", badge: "NEW" },
  { name: "Whale Tracking", icon: Fish, page: "WhaleTracking", badge: "NEW" },
  { name: "تحليل المشاعر", icon: MessageSquare, page: "SentimentAnalysis", badge: "NEW" },
  { name: "سوق الإشارات", icon: Radio, page: "SignalMarketplace", badge: "NEW" },
  { name: "تحليلات الأداء", icon: PieChart, page: "PerformanceAnalytics", badge: "NEW" },
  { name: "الصفقات", icon: TrendingUp, page: "Trades" },
  { name: "سجل التداول", icon: History, page: "TradeHistory" },
  { name: "Backtesting", icon: BarChart3, page: "Backtesting" },
  { name: "Marketplace", icon: Store, page: "StrategyMarketplace", badge: "NEW" },
  { name: "محرر الاستراتيجيات", icon: Wand2, page: "StrategyBuilder", badge: "NEW" },
  { name: "نسخ التداول", icon: Copy, page: "CopyTrading", badge: "NEW" },
  { name: "التنبيهات", icon: Bell, page: "Alerts", badge: "NEW" },
  { name: "أتمتة التداول", icon: Bot, page: "AutoTrading", badge: "NEW" },
  { name: "استراتيجيات آلية", icon: Zap, page: "AutoStrategies", badge: "NEW" },
  { name: "إدارة المخاطر", icon: Shield, page: "RiskManagement" },
  { name: "الإعدادات", icon: Settings, page: "AppSettings" },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [tradingMode, setTradingMode] = useState("paper");

  useEffect(() => {
    base44.entities.RiskSettings.list("-created_date", 1).then(list => {
      if (list[0]?.trading_mode) setTradingMode(list[0].trading_mode);
    }).catch((e) => console.error("load trading mode failed:", e));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-[260px]"
        } flex-shrink-0 border-l border-border bg-sidebar transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/quantum-trade-icon.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <span className="font-bold text-sm text-sidebar-foreground">Quantum Trade</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-trading-green animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">متصل</span>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg overflow-hidden mx-auto">
              <img src="/quantum-trade-icon.svg" alt="" className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.name}</span>
                )}
                {!collapsed && item.page === "AISignals" && (
                  <Badge className="mr-auto bg-primary/20 text-primary text-[10px] px-1.5 py-0 h-4 border-0">3</Badge>
                )}
                {!collapsed && item.badge && item.badge !== undefined && item.page !== "AISignals" && (
                  <Badge className="mr-auto bg-trading-yellow/20 text-trading-yellow text-[9px] px-1.5 py-0 h-4 border-0">{item.badge}</Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse btn */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-colors"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">طي القائمة</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">
              {navItems.find(i => i.page === currentPageName)?.name || currentPageName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {tradingMode === "live" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-trading-red/10 border border-trading-red/20">
                <Zap className="w-3.5 h-3.5 text-trading-red animate-pulse" />
                <span className="text-xs font-medium text-trading-red">تداول حقيقي 🔴</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-trading-green/10 border border-trading-green/20">
                <Zap className="w-3.5 h-3.5 text-trading-green" />
                <span className="text-xs font-medium text-trading-green">تداول تجريبي</span>
              </div>
            )}
            <button aria-label="التنبيهات" className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-trading-red" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <TradingSafetyBanner />
          {children}
        </div>
      </main>
    </div>
  );
}