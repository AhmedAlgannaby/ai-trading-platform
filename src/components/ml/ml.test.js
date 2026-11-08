/**
 * اختبارات نموذج ML في المتصفح (P2) — خالصة بلا DOM وبلا شبكة:
 *   node src/components/ml/ml.test.js
 *
 * يغطي: buildFeatures/predict/trainStep/trainEpochs/evaluate من signalModel.js
 * و calcRSI/calcEMA/calcATR/computeIndicators من marketFeatures.js
 * (جلب الشموع fetchCandles يُختبر بجلب مُزيَّف محلي — بلا إنترنت).
 */
import { buildFeatures, predict, initialWeights, trainStep, trainEpochs, evaluate, evaluateWalkForward, N_FEATURES } from './signalModel.js';
import { calcRSI, calcEMA, calcATR, computeIndicators, fetchCandles } from './marketFeatures.js';

let pass = 0, fail = 0;
function ok(cond, name, extra = '') {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${extra}`); }
}

// ── 1) شكل السمات ──
const f = { rsi: 65, distEma20: 0.01, distEma50: 0.02, ema20: 101, ema50: 100, atrPct: 0.01, momentum: 0.005 };
const xBuy = buildFeatures(f, 'buy');
const xSell = buildFeatures(f, 'sell');
ok(xBuy.length === N_FEATURES && xBuy[0] === 1, `متجه السمات (${N_FEATURES} + انحياز)`);
ok(xBuy[6] === 1 && xSell[6] === -1, 'إشارة الاتجاه: شراء +1 / بيع -1');
ok(xBuy.every((v) => isFinite(v)), 'كل السمات أرقام صالحة');
ok(xBuy[7] === 0, 'RSI=65 ليس متطرفاً');
const fExt = { ...f, rsi: 80 };
ok(buildFeatures(fExt, 'buy')[7] === 1, 'RSI=80 متطرف');

// ── 2) التنبؤ احتمال في [0,1] ──
const w0 = initialWeights();
ok(w0.length === N_FEATURES, 'أوزان أولية بالطول الصحيح');
const p = predict(w0, xBuy);
ok(p >= 0 && p <= 1 && isFinite(p), `تنبؤ احتمال صالح (${p.toFixed(3)})`);
ok(predict(w0, xBuy) === predict(w0, xSell), 'أوزان صفرية: الاتجاه لا يؤثر قبل التدريب (تناظر متوقع)');

// ── 3) التدريب يحرّك الأوزان بالاتجاه الصحيح ──
const w1 = trainStep([...w0], xBuy, 1);
ok(w1.some((v, i) => v !== w0[i]), 'خطوة تدريب على نجاح تغيّر الأوزان');
const pBefore = predict(w0, xBuy);
const wTrained = trainEpochs([...w0], [{ x: xBuy, y: 1 }, { x: xSell, y: 0 }], 10);
const pAfterWin = predict(wTrained, xBuy);
ok(pAfterWin > pBefore, `التدريب يرفع احتمال العينة الرابحة (${pBefore.toFixed(3)} → ${pAfterWin.toFixed(3)})`);
ok(predict(wTrained, xBuy) !== predict(wTrained, xSell), 'بعد التدريب: الاتجاه يغيّر التنبؤ');

// ── 4) التقييم ──
const ev = evaluate(wTrained, [{ x: xBuy, y: 1 }, { x: xSell, y: 0 }]);
ok(ev.accuracy >= 0 && ev.accuracy <= 100 && isFinite(ev.loss), `تقييم: دقة ${ev.accuracy}% وخسارة ${ev.loss}`);
ok(evaluate(w0, []).accuracy === 0, 'تقييم فارغ آمن');
const shortWalkForward = evaluateWalkForward([{ x: xBuy, y: 1 }, { x: xSell, y: 0 }]);
ok(shortWalkForward.accuracy === null && shortWalkForward.samples === 0,
  'لا يعرض دقة خارج العينة قبل اكتمال فترة التهيئة');
const walkForwardSamples = Array.from({ length: 7 }, (_, i) => ({
  x: i % 2 ? xSell : xBuy,
  y: i % 2 ? 0 : 1,
}));
const walkForward = evaluateWalkForward(walkForwardSamples);
ok(walkForward.samples === 2 && walkForward.accuracy !== null && isFinite(walkForward.loss),
  'التقييم المتتابع يختبر كل صفقة قبل التعلّم منها');

// ── 5) مؤشرات marketFeatures ──
const up = Array.from({ length: 30 }, (_, i) => 100 + i);
ok(calcRSI(up) === 100, 'calcRSI صعود خالص = 100');
ok(calcRSI([100, 100, 100]) === 50, 'calcRSI عينات قصيرة = 50 (محايد)');
ok(calcEMA([10, 10, 10, 10], 3) === 10, 'calcEMA ثابت');
const candles = Array.from({ length: 30 }, (_, i) => ({
  high: 102 + i, low: 98 + i, close: 100 + i,
}));
ok(calcATR(candles) > 0, 'calcATR موجب');
const ind = computeIndicators(candles.map((c) => ({ ...c, open: c.close })));
ok(isFinite(ind.price) && isFinite(ind.rsi) && isFinite(ind.atrPct) && isFinite(ind.momentum),
  'computeIndicators كل الحقول أرقام صالحة');
ok(ind.rsi >= 0 && ind.rsi <= 100, 'RSI المحسوب في [0,100]');

// ── 6) fetchCandles بجلب مزيّف (بلا إنترنت) ──
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => [
    [1700000000000, '100', '102', '99', '101', '500'],
    [1700003600000, '101', '103', '100', '102', '600'],
  ],
});
try {
  const kl = await fetchCandles('BTC/USDT', { limit: 2 });
  ok(Array.isArray(kl) && kl.length === 2 && kl[0].close === 101, 'fetchCandles يحوّل الشموع (بجلب مزيّف)');
} finally {
  globalThis.fetch = realFetch;
}

console.log(`\nالنتيجة: ${pass} ناجح / ${fail} فاشل`);
process.exit(fail ? 1 : 0);
