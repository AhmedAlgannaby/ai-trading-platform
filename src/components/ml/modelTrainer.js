import { base44 } from "@/api/base44Client";
import { buildFeatures, initialWeights, trainStep, trainEpochs, evaluate } from "@/components/ml/signalModel";
import { computeIndicators, fetchCandles } from "@/components/ml/marketFeatures";

const MODEL_NAME = "signal_predictor";
const MAX_HISTORY = 50;
const MAX_IDS = 500;

export async function loadModel() {
  const list = await base44.entities.MLModel.filter({ name: MODEL_NAME }, "-created_date", 1);
  if (list[0]) return list[0];
  return base44.entities.MLModel.create({
    name: MODEL_NAME, version: 0, weights: initialWeights(),
    trained_samples: 0, loss_updates: 0, accuracy: 0, last_loss: 0,
    trained_trade_ids: [], history: [],
  });
}

/** سمات الصفقة وقت الدخول: المحفوظة، أو إعادة حسابها من شموع Binance التاريخية */
async function featuresForTrade(trade) {
  if (trade.ml_features?.length) return trade.ml_features;
  const endTime = new Date(trade.created_date).getTime();
  const candles = await fetchCandles(trade.pair, { limit: 100, endTime });
  if (!candles || candles.length < 55) return null;
  return buildFeatures(computeIndicators(candles), trade.type);
}

/**
 * يدرّب النموذج على الصفقات المغلقة التي لم يتعلم منها بعد.
 * كل خسارة => تحديث فوري بمعدل تعلّم مضاعف + تمريرات إضافية على كل العينات.
 * يعيد { model, newLosses, newSamples }
 */
export async function trainOnClosedTrades() {
  const model = await loadModel();
  const seen = new Set(model.trained_trade_ids || []);
  const closed = await base44.entities.Trade.filter({ status: "closed", mode: "paper" }, "closed_at", 200);
  const fresh = closed.filter(t => !seen.has(t.id));
  if (!fresh.length) return { model, newLosses: 0, newSamples: 0 };

  let weights = model.weights?.length ? model.weights : initialWeights();
  const newSamples = [];
  let newLosses = 0;

  for (const t of fresh) {
    const x = await featuresForTrade(t);
    seen.add(t.id);
    if (!x) continue;
    const y = (t.pnl || 0) > 0 ? 1 : 0;
    weights = trainStep(weights, x, y); // تحديث فوري بعد كل صفقة
    if (y === 0) newLosses++;
    newSamples.push({ x, y });
  }
  if (!newSamples.length) {
    await base44.entities.MLModel.update(model.id, { trained_trade_ids: [...seen].slice(-MAX_IDS) });
    return { model, newLosses: 0, newSamples: 0 };
  }

  // بعد الخسارة: مراجعة إضافية لتصحيح الخطأ
  if (newLosses > 0) weights = trainEpochs(weights, newSamples, 4);

  // تقييم على كل الصفقات المغلقة المتاحة سماتها
  const evalSamples = [];
  for (const t of closed) {
    if (t.ml_features?.length) evalSamples.push({ x: t.ml_features, y: (t.pnl || 0) > 0 ? 1 : 0 });
  }
  const evalAll = evalSamples.length ? evalSamples : newSamples;
  const { accuracy, loss } = evaluate(weights, evalAll);

  const version = (model.version || 0) + 1;
  const updated = await base44.entities.MLModel.update(model.id, {
    version, weights,
    trained_samples: (model.trained_samples || 0) + newSamples.length,
    loss_updates: (model.loss_updates || 0) + newLosses,
    accuracy, last_loss: loss,
    trained_trade_ids: [...seen].slice(-MAX_IDS),
    history: [
      ...(model.history || []),
      {
        version, accuracy, loss, samples: (model.trained_samples || 0) + newSamples.length,
        trigger: newLosses > 0 ? "loss" : "win", at: new Date().toISOString(),
      },
    ].slice(-MAX_HISTORY),
  });
  return { model: { ...model, ...updated, version, weights, accuracy, last_loss: loss }, newLosses, newSamples: newSamples.length };
}