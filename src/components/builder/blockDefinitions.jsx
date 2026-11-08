export const BLOCK_CATEGORIES = [
  {
    id: "indicators",
    label: "المؤشرات الفنية",
    color: "cyan",
    icon: "📊",
    blocks: [
      {
        type: "rsi", label: "RSI",
        description: "مؤشر القوة النسبية",
        color: "cyan",
        params: [
          { key: "period", label: "الفترة", type: "number", default: 14 },
          { key: "overbought", label: "ذروة الشراء", type: "number", default: 70 },
          { key: "oversold", label: "ذروة البيع", type: "number", default: 30 },
        ],
        outputs: ["rsi_value", "overbought_signal", "oversold_signal"],
      },
      {
        type: "macd", label: "MACD",
        description: "تقارب وتباعد المتوسطات",
        color: "cyan",
        params: [
          { key: "fast", label: "سريع", type: "number", default: 12 },
          { key: "slow", label: "بطيء", type: "number", default: 26 },
          { key: "signal", label: "الإشارة", type: "number", default: 9 },
        ],
        outputs: ["macd_line", "signal_line", "histogram", "bullish_cross", "bearish_cross"],
      },
      {
        type: "ema", label: "EMA",
        description: "المتوسط المتحرك الأسي",
        color: "cyan",
        params: [
          { key: "period", label: "الفترة", type: "number", default: 20 },
          { key: "source", label: "المصدر", type: "select", options: ["close","open","high","low"], default: "close" },
        ],
        outputs: ["ema_value", "price_above", "price_below"],
      },
      {
        type: "bollinger", label: "Bollinger Bands",
        description: "نطاقات بولينجر",
        color: "cyan",
        params: [
          { key: "period", label: "الفترة", type: "number", default: 20 },
          { key: "std_dev", label: "الانحراف المعياري", type: "number", default: 2 },
        ],
        outputs: ["upper_band", "lower_band", "middle_band", "squeeze_signal"],
      },
      {
        type: "stochastic", label: "Stochastic",
        description: "مؤشر ستوكاستيك",
        color: "cyan",
        params: [
          { key: "k_period", label: "K Period", type: "number", default: 14 },
          { key: "d_period", label: "D Period", type: "number", default: 3 },
          { key: "overbought", label: "ذروة الشراء", type: "number", default: 80 },
          { key: "oversold", label: "ذروة البيع", type: "number", default: 20 },
        ],
        outputs: ["k_value", "d_value", "overbought_signal", "oversold_signal"],
      },
      {
        type: "atr", label: "ATR",
        description: "متوسط المدى الحقيقي",
        color: "cyan",
        params: [{ key: "period", label: "الفترة", type: "number", default: 14 }],
        outputs: ["atr_value"],
      },
    ],
  },
  {
    id: "entry",
    label: "شروط الدخول",
    color: "green",
    icon: "🟢",
    blocks: [
      {
        type: "entry_long", label: "دخول شراء",
        description: "شرط فتح صفقة شراء",
        color: "green",
        params: [
          { key: "min_confirmations", label: "عدد التأكيدات", type: "number", default: 2 },
        ],
        inputs: ["condition_1", "condition_2", "condition_3"],
        outputs: ["buy_signal"],
      },
      {
        type: "entry_short", label: "دخول بيع",
        description: "شرط فتح صفقة بيع",
        color: "green",
        params: [
          { key: "min_confirmations", label: "عدد التأكيدات", type: "number", default: 2 },
        ],
        inputs: ["condition_1", "condition_2", "condition_3"],
        outputs: ["sell_signal"],
      },
      {
        type: "price_cross", label: "تقاطع السعر",
        description: "السعر يتجاوز مستوى معين",
        color: "green",
        params: [
          { key: "direction", label: "الاتجاه", type: "select", options: ["above","below"], default: "above" },
          { key: "price_level", label: "مستوى السعر", type: "number", default: 0 },
        ],
        outputs: ["cross_signal"],
      },
      {
        type: "candle_pattern", label: "نمط الشمعة",
        description: "نمط شمعة يابانية محدد",
        color: "green",
        params: [
          { key: "pattern", label: "النمط", type: "select", options: ["doji","hammer","engulfing_bull","engulfing_bear","shooting_star"], default: "hammer" },
          { key: "confirmation", label: "تأكيد إضافي", type: "boolean", default: true },
        ],
        outputs: ["pattern_signal"],
      },
    ],
  },
  {
    id: "exit",
    label: "شروط الخروج",
    color: "red",
    icon: "🔴",
    blocks: [
      {
        type: "stop_loss", label: "وقف الخسارة",
        description: "خروج عند بلوغ الخسارة",
        color: "red",
        params: [
          { key: "type", label: "النوع", type: "select", options: ["percent","atr_multiple","fixed"], default: "percent" },
          { key: "value", label: "القيمة", type: "number", default: 2 },
        ],
        outputs: ["stop_triggered"],
      },
      {
        type: "take_profit", label: "جني الربح",
        description: "خروج عند بلوغ الربح",
        color: "red",
        params: [
          { key: "type", label: "النوع", type: "select", options: ["percent","rr_ratio","fixed"], default: "rr_ratio" },
          { key: "value", label: "القيمة", type: "number", default: 3 },
          { key: "partial_exit", label: "خروج جزئي", type: "boolean", default: false },
          { key: "partial_percent", label: "نسبة الخروج الجزئي %", type: "number", default: 50 },
        ],
        outputs: ["tp_triggered"],
      },
      {
        type: "trailing_stop", label: "وقف خسارة متحرك",
        description: "يتتبع السعر تلقائياً",
        color: "red",
        params: [
          { key: "trail_percent", label: "نسبة التتبع %", type: "number", default: 1.5 },
          { key: "activation_percent", label: "نسبة التفعيل %", type: "number", default: 1 },
        ],
        outputs: ["trail_triggered"],
      },
      {
        type: "time_exit", label: "خروج زمني",
        description: "خروج بعد فترة محددة",
        color: "red",
        params: [
          { key: "candles", label: "عدد الشموع", type: "number", default: 10 },
        ],
        outputs: ["time_triggered"],
      },
    ],
  },
  {
    id: "risk",
    label: "إدارة المخاطر",
    color: "yellow",
    icon: "🛡️",
    blocks: [
      {
        type: "position_size", label: "حجم الصفقة",
        description: "تحديد حجم المركز",
        color: "yellow",
        params: [
          { key: "method", label: "الطريقة", type: "select", options: ["fixed_percent","kelly","fixed_amount"], default: "fixed_percent" },
          { key: "risk_percent", label: "نسبة المخاطرة %", type: "number", default: 2 },
          { key: "max_position_percent", label: "الحد الأقصى للمركز %", type: "number", default: 20 },
        ],
        outputs: ["size_calculated"],
      },
      {
        type: "max_trades", label: "حد الصفقات",
        description: "الحد الأقصى للصفقات المفتوحة",
        color: "yellow",
        params: [
          { key: "max_open", label: "صفقات مفتوحة كحد أقصى", type: "number", default: 3 },
          { key: "max_daily", label: "صفقات يومياً كحد أقصى", type: "number", default: 5 },
        ],
        outputs: ["allowed"],
      },
      {
        type: "drawdown_guard", label: "حماية الرصيد",
        description: "إيقاف عند خسارة معينة",
        color: "yellow",
        params: [
          { key: "daily_loss_limit", label: "حد الخسارة اليومية %", type: "number", default: 5 },
          { key: "weekly_loss_limit", label: "حد الخسارة الأسبوعية %", type: "number", default: 10 },
        ],
        outputs: ["trading_allowed"],
      },
    ],
  },
  {
    id: "filters",
    label: "الفلاتر",
    color: "purple",
    icon: "🔍",
    blocks: [
      {
        type: "trend_filter", label: "فلتر الاتجاه",
        description: "التداول مع الاتجاه فقط",
        color: "purple",
        params: [
          { key: "ema_period", label: "فترة EMA للاتجاه", type: "number", default: 200 },
          { key: "direction", label: "الاتجاه", type: "select", options: ["with_trend","counter_trend","both"], default: "with_trend" },
        ],
        outputs: ["filter_passed"],
      },
      {
        type: "time_filter", label: "فلتر الوقت",
        description: "التداول في أوقات محددة",
        color: "purple",
        params: [
          { key: "start_hour", label: "ساعة البداية", type: "number", default: 9 },
          { key: "end_hour", label: "ساعة النهاية", type: "number", default: 17 },
          { key: "avoid_weekends", label: "تجنب الإجازات", type: "boolean", default: true },
        ],
        outputs: ["filter_passed"],
      },
      {
        type: "volatility_filter", label: "فلتر التذبذب",
        description: "التداول عند تذبذب مناسب",
        color: "purple",
        params: [
          { key: "min_atr", label: "ATR الأدنى", type: "number", default: 0.5 },
          { key: "max_atr", label: "ATR الأقصى", type: "number", default: 5 },
        ],
        outputs: ["filter_passed"],
      },
    ],
  },
];

export const COLOR_MAP = {
  cyan:   { bg: "bg-trading-cyan/10",   border: "border-trading-cyan/30",   text: "text-trading-cyan",   dot: "bg-trading-cyan" },
  green:  { bg: "bg-trading-green/10",  border: "border-trading-green/30",  text: "text-trading-green",  dot: "bg-trading-green" },
  red:    { bg: "bg-trading-red/10",    border: "border-trading-red/30",    text: "text-trading-red",    dot: "bg-trading-red" },
  yellow: { bg: "bg-trading-yellow/10", border: "border-trading-yellow/30", text: "text-trading-yellow", dot: "bg-trading-yellow" },
  purple: { bg: "bg-purple-500/10",     border: "border-purple-500/30",     text: "text-purple-400",     dot: "bg-purple-400" },
};

export function getBlockDef(type) {
  for (const cat of BLOCK_CATEGORIES) {
    const found = cat.blocks.find(b => b.type === type);
    if (found) return { ...found, categoryColor: cat.color };
  }
  return null;
}