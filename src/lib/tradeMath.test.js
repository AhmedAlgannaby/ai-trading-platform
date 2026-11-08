/**
 * تستات رياضيات الصفقات (C5/C6 / Vitest):
 *   npm run test:ui
 */
import { describe, it, expect } from 'vitest';
import { calcPositionSize, validateTradeInput } from './tradeMath.js';

describe('calcPositionSize', () => {
  it('الصيغة الموحدة: (رصيد×مخاطرة) ÷ مسافة الوقف', () => {
    // 10000×2% = 200 مخاطرة؛ مسافة 2% → حجم 10000
    expect(calcPositionSize({ balance: 10000, riskPct: 2, entry: 100, sl: 98 })).toBe(10000);
  });
  it('مسقوف بالرصيد×الرافعة', () => {
    // مخاطرة ضخمة → يُسقف عند الرصيد (رافعة 1)
    expect(calcPositionSize({ balance: 10000, riskPct: 10, entry: 100, sl: 99.9 })).toBe(10000);
  });
  it('يرفض مسافة الوقف الصفرية (بدل fallback سحري)', () => {
    expect(() => calcPositionSize({ balance: 10000, riskPct: 2, entry: 100, sl: 100 })).toThrow();
  });
  it('يرفض المدخلات غير الصالحة', () => {
    expect(() => calcPositionSize({ balance: NaN, riskPct: 2, entry: 100, sl: 98 })).toThrow();
    expect(() => calcPositionSize({ balance: 10000, riskPct: 2, entry: -5, sl: 98 })).toThrow();
  });
  it('متناظر للبيع', () => {
    expect(calcPositionSize({ balance: 10000, riskPct: 2, entry: 100, sl: 102 })).toBe(10000);
  });
});

describe('validateTradeInput', () => {
  const good = { entry: 100, size: 500, sl: 98, tp: 104, direction: 'long', leverage: 5 };
  it('مدخلات سليمة → null', () => {
    expect(validateTradeInput(good)).toBeNull();
  });
  it('يرفض السعر/الحجم الفاسد', () => {
    expect(validateTradeInput({ ...good, entry: NaN })).toContain('سعر دخول');
    expect(validateTradeInput({ ...good, size: 0 })).toContain('حجم');
  });
  it('يرفض الوقف في الجهة الخاطئة', () => {
    expect(validateTradeInput({ ...good, sl: 102 })).toContain('تحت الدخول');
    expect(validateTradeInput({ ...good, direction: 'short', sl: 102, tp: 96, marketType: 'futures' })).toBeNull();
    expect(validateTradeInput({ ...good, direction: 'short', sl: 98, tp: 96, marketType: 'futures' })).toContain('فوق الدخول');
  });
  it('يرفض الرافعة خارج 1..125', () => {
    expect(validateTradeInput({ ...good, leverage: 200 })).toContain('الرافعة');
    expect(validateTradeInput({ ...good, leverage: 10.9 })).toContain('الرافعة');
  });
  it('الحقول الاختيارية الفارغة مقبولة', () => {
    expect(validateTradeInput({ entry: 100, size: 500, direction: 'long' })).toBeNull();
  });
  it('شورت سبوت مرفوض — الشورت للفيوتشر', () => {
    expect(validateTradeInput({ ...good, direction: 'short', sl: 102, tp: 96 })).toContain('الآجلة');
    expect(validateTradeInput({ ...good, direction: 'short', sl: 102, tp: 96, marketType: 'futures' })).toBeNull();
    expect(validateTradeInput({ ...good, marketType: 'futures' })).toBeNull();
  });
});
