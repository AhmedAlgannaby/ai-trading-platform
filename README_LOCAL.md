# تشغيل منصة AI Trading محلياً وعلى أي استضافة — بدون Base44

## 0) بعد كل تحديث من موقع Base44 — خطوة واحدة إجبارية

تحديث الموقع يمسح طبقة الاستغناء (يرجع `package.json` و `base44Client` و `AuthContext`
ونسخة Base44). بعد كل تحديث نفّذ:

```bash
node scripts/restore-local.js
```

السكربت يعيد الاستغناء **دون مساس** بتحديثات الموقع الجديدة في الصفحات، وآمن التكرار
(المطبق يُتخطى). ثم:

```bash
npm install   # فقط إن تغيّرت الاعتماديات في التحديث
```

> يعمل بـ Node فقط (بدون `node_modules`) لأنه يُنفذ مباشرة بـ `node` لا عبر `npm`.
> إن طبع تحذيراً (`⚠️ anchor مفقود`) فالموقع غيّر ملفاً جذرياً — راجع الرسالة وصلّحه يدوياً.
> ملفات `scripts/` و `server/` لا يعرفها الموقع فلا تُمسح بالتحديثات.

التطبيق كان يعتمد على Base44 (قاعدة البيانات + الدخول + الـ LLM + الدوال الخلفية).
تم فك الاعتماد بالكامل: **صفر تعديل على الصفحات والمكونات** — فقط طبقة اتصال
محلية بنفس الواجهة (`src/api/base44Client.js`) + سيرفر Node خفيف (`server/`).

## البنية الجديدة

| كان (Base44) | أصبح (محلي) |
|---|---|
| `entities.*` (سحابة) | `server/db.js` — ملفات JSON في `server/data/` |
| `auth.me/updateMe` | مستخدم محلي واحد يُحفظ في `server/data/_user.json` |
| `InvokeLLM` | `POST /api/llm` → أي مزود متوافق مع OpenAI عبر `.env` |
| `ai_signal_generator` | `POST /api/functions/ai_signal_generator` + مجدول `AI_CRON_MINUTES` |
| `signal_executor` | خطاف تلقائي عند إنشاء أي `Signal` |
| `binance_proxy` | `POST /api/binance` (والواجهة ما زالت تنادي Binance مباشرة أيضاً) |

## 1) التشغيل المحلي

```bash
cd my-app-source
npm install
cp .env.example .env
# افتح .env وضع مفتاح الـ LLM:
#   LLM_API_KEY=sk-...
```

طرفيتان:
```bash
# طرفية 1 — السيرفر (API على http://localhost:3001)
npm run dev:server

# طرفية 2 — الواجهة (http://localhost:5173)
npm run dev
```

## 2) العقل المحلي — ذكاء بدون LLM (اختياري لكنه يعمل فوراً)

حتى **بدون أي مفتاح LLM** النظام ذكي وشغال: كل طلبات الذكاء في الواجهة
تمر عبر `POST /api/llm`، والسيرفر — عند غياب `LLM_API_KEY` — يحوّلها تلقائياً
للعقل الكمي (`server/brain/`) الذي يحلل بيانات Binance الحية حسابياً:

| الصفحة | ماذا يفعل العقل |
|---|---|
| إشارات AI / أتمتة / المولد التلقائي | تصويت مرجح (EMA + MACD + RSI واعٍ بالاتجاه + Stochastic + Bollinger + حجم + دعوم/مقاومات + أنماط شموع) مع مستويات ATR |
| الاختبار الخلفي | **باكتست حقيقي** على الشموع (بلا تسرب مستقبلي + عمولة وانزلاق) + منحنى رأس المال |
| الدروس والتوصيات | استخلاص `ai_lessons` والمعاملات المثلى من الأرقام + `BacktestResult` المحفوظة |
| محرك AI / المشاعر / الحيتان / تقييم الاستراتيجيات | نماذج فرعية مرجحة + خوف/طمع من بيانات السوق + سيولة شاذة |
| التقويم الاقتصادي | يحتاج LLM حصراً (بدونه تُعرض البيانات الاحتياطية — بلا فبركة أحداث) |

نقاط مباشرة للعقل (تفيد الكرون والتشخيص):
```bash
curl -X POST http://localhost:3001/api/brain/analyze -H 'Content-Type: application/json' -d '{"pair":"BTC/USDT"}'
curl -X POST http://localhost:3001/api/brain/backtest -H 'Content-Type: application/json' -d '{"pair":"ETH/USDT","save":true}'
```

اختبارات العقل (35 فحصاً رقمياً، بلا إنترنت):
```bash
npm run test:brain
```

> عند ضبط `LLM_API_KEY` لاحقاً، تُستخدم قراءته أولاً تلقائياً والعقل يبقى
> احتياطاً (وفق مبادئ `backtesting-frameworks`: تكاليف واقعية، ولا overfitting
> على نفس البيانات، وتقييم خارج العينة في كل باكتست).

## 3) إضافة LLM API

كل مفاتيح الذكاء في ملف `.env` فقط — لا كود:

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-xxxx
LLM_MODEL=gpt-4o-mini
```

مزودون جاهزون (غيّر `BASE_URL` والموديل فقط):

| المزود | BASE_URL | موديل مقترح |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek (رخيص) | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq (سريع ومجاني جزئياً) | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | أي موديل |
| Ollama (محلي ومجاني) | `http://localhost:11434/v1` | `llama3.1` (المفتاح: أي نص) |

> ملاحظة: `add_context_from_internet` كانت ميزة Base44 للبحث الحي — النسخة
> المحلية تحلل بناءً على معرفة الموديل + بيانات الـ Backtest المحفوظة عندك.

## 4) التوليد التلقائي للإشارات

```bash
AI_CRON_MINUTES=60   # إشارة تلقائية كل ساعة (0 = معطل)
```

أو يدوياً في أي وقت:
```bash
curl -X POST http://localhost:3001/api/functions/ai_signal_generator
```

## 5) الإنتاج — على أي استضافة

```bash
npm run build   # ينتج dist/
npm start       # سيرفر واحد يقدّم الواجهة + API على نفس المنفذ (PORT)
```

### خيارات الاستضافة
- **VPS (أفضل سيطرة):** انسخ المجلد، `npm install --omit=dev`، ثم
  `PORT=3001 node server/index.js` (يُفضل عبر `pm2` + Nginx).
- **Docker:** `docker build -t ai-trading .` ثم
  `docker run -d -p 3001:3001 --env-file .env -v ai-data:/app/server/data ai-trading`
- **Render / Railway / Fly.io:** اربط المستودع، أمر البناء `npm install && npm run build`،
  وأمر التشغيل `npm start`، وأضف متغيرات `.env` من لوحة التحكم.
- البيانات ملفات JSON في `server/data/` — تُنسخ احتياطياً بنسخ المجلد.

### مفاتيح Binance و Telegram
تُدخل من صفحة **الإعدادات** داخل التطبيق وتُحفظ في `server/data/_user.json`
(لا تضعها في كود أو مستودع عام).

## 6) ملفات Base44 القديمة
مجلد `src/base44/` و `base44/` بقيا للمرجعية فقط ولا يُستوردان في البناء —
احذفهما متى شئت.

## 8) دليل تشغيل الشهر التجريبي (paper، بلا متصفح)

**التشغيل المحلي (فترات متقطعة مسموحة):**
```bash
node server/index.js   # العامل يعمل بداخله: مراقب + مولد + متعلم + منبّه
```
عند الإيقاف والتشغيل يستأنف تلقائياً: المراقب يقيّم الصفقات المفتوحة في أول دورة
(30s)، والمولد يعمل فقط إن ضبطت `AI_CRON_MINUTES` (مثال: `AI_CRON_MINUTES=60`).
المتصفح **غير مطلوب إطلاقاً** — وعند فتحه تتنحى محركاته تلقائياً (لا تشغيل مزدوج).

**الإعدادات المطلوبة قبل البدء (صفحة إدارة المخاطر + الإعدادات):**
- `execution_mode=auto` (أو `semi_auto` للموافقة اليدوية)، `trading_mode=paper`
- `max_open_positions` و `max_risk_per_trade` و `circuit_breaker_losses` حسب راحتك
- Telegram: أدخل `Bot Token` و `Chat ID` في الإعدادات — المنبّه يرسل تلقائياً
- مفاتيح Binance **غير مطلوبة** للتجريبي (الأسعار عامة). مفاتيح testnet اختيارية
  من الإعدادات (شبكة testnet) للتجربة اللاحقة.

**الصيانة الأسبوعية (دقيقتان):**
```bash
npm run history:fetch   # تحديث الشموع التراكمي (استئناف تلقائي)
npm run history:learn   # إعادة قياس الاستراتيجيات → تدوير تلقائي للأفضل
```

**ماذا تراقب:** سجل `AlertLog` (فتح/إغلاق/تعديل وقف/كبح) + صفحة الأداء +
`TradeReview` (سبب كل خسارة) + `StrategyScore` (درجات walk-forward).
قاعدة التدوير: لا تُختار استراتيجية إلا بدرجة ≥50 ونافذتين — وإلا الهجين الافتراضي.
نتيجة القياس الصادقة حتى الآن: القواعد البسيطة على 4h خاسرة (~34% نجاح)، والتدوير
يرفضها تلقائياً بدل تزيينها.

**للـ VPS لاحقاً:** نفس المجلد + `.env` + `npm install --omit=dev` ثم
`pm2 start server/index.js --name trading` (أو Docker الموثق في قسم 5).
لا تنسَ `LOCAL_API_TOKEN` + نسخ `server/data/` احتياطياً.

## 7) سيرفر MCP — حلّل بذكاء المساعد مجاناً (بديل LLM API)

مجلد `mcp-server/` يعرّض النظام كأدوات MCP قياسية (stdio) لأي مساعد يدعم MCP:
`brain_analyze` و `brain_backtest` و `generate_signals` والشموع والتيكر والإشارات
والصفقات — كلها من بيانات Binance الحية **وبلا أي مفتاح LLM (صفر تكلفة)**.

**الشرط:** السيرفر المحلي شغال (`node server/index.js`) لأن MCP يتكلم معه عبر
`API_BASE` (افتراضياً `http://localhost:3001`).

**ربط Claude Desktop** — ملف الإعداد (`~/Library/Application Support/Claude/claude_desktop_config.json`
على Mac أو `%APPDATA%\Claude\claude_desktop_config.json` على Windows):

```json
{
  "mcpServers": {
    "ai-trading-local": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/my-app-source/mcp-server/index.js"],
      "env": { "API_BASE": "http://localhost:3001" }
    }
  }
}
```

**ربط Cursor / VS Code / Windsurf** — نفس الفكرة في `mcp.json`:

```json
{
  "mcpServers": {
    "ai-trading-local": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/my-app-source/mcp-server/index.js"],
      "env": { "API_BASE": "http://localhost:3001" }
    }
  }
}
```

ضع المسار المطلق الكامل بدل `/ABSOLUTE/PATH/TO/my-app-source`.
إن فعّلت `LOCAL_API_TOKEN` في `.env` أضف `"MCP_API_TOKEN": "نفس-التوكن"` في `env`.

**تجربة سريعة من الطرفية** (تعداد الأدوات):

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 | node mcp-server/index.js
```

**أمان:** أداة `execute_signal` تنفذ حسب `RiskSettings` في السيرفر وقد تفتح أمراً
حقيقياً إن كان `trading_mode=live` — عملاء MCP يطلبون موافقتك قبل كل استدعاء،
لا توافق على تنفيذ حي إلا بعد مراجعة الإشارة. أداة `paper_trade` تجريبية دائماً.

**بعد تحديث الموقع:** ملفات `mcp-server/` لا يعرفها الموقع فتبقى، وسكربت
`restore-local` يعيد سطر `mcp` وحزمة `@modelcontextprotocol/sdk` تلقائياً.
