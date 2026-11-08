/**
 * قائمة الأزواج المتاحة في التطبيق (Binance USDT — سيولة عالية).
 * مصدر واحد لكل الصفحات كي لا تختلف القوائم بين الواجهات.
 */
export const TRADING_PAIRS = [
  // الأزواج الأساسية
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
  // أزواج إضافية عالية السيولة
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'TRX/USDT', 'LTC/USDT',
  'BCH/USDT', 'NEAR/USDT', 'ATOM/USDT', 'FIL/USDT', 'APT/USDT', 'ARB/USDT',
  'OP/USDT', 'SUI/USDT', 'INJ/USDT', 'TIA/USDT', 'SEI/USDT', 'PEPE/USDT',
  'SHIB/USDT', 'UNI/USDT', 'XLM/USDT', 'ETC/USDT',
];

/** نفس القائمة بصيغة Binance بلا شرطة مائلة: BTCUSDT */
export const TRADING_SYMBOLS = TRADING_PAIRS.map((p) => p.replace('/', ''));

/** الأزواج المفعّلة افتراضياً في روبوت التداول. */
export const DEFAULT_BOT_PAIRS = ['BTC/USDT', 'ETH/USDT'];
