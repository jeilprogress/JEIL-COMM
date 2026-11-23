import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

const password = process.env.ADMIN_PASSWORD;
const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://api.github.com/repos/jeilprogress/JEIL-COMM/contents/commissions.json';
const digest = value => createHash('sha256').update(value).digest();
const fields = ['code', 'title', 'status', 'updated_at', 'note', 'x_link', 'telegram_link'];
let failures = 0;
let retryAt = 0;

async function github(method, data) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: data && JSON.stringify(data),
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 409) throw Object.assign(new Error(), { status: 409 });
  if (!response.ok) throw new Error('GitHub request failed');
  return response.json();
}

const page = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jeil’s Commission Admin</title>
<style>
:root{color-scheme:dark}body{margin:0;background:#111;color:#eee;font:16px system-ui}main{max-width:680px;margin:auto;padding:36px 20px}h1{font-weight:500}label{display:grid;gap:6px;margin:14px 0}input,select,textarea,button{font:inherit;padding:10px;color:inherit;background:#191919;border:1px solid #777;border-radius:4px}button{cursor:pointer;background:#eee;color:#111}textarea{min-height:90px}p{line-height:1.5}a{color:inherit}
</style>
<main><a href="https://jeilprogress.github.io/JEIL-COMM/">Public tracker</a><h1>Commission admin</h1>
<form id="login"><label>Admin password<input type="password" id="password" autocomplete="current-password" required></label><button>Sign in</button></form>
<section id="editor" hidden><label>Commission<select id="select"></select></label><form id="edit"><div id="fields"></div><button>Save to live tracker</button></form></section>
<p id="message" role="status"></p>
</main>
<script src="/admin.js" defer></script>`;

const script = `
const get = id => document.getElementById(id);
const fields = {
  code: 'Tracking code', title: 'Story title', status: 'Status', updated_at: 'Last updated',
  note: 'Public note', x_link: 'X link', telegram_link: 'Telegram link'
};
const inputs = {};
for (const [key, name] of Object.entries(fields)) {
  const label = document.createElement('label');
  label.textContent = name;
  const input = document.createElement(key === 'note' ? 'textarea' : 'input');
  if (key === 'updated_at') input.type = 'date';
  if (key.endsWith('_link')) input.type = 'url';
  input.required = key === 'code';
  label.append(input);
  get('fields').append(label);
  inputs[key] = input;
}
let password, state;
async function request(method, data) {
  const response = await fetch('/api/commissions', {
    method,
    headers: {'Content-Type': 'application/json', 'X-Admin-Password': encodeURIComponent(password)},
    body: data && JSON.stringify(data),
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}
function populate(index) {
  const select = get('select');
  select.replaceChildren(new Option('New commission', '-1'));
  state.commissions.forEach((record, position) => {
    select.append(new Option(record.code + ' · ' + (record.title || 'Untitled'), position));
  });
  select.value = String(index);
  fill();
}
function fill() {
  const record = state.commissions[Number(get('select').value)] || {};
  for (const key of Object.keys(inputs)) inputs[key].value = record[key] || '';
}
get('select').addEventListener('change', fill);
get('login').onsubmit = async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  get('message').textContent = 'Signing in…';
  password = get('password').value;
  try {
    state = await request('GET');
    get('password').value = '';
    get('login').hidden = true;
    get('editor').hidden = false;
    populate(state.commissions.length ? 0 : -1);
    get('message').textContent = '';
  } catch (error) {
    password = undefined;
    get('message').textContent = error.message;
  } finally { button.disabled = false; }
};
get('edit').onsubmit = async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  get('message').textContent = 'Saving…';
  const index = Number(get('select').value);
  const record = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
  try {
    state = await request('PUT', {sha: state.sha, index, record});
    populate(index === -1 ? state.commissions.length - 1 : index);
    get('message').textContent = 'Saved. GitHub Pages will publish the update shortly.';
  } catch (error) {
    get('message').textContent = error.message;
  } finally { button.disabled = false; }
};`;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'");
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  if (req.method === 'GET' && (req.url === '/' || req.url === '/admin/')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }
  if (req.method === 'GET' && req.url === '/admin.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    return res.end(script);
  }
  if (req.url !== '/api/commissions' || !['GET', 'PUT'].includes(req.method)) {
    return json(res, 404, { error: 'Page not found.' });
  }
  if (!token || !password || password.length < 16) {
    return json(res, 503, { error: 'Admin setup is pending in Render.' });
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: 'Access denied.' });
  if (Date.now() < retryAt) return json(res, 429, { error: 'Try again in a minute.' });
  let supplied = '';
  try { supplied = decodeURIComponent(req.headers['x-admin-password'] || ''); } catch {}
  if (!timingSafeEqual(digest(supplied), digest(password))) {
    if (++failures >= 8) {
      failures = 0;
      retryAt = Date.now() + 60000;
    }
    return json(res, 401, { error: 'Incorrect password.' });
  }
  failures = 0;

  try {
    let data;
    if (req.method === 'PUT') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16000) return json(res, 413, { error: 'This update is too large.' });
      }
      try { data = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid update.' }); }
    }
    const file = await github('GET');
    const document = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    const commissions = document.commissions;
    if (!Array.isArray(commissions)) throw new Error('Invalid tracker data');
    if (req.method === 'GET') return json(res, 200, { sha: file.sha, commissions });
    if (data?.sha !== file.sha) return json(res, 409, { error: 'The tracker changed since you opened it. Keep a copy of your changes, then reload before saving.' });
    if (!Number.isInteger(data.index) || data.index < -1 || data.index >= commissions.length ||
        !data.record || fields.some(key => typeof data.record[key] !== 'string' || data.record[key].length > 4000)) {
      return json(res, 400, { error: 'Invalid commission details.' });
    }
    const record = Object.fromEntries(fields.map(key => [key, data.record[key].trim()]));
    const match = record.code.match(/^AU-?(\d{1,6})$/i);
    if (!match) return json(res, 400, { error: 'Use a tracking code like AU-4.' });
    record.code = 'AU-' + Number(match[1]);
    if (commissions.some((item, i) => i !== data.index && Number(String(item.code).replace(/^AU-?/i, '')) === Number(match[1]))) {
      return json(res, 400, { error: 'This tracking code is already in use.' });
    }
    if (['x_link', 'telegram_link'].some(key => record[key] && !/^https?:\/\//i.test(record[key]))) {
      return json(res, 400, { error: 'Use full links beginning with https:// or http://.' });
    }
    if (!record.updated_at) record.updated_at = new Date().toISOString().slice(0, 10);
    if (data.index === -1) commissions.push(record);
    else commissions[data.index] = { ...commissions[data.index], ...record };
    const saved = await github('PUT', {
      branch: 'main', sha: file.sha, message: 'Update commission ' + record.code,
      content: Buffer.from(JSON.stringify(document, null, 2) + '\n').toString('base64')
    });
    return json(res, 200, { sha: saved.content.sha, commissions });
  } catch (error) {
    return error.status === 409
      ? json(res, 409, { error: 'Another edit was saved first. Reload the admin page and try again.' })
      : json(res, 502, { error: 'Could not access the tracker data on GitHub. Check the Render configuration and try again.' });
  }
}).listen(Number(process.env.PORT || 10000), '0.0.0.0');

