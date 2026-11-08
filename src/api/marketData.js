/**
 * جلب بيانات السوق عبر السيرفر المحلي (/api/binance) بدل الاتصال المباشر
 * بـ Binance من المتصفح.
 *
 * السبب: بعض الشبكات/المتصفحات تحجب api.binance.com أو تفشل في CORS،
 * بينما السيرفر المحلي يصل للبيانات بشكل موثوق. كل الواجهة تستخدم هذا
 * الملف كي تظهر الأسعار الحية دائماً.
 */
// import.meta.env غير متاح عند تشغيل الاختبارات بـ Node — حماية من الانهيار
const ENV = import.meta.env || {};
const API_BASE = ENV.VITE_API_URL || '';
const API_TOKEN = ENV.VITE_API_TOKEN || '';

export const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
];

// كاش قصير في المتصفح + دمج الطلبات المتطابقة.
// عدة مكونات (الأسعار، التنبيهات، المحفظة...) تطلب نفس البيانات كل بضع ثوانٍ،
// وبدون هذا كان كل مكوّن يستهلك وزن Binance بشكل منفصل.
const TICKER_TTL_MS = 8_000;
const KLINES_TTL_MS = 20_000;
const HISTORICAL_TTL_MS = 5 * 60_000;
const _cache = new Map();
const _inflight = new Map();

function cached(key, ttlMs, fn) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  if (_inflight.has(key)) return _inflight.get(key);
  const p = fn()
    .then((value) => {
      _cache.set(key, { at: Date.now(), value });
      if (_cache.size > 300) {
        const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 50);
        for (const [k] of oldest) _cache.delete(k);
      }
      return value;
    })
    .catch((e) => {
      // نسخة قديمة أفضل من شاشة فارغة عند تعذر التحديث
      if (hit) return hit.value;
      throw e;
    })
    .finally(() => { _inflight.delete(key); });
  _inflight.set(key, p);
  return p;
}

async function apiPost(action, payload = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/binance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'x-api-token': API_TOKEN } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.details || data?.error || `Market data error: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error('Market data timeout');
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** أسعار 24 ساعة — مصفوفة tickers بنفس شكل Binance. */
export async function fetchTickers(symbols = DEFAULT_SYMBOLS) {
  const list = Array.isArray(symbols) && symbols.length
    ? symbols.slice(0, 50)
    : DEFAULT_SYMBOLS;
  const key = `ticker:${[...list].sort().join(',')}`;
  return cached(key, TICKER_TTL_MS, async () => {
    const data = await apiPost('ticker', { symbols: list });
    return Array.isArray(data) ? data : [];
  });
}

/** شموع Binance الخام (مصفوفة صفوف). */
export async function fetchKlines(symbol, interval = '1h', limit = 100, opts = {}) {
  const payload = { symbol, interval, limit };
  if (Number.isFinite(Number(opts.startTime))) payload.startTime = Number(opts.startTime);
  if (Number.isFinite(Number(opts.endTime))) payload.endTime = Number(opts.endTime);
  const key = `klines:${symbol}:${interval}:${limit}:${payload.startTime ?? ''}:${payload.endTime ?? ''}`;
  const historical = payload.endTime !== undefined && payload.endTime < Date.now() - 60_000;
  return cached(key, historical ? HISTORICAL_TTL_MS : KLINES_TTL_MS, async () => {
    const data = await apiPost('klines', payload);
    return Array.isArray(data) ? data : [];
  });
}

/** خريطة سعر { SYMBOL: price } للأزواج المطلوبة. */
export async function fetchPriceMap(pairs = []) {
  const symbols = [...new Set((pairs || []).filter(Boolean).map((p) => String(p).replace('/', '')))];
  if (!symbols.length) return {};
  const rows = await fetchTickers(symbols);
  const map = {};
  rows.forEach((t) => { map[t.symbol] = parseFloat(t.lastPrice ?? t.price); });
  return map;
}
