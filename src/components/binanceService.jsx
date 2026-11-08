// Binance Service — عبر وسيط السيرفر المحلي (POST /api/binance).
//
// قاعدة أمنية: مفاتيح Binance لا تغادر السيرفر أبداً. المتصفح يرسل فقط
// معلمات العملية (symbol/side/quantity) والتوقيع HMAC يتم على السيرفر
// بالمفاتيح المحفوظة في الإعدادات. لا CORS proxy ولا مفاتيح في المتصفح.
const API_BASE = import.meta.env.VITE_API_URL || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

async function apiPost(action, payload = {}, timeoutMs = 15000) {
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
      const err = new Error(data?.details || data?.error || `Binance error: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error('Request timeout');
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function assertSymbol(symbol) {
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{4,20}$/.test(symbol)) {
    throw new Error('Invalid symbol');
  }
}

/** رصيد الحساب — المفاتيح تُقرأ على السيرفر من الإعدادات (تشمل testnet). */
export async function fetchBinanceAccount() {
  return apiPost('account');
}

/** الأسعار العامة — لا تحتاج مفاتيح. */
export async function fetchBinanceTicker(symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT"]) {
  if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 20) {
    throw new Error('Invalid symbols');
  }
  symbols.forEach(assertSymbol);
  return apiPost('ticker', { symbols });
}

/** الأوامر المفتوحة — عبر السيرفر. */
export async function fetchBinanceOpenOrders() {
  return apiPost('openOrders');
}

/** إرسال أمر — عبر السيرفر مع تحقق محلي مبكر قبل الإرسال. */
export async function placeBinanceOrder({ symbol, side, type, quantity, price }) {
  assertSymbol(symbol);
  if (side !== 'BUY' && side !== 'SELL') throw new Error('Invalid side (BUY/SELL only)');
  if (type !== 'MARKET' && type !== 'LIMIT') throw new Error('Invalid type (MARKET/LIMIT only)');
  const qty = Number(quantity);
  if (!isFinite(qty) || qty <= 0) throw new Error('أدخل كمية صالحة');
  const payload = { symbol, side, type, quantity: qty };
  if (type === 'LIMIT') {
    const p = Number(price);
    if (!isFinite(p) || p <= 0) throw new Error('أدخل سعر حد صالح');
    payload.price = p;
  }
  return apiPost('order', payload, 20000);
}

export function calcPortfolioFromAccount(account, prices) {
  const priceMap = {};
  const priceList = Array.isArray(prices) ? prices : (prices?.tickers || []);
  priceList.forEach(p => { priceMap[p.symbol] = parseFloat(p.lastPrice); });

  let totalUsdt = 0;
  const assets = (account?.balances || []).filter(b =>
    parseFloat(b.free) + parseFloat(b.locked) > 0
  );

  assets.forEach(b => {
    const amount = parseFloat(b.free) + parseFloat(b.locked);
    if (b.asset === 'USDT') {
      totalUsdt += amount;
    } else {
      const price = priceMap[`${b.asset}USDT`] || 0;
      totalUsdt += amount * price;
    }
  });

  const availableUsdt = parseFloat(
    (account?.balances || []).find(b => b.asset === 'USDT')?.free || 0
  );

  return {
    total_balance: parseFloat(totalUsdt.toFixed(2)),
    available_balance: parseFloat(availableUsdt.toFixed(2)),
    assets,
    priceMap,
  };
}
