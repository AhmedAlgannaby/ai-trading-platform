import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, History, Settings2, Send, CheckCircle2 } from "lucide-react";
import AlertForm from "@/components/alerts/AlertForm";
import AlertList from "@/components/alerts/AlertList";
import AlertLogs from "@/components/alerts/AlertLogs";
import AlertMonitor from "@/components/alerts/AlertMonitor";
import InAppNotificationToast from "@/components/alerts/InAppNotificationToast";
import OpportunityToast from "@/components/alerts/OpportunityToast";
import { sendTelegramMessage } from "@/components/alerts/telegramService";

export default function Alerts() {
  const [showForm, setShowForm] = useState(false);
  const [editAlert, setEditAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [testStatus, setTestStatus] = useState(null);

  const handleOpportunity = useCallback((opp) => {
    setOpportunities(prev => [...prev.filter(o => o.pair !== opp.pair), opp]);
  }, []);
  const qc = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ["alert_configs"],
    queryFn: () => base44.entities.AlertConfig.list("-created_date"),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["alert_logs"],
    queryFn: () => base44.entities.AlertLog.list("-created_date", 50),
    refetchInterval: 30_000,
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const handleNotification = useCallback((notif) => {
    const id = notif.id || Date.now().toString();
    setNotifications(prev => [...prev, { ...notif, id }]);
    qc.invalidateQueries({ queryKey: ["alert_logs"] });
  }, [qc]);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["alert_configs"] });
    qc.invalidateQueries({ queryKey: ["alert_logs"] });
  };

  const handleEdit = (alert) => {
    setEditAlert(alert);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditAlert(null);
    handleRefresh();
  };

  const handleTestTelegram = async () => {
    const token = user?.telegram_bot_token;
    const chatId = user?.telegram_chat_id;
    if (!token || !chatId) {
      setTestStatus("error");
      return;
    }
    try {
      setTestStatus("loading");
      await sendTelegramMessage(token, chatId,
        `✅ <b>اتصال ناجح!</b>\n\nتم ربط تنبيهات Trading AI بحسابك على تلغرام بنجاح.\n🕐 ${new Date().toLocaleString("ar-SA")}`
      );
      setTestStatus("success");
      setTimeout(() => setTestStatus(null), 4000);
    } catch (e) {
      setTestStatus("error");
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const activeCount = alerts.filter(a => a.is_active).length;
  const unsentLogs = logs.filter(l => !l.telegram_sent && l.in_app_enabled !== false).length;

  return (
    <div className="space-y-6">
      {/* Background Monitor */}
      <AlertMonitor onNotification={handleNotification} onOpportunity={handleOpportunity} />
      <InAppNotificationToast notifications={notifications} onDismiss={dismissNotification} />
      <OpportunityToast opportunities={opportunities} onDismiss={(id) => setOpportunities(prev => prev.filter(o => o.id !== id))} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            نظام التنبيهات
            {activeCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-0 text-xs">{activeCount} نشط</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تنبيهات فورية عبر تلغرام وداخل التطبيق</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Telegram Test */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestTelegram}
            disabled={testStatus === "loading"}
            className="gap-2 text-xs"
          >
            {testStatus === "loading" ? (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : testStatus === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-trading-green" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {testStatus === "success" ? "تم الإرسال!" : testStatus === "error" ? "أضف الإعدادات أولاً" : "اختبار تلغرام"}
          </Button>
          <Button size="sm" onClick={() => { setEditAlert(null); setShowForm(!showForm); }} className="gap-2">
            <Plus className="w-4 h-4" />
            تنبيه جديد
          </Button>
        </div>
      </div>

      {/* Telegram Setup Hint */}
      {!user?.telegram_bot_token && (
        <div className="glass-card p-4 flex items-start gap-3 border-trading-yellow/20">
          <span className="text-xl">📱</span>
          <div>
            <p className="text-sm font-medium text-trading-yellow">إعداد تلغرام مطلوب</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              لاستقبال التنبيهات على تلغرام، أضف <strong>Telegram Bot Token</strong> و <strong>Chat ID</strong> في صفحة الإعدادات.
            </p>
            <a href="/app-settings" className="text-xs text-primary hover:underline mt-1 inline-block">الذهاب إلى الإعدادات ←</a>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <AlertForm
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditAlert(null); }}
          editAlert={editAlert}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList className="bg-secondary">
          <TabsTrigger value="alerts" className="gap-2 text-xs">
            <Bell className="w-3.5 h-3.5" />
            التنبيهات
            <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1">{alerts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs">
            <History className="w-3.5 h-3.5" />
            السجل
            {unsentLogs > 0 && (
              <Badge className="bg-trading-red/20 text-trading-red border-0 text-[10px] px-1">{unsentLogs}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2 text-xs">
            <Settings2 className="w-3.5 h-3.5" />
            دليل الإعداد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <AlertList
            alerts={alerts}
            onEdit={handleEdit}
            onRefresh={handleRefresh}
            userSettings={user}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              سجل التنبيهات الأخيرة
            </h3>
            <AlertLogs logs={logs} />
          </div>
        </TabsContent>

        <TabsContent value="guide" className="mt-4">
          <div className="glass-card p-5 space-y-5">
            <h3 className="font-semibold text-sm">📱 كيفية إعداد تنبيهات تلغرام</h3>
            <div className="space-y-4">
              {[
                { step: "1", title: "إنشاء Bot على تلغرام", desc: 'ابحث عن @BotFather في تلغرام، أرسل /newbot، اتبع التعليمات، ستحصل على Bot Token.', icon: "🤖" },
                { step: "2", title: "الحصول على Chat ID", desc: 'ابحث عن @userinfobot في تلغرام، أرسل له رسالة، سيرد بـ Chat ID الخاص بك.', icon: "🆔" },
                { step: "3", title: "إضافة البيانات في الإعدادات", desc: 'اذهب إلى صفحة الإعدادات وأضف Bot Token وChat ID في قسم تلغرام.', icon: "⚙️" },
                { step: "4", title: "اختبار الاتصال", desc: 'اضغط زر "اختبار تلغرام" في الأعلى للتأكد من وصول الرسائل.', icon: "✅" },
                { step: "5", title: "إنشاء التنبيهات", desc: 'انشئ تنبيهاتك وفعّل خيار تلغرام في كل تنبيه، ستصلك إشعارات فورية!', icon: "🔔" },
              ].map(item => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.icon} {item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}