#!/usr/bin/env node
/**
 * mcp-server — يعرّض منصة التداول المحلية كأدوات MCP (Model Context Protocol)
 * لأي مساعد ذكي يدعم MCP (Claude Desktop, Cursor, VS Code, Windsurf, ...).
 *
 * النقل: stdio (المعيار لعملاء MCP). يتكلم مع السيرفر المحلي عبر HTTP:
 *   API_BASE=http://localhost:3001  (لازم `node server/index.js` يكون شغال)
 *   MCP_API_TOKEN=...               (مطابق LOCAL_API_TOKEN إن فعّلته في .env)
 *
 * التشغيل اليدوي للتجربة:
 *   node mcp-server/index.js
 * ثم تحدث معه JSON-RPC على stdin (انظر قسم الاختبار في README_LOCAL.md).
 *
 * التحليل الكمي (brain_analyze / brain_backtest / generate_signals) يعمل
 * بلا أي مفتاح LLM — من بيانات Binance الحية. صفر تكلفة.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = (process.env.API_BASE || 'http://localhost:3001').replace(/\/$/, '');
const API_TOKEN = process.env.MCP_API_TOKEN || process.env.LOCAL_API_TOKEN || '';

async function api(path, { method = 'GET', body, timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'x-api-token': API_TOKEN } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Backend ${res.status} on ${path}`);
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`Backend timeout (${timeoutMs}ms) on ${path} — is server/index.js running?`);
    if (e?.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(e.message)) {
      throw new Error(`Cannot reach backend at ${API_BASE} — start it with: node server/index.js`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const text = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ content: [{ type: 'text', text: `Error: ${e.message || e}` }], isError: true });

function entitiesQuery(name, { sort, limit, filter } = {}) {
  const q = new URLSearchParams();
  if (sort) q.set('sort', sort);
  if (limit !== undefined) q.set('limit', String(limit));
  if (filter) q.set('filter', JSON.stringify(filter));
  const s = q.toString();
  return api(`/api/entities/${name}${s ? `?${s}` : ''}`);
}

const PAIR = z.string().regex(/^[A-Z]{2,12}\/[A-Z]{2,12}$/, 'Pair like BTC/USDT').default('BTC/USDT');
const INTERVAL = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']).default('4h');

const server = new McpServer(
  { name: 'ai-trading-local', version: '1.0.0' },
  {
    capabilities: { tools: {}, prompts: {} },
    instructions:
      'Local AI crypto-trading backend. Quantitative brain (EMA/MACD/RSI/Stochastic/Bollinger/ATR/S/R/candles) analyzes LIVE Binance data — no LLM key needed, zero cost. ' +
      'Default trading mode is paper. execute_signal acts per server RiskSettings and may place a REAL Binance order if trading_mode is live — always confirm with the user first. ' +
      'Hold signals carry null stop/take-profit levels by design.',
  },
);

// ── صحة السيرفر ─────────────────────────────────────────────────────────────
server.registerTool('server_health', { description: 'Check the local trading backend is reachable.' }, async () => {
  try { return text(await api('/api/health', { timeoutMs: 10000 })); } catch (e) { return fail(e); }
});

// ── بيانات السوق ─────────────────────────────────────────────────────────────
server.registerTool('market_ticker',
  { description: '24h tickers for symbols (default: majors). Public, no keys.',
    inputSchema: { symbols: z.array(z.string().regex(/^[A-Z0-9]{4,20}$/)).max(20).optional() } },
  async ({ symbols }) => {
    try { return text(await api('/api/binance', { method: 'POST', body: { action: 'ticker', ...(symbols ? { symbols } : {}) } })); }
    catch (e) { return fail(e); }
  });

server.registerTool('market_candles',
  { description: 'OHLCV klines array [openTime,open,high,low,close,volume,...]. Last (forming) candle is excluded server-side.',
    inputSchema: { symbol: z.string().regex(/^[A-Z0-9]{4,20}$/).default('BTCUSDT'), interval: INTERVAL, limit: z.number().int().min(1).max(500).default(100) } },
  async ({ symbol, interval, limit }) => {
    try {
      const klines = await api('/api/binance', { method: 'POST', body: { action: 'klines', symbol, interval, limit }, timeoutMs: 20000 });
      const closes = klines.map((k) => +k[4]);
      return text({ count: klines.length, last_close: closes[closes.length - 1], klines });
    } catch (e) { return fail(e); }
  });

// ── العقل الكمي (مجاناً) ─────────────────────────────────────────────────────
server.registerTool('brain_analyze',
  { description: 'Quant signal for a pair from live candles: direction (buy/sell/hold), confidence, entry, ATR-based stop/TPs, indicators, summary. Free, no LLM key.',
    inputSchema: { pair: PAIR, interval: INTERVAL } },
  async ({ pair, interval }) => {
    try { return text(await api('/api/brain/analyze', { method: 'POST', body: { pair, interval }, timeoutMs: 60000 })); }
    catch (e) { return fail(e); }
  });

server.registerTool('brain_backtest',
  { description: 'Real backtest on live candles (no look-ahead, fees+slippage, OOS stats, lessons). Returns full stats + optimal params.',
    inputSchema: {
      pair: PAIR, interval: z.enum(['1h', '4h', '1d']).default('1h'),
      limit: z.number().int().min(80).max(1000).default(400),
      initialBalance: z.number().positive().default(10000),
      riskPerTrade: z.number().min(0.1).max(10).default(2),
      stopLossPercent: z.number().min(0.1).max(20).default(2),
      takeProfitPercent: z.number().min(0.1).max(50).default(4),
    } },
  async (args) => {
    try { return text(await api('/api/brain/backtest', { method: 'POST', body: { ...args, save: false }, timeoutMs: 120000 })); }
    catch (e) { return fail(e); }
  });

server.registerTool('generate_signals',
  { description: 'Generate + auto-process quant signals for up to 10 pairs (uses server brain, or LLM if the server has a key). Hold signals are stored as expired, never pending.',
    inputSchema: { pairs: z.array(z.string().regex(/^[A-Z]{2,12}\/[A-Z]{2,12}$/)).max(10).optional() } },
  async ({ pairs }) => {
    try { return text(await api('/api/functions/ai_signal_generator', { method: 'POST', body: pairs ? { pairs } : {}, timeoutMs: 120000 })); }
    catch (e) { return fail(e); }
  });

// ── الإشارات والصفقات ────────────────────────────────────────────────────────
server.registerTool('list_signals',
  { description: 'Latest signals (default 20). Filter by status: pending|executed|expired.',
    inputSchema: { limit: z.number().int().min(1).max(100).default(20), status: z.enum(['pending', 'executed', 'expired']).optional() } },
  async ({ limit, status }) => {
    try { return text(await entitiesQuery('Signal', { sort: '-created_date', limit, ...(status ? { filter: { status } } : {}) })); }
    catch (e) { return fail(e); }
  });

server.registerTool('get_signal',
  { description: 'Fetch one signal by id.', inputSchema: { id: z.string() } },
  async ({ id }) => {
    try { return text(await api(`/api/entities/Signal/${encodeURIComponent(id)}`)); }
    catch (e) { return fail(e); }
  });

server.registerTool('execute_signal',
  { description: 'Process a pending signal per server RiskSettings: auto mode opens a trade (paper, or REAL Binance order if trading_mode=live), semi_auto logs an approval alert, manual skips. CONFIRM WITH THE USER FIRST when live mode may be on.',
    inputSchema: { id: z.string() } },
  async ({ id }) => {
    try { return text(await api('/api/functions/signal_executor', { method: 'POST', body: { id }, timeoutMs: 60000 })); }
    catch (e) { return fail(e); }
  });

server.registerTool('list_trades',
  { description: 'List trades, optionally filtered by status (open|closed) and mode (paper|live).',
    inputSchema: {
      status: z.enum(['open', 'closed']).optional(), mode: z.enum(['paper', 'live']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    } },
  async ({ status, mode, limit }) => {
    try {
      const filter = { ...(status ? { status } : {}), ...(mode ? { mode } : {}) };
      return text(await entitiesQuery('Trade', { sort: '-created_date', limit, ...(Object.keys(filter).length ? { filter } : {}) }));
    } catch (e) { return fail(e); }
  });

server.registerTool('paper_trade',
  { description: 'Open a PAPER trade only (mode is forced to paper server-side; never touches real funds). Size in USD notional.',
    inputSchema: {
      pair: PAIR, type: z.enum(['long', 'short']), entry_price: z.number().positive(),
      position_size: z.number().positive(), stop_loss: z.number().positive().optional(),
      take_profit_1: z.number().positive().optional(), strategy: z.string().max(200).default('MCP paper'),
    } },
  async (args) => {
    try {
      return text(await api('/api/entities/Trade', { method: 'POST', body: {
        ...args, current_price: args.entry_price, leverage: 1, status: 'open',
        mode: 'paper', market_type: 'spot', pnl: 0, pnl_percent: 0,
      } }));
    } catch (e) { return fail(e); }
  });

server.registerTool('risk_settings',
  { description: 'Read current risk/execution settings (execution_mode, trading_mode paper|live, limits, balances).',
    inputSchema: {} },
  async () => {
    try { return text(await entitiesQuery('RiskSettings', { sort: '-created_date', limit: 1 })); }
    catch (e) { return fail(e); }
  });

// ── موجّه تحليل جاهز ─────────────────────────────────────────────────────────
server.registerPrompt('analyze_pair',
  { description: 'Full quant workup for a pair: ticker + brain signal + backtest context, then a verdict.',
    argsSchema: { pair: PAIR } },
  async ({ pair }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Do a full quantitative workup for ${pair}: (1) call market_ticker for its symbol, (2) call brain_analyze (4h), (3) call brain_backtest (1h, 400 candles), then give a verdict: direction, confidence, entry/stop/TPs, key evidence (max 5 bullets), and what would invalidate it. If direction is hold, say so plainly — never force a trade.`,
      },
    }],
  }));

const transport = new StdioServerTransport();
await server.connect(transport);
