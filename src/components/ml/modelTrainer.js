import { base44 } from "@/api/base44Client";
import { buildFeatures, initialWeights, trainStep, evaluateWalkForward, N_FEATURES } from "@/components/ml/signalModel";
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
    validation_samples: 0, validation_method: "prequential-walk-forward",
    trained_trade_ids: [], history: [],
  });
}

/** سمات الصفقة وقت الدخول: المحفوظة، أو إعادة حسابها من شموع Binance التاريخية */
async function featuresForTrade(trade) {
  if (Array.isArray(trade.ml_features) && trade.ml_features.length === N_FEATURES &&
      trade.ml_features.every(Number.isFinite)) return trade.ml_features;
  const endTime = new Date(trade.created_date).getTime();
  const candles = await fetchCandles(trade.pair, { limit: 100, endTime });
  if (!candles || candles.length < 55) return null;
  return buildFeatures(computeIndicators(candles), trade.type);
}

/**
 * يدرّب على نتائج PnL المحسوبة بالصيغة الحالية، ويقيس الأداء بتقييم متتابع.
 * يعيد { model, newLosses, newSamples }
 */
export async function trainOnClosedTrades() {
  let model = await loadModel();
  if (model.validation_method !== "prequential-walk-forward") {
    const reset = {
      weights: initialWeights(), trained_samples: 0, loss_updates: 0,
      accuracy: 0, last_loss: 0, validation_samples: 0,
      validation_method: "prequential-walk-forward",
      trained_trade_ids: [], history: [],
    };
    const updated = await base44.entities.MLModel.update(model.id, reset);
    model = { ...model, ...updated, ...reset };
  }
  const seen = new Set(model.trained_trade_ids || []);
  const newestFirst = await base44.entities.Trade.filter({ status: "closed", mode: "paper" }, "-closed_at", 200);
  const validClosed = newestFirst
    .filter(t => t.pnl_accounting_version === 2)
    .reverse();
  const fresh = validClosed.filter(t => !seen.has(t.id));
  if (!fresh.length) {
    if (model.validation_method === "prequential-walk-forward") {
      return { model, newLosses: 0, newSamples: 0 };
    }
    const resetMetrics = {
      accuracy: 0, last_loss: 0, validation_samples: 0,
      validation_method: "prequential-walk-forward",
    };
    const updated = await base44.entities.MLModel.update(model.id, resetMetrics);
    return { model: { ...model, ...updated, ...resetMetrics }, newLosses: 0, newSamples: 0 };
  }

  let weights = model.weights?.length ? model.weights : initialWeights();
  const newSamples = [];
  const featuresByTrade = new Map();
  let newLosses = 0;

  for (const t of fresh) {
    const x = await featuresForTrade(t);
    if (!x) continue;
    seen.add(t.id);
    featuresByTrade.set(t.id, x);
    const y = (t.pnl || 0) > 0 ? 1 : 0;
    weights = trainStep(weights, x, y); // تحديث فوري بعد كل صفقة
    if (y === 0) newLosses++;
    newSamples.push({ x, y });
  }
  if (!newSamples.length) {
    const resetMetrics = {
      accuracy: 0, last_loss: 0, validation_samples: 0,
      validation_method: "prequential-walk-forward",
      trained_trade_ids: [...seen].slice(-MAX_IDS),
    };
    const updated = await base44.entities.MLModel.update(model.id, resetMetrics);
    return { model: { ...model, ...updated, ...resetMetrics }, newLosses: 0, newSamples: 0 };
  }

  const walkForwardSamples = [];
  for (const t of validClosed) {
    const x = featuresByTrade.get(t.id) || (
      Array.isArray(t.ml_features) && t.ml_features.length === N_FEATURES &&
      t.ml_features.every(Number.isFinite) ? t.ml_features : null
    );
    if (x) walkForwardSamples.push({ x, y: (t.pnl || 0) > 0 ? 1 : 0 });
  }
  const { accuracy, loss, samples: validationSamples } = evaluateWalkForward(walkForwardSamples);

  const version = (model.version || 0) + 1;
  const updated = await base44.entities.MLModel.update(model.id, {
    version, weights,
    trained_samples: (model.trained_samples || 0) + newSamples.length,
    loss_updates: (model.loss_updates || 0) + newLosses,
    accuracy: accuracy ?? 0, last_loss: loss ?? 0,
    validation_samples: validationSamples,
    validation_method: "prequential-walk-forward",
    trained_trade_ids: [...seen].slice(-MAX_IDS),
    history: [
      ...(model.history || []),
      {
        version, accuracy: accuracy ?? 0, loss: loss ?? 0, validation_samples: validationSamples,
        samples: (model.trained_samples || 0) + newSamples.length,
        trigger: newLosses > 0 ? "loss" : "win", at: new Date().toISOString(),
      },
    ].slice(-MAX_HISTORY),
  });
  return {
    model: {
      ...model, ...updated, version, weights, accuracy: accuracy ?? 0,
      last_loss: loss ?? 0, validation_samples: validationSamples,
      validation_method: "prequential-walk-forward",
    },
    newLosses, newSamples: newSamples.length,
  };
}