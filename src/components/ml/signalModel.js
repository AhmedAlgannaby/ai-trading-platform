/**
 * نموذج انحدار لوجستي (Logistic Regression) للتنبؤ باحتمال نجاح الصفقة.
 * يعمل بالكامل في المتصفح — بدون LLM.
 */
export const FEATURE_NAMES = [
  "bias", "rsi", "dist_ema20", "dist_ema50", "ema_trend", "atr_pct", "is_long", "rsi_extreme", "momentum",
];
export const N_FEATURES = FEATURE_NAMES.length;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sigmoid = (z) => 1 / (1 + Math.exp(-clamp(z, -30, 30)));

/** يحوّل مؤشرات السوق إلى متجه سمات مطبّع (قيم تقريباً بين -1 و 1) */
export function buildFeatures(f, direction) {
  const dir = direction === "buy" || direction === "long" ? 1 : -1;
  return [
    1,
    (f.rsi - 50) / 50,
    clamp(f.distEma20 * 20, -1, 1),
    clamp(f.distEma50 * 10, -1, 1),
    f.ema20 > f.ema50 ? 1 : -1,
    clamp(f.atrPct * 20, 0, 1),
    dir,
    f.rsi < 30 || f.rsi > 70 ? 1 : 0,
    clamp(f.momentum * 20, -1, 1) * dir,
  ];
}

export const initialWeights = () => {
  const w = new Array(N_FEATURES).fill(0);
  w[0] = 0.1; // انحياز بسيط للتفاؤل في البداية
  return w;
};

export function predict(weights, x) {
  let z = 0;
  for (let i = 0; i < x.length; i++) z += (weights[i] || 0) * x[i];
  return sigmoid(z);
}

/** خطوة تدريب واحدة (SGD + L2). الخسارة تُعامل بوزن أكبر لتصحيح الأخطاء أسرع */
export function trainStep(weights, x, label, { lr = 0.08, lossBoost = 1, l2 = 0.002 } = {}) {
  const p = predict(weights, x);
  const err = label - p; // موجب لو النموذج قلّل من احتمال النجاح
  const rate = label === 0 ? lr * lossBoost : lr;
  return weights.map((w, i) => w + rate * (err * x[i] - l2 * w));
}

/** عدة تمريرات على كل العينات لتثبيت التعلّم */
export function trainEpochs(weights, samples, epochs = 3) {
  let w = weights;
  for (let e = 0; e < epochs; e++) {
    for (const s of samples) w = trainStep(w, s.x, s.y);
  }
  return w;
}

export function evaluate(weights, samples) {
  if (!samples.length) return { accuracy: 0, loss: 0 };
  let correct = 0, loss = 0;
  for (const s of samples) {
    const p = clamp(predict(weights, s.x), 1e-6, 1 - 1e-6);
    if ((p >= 0.5 ? 1 : 0) === s.y) correct++;
    loss += -(s.y * Math.log(p) + (1 - s.y) * Math.log(1 - p));
  }
  return {
    accuracy: Math.round((correct / samples.length) * 1000) / 10,
    loss: Math.round((loss / samples.length) * 1000) / 1000,
  };
}

/** Evaluates each trade before learning from it; the first warmup trades only train. */
export function evaluateWalkForward(samples, warmup = 5) {
  let weights = initialWeights();
  let correct = 0;
  let loss = 0;
  let scored = 0;

  for (const [index, sample] of samples.entries()) {
    if (index >= warmup) {
      const p = clamp(predict(weights, sample.x), 1e-6, 1 - 1e-6);
      if ((p >= 0.5 ? 1 : 0) === sample.y) correct++;
      loss += -(sample.y * Math.log(p) + (1 - sample.y) * Math.log(1 - p));
      scored++;
    }
    weights = trainStep(weights, sample.x, sample.y);
  }

  return {
    accuracy: scored ? Math.round((correct / scored) * 1000) / 10 : null,
    loss: scored ? Math.round((loss / scored) * 1000) / 1000 : null,
    samples: scored,
  };
}