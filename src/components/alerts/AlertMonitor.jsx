/**
 * AlertMonitor — runs in background, checks prices every minute,
 * fires Telegram + browser notifications + opportunity scanning.
 */
import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { sendTelegramMessage, buildAlertMessage } from "./telegramService";
import {
  requestNotificationPermission,
  sendPriceAlertNotification,
  sendOpportunityNotification,
} from "./BrowserNotificationService";
import { scanForOpportunity } from "./OpportunityScanner";
import { fetchPriceMap } from "@/api/marketData";
import { TRADING_PAIRS } from "@/lib/pairs";

const MONITORED_PAIRS = TRADING_PAIRS;

// cooldown لمنع تكرار فرص التداول (15 دقيقة لكل زوج)
const opportunityCooldown = {};

async function fetchPrices(pairs) {
  return fetchPriceMap(pairs);
}

function withinCooldown(alert) {
  if (!alert.last_triggered || !alert.cooldown_minutes) return false;
  const last = new Date(alert.last_triggered).getTime();
  return Date.now() - last < (alert.cooldown_minutes || 60) * 60 * 1000;
}

function checkCondition(alert, price) {
  if (!price) return false;
  switch (alert.alert_type) {
    case "price_above":       return price >= alert.threshold;
    case "price_below":       return price <= alert.threshold;
    case "stop_loss_near":
    case "take_profit_near":  return alert.threshold && Math.abs(price - alert.threshold) / alert.threshold < 0.005;
    default:                  return false;
  }
}

function buildMessage(alert, price) {
  const labels = {
    price_above:       `وصل السعر فوق المستوى $${alert.threshold?.toLocaleString()}`,
    price_below:       `انخفض السعر تحت المستوى $${alert.threshold?.toLocaleString()}`,
    stop_loss_near:    `⚠️ السعر قريب من وقف الخسارة ($${alert.threshold?.toLocaleString()})`,
    take_profit_near:  `السعر قريب من هدف الربح ($${alert.threshold?.toLocaleString()})`,
    big_move:          `حركة كبيرة مفاجئة في السوق`,
  };
  return labels[alert.alert_type] || alert.name;
}

export default function AlertMonitor({ onNotification, onOpportunity }) {
  const intervalRef = useRef(null);
  const oppIntervalRef = useRef(null);

  // طلب إذن إشعارات المتصفح عند التحميل
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // ---- فحص تنبيهات الأسعار ----
  const runCheck = useCallback(async () => {
    try {
      const alerts = await base44.entities.AlertConfig.filter({ is_active: true });
      if (!alerts.length) return;

      const pairs = alerts.map(a => a.pair).filter(Boolean);
      const priceMap = await fetchPrices(pairs);

      const user = await base44.auth.me().catch(() => null);
      const defaultToken = user?.telegram_bot_token;
      const defaultChatId = user?.telegram_chat_id;

      for (const alert of alerts) {
        if (withinCooldown(alert)) continue;
        const pair = alert.pair?.replace("/", "");
        const price = priceMap[pair];
        if (!checkCondition(alert, price)) continue;

        const message = buildMessage(alert, price);
        const severity = ["stop_loss_near", "big_move"].includes(alert.alert_type) ? "critical"
          : alert.alert_type === "take_profit_near" ? "warning" : "info";

        const logEntry = {
          alert_config_id: alert.id, alert_name: alert.name,
          pair: alert.pair, message, alert_type: alert.alert_type,
          triggered_price: price, threshold: alert.threshold,
          severity, telegram_sent: false,
        };

        // إشعار المتصفح
        sendPriceAlertNotification(alert.pair, price, alert.alert_type, alert.threshold);

        // إرسال Telegram
        const token = alert.telegram_bot_token || defaultToken;
        const chatId = alert.telegram_chat_id || defaultChatId;
        let telegramSent = false, telegramError = null;

        if (alert.telegram_enabled && token && chatId) {
          try {
            await sendTelegramMessage(token, chatId, buildAlertMessage({ ...logEntry, alert_name: alert.name }));
            telegramSent = true;
          } catch (e) { telegramError = e.message; }
        }

        const saved = await base44.entities.AlertLog.create({ ...logEntry, telegram_sent: telegramSent, telegram_error: telegramError });
        await base44.entities.AlertConfig.update(alert.id, {
          triggered_count: (alert.triggered_count || 0) + 1,
          last_triggered: new Date().toISOString(),
        });

        if (alert.in_app_enabled && onNotification) {
          onNotification({ ...logEntry, id: saved.id });
        }
      }
    } catch { /* silent */ }
  }, [onNotification]);

  // ---- فحص فرص التداول ----
  const runOpportunityScan = useCallback(async () => {
    for (const pair of MONITORED_PAIRS) {
      // تحقق من cooldown (15 دقيقة)
      const lastScan = opportunityCooldown[pair] || 0;
      if (Date.now() - lastScan < 15 * 60 * 1000) continue;

      const opp = await scanForOpportunity(pair).catch(() => null);
      if (!opp) continue;

      opportunityCooldown[pair] = Date.now();

      // إشعار المتصفح
      sendOpportunityNotification(pair, opp.direction, opp.entry, opp.tp1, opp.sl, opp.confidence);

      // إشعار داخل التطبيق
      if (onOpportunity) {
        onOpportunity({ ...opp, id: `opp-${pair}-${Date.now()}` });
      }
    }
  }, [onOpportunity]);

  useEffect(() => {
    runCheck();
    intervalRef.current = setInterval(runCheck, 60_000);

    // فحص الفرص كل 5 دقائق
    runOpportunityScan();
    oppIntervalRef.current = setInterval(runOpportunityScan, 5 * 60_000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(oppIntervalRef.current);
    };
  }, [runCheck, runOpportunityScan]);

  return null;
}