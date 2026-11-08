/**
 * Browser Notification Service
 * يطلب إذن الإشعارات ويرسل notifications للمتصفح
 */

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendBrowserNotification(title, body, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/quantum-trade-icon.svg",
    badge: "/quantum-trade-icon.svg",
    tag: options.tag || "trading-alert",
    renotify: true,
    ...options,
  });
  // إغلاق تلقائي بعد 8 ثوان
  setTimeout(() => n.close(), 8000);
  return n;
}

export function sendPriceAlertNotification(pair, price, alertType, threshold) {
  const icons = {
    price_above: "📈",
    price_below: "📉",
    stop_loss_near: "🛑",
    take_profit_near: "🎯",
    big_move: "⚡",
  };
  const icon = icons[alertType] || "🔔";
  sendBrowserNotification(
    `${icon} تنبيه سعر: ${pair}`,
    `السعر الحالي: $${price?.toLocaleString()} | الهدف: $${threshold?.toLocaleString()}`,
    { tag: `price-${pair}` }
  );
}

export function sendOpportunityNotification(pair, direction, entry, tp, sl, confidence) {
  const emoji = direction === "buy" ? "🟢" : "🔴";
  const dirText = direction === "buy" ? "شراء" : "بيع";
  sendBrowserNotification(
    `${emoji} فرصة تداول: ${pair} — ${dirText}`,
    `دخول: $${entry?.toLocaleString()} | TP: $${tp?.toLocaleString()} | SL: $${sl?.toLocaleString()} | ثقة: ${confidence}%`,
    { tag: `opportunity-${pair}`, requireInteraction: true }
  );
}