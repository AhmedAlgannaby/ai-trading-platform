/**
 * اختبار دخاني لمكوّن الزر (P3 / Vitest + Testing Library):
 *   npm run test:ui
 *
 * يتحقق من العرض الأساسي والمتغيرات — أي كسر في cva/cn سيفشل هنا فوراً.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button.jsx';

describe('Button', () => {
  it('يعرض النص ويعمل كزر', () => {
    render(<Button>اشترِ الآن</Button>);
    const btn = screen.getByRole('button', { name: 'اشترِ الآن' });
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('يطبق متغير destructive', () => {
    render(<Button variant="destructive">بيع</Button>);
    const btn = screen.getByRole('button', { name: 'بيع' });
    expect(btn.className).toContain('bg-destructive');
  });

  it('الحجم sm يطبق الأصناف الصحيحة', () => {
    render(<Button size="sm">صغير</Button>);
    const btn = screen.getByRole('button', { name: 'صغير' });
    expect(btn.className).toContain('h-8');
  });

  it('الزر المعطّل يحمل disabled', () => {
    render(<Button disabled>معطّل</Button>);
    expect(screen.getByRole('button', { name: 'معطّل' }).disabled).toBe(true);
  });
});
