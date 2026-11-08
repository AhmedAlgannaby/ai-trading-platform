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
import AIEngine from './pages/AIEngine';
import AutoTrading from './pages/AutoTrading';
import AutoStrategies from './pages/AutoStrategies';
import AISignals from './pages/AISignals';
import Alerts from './pages/Alerts';
import AppSettings from './pages/AppSettings';
import Backtesting from './pages/Backtesting';
import CopyTrading from './pages/CopyTrading';
import Dashboard from './pages/Dashboard';
import MarketAnalysis from './pages/MarketAnalysis';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import RiskManagement from './pages/RiskManagement';
import SentimentAnalysis from './pages/SentimentAnalysis';
import StrategyBuilder from './pages/StrategyBuilder';
import StrategyMarketplace from './pages/StrategyMarketplace';
import SignalMarketplace from './pages/SignalMarketplace';
import TradeHistory from './pages/TradeHistory';
import Trades from './pages/Trades';
import WhaleTracking from './pages/WhaleTracking';
import __Layout from './Layout.jsx';


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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};