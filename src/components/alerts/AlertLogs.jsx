import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Zap } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: Zap, color: "text-trading-red", bg: "bg-trading-red/10", label: "حرج" },
  warning:  { icon: AlertTriangle, color: "text-trading-yellow", bg: "bg-trading-yellow/10", label: "تحذير" },
  info:     { icon: Info, color: "text-trading-cyan", bg: "bg-trading-cyan/10", label: "معلومة" },
};

const TYPE_ICONS = {
  price_above: "📈", price_below: "📉",
  stop_loss_near: "🛑", take_profit_near: "🎯",
  new_signal: "🤖", trade_opened: "✅",
  trade_closed: "🔐", big_move: "⚡",
};

export default function AlertLogs({ logs }) {
  if (!logs?.length) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        لا توجد سجلات تنبيهات بعد
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
      {logs.map(log => {
        const s = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
        const SIcon = s.icon;
        return (
          <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg ${s.bg} border border-border/30`}>
            <SIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-medium">{TYPE_ICONS[log.alert_type]} {log.alert_name}</span>
                {log.pair && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{log.pair}</Badge>}
                <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${s.bg} ${s.color}`}>{s.label}</Badge>
                {log.telegram_sent && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 border-0 bg-primary/10 text-primary">📱 أُرسل</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{log.message}</p>
              {log.triggered_price && (
                <p className="text-[10px] text-trading-cyan font-mono mt-0.5">
                  السعر: ${log.triggered_price?.toLocaleString()}
                  {log.threshold ? ` / الهدف: $${log.threshold?.toLocaleString()}` : ""}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
              {new Date(log.created_date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}