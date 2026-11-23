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
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0a0a0a"><meta name="robots" content="noindex">
<title>Jeil’s Commission Studio | Admin</title>
<style>
:root{--bg:#0a0a0a;--panel:#151515;--line:#353535;--fg:#fafafa;--muted:#999;--sub:#1e1e1e}
*{box-sizing:border-box}body{background:var(--bg);color:var(--fg);font-family:Arial,Helvetica,sans-serif;margin:0;font-size:14px}button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--fg);outline-offset:3px}button:disabled{opacity:.45;cursor:not-allowed}
.wrap{max-width:1230px;margin:0 auto;padding:0 30px}.head{padding:30px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);gap:20px}.brand{font-size:13px;letter-spacing:.17em;font-weight:700}.brand span{display:block;margin-top:8px;font-size:10px;color:var(--muted);font-weight:400;letter-spacing:.12em}.right-head{font-size:11px;color:var(--muted);letter-spacing:.07em}
.hero{padding:64px 0 35px;border-bottom:1px solid var(--line)}.tag{font-size:11px;letter-spacing:.17em;color:var(--muted);text-transform:uppercase}.hero h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(42px,5vw,72px);font-weight:400;line-height:1.1;letter-spacing:-.055em;margin:18px 0 18px}.hero p{line-height:1.85;color:var(--muted);max-width:680px;font-size:13px}.warn{border-left:2px solid white;padding:13px 18px;margin:25px 0 0;background:var(--panel);max-width:900px;color:#eaeaea;font-size:12px;line-height:1.85}.warn strong{color:white}
.actions{padding:25px 0;display:flex;gap:11px;flex-wrap:wrap;align-items:center}.btn{border:1px solid var(--line);color:var(--fg);background:transparent;padding:13px 18px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;font-size:10px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:45px;transition:background .2s,color .2s}.btn:hover{border-color:var(--fg);background:var(--sub)}.btn.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}.btn.primary:hover{opacity:.85}.btn.danger:hover{background:#333}.file-input{position:absolute;left:-10000px}.upload-label{cursor:pointer}.tiny{font-size:11px;color:var(--muted);line-height:1.7}.actions .tiny{margin-left:auto}.grid{display:grid;grid-template-columns:1fr 1.18fr;gap:26px;padding:0 0 65px}.panel{background:var(--panel);border:1px solid var(--line)}.panel-header{border-bottom:1px solid var(--line);padding:24px 25px;display:flex;gap:10px;align-items:center;justify-content:space-between}.panel h2{font-size:17px;font-weight:500;margin:0}.pill{font-size:10px;color:var(--muted);letter-spacing:.11em}.records{padding:14px;max-height:610px;overflow:auto}.record{background:transparent;color:var(--fg);border:1px solid transparent;border-bottom-color:var(--line);padding:18px;display:flex;justify-content:space-between;text-align:left;width:100%;align-items:center;gap:15px;transition:background .2s}.record:hover,.record.selected{background:var(--sub);border-color:var(--line)}.record .code{font-size:18px;font-weight:600;letter-spacing:-.025em}.record .title{color:var(--muted);font-size:11px;margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}.record .status{font-size:10px;white-space:nowrap;color:#ddd;border:1px solid var(--line);padding:8px 9px}.no-records{color:var(--muted);padding:30px 18px;font-size:12px;line-height:1.7}.form-area{padding:25px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}.field.full{grid-column:1/-1}.field label{color:#c5c5c5;font-size:11px;letter-spacing:.06em}.field input,.field select,.field textarea{background:#0e0e0e;color:var(--fg);border:1px solid var(--line);padding:14px 15px;width:100%;border-radius:0;font-size:13px}.field textarea{height:100px;resize:vertical;line-height:1.55}.form-actions{border-top:1px solid var(--line);padding-top:22px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.feedback{font-size:12px;color:#bbb;min-height:20px;padding:0 0 16px}.preview{font-size:11px;color:var(--muted);margin:0 0 8px}.foot{color:var(--muted);border-top:1px solid var(--line);padding:25px 0 40px;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
@media(max-width:900px){.grid{grid-template-columns:1fr}.records{max-height:380px}.actions .tiny{flex-basis:100%;margin-left:0}}@media(max-width:600px){.wrap{padding:0 18px}.head{align-items:start}.right-head{display:none}.hero{padding:45px 0 27px}.form-grid{grid-template-columns:1fr}.form-area{padding:20px}.panel-header{padding:20px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}

:root{color-scheme:dark}.brand-lockup{display:flex;align-items:center;gap:14px}.mark{display:grid;place-items:center;width:37px;height:37px;border:1px solid var(--line)}.mark svg{width:20px;height:20px}.head a{color:var(--fg);text-decoration:none}.head a:hover{text-decoration:underline}.hero em{font-weight:400}.hero p{margin-bottom:0}.login-card{max-width:450px;margin:30px 0 55px}.login-card form{padding:25px}.login-card .btn{width:100%}.feedback{min-height:0;padding:0;margin:14px 0 0}.feedback:empty{display:none}.record>span:first-child{display:grid;min-width:0}.record .status{white-space:normal;text-align:center}.panel-header .btn{margin-left:auto;white-space:nowrap}.workspace-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:22px 0}.workspace-actions p{margin:0}.form-actions .feedback{margin:0;flex-basis:100%}.grid{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}@media(max-width:900px){.grid{grid-template-columns:minmax(0,1fr)}}@media(max-width:600px){.brand{letter-spacing:.11em}.head{align-items:center}.head a{font-size:11px}.panel-header .btn{padding:10px}.record .title{max-width:100%}}
</style></head>
<body><main class="wrap">
<header class="head"><div class="brand-lockup"><div class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20l4-.9L20 7a2 2 0 0 0-3-3L4.9 16 4 20Zm11-14 3 3"/></svg></div><div class="brand">JEIL COMM.<span>COMMISSION STUDIO</span></div></div><a href="https://jeilprogress.github.io/JEIL-COMM/">Public tracker ↗</a></header>
<section class="hero"><div class="tag">Private workspace</div><h1 id="heroTitle">Welcome <em>back.</em></h1><p id="heroCopy">Sign in to manage your commissioned AUs.</p></section>
<section id="loginPanel" class="panel login-card"><div class="panel-header"><h2>Admin sign-in</h2></div><form id="login"><div class="field"><label for="password">Admin password</label><input type="password" id="password" autocomplete="current-password" required></div><button class="btn primary">Sign in →</button><p id="loginMessage" class="feedback" role="status"></p></form></section>
<section id="editor" hidden><div class="workspace-actions"><p class="tiny">Updates publish to the public tracker after you save.</p><button class="btn" id="logout" type="button">Sign out</button></div>
<div class="grid"><section class="panel"><div class="panel-header"><h2>Commissions <span class="pill" id="count"></span></h2><button class="btn" id="add" type="button">+ New commission</button></div><div class="records" id="records" aria-label="Commissions"></div></section>
<section class="panel"><div class="panel-header"><h2 id="editTitle">Edit commission</h2></div><form class="form-area" id="edit"><div class="form-grid" id="fields"></div><div class="form-actions"><button class="btn primary">Save to live tracker →</button><p id="message" class="feedback" role="status"></p></div></form></section></div></section>
<footer class="foot">Jeil Comm. · Commission Studio</footer>
</main><script src="/admin.js" defer></script></body></html>`;

const script = `
const get = id => document.getElementById(id);
const fields = {
  code: 'Tracking code', title: 'Story title', status: 'Status', updated_at: 'Last updated',
  note: 'Public note', x_link: 'X link', telegram_link: 'Telegram link'
};
const inputs = {};
for (const [key, name] of Object.entries(fields)) {
  const field = document.createElement('div');
  field.className = ['title', 'note'].includes(key) ? 'field full' : 'field';
  const label = document.createElement('label');
  label.htmlFor = 'field-' + key;
  label.textContent = name;
  const input = document.createElement(key === 'note' ? 'textarea' : 'input');
  if (key === 'updated_at') input.type = 'date';
  if (key.endsWith('_link')) input.type = 'url';
  input.required = key === 'code';
  input.id = label.htmlFor;
  input.maxLength = 4000;
  field.append(label, input);
  get('fields').append(field);
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
let selected = -1;
function populate(index) {
  selected = index;
  const list = get('records');
  list.replaceChildren();
  get('count').textContent = '(' + state.commissions.length + ')';
  if (!state.commissions.length) {
    const empty = document.createElement('p');
    empty.className = 'no-records';
    empty.textContent = 'No commissions yet. Add your first one to get started.';
    list.append(empty);
  }
  state.commissions.forEach((record, position) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'record' + (position === index ? ' selected' : '');
    button.setAttribute('aria-pressed', String(position === index));
    const identity = document.createElement('span');
    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = record.code;
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = record.title || 'Untitled';
    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = record.status || 'Pending';
    identity.append(code, title);
    button.append(identity, status);
    button.onclick = () => {
      get('message').textContent = '';
      populate(position);
      list.children[position].focus();
    };
    list.append(button);
  });
  const record = state.commissions[index] || {};
  get('editTitle').textContent = index === -1 ? 'New commission' : 'Edit ' + record.code;
  for (const key of Object.keys(inputs)) inputs[key].value = record[key] || '';
}
get('add').onclick = () => {
  get('message').textContent = '';
  populate(-1);
  inputs.code.focus();
};
get('logout').onclick = () => location.reload();
get('login').onsubmit = async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  get('loginMessage').textContent = 'Signing in…';
  password = get('password').value;
  try {
    state = await request('GET');
    get('password').value = '';
    get('loginPanel').hidden = true;
    get('heroTitle').innerHTML = 'Manage the <em>stories.</em>';
    get('heroCopy').textContent = 'Add commissions, update their status, and share story links.';
    get('editor').hidden = false;
    populate(state.commissions.length ? 0 : -1);
    get('editTitle').tabIndex = -1;
    get('editTitle').focus();
  } catch (error) {
    password = undefined;
    get('loginMessage').textContent = error.message;
  } finally { button.disabled = false; }
};
get('edit').onsubmit = async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  get('message').textContent = 'Saving…';
  const editor = get('editor');
  editor.inert = true;
  const index = selected;
  const record = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
  try {
    state = await request('PUT', {sha: state.sha, index, record});
    populate(index === -1 ? state.commissions.length - 1 : index);
    get('message').textContent = 'Saved. GitHub Pages will publish the update shortly.';
  } catch (error) {
    get('message').textContent = error.message;
  } finally { editor.inert = false; button.disabled = false; button.focus(); }
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


