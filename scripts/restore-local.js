#!/usr/bin/env node
/**
 * restore-local.js — يُشغّل بعد كل تحديث من موقع Base44:
 *
 *    node scripts/restore-local.js
 *
 * يعيد طبقة الاستغناء المحلية (local independence layer) دون المساس
 * بالتحديثات الجديدة القادمة من الموقع في الصفحات والمكونات:
 *   1) دمج package.json (سكربتات + deps السيرفر، حذف @base44/*)
 *   2) استرجاع ملفات كاملة من scripts/overrides (vite.config، base44Client، AuthContext، ...)
 *   3) ترقيعات نصية صغيرة وآمنة لملفات الموقع (App، الصفحات، ...)
 *
 * السكربت آمن التكرار (idempotent): المطبق يُتخطى، والناقص يُطبق.
 * يعتمد على مكتبات Node المدمجة فقط — يعمل حتى لو node_modules محذوفة
 * وحتى لو package.json رجعت لنسخة الموقع (يُنفذ مباشرة بـ node، لا عبر npm).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OVERRIDES = path.join(ROOT, 'scripts', 'overrides');

let applied = 0;
let skipped = 0;
const warnings = [];

const ok = (msg) => { applied++; console.log(`  ✅ ${msg}`); };
const skip = (msg) => { skipped++; console.log(`  ⏭️  ${msg}`); };
const warn = (msg) => { warnings.push(msg); console.log(`  ⚠️  ${msg}`); };

async function read(p) {
  try { return await fs.readFile(p, 'utf-8'); } catch { return null; }
}
async function write(p, content) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf-8');
}
const target = (rel) => path.join(ROOT, rel);

// ── 1) ملفات كاملة تُسترجع من overrides ─────────────────────────────────────
// marker: نص موجود فقط في النسخة المحلية → إن وُجد يُتخطى، وإلا يُنسخ البديل.
const FULL_RESTORES = [
  { target: 'vite.config.js', override: 'vite.config.js', marker: "'/api': 'http://localhost:3001'" },
  { target: 'src/api/base44Client.js', override: 'base44Client.js', marker: 'const API_TOKEN' },
  { target: 'src/lib/AuthContext.jsx', override: 'AuthContext.jsx', marker: 'نسخة محلية' },
  { target: 'src/main.jsx', override: 'main.jsx', marker: 'ErrorBoundary' },
  { target: 'src/components/ErrorBoundary.jsx', override: 'ErrorBoundary.jsx', marker: 'getDerivedStateFromError' },
  { target: 'src/lib/queryKeys.js', override: 'queryKeys.js', marker: 'riskSettings' },
];

async function restoreFullFiles() {
  console.log('\n[1/4] ملفات محلية كاملة:');
  for (const r of FULL_RESTORES) {
    const cur = await read(target(r.target));
    if (cur && cur.includes(r.marker)) { skip(`${r.target} (محلي already)`); continue; }
    const fresh = await read(path.join(OVERRIDES, r.override));
    if (!fresh) { warn(`override مفقود: scripts/overrides/${r.override}`); continue; }
    await write(target(r.target), fresh);
    ok(`${r.target} ${cur ? 'رُجع للنسخة المحلية' : 'أُنشئ'}`);
  }
}

// ── 2) دمج package.json ─────────────────────────────────────────────────────
async function mergePackageJson() {
  console.log('\n[2/4] دمج package.json:');
  const p = target('package.json');
  const raw = await read(p);
  if (!raw) { warn('package.json غير موجود!'); return; }
  let pkg;
  try { pkg = JSON.parse(raw); } catch { warn('package.json تالف (JSON invalid) — تُخطى'); return; }
  let changed = false;
  const needScripts = {
    'dev:server': 'node server/index.js',
    start: 'node server/index.js',
    'test:brain': 'node server/brain/brain.test.js',
    'restore:local': 'node scripts/restore-local.js',
    mcp: 'node mcp-server/index.js',
    'history:fetch': 'node server/brain/history.js',
    'history:gaps': 'node server/brain/history.js --gaps',
    'history:learn': 'node server/brain/learn.js',
    'test:worker': 'node server/worker/worker.test.js',
  };
  pkg.scripts = pkg.scripts || {};
  for (const [k, v] of Object.entries(needScripts)) {
    if (pkg.scripts[k] !== v) { pkg.scripts[k] = v; changed = true; }
  }
  if (pkg.scripts.typecheck === 'tsc -p ./jsconfig.json') {
    pkg.scripts.typecheck = 'tsc --noEmit -p ./jsconfig.json';
    changed = true;
  }
  pkg.dependencies = pkg.dependencies || {};
  for (const bad of ['@base44/sdk', '@base44/vite-plugin']) {
    if (pkg.dependencies[bad] || (pkg.devDependencies && pkg.devDependencies[bad])) {
      delete pkg.dependencies[bad];
      if (pkg.devDependencies) delete pkg.devDependencies[bad];
      changed = true;
    }
  }
  const needDeps = {
    cors: '^2.8.5', dotenv: '^16.4.5', express: '^4.19.2',
    '@modelcontextprotocol/sdk': '^1.32.1', // MCP server (mcp-server/)
  };
  for (const [k, v] of Object.entries(needDeps)) {
    if (!pkg.dependencies[k]) { pkg.dependencies[k] = v; changed = true; }
  }
  if (changed) {
    await write(p, JSON.stringify(pkg, null, 2) + '\n');
    ok('package.json اتدمج (scripts + server deps، بدون @base44)');
  } else {
    skip('package.json مدموج already');
  }
}

// ── 3) ترقيعات نصية لملفات الموقع (تحافظ على تحديثات الموقع) ────────────────
// القاعدة: إن كان `replace` موجوداً → متطبقة (تُخطى).
// وإلا إن وُجد `find` → تُطبق. وإلا → تحذير (الموقع غيّر الملف كثيراً).
// لقواعد الحذف الصرف (حيث replace جزء من find) استخدم `absent`:
// إن غاب نص `absent` عن الملف → متطبقة (تُخطى).
const PATCHES = [
  // — App.jsx —
  { file: 'src/App.jsx', name: 'Navigate import',
    find: "import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';",
    replace: "import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';" },
  { file: 'src/App.jsx', name: 'ErrorBoundary import',
    find: "import UserNotRegisteredError from '@/components/UserNotRegisteredError';",
    replace: "import UserNotRegisteredError from '@/components/UserNotRegisteredError';\nimport ErrorBoundary from '@/components/ErrorBoundary.jsx';" },
  { file: 'src/App.jsx', name: 'LayoutWrapper + ErrorBoundary',
    find: 'const LayoutWrapper = ({ children, currentPageName }) => Layout ?\n  <Layout currentPageName={currentPageName}>{children}</Layout>\n  : <>{children}</>;',
    replace: 'const LayoutWrapper = ({ children, currentPageName }) => (\n  <ErrorBoundary>\n    {Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>}\n  </ErrorBoundary>\n);' },
  { file: 'src/App.jsx', name: 'remove unused MainPage var',
    absent: 'const MainPage = ',
    find: 'const mainPageKey = mainPage ?? Object.keys(Pages)[0];\nconst MainPage = mainPageKey ? Pages[mainPageKey] : <></>;',
    replace: 'const mainPageKey = mainPage ?? Object.keys(Pages)[0];' },
  { file: 'src/App.jsx', name: '/ redirect (no duplicate route)',
    find: '  // Render the main app\n  return (\n    <Routes>\n      <Route path="/" element={\n        <LayoutWrapper currentPageName={mainPageKey}>\n          <MainPage />\n        </LayoutWrapper>\n      } />',
    replace: '  // Render the main app — "/" redirects to the canonical main page URL\n  // to avoid duplicate content (was rendering Dashboard at both / and /Dashboard).\n  return (\n    <Routes>\n      <Route path="/" element={<Navigate to={`/${mainPageKey}`} replace />} />' },

  // — query-client.js —
  { file: 'src/lib/query-client.js', name: 'staleTime/gcTime',
    find: '\t\t\trefetchOnWindowFocus: false,\n\t\t\tretry: 1,',
    replace: '\t\t\trefetchOnWindowFocus: false,\n\t\t\tretry: 1,\n\t\t\tstaleTime: 30_000,\n\t\t\tgcTime: 5 * 60_000,' },

  // — eslint.config.js —
  { file: 'eslint.config.js', name: 'lint scope incl. server',
    find: '      "src/components/**/*.{js,mjs,cjs,jsx}",\n      "src/pages/**/*.{js,mjs,cjs,jsx}",\n      "src/Layout.jsx",',
    replace: '      "src/**/*.{js,mjs,cjs,jsx}",\n      "server/**/*.js",\n      "mcp-server/**/*.js",' },
  { file: 'eslint.config.js', name: 'lint ignores',
    find: 'ignores: ["src/lib/**/*", "src/components/ui/**/*"],',
    replace: 'ignores: ["src/components/ui/**/*", "dist/**/*"],' },

  // — Layout.jsx —
  { file: 'src/Layout.jsx', name: 'remove dead FlaskConical import',
    find: 'Store, Copy, Wand2, FlaskConical, Radio, PieChart',
    replace: 'Store, Copy, Wand2, Radio, PieChart' },
  { file: 'src/Layout.jsx', name: 'log trading-mode errors',
    find: '    }).catch(() => {});',
    replace: '    }).catch((e) => console.error("load trading mode failed:", e));' },
  { file: 'src/Layout.jsx', name: 'collapse btn aria-label',
    find: '            onClick={() => setCollapsed(!collapsed)}\n            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-colors"',
    replace: '            onClick={() => setCollapsed(!collapsed)}\n            aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}\n            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-colors"' },
  { file: 'src/Layout.jsx', name: 'bell btn aria-label',
    find: '<button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">',
    replace: '<button aria-label="التنبيهات" className="relative p-2 rounded-lg hover:bg-secondary transition-colors">' },

  // — AISignals.jsx —
  { file: 'src/pages/AISignals.jsx', name: 'signals query error state',
    find: '  const { data: signals } = useQuery({',
    replace: '  const { data: signals = [], isError: signalsError } = useQuery({' },
  { file: 'src/pages/AISignals.jsx', name: 'knowledge default []',
    find: '  const { data: backtestKnowledge } = useQuery({',
    replace: '  const { data: backtestKnowledge = [] } = useQuery({' },
  { file: 'src/pages/AISignals.jsx', name: 'generateSignal try{',
    find: '  const generateSignal = async () => {\n    setGenerating(true);',
    replace: '  const generateSignal = async () => {\n    setGenerating(true);\n    try {' },
  { file: 'src/pages/AISignals.jsx', name: 'hold→expired + finally',
    find: '    await base44.entities.Signal.create({\n      pair: selectedPair,\n      ...result,\n      status: "pending",\n      suggested_size_percent: 5,\n      timeframe: "4H",\n    });\n\n    queryClient.invalidateQueries({ queryKey: ["signals"] });\n    setGenerating(false);\n  };',
    replace: '    await base44.entities.Signal.create({\n      pair: selectedPair,\n      ...result,\n      status: result?.direction === "hold" ? "expired" : "pending",\n      suggested_size_percent: 5,\n      timeframe: "4H",\n    });\n\n    queryClient.invalidateQueries({ queryKey: ["signals"] });\n    } catch (e) {\n      console.error("generateSignal failed:", e);\n    } finally {\n      setGenerating(false);\n    }\n  };' },
  { file: 'src/pages/AISignals.jsx', name: 'signals error banner',
    find: '      {/* Signals List */}\n      <AnimatePresence>\n        {signals.map((signal, i) => (',
    replace: '      {signalsError && (\n        <div className="glass-card p-4 text-center text-sm text-trading-red" role="alert">\n          تعذر تحميل الإشارات — تحقق من اتصال الخادم ثم أعد المحاولة.\n        </div>\n      )}\n      {/* Signals List */}\n      <AnimatePresence>\n        {(signals || []).map((signal, i) => (' },
  { file: 'src/pages/AISignals.jsx', name: 'executeTrade (fresh + SL sizing + finally)',
    find: '  const executeTrade = async () => {\n    if (!signal.entry_price || signal.direction === "hold") return;\n    setExecuting(true);\n    const { data: settings } = await base44.entities.RiskSettings.list("-created_date", 1).then(d => ({ data: d[0] })).catch(() => ({ data: null }));\n    const mode = settings?.trading_mode || "paper";\n    const size = settings?.paper_balance ? (settings.paper_balance * (settings.max_risk_per_trade || 2) / 100) : 200;\n\n    await base44.entities.Trade.create({\n      pair: signal.pair,\n      type: signal.direction === "buy" ? "long" : "short",\n      entry_price: signal.entry_price,\n      current_price: signal.entry_price,\n      stop_loss: signal.stop_loss,\n      take_profit_1: signal.take_profit_1,\n      take_profit_2: signal.take_profit_2,\n      take_profit_3: signal.take_profit_3,\n      position_size: Math.round(size),\n      leverage: settings?.default_leverage || 1,',
    replace: '  const executeTrade = async () => {\n    if (!signal.entry_price || signal.direction === "hold") return;\n    setExecuting(true);\n    try {\n      const fresh = await base44.entities.Signal.get(signal.id).catch(() => signal);\n      if (fresh?.status === "executed" || fresh?.status === "expired") {\n        setExecuted(fresh.status === "executed");\n        return;\n      }\n      const { data: settings } = await base44.entities.RiskSettings.list("-created_date", 1).then(d => ({ data: d[0] })).catch(() => ({ data: null }));\n      const mode = settings?.trading_mode || "paper";\n      // Size by SL distance (was notional balance*risk%).\n      const entry = Number(signal.entry_price);\n      const sl = Number(signal.stop_loss);\n      const balance = Number(settings?.paper_balance) || 10000;\n      const riskPct = Number(settings?.max_risk_per_trade) || 2;\n      const slDist = entry && sl ? Math.abs(entry - sl) / entry : 0;\n      const size = slDist > 0 ? Math.round(((balance * riskPct) / 100) / slDist) : 200;\n\n      await base44.entities.Trade.create({\n        pair: signal.pair,\n        type: signal.direction === "buy" ? "long" : "short",\n        entry_price: signal.entry_price,\n        current_price: signal.entry_price,\n        stop_loss: signal.stop_loss,\n        take_profit_1: signal.take_profit_1,\n        take_profit_2: signal.take_profit_2,\n        take_profit_3: signal.take_profit_3,\n        position_size: Math.round(size),\n        leverage: 1,' },
  { file: 'src/pages/AISignals.jsx', name: 'executeTrade tail (invalidate + catch/finally)',
    find: '    await base44.entities.Signal.update(signal.id, { status: "executed" });\n    queryClient.invalidateQueries({ queryKey: ["signals"] });\n    queryClient.invalidateQueries({ queryKey: ["trades"] });\n    setExecuted(true);\n    setExecuting(false);\n  };',
    replace: '      await base44.entities.Signal.update(signal.id, { status: "executed" });\n      queryClient.invalidateQueries({ queryKey: ["signals"] });\n      queryClient.invalidateQueries({ queryKey: ["trades"] });\n      queryClient.invalidateQueries({ queryKey: ["riskSettings"] });\n      setExecuted(true);\n    } catch (e) {\n      console.error("executeTrade failed:", e);\n    } finally {\n      setExecuting(false);\n    }\n  };' },

  // — Backtesting.jsx —
  { file: 'src/pages/Backtesting.jsx', name: 'runBacktest try{',
    find: '  const runBacktest = async () => {\n    setRunning(true);\n    setLearnDone(false);',
    replace: '  const runBacktest = async () => {\n    setRunning(true);\n    setLearnDone(false);\n    try {' },
  { file: 'src/pages/Backtesting.jsx', name: 'runBacktest catch/finally',
    find: '    setLearning(false);\n    setLearnDone(true);\n  };',
    replace: '    setLearnDone(true);\n    } catch (e) {\n      console.error("runBacktest failed:", e);\n    } finally {\n      setRunning(false);\n      setLearning(false);\n    }\n  };' },

  // — Trades.jsx —
  { file: 'src/pages/Trades.jsx', name: 'remove dead icon imports',
    find: 'import { Plus, TrendingUp, TrendingDown, Edit3, X, Loader2 } from "lucide-react";',
    replace: 'import { Plus, TrendingUp, Loader2 } from "lucide-react";' },
  { file: 'src/pages/Trades.jsx', name: 'trades query error state',
    find: '  const { data: trades } = useQuery({',
    replace: '  const { data: trades = [], isError: tradesError } = useQuery({' },
  { file: 'src/pages/Trades.jsx', name: 'openTrades null-safe',
    find: '  const openTrades = trades.filter(t => t.status === "open");',
    replace: '  const openTrades = (trades || []).filter(t => t.status === "open");' },
  { file: 'src/pages/Trades.jsx', name: 'closeTrade fresh fetch + no leverage mult',
    find: '    mutationFn: async ({ id, exitPrice }) => {\n      const trade = trades.find(t => t.id === id);\n      const pnl = trade.type === "long"\n        ? (exitPrice - trade.entry_price) * (trade.position_size / trade.entry_price) * (trade.leverage || 1)\n        : (trade.entry_price - exitPrice) * (trade.position_size / trade.entry_price) * (trade.leverage || 1);\n      const pnlPercent = (pnl / trade.position_size) * 100;',
    replace: '    mutationFn: async ({ id, exitPrice }) => {\n      // Fetch fresh trade to avoid stale-closure PnL (was reading `trades` from render).\n      const trade = await base44.entities.Trade.get(id);\n      if (!trade) throw new Error("Trade not found");\n      const pnl = trade.type === "long"\n        ? (exitPrice - trade.entry_price) * (trade.position_size / trade.entry_price)\n        : (trade.entry_price - exitPrice) * (trade.position_size / trade.entry_price);\n      const pnlPercent = trade.position_size ? (pnl / trade.position_size) * 100 : 0;' },
  { file: 'src/pages/Trades.jsx', name: 'closeTrade onError',
    find: '    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trades"] }),\n  });',
    replace: '    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trades"] }),\n    onError: (e) => console.error("closeTrade failed:", e),\n  });' },
  { file: 'src/pages/Trades.jsx', name: 'create trade try/catch',
    find: '              onSubmit={async (data) => {\n                await base44.entities.Trade.create(data);\n                queryClient.invalidateQueries({ queryKey: ["trades"] });\n                setShowForm(false);\n              }}',
    replace: '              onSubmit={async (data) => {\n                try {\n                  await base44.entities.Trade.create(data);\n                  queryClient.invalidateQueries({ queryKey: ["trades"] });\n                  setShowForm(false);\n                } catch (e) {\n                  console.error("create trade failed:", e);\n                }\n              }}' },
  { file: 'src/pages/Trades.jsx', name: 'trades error banner',
    find: '      {/* Open Trades */}\n      <AnimatePresence>\n        {openTrades.length === 0 ? (',
    replace: '      {tradesError && (\n        <div className="glass-card p-4 text-center text-sm text-trading-red" role="alert">\n          تعذر تحميل الصفقات — تحقق من اتصال الخادم.\n        </div>\n      )}\n      {/* Open Trades */}\n      <AnimatePresence>\n        {openTrades.length === 0 ? (' },
  { file: 'src/pages/Trades.jsx', name: 'logical border-s (RTL)',
    find: 'className={`glass-card p-5 border-r-2 ${\n                    isProfit ? "border-r-trading-green" : "border-r-trading-red"\n                  }`}',
    replace: 'className={`glass-card p-5 border-s-2 ${\n                    isProfit ? "border-s-trading-green" : "border-s-trading-red"\n                  }`}' },
  { file: 'src/pages/Trades.jsx', name: 'handleSubmit (spot 1x + try/finally)',
    find: '  const handleSubmit = async (e) => {\n    e.preventDefault();\n    setSubmitting(true);\n    await onSubmit({\n      ...form,\n      entry_price: parseFloat(form.entry_price),\n      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,\n      take_profit_1: form.take_profit_1 ? parseFloat(form.take_profit_1) : undefined,\n      position_size: parseFloat(form.position_size),\n      leverage: parseInt(form.leverage),\n      current_price: form.entry_price ? parseFloat(form.entry_price) : undefined,\n    });\n    setSubmitting(false);\n  };',
    replace: '  const handleSubmit = async (e) => {\n    e.preventDefault();\n    setSubmitting(true);\n    try {\n      await onSubmit({\n        ...form,\n        entry_price: parseFloat(form.entry_price),\n        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,\n        take_profit_1: form.take_profit_1 ? parseFloat(form.take_profit_1) : undefined,\n        position_size: parseFloat(form.position_size),\n        leverage: form.market_type === "spot" ? 1 : parseInt(form.leverage),\n        current_price: form.entry_price ? parseFloat(form.entry_price) : undefined,\n      });\n    } finally {\n      setSubmitting(false);\n    }\n  };' },

  // — RiskManagement.jsx —
  { file: 'src/pages/RiskManagement.jsx', name: 'settings loading/error states',
    find: '  const { data: settings } = useQuery({',
    replace: '  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useQuery({' },
  { file: 'src/pages/RiskManagement.jsx', name: 'dirty-guard + safe save',
    find: '  useEffect(() => {\n    if (settings) {',
    replace: '  const [dirty, setDirty] = useState(false);\n  const setField = (patch) => {\n    setForm((f) => ({ ...f, ...patch }));\n    setDirty(true);\n  };\n\n  useEffect(() => {\n    // Only sync from server on first load (or when not editing) — was\n    // clobbering user input on every refetch.\n    if (settings && !dirty) {' },
  { file: 'src/pages/RiskManagement.jsx', name: 'effect dep dirty',
    find: '        paper_balance: settings.paper_balance ?? 10000,\n      });\n    }\n  }, [settings]);',
    replace: '        paper_balance: settings.paper_balance ?? 10000,\n      });\n    }\n  }, [settings, dirty]);' },
  { file: 'src/pages/RiskManagement.jsx', name: 'handleSave try/finally + dual invalidate',
    find: '  const handleSave = async () => {\n    setSaving(true);\n    if (settings?.id) {\n      await base44.entities.RiskSettings.update(settings.id, form);\n    } else {\n      await base44.entities.RiskSettings.create(form);\n    }\n    queryClient.invalidateQueries({ queryKey: ["riskSettings"] });\n    setSaving(false);\n    setSaved(true);\n    setTimeout(() => setSaved(false), 2000);\n  };',
    replace: '  const handleSave = async () => {\n    setSaving(true);\n    try {\n      if (settings?.id) {\n        await base44.entities.RiskSettings.update(settings.id, form);\n      } else {\n        await base44.entities.RiskSettings.create(form);\n      }\n      setDirty(false);\n      queryClient.invalidateQueries({ queryKey: ["riskSettings"] });\n      // Legacy key variants used elsewhere — invalidate those too until unified.\n      queryClient.invalidateQueries({ queryKey: ["risk-settings"] });\n      queryClient.invalidateQueries({ queryKey: ["risk_settings"] });\n      setSaved(true);\n      setTimeout(() => setSaved(false), 2000);\n    } catch (e) {\n      console.error("save risk settings failed:", e);\n    } finally {\n      setSaving(false);\n    }\n  };' },
  { file: 'src/pages/RiskManagement.jsx', name: 'settings loading banners',
    find: '  return (\n    <div className="space-y-6 max-w-[1200px] mx-auto">\n      <Tabs defaultValue="settings">',
    replace: '  return (\n    <div className="space-y-6 max-w-[1200px] mx-auto">\n      {settingsLoading && (\n        <div className="glass-card p-4 text-center text-sm text-muted-foreground">جاري تحميل الإعدادات...</div>\n      )}\n      {settingsError && (\n        <div className="glass-card p-4 text-center text-sm text-trading-red" role="alert">\n          تعذر تحميل الإعدادات — سيتم إنشاء سجل جديد عند الحفظ.\n        </div>\n      )}\n      <Tabs defaultValue="settings">' },

  // — AppSettings.jsx —
  { file: 'src/pages/AppSettings.jsx', name: 'load settings try/catch + masked secrets',
    find: '  useEffect(() => {\n    (async () => {\n      const me = await base44.auth.me();\n      setUser(me);\n      if (me?.binance_api_key) {',
    replace: '  useEffect(() => {\n    (async () => {\n      try {\n        const me = await base44.auth.me();\n        setUser(me);\n        // Secrets are masked (empty) by the server on read — empty means\n        // "keep existing" on save (see server/db.js updateUser).' },
  { file: 'src/pages/AppSettings.jsx', name: 'settings mapping unconditional',
    find: '          notify_risk_warning: me.notify_risk_warning ?? true,\n        }));\n      }\n    })();\n  }, []);',
    replace: '          notify_risk_warning: me.notify_risk_warning ?? true,\n        }));\n      } catch (e) {\n        console.error("load settings failed:", e);\n      }\n    })();\n  }, []);' },
  { file: 'src/pages/AppSettings.jsx', name: 'save try/finally',
    find: '  const handleSave = async () => {\n    setSaving(true);\n    await base44.auth.updateMe(settings);\n    setSaving(false);\n    setSaved(true);\n    setTimeout(() => setSaved(false), 2000);\n  };',
    replace: '  const handleSave = async () => {\n    setSaving(true);\n    try {\n      await base44.auth.updateMe(settings);\n      setSaved(true);\n      setTimeout(() => setSaved(false), 2000);\n    } catch (e) {\n      console.error("save settings failed:", e);\n    } finally {\n      setSaving(false);\n    }\n  };' },
  { file: 'src/pages/AppSettings.jsx', name: 'honest secrets badge',
    find: '<Badge variant="outline" className="text-[9px]">مشفر</Badge>',
    replace: '<Badge variant="outline" className="text-[9px]">محفوظ محلياً — ليس مشفراً</Badge>' },
  { file: 'src/pages/AppSettings.jsx', name: 'testnet state fields',
    find: '  const [settings, setSettings] = useState({\n    binance_api_key: "",\n    binance_secret_key: "",\n    telegram_bot_token: "",',
    replace: '  const [settings, setSettings] = useState({\n    binance_api_key: "",\n    binance_secret_key: "",\n    binance_testnet_api_key: "",\n    binance_testnet_secret_key: "",\n    binance_network: "mainnet",\n    telegram_bot_token: "",' },
  { file: 'src/pages/AppSettings.jsx', name: 'testnet load mapping',
    find: '          binance_api_key: me.binance_api_key || "",\n          binance_secret_key: me.binance_secret_key || "",\n          telegram_bot_token: me.telegram_bot_token || "",',
    replace: '          binance_api_key: me.binance_api_key || "",\n          binance_secret_key: me.binance_secret_key || "",\n          binance_testnet_api_key: me.binance_testnet_api_key || "",\n          binance_testnet_secret_key: me.binance_testnet_secret_key || "",\n          binance_network: me.binance_network === "testnet" ? "testnet" : "mainnet",\n          telegram_bot_token: me.telegram_bot_token || "",' },
  { file: 'src/pages/AppSettings.jsx', name: 'testnet UI section',
    find: '              <button onClick={() => setShowSecretKey(!showSecretKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">\n                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}\n              </button>\n            </div>\n          </div>\n        </div>\n      </motion.div>',
    replace: '              <button onClick={() => setShowSecretKey(!showSecretKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">\n                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}\n              </button>\n            </div>\n          </div>\n          <div className="pt-2 border-t border-border/50">\n            <Label className="text-xs">شبكة التداول الحقيقي</Label>\n            <div className="flex gap-2 mt-2">\n              <Button\n                type="button"\n                variant={settings.binance_network !== "testnet" ? "default" : "outline"}\n                size="sm"\n                className="flex-1 text-xs"\n                onClick={() => setSettings({...settings, binance_network: "mainnet"})}\n              >\n                رئيسي (Mainnet)\n              </Button>\n              <Button\n                type="button"\n                variant={settings.binance_network === "testnet" ? "default" : "outline"}\n                size="sm"\n                className="flex-1 text-xs"\n                onClick={() => setSettings({...settings, binance_network: "testnet"})}\n              >\n                تجريبي (Testnet)\n              </Button>\n            </div>\n            <p className="text-[10px] text-muted-foreground mt-1">\n              {settings.binance_network === "testnet"\n                ? "الأوامر الحقيقية ستذهب إلى testnet.binance.vision (أموال وهمية)"\n                : "الأوامر الحقيقية ستذهب إلى Binance الرئيسي — تأكد قبل التفعيل"}\n            </p>\n          </div>\n          <div>\n            <Label className="text-xs">Testnet API Key <span className="text-muted-foreground">(testnet.binance.vision)</span></Label>\n            <Input\n              type="password"\n              value={settings.binance_testnet_api_key}\n              onChange={(e) => setSettings({...settings, binance_testnet_api_key: e.target.value})}\n              className="bg-secondary"\n              placeholder="مفتاح Testnet (يُستخدم فقط عند اختيار شبكة Testnet)"\n            />\n          </div>\n          <div>\n            <Label className="text-xs">Testnet Secret Key</Label>\n            <Input\n              type="password"\n              value={settings.binance_testnet_secret_key}\n              onChange={(e) => setSettings({...settings, binance_testnet_secret_key: e.target.value})}\n              className="bg-secondary"\n              placeholder="سر Testnet"\n            />\n          </div>\n        </div>\n      </motion.div>' },

  // — no-double-run guards (Phase 0b) —
  { file: 'src/components/dashboard/PaperTradingEngine.jsx', name: 'stand down when server worker active',
    find: '  const runEngine = useCallback(async () => {\n    if (processingRef.current) return;\n    processingRef.current = true;',
    replace: '  const runEngine = useCallback(async () => {\n    if (processingRef.current) return;\n    // عامل السيرفر هو المسؤول عند نشاطه — نتنحى لتجنب الإغلاق المزدوج\n    try {\n      const h = await fetch(\'/api/health\').then((r) => r.json()).catch(() => null);\n      if (h?.worker?.monitorActive) return;\n    } catch { /* لا صحة؟ نعمل محلياً كاحتياط */ }\n    processingRef.current = true;' },
  { file: 'src/components/dashboard/AutoPaperTrader.jsx', name: 'stand down when server generator active',
    find: '  const run = useCallback(async () => {\n    if (runningRef.current) return;\n    runningRef.current = true;',
    replace: '  const run = useCallback(async () => {\n    if (runningRef.current) return;\n    // مولد السيرفر هو المسؤول عند نشاطه — نتنحى لتجنب فتح صفقات مكررة\n    try {\n      const h = await fetch(\'/api/health\').then((r) => r.json()).catch(() => null);\n      if (h?.worker?.generatorActive) return;\n    } catch { /* لا صحة؟ نعمل محلياً كاحتياط */ }\n    runningRef.current = true;' },

  // — BacktestModal → real engine (Phase 3, kills LLM-fabricated numbers) —
  { file: 'src/components/strategy/BacktestModal.jsx', name: 'specForCategory helper',
    find: '  };\n\n  const runBacktest = async () => {',
    replace: '  };\n\n  // ربط فئة القالب القديم (بلا spec_id) بعائلة قابلة للتنفيذ\n  const specForCategory = (cat) => ({\n    trend_following: \'macd_wave\', mean_reversion: \'rsi_divergence\',\n    breakout: \'breakout_sniper\', scalping: \'stoch_scalper\',\n    swing: \'swing_master\', ai_hybrid: \'ai_sentiment_hybrid\',\n  }[cat] || \'quant_hybrid\');\n\n  const runBacktest = async () => {' },
  // — StrategyMarketplace seeds → spec_id (Phase 3) —
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec ema_cross_pro',
    find: '    name: "EMA Crossover Pro",', replace: '    name: "EMA Crossover Pro",\n    spec_id: "ema_cross_pro",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec rsi_divergence',
    find: '    name: "RSI Divergence Hunter",', replace: '    name: "RSI Divergence Hunter",\n    spec_id: "rsi_divergence",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec breakout_sniper',
    find: '    name: "Breakout Sniper",', replace: '    name: "Breakout Sniper",\n    spec_id: "breakout_sniper",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec stoch_scalper',
    find: '    name: "Scalping Lightning",', replace: '    name: "Scalping Lightning",\n    spec_id: "stoch_scalper",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec swing_master',
    find: '    name: "Swing Master AI",', replace: '    name: "Swing Master AI",\n    spec_id: "swing_master",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec ai_sentiment_hybrid',
    find: '    name: "AI Sentiment Trader",', replace: '    name: "AI Sentiment Trader",\n    spec_id: "ai_sentiment_hybrid",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec bb_squeeze',
    find: '    name: "Bollinger Squeeze",', replace: '    name: "Bollinger Squeeze",\n    spec_id: "bb_squeeze",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'seed spec macd_wave',
    find: '    name: "MACD Momentum Wave",', replace: '    name: "MACD Momentum Wave",\n    spec_id: "macd_wave",' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'measured scores query',
    find: '  const { data: backtestResults = [] } = useQuery({\n    queryKey: ["backtest_results_count"],\n    queryFn: () => base44.entities.BacktestResult.list("-created_date", 5),\n  });',
    replace: '  const { data: backtestResults = [] } = useQuery({\n    queryKey: ["backtest_results_count"],\n    queryFn: () => base44.entities.BacktestResult.list("-created_date", 5),\n  });\n\n  // Phase 5: النتائج المقاسة حقيقياً (walk-forward) بدل الأرقام التسويقية\n  const { data: measuredScores = [] } = useQuery({\n    queryKey: ["strategy_scores"],\n    queryFn: () => base44.entities.StrategyScore.list("-created_date", 200),\n  });\n  const measuredBySpec = {};\n  for (const row of measuredScores) {\n    if (row.strategy_id && !measuredBySpec[row.strategy_id]) {\n      measuredBySpec[row.strategy_id] = {\n        win_rate: row.oos_win_rate,\n        oos_return: row.oos_return_percent,\n        oos_trades: row.oos_trades,\n        score: row.score,\n      };\n    }\n  }' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'featured card measured prop',
    find: '<StrategyCard key={s.id} strategy={s} index={i} onBacktest={setSelectedStrategy} />',
    replace: '<StrategyCard key={s.id} strategy={s} measured={measuredBySpec[s.spec_id]} index={i} onBacktest={setSelectedStrategy} />' },
  { file: 'src/pages/StrategyMarketplace.jsx', name: 'others card measured prop',
    find: '<StrategyCard key={s.id} strategy={s} index={i + featured.length} onBacktest={setSelectedStrategy} />',
    replace: '<StrategyCard key={s.id} strategy={s} measured={measuredBySpec[s.spec_id]} index={i + featured.length} onBacktest={setSelectedStrategy} />' },

  // — StrategyCard measured display (Phase 5) —
  { file: 'src/components/strategy/StrategyCard.jsx', name: 'measured prop',
    find: 'export default function StrategyCard({ strategy, onBacktest, index }) {',
    replace: 'export default function StrategyCard({ strategy, measured, onBacktest, index }) {' },
  { file: 'src/components/strategy/StrategyCard.jsx', name: 'measured badge',
    find: '              {strategy.is_featured && <Star className="w-3.5 h-3.5 text-trading-yellow fill-trading-yellow" />}\n            </div>',
    replace: '              {strategy.is_featured && <Star className="w-3.5 h-3.5 text-trading-yellow fill-trading-yellow" />}\n              {measured && (\n                <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 bg-trading-green/10 text-trading-green">\n                  مقاس حقيقياً ({measured.oos_trades} صفقة)\n                </Badge>\n              )}\n            </div>' },
  { file: 'src/components/strategy/StrategyCard.jsx', name: 'measured stats grid',
    find: '          <p className="text-sm font-bold text-trading-green">{strategy.avg_win_rate || "—"}%</p>',
    replace: '          <p className="text-sm font-bold text-trading-green">{measured ? `${measured.win_rate}%` : "—"}</p>' },
  { file: 'src/components/strategy/StrategyCard.jsx', name: 'measured return cell',
    find: '          <p className="text-sm font-bold text-trading-cyan">+{strategy.avg_return || "—"}%</p>',
    replace: '          <p className="text-sm font-bold text-trading-cyan">{measured ? `${measured.oos_return >= 0 ? "+" : ""}${measured.oos_return}%` : "—"}</p>' },

  // — SentimentAnalysis: no fabricated volume (Phase 5) —
  { file: 'src/pages/SentimentAnalysis.jsx', name: 'drop random volume',
    find: '        volume: Math.floor(Math.random() * 50000 + 5000),',
    replace: '        // لا حجم تغريدات حقيقي متاح — لا نختلق أرقاماً (Phase 5)' },
  { file: 'src/pages/SentimentAnalysis.jsx', name: 'drop volume display',
    find: '                        <span className="text-xs font-medium">#{t.topic}</span>\n                        <span className="text-[9px] text-muted-foreground">{t.volume?.toLocaleString()} تغريدة</span>',
    replace: '                        <span className="text-xs font-medium">#{t.topic}</span>' },

  // — EconomicCalendar: honest empty state (Phase 5) —
  { file: 'src/components/dashboard/EconomicCalendar.jsx', name: 'noKey state',
    find: '  const [lastUpdated, setLastUpdated] = useState(null);',
    replace: '  const [lastUpdated, setLastUpdated] = useState(null);\n  const [noKey, setNoKey] = useState(false);' },
  { file: 'src/components/dashboard/EconomicCalendar.jsx', name: 'no static fallback (full catch)',
    find: '    } catch {\n      // fallback بيانات ثابتة\n      setEvents([\n        { title: "قرار الفائدة الأمريكية (Fed)", title_en: "FOMC Rate Decision", date: "الأربعاء", time: "21:00", impact: "high", currency: "USD", forecast: "5.25%", previous: "5.25%", crypto_effect: "تثبيت الفائدة يدعم البيتكوين صعوداً", direction: "bullish" },\n        { title: "بيانات مؤشر أسعار المستهلك", title_en: "CPI Data", date: "الثلاثاء", time: "15:30", impact: "high", currency: "USD", forecast: "3.1%", previous: "3.2%", crypto_effect: "انخفاض التضخم إشارة إيجابية للعملات الرقمية", direction: "bullish" },\n        { title: "بيانات الوظائف غير الزراعية", title_en: "Non-Farm Payrolls", date: "الجمعة", time: "15:30", impact: "high", currency: "USD", forecast: "200K", previous: "187K", crypto_effect: "سوق العمل القوي قد يحد من خفض الفائدة", direction: "bearish" },\n        { title: "خطاب رئيس الفيدرالي باول", title_en: "Fed Chair Powell Speech", date: "الخميس", time: "19:00", impact: "high", currency: "USD", forecast: "-", previous: "-", crypto_effect: "أي إشارة لخفض الفائدة تدعم الأصول الرقمية", direction: "neutral" },\n        { title: "قرار فائدة البنك المركزي الأوروبي", title_en: "ECB Rate Decision", date: "الخميس", time: "14:15", impact: "medium", currency: "EUR", forecast: "4.5%", previous: "4.5%", crypto_effect: "تأثير متوسط على سوق العملات الرقمية", direction: "neutral" },\n        { title: "بيانات الناتج المحلي الأمريكي", title_en: "US GDP q/q", date: "الخميس", time: "15:30", impact: "medium", currency: "USD", forecast: "2.8%", previous: "3.1%", crypto_effect: "تباطؤ النمو يزيد احتمالية خفض الفائدة", direction: "bullish" },\n      ]);',
    replace: '    } catch {\n      // Phase 5: بلا مفتاح LLM لا أحداث حقيقية — حالة صريحة بدل بيانات قديمة ملفقة\n      setEvents([]);\n      setNoKey(true);' },
  { file: 'src/components/dashboard/EconomicCalendar.jsx', name: 'empty + AI-generated note',
    find: '      ) : (\n        <div className="space-y-2.5">',
    replace: '      ) : noKey || events.length === 0 ? (\n        <div className="p-4 rounded-lg bg-secondary/30 text-center">\n          <p className="text-xs text-muted-foreground leading-relaxed">\n            لا توجد أحداث — التقويم الاقتصادي يحتاج مفتاح LLM في ملف .env\n            (بلا مفتاح لا نعرض تواريخ مختلقة).\n          </p>\n        </div>\n      ) : (\n        <>\n        <p className="text-[10px] text-muted-foreground mb-2 text-center">\n          الأحداث مولّدة بالذكاء الاصطناعي — تحقق من التواريخ قبل الاعتماد عليها\n        </p>\n        <div className="space-y-2.5">' },
  { file: 'src/components/dashboard/EconomicCalendar.jsx', name: 'close fragment',
    find: '          })}\n        </div>\n      )}',
    replace: '          })}\n        </div>\n        </>\n      )}' },

  { file: 'src/components/strategy/BacktestModal.jsx', name: 'runBacktest → real engine (full function)',
    find: '  const runBacktest = async () => {\n    setRunning(true);\n    setResult(null);\n    const res = await base44.integrations.Core.InvokeLLM({\n      prompt: `قم بمحاكاة backtest دقيق لاستراتيجية التداول التالية:\n\nالاستراتيجية: ${strategy.name}\nالوصف: ${strategy.description}\nالفئة: ${strategy.category}\nالمؤشرات: ${strategy.indicators?.join(", ")}\n\nالمعاملات:\n- الزوج: ${params.pair}\n- الإطار الزمني: ${params.timeframe}\n- الفترة: من ${params.start_date} إلى ${params.end_date}\n- الرصيد الأولي: $${params.initial_balance}\n- الخطر لكل صفقة: ${params.risk_per_trade}%\n- وقف خسارة: ${params.stop_loss_percent}%، أخذ ربح: ${params.take_profit_percent}%.\n\nبناءً على السلوك الفعلي لزوج ${params.pair} خلال هذه الفترة وطبيعة هذه الاستراتيجية، أعطني نتائج backtest واقعية ودقيقة.`,\n      response_json_schema: {\n        type: "object",\n        properties: {\n          total_trades: { type: "number" },\n          winning_trades: { type: "number" },\n          losing_trades: { type: "number" },\n          win_rate: { type: "number" },\n          total_return_percent: { type: "number" },\n          final_balance: { type: "number" },\n          max_drawdown: { type: "number" },\n          sharpe_ratio: { type: "number" },\n          profit_factor: { type: "number" },\n          avg_win_percent: { type: "number" },\n          avg_loss_percent: { type: "number" },\n          best_month: { type: "string" },\n          worst_month: { type: "string" },\n          summary: { type: "string" },\n          strengths: { type: "array", items: { type: "string" } },\n          weaknesses: { type: "array", items: { type: "string" } },\n          score: { type: "number" }\n        }\n      }\n    });\n    setResult(res);\n\n    // Save to BacktestResult entity\n    await base44.entities.BacktestResult.create({\n      pair: params.pair,\n      strategy: strategy.name,\n      start_date: params.start_date,\n      end_date: params.end_date,\n      initial_balance: params.initialBalance,\n      risk_per_trade: params.riskPerTrade,\n      stop_loss_percent: params.stopLossPercent,\n      take_profit_percent: params.takeProfitPercent,\n      total_return_percent: res.total_return_percent,\n      win_rate: res.win_rate,\n      total_trades: res.total_trades,\n      sharpe_ratio: res.sharpe_ratio,\n      max_drawdown: res.max_drawdown,\n      profit_factor: res.profit_factor,\n      avg_win: res.avg_win_percent,\n      avg_loss: res.avg_loss_percent,\n      score: res.score,\n    });\n\n    // Increment usage\n    await base44.entities.StrategyTemplate.update(strategy.id, {\n      times_used: (strategy.times_used || 0) + 1,\n    });\n\n    setRunning(false);\n    onComplete?.();\n  };',
    replace: '  const runBacktest = async () => {\n    setRunning(true);\n    setResult(null);\n    try {\n    // محرك حقيقي (Phase 3) — كان سابقاً تأليف LLM لأرقام وهمية\n    const apiPair = params.pair.includes(\'/\') ? params.pair : params.pair.replace(/(USDT|BTC|ETH|BNB)$/, \'/$1\');\n    const res = await fetch(\'/api/brain/backtest\', {\n      method: \'POST\',\n      headers: { \'Content-Type\': \'application/json\' },\n      body: JSON.stringify({\n        pair: apiPair,\n        interval: params.timeframe,\n        limit: 1000,\n        initialBalance: params.initialBalance,\n        riskPerTrade: params.riskPerTrade,\n        stopLossPercent: params.stopLossPercent,\n        takeProfitPercent: params.takeProfitPercent,\n        strategy: strategy.name,\n        strategyId: strategy.spec_id || specForCategory(strategy.category),\n        save: false,\n      }),\n    }).then((r) => r.json());\n    if (res.error) throw new Error(res.error);\n    // توافق أسماء العرض القديم مع حقول المحرك\n    res.avg_win_percent = res.avg_win;\n    res.avg_loss_percent = res.avg_loss;\n    res.summary = res.ai_lessons;\n    res.strengths = res.best_conditions ? [res.best_conditions] : [];\n    res.weaknesses = res.avoid_conditions ? [res.avoid_conditions] : [];\n    setResult(res);\n\n    // Save to BacktestResult entity (مصدر حقيقي: engine — ليست أرقام LLM)\n    await base44.entities.BacktestResult.create({\n      pair: apiPair,\n      strategy: strategy.name,\n      strategy_id: res.strategy_id || strategy.spec_id || null,\n      source: \'engine\',\n      start_date: params.start_date,\n      end_date: params.end_date,\n      initial_balance: params.initialBalance,\n      risk_per_trade: params.riskPerTrade,\n      stop_loss_percent: params.stopLossPercent,\n      take_profit_percent: params.takeProfitPercent,\n      total_return_percent: res.total_return_percent,\n      win_rate: res.win_rate,\n      total_trades: res.total_trades,\n      sharpe_ratio: res.sharpe_ratio,\n      max_drawdown: res.max_drawdown,\n      profit_factor: res.profit_factor,\n      avg_win: res.avg_win,\n      avg_loss: res.avg_loss,\n      ai_lessons: res.ai_lessons,\n      best_conditions: res.best_conditions,\n      avoid_conditions: res.avoid_conditions,\n      score: res.score,\n    });\n\n    // Increment usage\n    await base44.entities.StrategyTemplate.update(strategy.id, {\n      times_used: (strategy.times_used || 0) + 1,\n    });\n\n    } catch (e) {\n      console.error("engine backtest failed:", e);\n    } finally {\n      setRunning(false);\n    }\n    onComplete?.();\n  };\n' },
];

// NOTE: RiskManagement `setForm({...form,` → `setField({` bulk rename runs AFTER
// the rules above (it needs the setField helper to exist first).
async function bulkRenameRiskSetForm() {
  console.log('\n[3b/4] RiskManagement setForm→setField:');
  const p = target('src/pages/RiskManagement.jsx');
  const cur = await read(p);
  if (!cur) { warn('src/pages/RiskManagement.jsx غير موجود'); return; }
  if (!cur.includes('const setField = (patch)')) {
    warn('setField helper غير موجود — تُخطى إعادة التسمية (راجع تحذيرات [3/4])');
    return;
  }
  if (!cur.includes('setForm({...form,')) { skip('لا setForm({...form, متبقٍ'); return; }
  await write(p, cur.split('setForm({...form,').join('setField({'));
  ok('setForm({...form, → setField({ (bulk)');
}

async function applyPatches() {
  console.log('\n[3/4] ترقيعات ملفات الموقع:');
  const byFile = new Map();
  for (const r of PATCHES) {
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push(r);
  }
  for (const [file, rules] of byFile) {
    const p = target(file);
    let cur = await read(p);
    if (cur === null) { warn(`${file} غير موجود — تُخطى قواعده (${rules.length})`); continue; }
    let changed = false;
    for (const r of rules) {
      // Skip-detection: deletion rules (absent) are done when the deleted
      // text is GONE (their replace is a substring of find, so replace-check
      // would misfire); normal rules are done when replace is present.
      const done = r.absent ? !cur.includes(r.absent) : cur.includes(r.replace);
      if (done) { skipped++; continue; }
      if (cur.includes(r.find)) { cur = cur.replace(r.find, r.replace); changed = true; }
      else warn(`${file}: anchor مفقود لقاعدة "${r.name}" — الموقع غيّر الملف، راجع يدوياً`);
    }
    if (changed) { await write(p, cur); ok(`${file} اترقّع`); }
    else console.log(`  ⏭️  ${file} (كل قواعده مطبقة already)`);
  }
}

// ── 4) تحقق نهائي: صفر اعتماد Base44 في التشغيل ─────────────────────────────
async function verify() {
  console.log('\n[4/4] تحقق:');
  const pkg = JSON.parse((await read(target('package.json'))) || '{}');
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const bad of ['@base44/sdk', '@base44/vite-plugin']) {
    if (deps[bad]) warn(`package.json ما زال فيه ${bad}`);
  }
  for (const f of ['vite.config.js', 'src/main.jsx', 'src/api/base44Client.js', 'src/lib/AuthContext.jsx']) {
    const c = (await read(target(f))) || '';
    if (c.includes('@base44/')) warn(`${f} ما زال يستورد @base44`);
  }
  // أي استيراد SDK خارج مجلد المرجع src/base44/
  const { execSync } = await import('node:child_process');
  let hits = '';
  try {
    hits = execSync(
      `grep -rn "from '@base44\\|from \\"@base44" src --include='*.jsx' --include='*.js' | grep -v "src/base44/" || true`,
      { cwd: ROOT, encoding: 'utf-8' },
    ).trim();
  } catch { /* grep not available — skip */ }
  if (hits) warn(`استيرادات @base44 متبقية خارج src/base44/:\n${hits}`);
  else console.log('  ✅ لا استيرادات @base44 في كود التشغيل');
  const brain = await read(target('server/brain/brain.test.js'));
  if (!brain) warn('server/brain مفقود — هل انمسح السيرفر؟');
  else console.log('  ✅ السيرفر المحلي موجود');
}

console.log('🔧 restore-local: إرجاع طبقة الاستغناء عن Base44…');
await restoreFullFiles();
await mergePackageJson();
await applyPatches();
await bulkRenameRiskSetForm();
await verify();

console.log(`\nالنتيجة: ${applied} طُبق / ${skipped} متخطى (مطبق already) / ${warnings.length} تحذير`);
if (warnings.length) {
  console.log('⚠️  راجع التحذيرات أعلاه — غالباً الموقع غيّر ملفاً جذرياً ويحتاج تدخلاً يدوياً.');
  process.exit(1);
}
console.log('✅ جاهز — شغّل: npm install (عند الحاجة) ثم npm run dev:server + npm run dev');
