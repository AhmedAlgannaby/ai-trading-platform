/**
 * رياضيات الصفقات الموحدة (C5) — دالة واحدة لحجم الصفقة في كل الواجهة:
 *   الحجم = (الرصيد × نسبة المخاطرة) ÷ مسافة الوقف % — بسقف رصيد×رافعة.
 * تُستخدم في: AutoTrading / AISignals / AIEngine (كانت 3 معادلات مختلفة).
 */

/** رقم موجب صالح وإلا يرمي */
function posNum(v, field) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) throw new Error(`Invalid ${field}`);
  return n;
}

export function calcPositionSize({ balance, riskPct, entry, sl, leverage = 1 }) {
  const bal = posNum(balance, 'balance');
  const risk = posNum(riskPct, 'riskPct');
  const e = posNum(entry, 'entry');
  const s = posNum(sl, 'stop');
  const lev = Math.min(Math.max(Number(leverage) || 1, 1), 125);
  const slDistPct = Math.abs(e - s) / e;
  if (!(slDistPct > 0)) throw new Error('SL distance must be positive');
  const riskAmount = (bal * risk) / 100;
  const size = Math.round(riskAmount / slDistPct);
  const cap = Math.round(bal * lev);
  return Math.min(Math.max(size, 0), cap);
}

/**
 * تحقق مدخلات صفقة يدوية (C6) — يعيد رسالة خطأ عربية أو null.
 * direction: 'long' | 'short'
 * marketType: 'spot' (افتراضي) | 'futures' — السبوت شراء فقط (لا تملك الأصل لتبيعه)
 */
export function validateTradeInput({ entry, size, sl, tp, direction, leverage, marketType = 'spot' }) {
  const e = Number(entry);
  const sz = Number(size);
  if (!isFinite(e) || e <= 0) return 'أدخل سعر دخول صالحًا (> 0)';
  if (!isFinite(sz) || sz <= 0) return 'أدخل حجم صفقة صالحًا (> 0)';
  if (!['long', 'short'].includes(direction)) return 'اختر اتجاه الصفقة';
  if (marketType !== 'futures' && direction === 'short') {
    return 'البيع على المكشوف (short) يحتاج سوق العقود الآجلة — في السبوت لا تملك الأصل لتبيعه';
  }
  if (leverage !== undefined) {
    const l = Number(leverage);
    if (!Number.isInteger(l) || l < 1 || l > 125) return 'الرافعة من 1 إلى 125';
  }
  const s = sl === undefined || sl === '' || sl === null ? undefined : Number(sl);
  const t = tp === undefined || tp === '' || tp === null ? undefined : Number(tp);
  if (s !== undefined && (!isFinite(s) || s <= 0)) return 'أدخل وقف خسارة صالحًا';
  if (t !== undefined && (!isFinite(t) || t <= 0)) return 'أدخل هدفًا صالحًا';
  if (s !== undefined) {
    if (direction === 'long' && s >= e) return 'للشراء: الوقف يجب أن يكون تحت الدخول';
    if (direction === 'short' && s <= e) return 'للبيع: الوقف يجب أن يكون فوق الدخول';
  }
  if (t !== undefined) {
    if (direction === 'long' && t <= e) return 'للشراء: الهدف يجب أن يكون فوق الدخول';
    if (direction === 'short' && t >= e) return 'للبيع: الهدف يجب أن يكون تحت الدخول';
  }
  return null;
}
