import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/create-store.mjs';
import { drawParticipants } from './lib/draw.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const store = createStore(root);
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function answer(res, status, body, headers = {}) {
  res.writeHead(status, { ...jsonHeaders, ...headers });
  res.end(JSON.stringify(body));
}

function isAdmin(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Basic ')) return false;
  const [user = '', password = ''] = Buffer.from(authorization.slice(6), 'base64').toString().split(':');
  const expectedUser = process.env.ADMIN_USER || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  if (!expectedUser || expectedPassword.length < 12) return false;
  const safe = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  return safe(user, expectedUser) && safe(password, expectedPassword);
}

function demandAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.writeHead(401, { 'www-authenticate': 'Basic realm="Camp Post Admin", charset="UTF-8"', 'cache-control': 'no-store' });
  res.end('Нужен вход администратора');
  return false;
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error('payload_too_large');
  }
  return JSON.parse(raw || '{}');
}

function clean(value, max = 180) { return String(value || '').trim().slice(0, max); }

function validateApplication(input) {
  const application = {
    name: clean(input.name, 80), country: clean(input.country, 80), postcode: clean(input.postcode, 24),
    city: clean(input.city, 120), region: clean(input.region, 120), street: clean(input.street, 180),
    wish: clean(input.wish, 140), geography: input.geography === 'international' ? 'international' : 'domestic'
  };
  if (!application.name || !application.country || !application.postcode || !application.city || !application.street) return null;
  if (![input.rules, input.personal, input.transfer, input.age].every(Boolean)) return null;
  return application;
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    await store.read();
    return answer(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/api/applications') {
    const input = await body(req);
    const fields = validateApplication(input);
    if (!fields) return answer(res, 422, { error: 'Проверь обязательные поля и согласия.' });
    const id = crypto.randomUUID();
    const botCode = crypto.randomBytes(16).toString('hex');
    const accessToken = crypto.randomBytes(24).toString('hex');
    await store.update(data => ({ ...data, applications: [...data.applications, {
      id, ...fields, status: 'pending_telegram', telegramId: null, botCode, accessToken,
      consent: { version: 'draft-2026-08', acceptedAt: new Date().toISOString() }, createdAt: new Date().toISOString()
    }] }));
    const username = clean(process.env.TELEGRAM_BOT_USERNAME, 64);
    return answer(res, 201, { id, accessToken, status: 'pending_telegram', botUrl: username ? `https://t.me/${username}?start=${botCode}` : null });
  }

  const statusMatch = url.pathname.match(/^\/api\/applications\/([a-f0-9-]+)\/status$/i);
  if (req.method === 'GET' && statusMatch) {
    const data = await store.read();
    const application = data.applications.find(item => item.id === statusMatch[1] && item.accessToken === url.searchParams.get('token'));
    if (!application) return answer(res, 404, { error: 'Заявка не найдена.' });
    return answer(res, 200, { status: application.status });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    if (!demandAdmin(req, res)) return;
    const data = await store.read();
    const countries = new Set(data.applications.map(item => item.country));
    return answer(res, 200, {
      applications: data.applications.length,
      confirmed: data.applications.filter(item => item.status === 'confirmed').length,
      needsHelp: data.applications.filter(item => !['confirmed', 'assigned', 'sent'].includes(item.status)).length,
      countries: countries.size,
      rows: data.applications.map(({ id, name, country, status, geography, createdAt }) => ({ id, name, country, status, geography, createdAt }))
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/draw') {
    if (!demandAdmin(req, res)) return;
    let result;
    await store.update(data => {
      result = drawParticipants(data.applications, data.routes);
      if (!result.ok) return data;
      const recipientBySender = new Map(result.assignments.map(item => [item.senderId, item.recipientId]));
      return {
        ...data,
        assignments: result.assignments.map(item => ({ ...item, createdAt: new Date().toISOString(), status: 'assigned' })),
        applications: data.applications.map(item => recipientBySender.has(item.id) ? { ...item, status: 'assigned' } : item)
      };
    });
    return answer(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/routes') {
    if (!demandAdmin(req, res)) return;
    const input = await body(req);
    const from = clean(input.from, 80), to = clean(input.to, 80);
    if (!from || !to || typeof input.available !== 'boolean') return answer(res, 422, { error: 'Некорректный маршрут.' });
    await store.update(data => ({ ...data, routes: { ...data.routes, [`${from}->${to}`]: input.available } }));
    return answer(res, 200, { ok: true });
  }

  return answer(res, 404, { error: 'Не найдено.' });
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf', '.json': 'application/json; charset=utf-8' };

async function staticFile(req, res, url) {
  if ((url.pathname === '/admin' || url.pathname === '/admin.html' || url.searchParams.get('view') === 'admin') && !demandAdmin(req, res)) return;
  const requested = url.pathname === '/' || url.pathname === '/admin' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requested);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const contents = await fs.readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'cache-control': file.endsWith('.html') ? 'no-store' : 'public, max-age=3600' });
    res.end(contents);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Не найдено'); }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await staticFile(req, res, url);
  } catch (error) {
    console.error(error.message);
    answer(res, error.message === 'payload_too_large' ? 413 : 500, { error: 'Что-то пошло не так. Попробуй ещё раз.' });
  }
}).listen(port, () => console.log(`Лагерная почта: http://localhost:${port}`));
