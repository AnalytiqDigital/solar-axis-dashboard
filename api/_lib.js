const crypto = require('crypto');

const CHAT_TABLE_NAME = process.env.CHAT_TABLE_NAME || 'whatsapp_chat_log';

function authorized(req) {
  const given = String(req.headers['x-dashboard-password'] || '');
  const expected = String(process.env.DASHBOARD_PASSWORD || '');
  if (!expected || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

async function n8n(path, options = {}) {
  const base = String(process.env.N8N_BASE_URL || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/v1${path}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`n8n ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const cache = {};
async function findTable(name, envId) {
  if (envId) return envId;
  if (cache[name]) return cache[name];
  const list = await n8n('/data-tables?limit=250');
  const t = (list.data || list).find((x) => x.name === name);
  if (!t) return null;
  cache[name] = t.id;
  return t.id;
}

async function handoffTable() {
  const id = await findTable(process.env.DATA_TABLE_NAME || 'whatsapp_handoffs', process.env.DATA_TABLE_ID);
  if (!id) throw new Error('Handoff data table not found. Set DATA_TABLE_ID.');
  return id;
}

async function chatTable({ create = false } = {}) {
  let id = await findTable(CHAT_TABLE_NAME, process.env.CHAT_TABLE_ID);
  if (!id && create) {
    const made = await n8n('/data-tables', {
      method: 'POST',
      body: JSON.stringify({
        name: CHAT_TABLE_NAME,
        columns: [
          { name: 'customer_phone', type: 'string' },
          { name: 'customer_name', type: 'string' },
          { name: 'direction', type: 'string' },
          { name: 'sender', type: 'string' },
          { name: 'text', type: 'string' },
        ],
      }),
    });
    id = made.id || (made.data && made.data.id);
    cache[CHAT_TABLE_NAME] = id;
  }
  return id || null;
}

async function allRows(id, max = 2000) {
  const rows = [];
  let cursor;
  while (rows.length < max) {
    const qs = `limit=250&sortBy=createdAt:desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const out = await n8n(`/data-tables/${id}/rows?${qs}`);
    rows.push(...(out.data || []));
    cursor = out.nextCursor;
    if (!cursor) break;
  }
  return rows;
}

function guard(handler, method) {
  return async (req, res) => {
    if (req.method !== method) return res.status(405).json({ error: 'Method not allowed' });
    if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await handler(req, res);
    } catch (e) {
      res.status(e.status && e.status < 500 ? e.status : 500).json({ error: e.message });
    }
  };
}

module.exports = { n8n, handoffTable, chatTable, allRows, guard };
