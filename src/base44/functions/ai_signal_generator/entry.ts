/**
 * AI Signal Generator - Scheduled Backend Function
 * يولّد إشارات تداول AI بشكل دوري لأزواج العملات المحددة
 */
import { createClientFromRequest } from "npm:@base44/sdk";

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const adminClient = base44.asServiceRole;

  const results: { pair: string; status: string; direction?: string; confidence?: number }[] = [];

  // جلب معرفة الـ Backtest لتحسين الإشارات
  const backtestKnowledge = await adminClient.entities.BacktestResult.list("-score", 10);

  for (const pair of PAIRS) {
    try {
      // بناء سياق المعرفة المكتسبة من Backtest
      const pairKnowledge = backtestKnowledge.filter(r => r.pair === pair).slice(0, 2);
      const knowledgeContext = pairKnowledge.length > 0
        ? `\n\n🧠 معرفة مكتسبة من اختبارات تاريخية على ${pair}:\n` +
          pairKnowledge.map(r =>
            `- استراتيجية "${r.strategy}": عائد ${r.total_return_percent?.toFixed(1)}%, نجاح ${r.win_rate?.toFixed(0)}%\n  الدروس: ${r.ai_lessons || "-"}`
          ).join("\n")
        : "";

      const result = await adminClient.integrations.Core.InvokeLLM({
        prompt: `أنت محلل أسواق خبير في العملات الرقمية. حلل زوج ${pair} الآن وأعطني إشارة تداول دقيقة.
${knowledgeContext}

قيّم الوضع الحالي بناءً على:
- المؤشرات الفنية الرئيسية (RSI، MACD، Bollinger Bands، EMA)
- مستويات الدعم والمقاومة الهامة
- حجم التداول والزخم الحالي
- الأنماط السعرية المكتشفة

أعطني إشارة واضحة فقط إذا كانت هناك فرصة حقيقية وقوية.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            direction: { type: "string", enum: ["buy", "sell", "hold"] },
            confidence: { type: "number" },
            entry_price: { type: "number" },
            stop_loss: { type: "number" },
            take_profit_1: { type: "number" },
            take_profit_2: { type: "number" },
            take_profit_3: { type: "number" },
            risk_reward: { type: "string" },
            analysis_summary: { type: "string" },
            strategy: { type: "string" },
            indicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "string" },
                  signal: { type: "string" }
                }
              }
            },
            patterns_detected: { type: "array", items: { type: "string" } }
          }
        }
      });

      // حفظ الإشارة في قاعدة البيانات
      await adminClient.entities.Signal.create({
        pair,
        direction: result.direction,
        confidence: result.confidence,
        entry_price: result.entry_price,
        stop_loss: result.stop_loss,
        take_profit_1: result.take_profit_1,
        take_profit_2: result.take_profit_2,
        take_profit_3: result.take_profit_3,
        risk_reward: result.risk_reward,
        analysis_summary: result.analysis_summary,
        strategy: result.strategy || "AI Scheduled",
        indicators: result.indicators || [],
        patterns_detected: result.patterns_detected || [],
        timeframe: "4H",
        status: "pending",
        suggested_size_percent: 2,
      });

      results.push({ pair, status: "generated", direction: result.direction, confidence: result.confidence });
      console.log(`✅ ${pair}: إشارة ${result.direction} بثقة ${result.confidence}%`);

    } catch (err) {
      console.error(`❌ خطأ في تحليل ${pair}:`, err.message);
      results.push({ pair, status: "error" });
    }
  }

  return Response.json({
    success: true,
    generated_at: new Date().toISOString(),
    results,
  });
});