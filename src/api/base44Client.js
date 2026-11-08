/**
 * عميل محلي بنفس واجهة Base44 تماماً — لا حاجة لتعديل أي صفحة أو مكون.
 *
 * يغطي كل الاستخدامات الموجودة في المشروع:
 *   base44.entities.X.list(sort?, limit?)            → GET /api/entities/X?sort=&limit=
 *   base44.entities.X.filter(filters, sort?, limit?) → GET /api/entities/X?filter={...}
 *   base44.entities.X.create(data)                   → POST /api/entities/X
 *   base44.entities.X.update(id, data)               → PATCH /api/entities/X/:id
 *   base44.entities.X.delete(id)                     → DELETE /api/entities/X/:id
 *   base44.entities.X.bulkCreate(items)              → POST /api/entities/X/bulk
 *   base44.auth.me() / updateMe() / logout()
 *   base44.integrations.Core.InvokeLLM({prompt, response_json_schema, ...}) → POST /api/llm
 *   base44.functions.invoke(name, payload)          → POST /api/functions/:name
 */

// في التطوير يتكفل Vite بالتحويل عبر proxy، وفي الإنتاج نفس المنشأ يقدّم الـ API
const API_BASE = import.meta.env.VITE_API_URL || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

async function request(path, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'x-api-token': API_TOKEN } : {}),
        ...(options.headers || {}),
      },
      ...options,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `Request failed: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error('Request timeout');
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function toQuery(params = {}) {
  const q = new URLSearchParams();
  if (params.sort) q.set('sort', params.sort);
  if (params.limit !== undefined && params.limit !== null) q.set('limit', String(params.limit));
  if (params.filter && Object.keys(params.filter).length) q.set('filter', JSON.stringify(params.filter));
  const s = q.toString();
  return s ? `?${s}` : '';
}

function entityClient(name) {
  return {
    list: (sort, limit) => request(`/api/entities/${name}${toQuery({ sort, limit })}`),
    filter: (filters, sort, limit) => request(`/api/entities/${name}${toQuery({ sort, limit, filter: filters })}`),
    get: (id) => request(`/api/entities/${name}/${encodeURIComponent(id)}`),
    create: (data) => request(`/api/entities/${name}`, { method: 'POST', body: JSON.stringify(data || {}) }),
    bulkCreate: (items) => request(`/api/entities/${name}/bulk`, {
      method: 'POST',
      body: JSON.stringify(Array.isArray(items) ? items : []),
    }),
    update: (id, data) => request(`/api/entities/${name}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    }),
    delete: (id) => request(`/api/entities/${name}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

// Explicit entity allowlist: typos fail fast instead of becoming runtime 404s.
// (Was `new Proxy` accepting any name, including typos and internal `_user`.)
const KNOWN_ENTITIES = new Set([
  'Trade', 'Signal', 'RiskSettings', 'AlertLog', 'AlertConfig',
  'BacktestResult', 'StrategyTemplate', 'CustomStrategy', 'PortfolioSnapshot',
  'TraderProfile', 'CopyFollow', 'TradeLesson', 'MLModel',
]);
const entities = new Proxy({}, {
  get: (_t, name) => {
    if (typeof name !== 'string') return undefined;
    if (name.startsWith('_')) throw new Error(`Unknown entity: ${name}`);
    if (!KNOWN_ENTITIES.has(name)) {
      console.warn(`Unknown entity accessed: ${name}`);
    }
    return entityClient(name);
  },
});

const auth = {
  me: () => request('/api/auth/me'),
  updateMe: (data) => request('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data || {}) }),
  logout: () => window.location.reload(),
  redirectToLogin: () => {},
  isAuthenticated: async () => true,
};

const integrations = {
  Core: {
    // نفس شكل InvokeLLM الأصلي: { prompt, response_json_schema, ... } → يعيد كائن JSON مباشرة
    InvokeLLM: (args = {}) => request('/api/llm', { method: 'POST', body: JSON.stringify(args) }),
  },
};

const functions = {
  invoke: (name, payload = {}) => request(`/api/functions/${name}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

export const base44 = { entities, auth, integrations, functions };
