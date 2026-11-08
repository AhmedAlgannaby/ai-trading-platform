import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const SEVERITY_STYLES = {
  critical: "border-trading-red/50 bg-trading-red/10",
  warning: "border-trading-yellow/50 bg-trading-yellow/10",
  info: "border-primary/30 bg-primary/10",
};

const SEVERITY_ICONS = { critical: "🚨", warning: "⚠️", info: "🔔" };

function NotificationItem({ notif, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notif.id), 8000);
    return () => clearTimeout(t);
  }, [notif.id, onDismiss]);

  const style = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      className={`flex items-start gap-3 p-3 rounded-xl border glass-card ${style} shadow-xl max-w-xs w-full`}
    >
      <span className="text-lg mt-0.5">{SEVERITY_ICONS[notif.severity] || "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{notif.alert_name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
        {notif.triggered_price && (
          <p className="text-[11px] text-trading-cyan font-mono mt-0.5">
            ${notif.triggered_price?.toLocaleString()}
          </p>
        )}
      </div>
      <button onClick={() => onDismiss(notif.id)} className="flex-shrink-0">
        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </motion.div>
  );
}

export default function InAppNotificationToast({ notifications, onDismiss }) {
  return (
    <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationItem notif={n} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}