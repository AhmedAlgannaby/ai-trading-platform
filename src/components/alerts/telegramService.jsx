/**
 * Telegram Bot API service
 * Sends messages via a Telegram bot to a specific chat.
 */

export async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) {
    throw new Error("Bot Token أو Chat ID مفقود");
  }
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "فشل إرسال رسالة Telegram");
  return data;
}

export function buildAlertMessage(log) {
  const icons = {
    price_above: "📈",
    price_below: "📉",
    stop_loss_near: "🛑",
    take_profit_near: "🎯",
    big_move: "⚡",
    new_signal: "🤖",
    trade_opened: "✅",
    trade_closed: "🔐",
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };

  const severityIcon = icons[log.severity] || "🔔";
  const typeIcon = icons[log.alert_type] || "🔔";

  return `${severityIcon} <b>تنبيه تداول AI</b>

${typeIcon} <b>${log.alert_name || "تنبيه"}</b>
${log.pair ? `💱 الزوج: <code>${log.pair}</code>` : ""}
📝 ${log.message}
${log.triggered_price ? `💰 السعر الحالي: <b>$${log.triggered_price.toLocaleString()}</b>` : ""}
${log.threshold ? `🎯 المستوى المستهدف: <b>$${log.threshold.toLocaleString()}</b>` : ""}

🕐 ${new Date().toLocaleString("ar-SA")}`;
}