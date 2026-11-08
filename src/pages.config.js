/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const AIEngine = lazy(() => import('./pages/AIEngine'));
const AutoTrading = lazy(() => import('./pages/AutoTrading'));
const AutoStrategies = lazy(() => import('./pages/AutoStrategies'));
const AISignals = lazy(() => import('./pages/AISignals'));
const Alerts = lazy(() => import('./pages/Alerts'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
const Backtesting = lazy(() => import('./pages/Backtesting'));
const CopyTrading = lazy(() => import('./pages/CopyTrading'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MarketAnalysis = lazy(() => import('./pages/MarketAnalysis'));
const PerformanceAnalytics = lazy(() => import('./pages/PerformanceAnalytics'));
const RiskManagement = lazy(() => import('./pages/RiskManagement'));
const SentimentAnalysis = lazy(() => import('./pages/SentimentAnalysis'));
const StrategyBuilder = lazy(() => import('./pages/StrategyBuilder'));
const StrategyMarketplace = lazy(() => import('./pages/StrategyMarketplace'));
const SignalMarketplace = lazy(() => import('./pages/SignalMarketplace'));
const TradeHistory = lazy(() => import('./pages/TradeHistory'));
const Trades = lazy(() => import('./pages/Trades'));
const WhaleTracking = lazy(() => import('./pages/WhaleTracking'));
const Wallet = lazy(() => import('./pages/Wallet'));

export const PAGES = {
    "AIEngine": AIEngine,
    "AutoTrading": AutoTrading,
    "AutoStrategies": AutoStrategies,
    "AISignals": AISignals,
    "Alerts": Alerts,
    "AppSettings": AppSettings,
    "Backtesting": Backtesting,
    "CopyTrading": CopyTrading,
    "Dashboard": Dashboard,
    "MarketAnalysis": MarketAnalysis,
    "PerformanceAnalytics": PerformanceAnalytics,
    "RiskManagement": RiskManagement,
    "SentimentAnalysis": SentimentAnalysis,
    "StrategyBuilder": StrategyBuilder,
    "StrategyMarketplace": StrategyMarketplace,
    "SignalMarketplace": SignalMarketplace,
    "TradeHistory": TradeHistory,
    "Trades": Trades,
    "WhaleTracking": WhaleTracking,
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};