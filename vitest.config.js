import { mergeConfig } from 'vitest/config';
import base from './vite.config.js';

// إعداد Vitest: يرث alias(@) وإضافة react من إعداد Vite الأصلي — بلا تكرار.
export default mergeConfig(base, {
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,jsx}'],
    // ملفات الـ runner اليدوي (node + process.exit) تُشغَّل عبر npm scripts وليس Vitest
    exclude: ['**/node_modules/**', 'src/components/ml/ml.test.js'],
    globals: false,
  },
});
