/**
 * AutoSignalGenerator
 * يولد إشارات AI تلقائياً كل 15 دقيقة لزوج محدد،
 * يحفظها في قاعدة البيانات، ويرسل تنبيه متصفح + Telegram.
 */
import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { sendBrowserNotification } from "@/components/alerts/BrowserNotificationService";
import { sendTelegramMessage } from "@/components/alerts/telegramService";
import { fetchTickers, fetchKlines } from "@/api/marketData";

const INTERVAL_MS = 5 * 60 * 1000; // كل 5 دقائق
// cooldown لمنع تكرار نفس الزوج
const lastGenerated = {};

async function fetchMarketData(symbol) {
  const [tickers, klines] = await Promise.all([
    fetchTickers([symbol]),
    fetchKlines(symbol, '1h', 50),
  ]);
  const ticker = tickers[0] || {};
  const candles = klines.map(k => ({
    open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
  return {
    price: parseFloat(ticker.lastPrice),
    change24h: parseFloat(ticker.priceChangePercent),
    volume: parseFloat(ticker.volume),
    high24h: parseFloat(ticker.highPrice),
    low24h: parseFloat(ticker.lowPrice),
    candles,
  };
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgG = gains / period;
  const avgL = losses / period;
  if (avgL === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgG / avgL)).toFixed(1));
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  closes.forEach((c, i) => { if (i > 0) ema = c * k + ema * (1 - k); });
  return ema;
}

async function generateSignalWithAI(pair, marketData) {
  const closes = marketData.candles.map(c => c.close);
  const rsi = calcRSI(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const price = marketData.price;
  const atr = marketData.candles.slice(-14).reduce((acc, c, i, arr) => {
    if (i === 0) return acc;
    return acc + Math.max(c.high - c.low, Math.abs(c.high - arr[i-1].close), Math.abs(c.low - arr[i-1].close));
  }, 0) / 13;

  const prompt = `أنت محلل تداول خبير. حلل البيانات التالية لزوج ${pair} وأعطني إشارة تداول دقيقة:

السعر الحالي: $${price.toLocaleString()}
التغير 24 ساعة: ${marketData.change24h.toFixed(2)}%
أعلى 24س: $${marketData.high24h.toLocaleString()}
أدنى 24س: $${marketData.low24h.toLocaleString()}
RSI (14): ${rsi}
EMA 20: $${ema20.toFixed(2)}
EMA 50: $${ema50.toFixed(2)}
ATR (14): $${atr.toFixed(2)}
السعر مقارنة بـ EMA20: ${price > ema20 ? 'فوق' : 'تحت'} EMA20
السعر مقارنة بـ EMA50: ${price > ema50 ? 'فوق' : 'تحت'} EMA50

بناءً على هذا التحليل، أعطني:
- اتجاه الإشارة (buy/sell/hold)
- نسبة الثقة (0-100)
- سعر الدخول المقترح
- وقف الخسارة
- هدف الربح الأول
- هدف الربح الثاني  
- ملخص التحليل باختصار بالعربية`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["buy", "sell", "hold"] },
        confidence: { type: "number" },
        entry_price: { type: "number" },
        stop_loss: { type: "number" },
        take_profit_1: { type: "number" },
        take_profit_2: { type: "number" },
        analysis_summary: { type: "string" },
      },
    },
  });

  return result;
}

function buildTelegramMsg(pair, signal, price) {
  const dirEmoji = signal.direction === "buy" ? "🟢" : signal.direction === "sell" ? "🔴" : "🟡";
  const dirText = signal.direction === "buy" ? "شراء" : signal.direction === "sell" ? "بيع" : "انتظار";
  const rr = signal.take_profit_1 && signal.stop_loss && signal.entry_price
    ? ((Math.abs(signal.take_profit_1 - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss))).toFixed(2)
    : "—";

  return `${dirEmoji} <b>إشارة AI تلقائية — ${pair}</b>

📊 الاتجاه: <b>${dirText}</b>
🎯 الثقة: <b>${signal.confidence}%</b>
💰 السعر الحالي: <b>$${price.toLocaleString()}</b>

📌 <b>تفاصيل الصفقة:</b>
• الدخول: <code>$${signal.entry_price?.toLocaleString()}</code>
• وقف الخسارة: <code>$${signal.stop_loss?.toLocaleString()}</code>
• هدف 1: <code>$${signal.take_profit_1?.toLocaleString()}</code>
• هدف 2: <code>$${signal.take_profit_2?.toLocaleString()}</code>
• نسبة المخاطرة/العائد: <b>${rr}</b>

📝 ${signal.analysis_summary || "—"}

🕐 ${new Date().toLocaleString("ar-SA")}`;
}

export default function AutoSignalGenerator({ pair = "BTC/USDT" }) {
  const timerRef = useRef(null);

  const generate = useCallback(async () => {
    // cooldown 4 دقائق لنفس الزوج
    const last = lastGenerated[pair] || 0;
    if (Date.now() - last < 4 * 60 * 1000) return;
    lastGenerated[pair] = Date.now();

    try {
      const symbol = pair.replace("/", "");
      const marketData = await fetchMarketData(symbol);
      const signal = await generateSignalWithAI(pair, marketData);

      if (!signal || signal.direction === "hold" || signal.confidence < 55) return;

      // حفظ في قاعدة البيانات
      await base44.entities.Signal.create({
        pair,
        direction: signal.direction,
        confidence: signal.confidence,
        entry_price: signal.entry_price || marketData.price,
        stop_loss: signal.stop_loss,
        take_profit_1: signal.take_profit_1,
        take_profit_2: signal.take_profit_2,
        timeframe: "1H",
        strategy: "AI Auto",
        analysis_summary: signal.analysis_summary,
        status: "pending",
      });

      // تنبيه المتصفح
      const dirText = signal.direction === "buy" ? "شراء 🟢" : "بيع 🔴";
      sendBrowserNotification(
        `🤖 إشارة AI — ${pair} ${dirText}`,
        `ثقة: ${signal.confidence}% | دخول: $${signal.entry_price?.toLocaleString()} | SL: $${signal.stop_loss?.toLocaleString()}`,
        { tag: `ai-signal-${pair}`, requireInteraction: true }
      );

      // تنبيه Telegram — نبحث عن بيانات البوت من إعدادات المستخدم أو من AlertConfig
      try {
        const user = await base44.auth.me().catch(() => null);
        // البيانات قد تكون مباشرة على المستخدم أو في الـ settings
        let token = user?.telegram_bot_token;
        let chatId = user?.telegram_chat_id;

        // إذا لم توجد على المستخدم مباشرة، نجلبها من أي AlertConfig نشط يحتوي عليها
        if (!token || !chatId) {
          const alerts = await base44.entities.AlertConfig.filter({ is_active: true }).catch(() => []);
          const withTelegram = alerts.find(a => a.telegram_bot_token && a.telegram_chat_id);
          if (withTelegram) {
            token = token || withTelegram.telegram_bot_token;
            chatId = chatId || withTelegram.telegram_chat_id;
          }
        }

        if (token && chatId) {
          await sendTelegramMessage(token, chatId, buildTelegramMsg(pair, signal, marketData.price));
        }
      } catch {
        // silent — Telegram اختياري
      }

    } catch {
      // silent
    }
  }, [pair]);

  useEffect(() => {
    // تشغيل فوري عند تغيير الزوج
    generate();
    timerRef.current = setInterval(generate, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [generate]);

  return null; // مكون خلفي بحت
}