/**
 * اختبار دخاني لأداة دمج الأصناف (P3 / Vitest):
 *   npm run test:ui
 */
import { describe, it, expect } from 'vitest';
import { cn } from './utils.js';

describe('cn()', () => {
  it('يدمج أصنافاً متعددة', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('يتجاهل القيم الفارغة', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('الأصناف المتعارضة في Tailwind تُحسم للأخير', () => {
    expect(cn('px-4 px-8')).toBe('px-8');
  });
  it('يدعم الكائنات الشرطية', () => {
    expect(cn('btn', { active: true, hidden: false })).toBe('btn active');
  });
});
