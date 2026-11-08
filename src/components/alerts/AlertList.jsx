import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Send, BellOff } from "lucide-react";
import { sendTelegramMessage, buildAlertMessage } from "./telegramService";

const TYPE_LABELS = {
  price_above: "📈 فوق السعر",
  price_below: "📉 تحت السعر",
  stop_loss_near: "🛑 قريب SL",
  take_profit_near: "🎯 قريب TP",
  new_signal: "🤖 إشارة جديدة",
  trade_opened: "✅ فتح صفقة",
  trade_closed: "🔐 إغلاق صفقة",
  big_move: "⚡ حركة كبيرة",
};

const SEVERITY_COLOR = {
  critical: "text-trading-red",
  warning: "text-trading-yellow",
  info: "text-trading-cyan",
};

export default function AlertList({ alerts, onEdit, onRefresh, userSettings }) {
  const [testing, setTesting] = useState(null);

  const handleToggle = async (alert) => {
    await base44.entities.AlertConfig.update(alert.id, { is_active: !alert.is_active });
    onRefresh?.();
  };

  const handleDelete = async (id) => {
    await base44.entities.AlertConfig.delete(id);
    onRefresh?.();
  };

  const handleTest = async (alert) => {
    setTesting(alert.id);
    const token = alert.telegram_bot_token || userSettings?.telegram_bot_token;
    const chatId = alert.telegram_chat_id || userSettings?.telegram_chat_id;
    if (!token || !chatId) {
      alert("أضف Telegram Bot Token وChat ID في الإعدادات أولاً");
      setTesting(null);
      return;
    }
    try {
      const msg = buildAlertMessage({
        alert_name: alert.name,
        pair: alert.pair,
        message: "هذه رسالة اختبار لتنبيه: " + alert.name,
        alert_type: alert.alert_type,
        triggered_price: alert.threshold,
        threshold: alert.threshold,
        severity: "info",
      });
      await sendTelegramMessage(token, chatId, msg);
    } catch (e) {
      console.error(e);
    }
    setTesting(null);
  };

  if (!alerts?.length) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
        <BellOff className="w-8 h-8 opacity-30" />
        <span>لا توجد تنبيهات بعد. أنشئ تنبيهك الأول!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div key={alert.id}
          className={`glass-card p-4 flex items-center justify-between gap-3 transition-opacity ${!alert.is_active ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Switch checked={!!alert.is_active} onCheckedChange={() => handleToggle(alert)} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{alert.name}</span>
                {alert.pair && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{alert.pair}</Badge>}
                <Badge className="bg-secondary text-muted-foreground text-[10px] px-1.5 py-0 h-4 border-0">
                  {TYPE_LABELS[alert.alert_type] || alert.alert_type}
                </Badge>
                {alert.threshold && (
                  <span className="text-xs text-trading-cyan font-mono">${alert.threshold?.toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {alert.telegram_enabled && <span className="text-[10px] text-muted-foreground">📱 تلغرام</span>}
                {alert.in_app_enabled && <span className="text-[10px] text-muted-foreground">🔔 داخل التطبيق</span>}
                {alert.triggered_count > 0 && (
                  <span className="text-[10px] text-muted-foreground">تفعّل {alert.triggered_count} مرة</span>
                )}
                {alert.last_triggered && (
                  <span className="text-[10px] text-muted-foreground">
                    آخر تنبيه: {new Date(alert.last_triggered).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="اختبار إشعار تلغرام"
              onClick={() => handleTest(alert)} disabled={testing === alert.id}>
              <Send className={`w-3.5 h-3.5 ${testing === alert.id ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(alert)}>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(alert.id)}>
              <Trash2 className="w-3.5 h-3.5 text-trading-red" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}