import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Key, Bell, User, Save, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function AppSettings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [settings, setSettings] = useState({
    binance_api_key: "",
    binance_secret_key: "",
    binance_testnet_api_key: "",
    binance_testnet_secret_key: "",
    binance_network: "mainnet",
    telegram_bot_token: "",
    telegram_chat_id: "",
    notify_trade_open: true,
    notify_trade_close: true,
    notify_take_profit: true,
    notify_stop_loss: true,
    notify_daily_report: true,
    notify_signal: true,
    notify_risk_warning: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        // Secrets are masked (empty) by the server on read — empty means
        // "keep existing" on save (see server/db.js updateUser).
        setSettings(prev => ({
          ...prev,
          binance_api_key: me.binance_api_key || "",
          binance_secret_key: me.binance_secret_key || "",
          binance_testnet_api_key: me.binance_testnet_api_key || "",
          binance_testnet_secret_key: me.binance_testnet_secret_key || "",
          binance_network: me.binance_network === "testnet" ? "testnet" : "mainnet",
          telegram_bot_token: me.telegram_bot_token || "",
          telegram_chat_id: me.telegram_chat_id || "",
          notify_trade_open: me.notify_trade_open ?? true,
          notify_trade_close: me.notify_trade_close ?? true,
          notify_take_profit: me.notify_take_profit ?? true,
          notify_stop_loss: me.notify_stop_loss ?? true,
          notify_daily_report: me.notify_daily_report ?? true,
          notify_signal: me.notify_signal ?? true,
          notify_risk_warning: me.notify_risk_warning ?? true,
        }));
      } catch (e) {
        console.error("load settings failed:", e);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("save settings failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">الملف الشخصي</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">الاسم</Label>
            <p className="text-sm font-medium mt-1">{user?.full_name || "المستخدم"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">البريد</Label>
            <p className="text-sm font-medium mt-1">{user?.email || "-"}</p>
          </div>
        </div>
      </motion.div>

      {/* API Keys */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-4 h-4 text-trading-yellow" />
          <h3 className="text-sm font-semibold">Binance API</h3>
          <Badge variant="outline" className="text-[9px]">محفوظ محلياً — ليس مشفراً</Badge>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={settings.binance_api_key}
                onChange={(e) => setSettings({...settings, binance_api_key: e.target.value})}
                className="bg-secondary pr-10"
                placeholder="أدخل Binance API Key"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Secret Key</Label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={settings.binance_secret_key}
                onChange={(e) => setSettings({...settings, binance_secret_key: e.target.value})}
                className="bg-secondary pr-10"
                placeholder="أدخل Binance Secret Key"
              />
              <button onClick={() => setShowSecretKey(!showSecretKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="pt-2 border-t border-border/50">
            <Label className="text-xs">شبكة التداول الحقيقي</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={settings.binance_network !== "testnet" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSettings({...settings, binance_network: "mainnet"})}
              >
                رئيسي (Mainnet)
              </Button>
              <Button
                type="button"
                variant={settings.binance_network === "testnet" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSettings({...settings, binance_network: "testnet"})}
              >
                تجريبي (Testnet)
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {settings.binance_network === "testnet"
                ? "الأوامر الحقيقية ستذهب إلى testnet.binance.vision (أموال وهمية)"
                : "الأوامر الحقيقية ستذهب إلى Binance الرئيسي — تأكد قبل التفعيل"}
            </p>
          </div>
          <div>
            <Label className="text-xs">Testnet API Key <span className="text-muted-foreground">(testnet.binance.vision)</span></Label>
            <Input
              type="password"
              value={settings.binance_testnet_api_key}
              onChange={(e) => setSettings({...settings, binance_testnet_api_key: e.target.value})}
              className="bg-secondary"
              placeholder="مفتاح Testnet (يُستخدم فقط عند اختيار شبكة Testnet)"
            />
          </div>
          <div>
            <Label className="text-xs">Testnet Secret Key</Label>
            <Input
              type="password"
              value={settings.binance_testnet_secret_key}
              onChange={(e) => setSettings({...settings, binance_testnet_secret_key: e.target.value})}
              className="bg-secondary"
              placeholder="سر Testnet"
            />
          </div>
        </div>
      </motion.div>

      {/* Telegram */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Telegram</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs">Bot Token</Label>
            <Input type="password" value={settings.telegram_bot_token} onChange={(e) => setSettings({...settings, telegram_bot_token: e.target.value})} className="bg-secondary" placeholder="Telegram Bot Token" />
          </div>
          <div>
            <Label className="text-xs">Chat ID</Label>
            <Input value={settings.telegram_chat_id} onChange={(e) => setSettings({...settings, telegram_chat_id: e.target.value})} className="bg-secondary" placeholder="Chat ID" />
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-trading-green" />
          <h3 className="text-sm font-semibold">الإشعارات</h3>
        </div>
        <div className="space-y-3">
          {[
            { key: "notify_trade_open", label: "فتح صفقة" },
            { key: "notify_trade_close", label: "إغلاق صفقة" },
            { key: "notify_take_profit", label: "تحقيق هدف الربح" },
            { key: "notify_stop_loss", label: "تفعيل وقف الخسارة" },
            { key: "notify_daily_report", label: "التقرير اليومي" },
            { key: "notify_signal", label: "إشارة تداول جديدة" },
            { key: "notify_risk_warning", label: "تحذيرات المخاطرة" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-xs">{label}</span>
              <Switch checked={settings[key]} onCheckedChange={(v) => setSettings({...settings, [key]: v})} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90">
        {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 ml-2" /> : <Save className="w-4 h-4 ml-2" />}
        {saved ? "تم الحفظ بنجاح" : "حفظ جميع الإعدادات"}
      </Button>
    </div>
  );
}