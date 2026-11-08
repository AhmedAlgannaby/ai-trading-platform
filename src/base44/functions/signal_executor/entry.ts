/**
 * Signal Executor - Entity Event Automation
 * يستمع لإشارات التداول الجديدة وينفذها أو يرسل إشعاراً بناءً على RiskSettings
 */
import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const adminClient = base44.asServiceRole;

  // الحصول على بيانات الحدث (الإشارة الجديدة)
  const body = await req.json();
  const signal = body?.record || body?.data || body;

  if (!signal || !signal.id || !signal.pair) {
    return Response.json({ skipped: true, reason: "no valid signal" });
  }

  // تجاهل إشارات "hold" أو المنفذة مسبقاً
  if (signal.direction === "hold" || signal.status === "executed" || signal.status === "expired") {
    return Response.json({ skipped: true, reason: `signal status is ${signal.status} or hold` });
  }

  // جلب إعدادات المخاطرة
  const settingsList = await adminClient.entities.RiskSettings.list("-created_date", 1);
  const settings = settingsList[0];

  if (!settings) {
    return Response.json({ error: "No RiskSettings found" }, { status: 404 });
  }

  const mode = settings.execution_mode; // "auto" | "semi_auto" | "manual"

  // التحقق من الحد الأدنى للثقة
  const minConfidence = 65;
  if (signal.confidence < minConfidence) {
    await adminClient.entities.Signal.update(signal.id, { status: "expired" });
    return Response.json({ skipped: true, reason: `confidence ${signal.confidence}% below minimum ${minConfidence}%` });
  }

  // التحقق من عدد الصفقات المفتوحة
  const openTrades = await adminClient.entities.Trade.filter({ status: "open" });
  const maxOpen = settings.max_open_positions || 5;
  if (openTrades.length >= maxOpen) {
    return Response.json({ skipped: true, reason: `max open positions reached (${openTrades.length}/${maxOpen})` });
  }

  if (mode === "auto") {
    if ((settings.trading_mode || "paper") === "live") {
      await adminClient.entities.Signal.update(signal.id, { status: "expired" });
      return Response.json({ skipped: true, reason: "live execution is not implemented by this signal handler" });
    }

    const market = settings.market_type === "futures" ? "futures" : "spot";
    if (signal.direction === "sell" && market !== "futures") {
      await adminClient.entities.Signal.update(signal.id, { status: "expired" });
      return Response.json({ skipped: true, reason: "spot market cannot short" });
    }

    const balance = settings.paper_balance || 10000;
    const riskPct = settings.max_risk_per_trade || 2;
    const maxLeverage = Math.min(Math.max(Number(settings.max_leverage) || 5, 1), 125);
    const leverage = market === "futures"
      ? Math.min(Math.max(Number(settings.default_leverage) || 1, 1), maxLeverage)
      : 1;
    const entry = Number(signal.entry_price);
    const stop = Number(signal.stop_loss);
    const stopDistancePct = entry > 0 && stop > 0 ? Math.abs(entry - stop) / entry : 0;
    if (!Number.isFinite(stopDistancePct) || stopDistancePct <= 0) {
      await adminClient.entities.Signal.update(signal.id, { status: "expired" });
      return Response.json({ skipped: true, reason: "invalid entry/stop for sizing" });
    }
    const riskUsd = balance * riskPct / 100;
    const positionSize = Math.min(
      Math.round(riskUsd / stopDistancePct),
      Math.round(balance * leverage),
    );
    if (positionSize < 10) {
      await adminClient.entities.Signal.update(signal.id, { status: "expired" });
      return Response.json({ skipped: true, reason: "position size below minimum" });
    }

    await adminClient.entities.Trade.create({
      pair: signal.pair,
      type: signal.direction === "buy" ? "long" : "short",
      entry_price: signal.entry_price,
      current_price: signal.entry_price,
      stop_loss: signal.stop_loss,
      take_profit_1: signal.take_profit_1,
      take_profit_2: signal.take_profit_2,
      take_profit_3: signal.take_profit_3,
      position_size: positionSize,
      leverage,
      confidence: signal.confidence,
      strategy: signal.strategy || "AI Signal (Auto)",
      timeframe: signal.timeframe || "1H",
      status: "open",
      mode: settings.trading_mode || "paper",
      market_type: market,
      pnl: 0,
      pnl_percent: 0,
      entry_reason: `[تلقائي] ${signal.analysis_summary?.slice(0, 300) || ""}`,
    });

    await adminClient.entities.Signal.update(signal.id, { status: "executed" });

    // تسجيل إشعار في AlertLog
    await adminClient.entities.AlertLog.create({
      alert_name: "تنفيذ تلقائي",
      pair: signal.pair,
      alert_type: "trade_opened",
      message: `✅ تم تنفيذ صفقة ${signal.direction === "buy" ? "شراء" : "بيع"} على ${signal.pair} تلقائياً — ثقة: ${signal.confidence}% — حجم: $${positionSize}`,
      severity: "info",
      telegram_sent: false,
    });

    return Response.json({ success: true, action: "trade_executed", pair: signal.pair, size: positionSize });

  } else if (mode === "semi_auto") {
    // إرسال إشعار فقط
    await adminClient.entities.AlertLog.create({
      alert_name: "إشارة جديدة تنتظر موافقتك",
      pair: signal.pair,
      alert_type: "new_signal",
      message: `🔔 إشارة ${signal.direction === "buy" ? "شراء" : "بيع"} على ${signal.pair} — ثقة: ${signal.confidence}% — تحتاج موافقة يدوية للتنفيذ`,
      severity: "warning",
      triggered_price: signal.entry_price,
      telegram_sent: false,
    });

    return Response.json({ success: true, action: "notification_sent", pair: signal.pair });

  } else {
    // وضع يدوي — لا إجراء
    return Response.json({ skipped: true, reason: "manual mode" });
  }
});