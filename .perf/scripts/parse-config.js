// PR description ke ```perf block se (ya .perf/perf-test.yml se) config padhta hai, validate karta hai.
const fs = require('fs');
const yaml = require('js-yaml');
const { CONFIG_FILE, SUMMARY_FILE, writeJson, setOutput } = require('./common');

const MAX_APIS = Number(process.env.PERF_MAX_APIS || 20);
const MAX_TOTAL_USERS = Number(process.env.PERF_MAX_TOTAL_USERS || 500); // sab APIs parallel chalti hain, isliye total load cap
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DEFAULTS = { users: 10, duration: 60, max_avg_response_time: 500, max_error_rate: 1 };

function fail(message) {
  console.error('Config error:', message);
  writeJson(SUMMARY_FILE, { status: 'config_error', message, apis: [] });
  setOutput('valid', 'false');
  process.exit(0); // job aage notify tak jayega, final step fail karega
}

function readRaw() {
  const body = (process.env.PR_BODY || '').replace(/<!--[\s\S]*?-->/g, ''); // template ke commented example ignore
  const m = body.match(/```perf[^\n]*\n([\s\S]*?)```/);
  if (m) return { raw: m[1], source: 'PR description' };
  if (fs.existsSync('.perf/perf-test.yml')) {
    return { raw: fs.readFileSync('.perf/perf-test.yml', 'utf8'), source: '.perf/perf-test.yml' };
  }
  return null;
}

function detectApp() {
  let pkg = {};
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return { start: 'node node_modules/next/dist/bin/next start', type: 'next' };
  const s = (pkg.scripts && pkg.scripts.start) || '';
  if (/^node\s+\S+/.test(s) && !/[&|;]/.test(s)) return { start: s.trim(), type: 'node' };
  if (pkg.main) return { start: `node ${pkg.main}`, type: 'node' };
  return { start: 'node index.js', type: 'node' };
}

const found = readRaw();
if (!found && process.env.HAS_LABEL !== 'true') {
  // Na block, na label: is PR me perf test nahi chahiye, chupchap skip
  console.log('Perf config nahi mila aur label bhi nahi; skip.');
  setOutput('skip', 'true');
  setOutput('valid', 'false');
  process.exit(0);
}
if (!found) fail('Perf config nahi mila. PR description me ```perf block do ya .perf/perf-test.yml banao.');

let parsed;
try {
  parsed = yaml.load(found.raw);
} catch (e) {
  fail(`YAML parse nahi hua: ${e.message.split('\n')[0]}`);
}

const list = Array.isArray(parsed) ? parsed : parsed && parsed.apis;
const appOverride = (!Array.isArray(parsed) && parsed && parsed.app) || {};
if (!Array.isArray(list) || list.length === 0) fail('Kam se kam 1 API chahiye.');
if (list.length > MAX_APIS) fail(`Max ${MAX_APIS} APIs allowed hain, ${list.length} mili.`);

const apis = [];
const seen = new Set();
list.forEach((raw, i) => {
  const a = raw || {};
  const n = `API #${i + 1}`;
  const method = String(a.method || 'GET').toUpperCase();
  if (typeof a.path !== 'string' || !a.path.startsWith('/')) fail(`${n}: path "/" se start hona chahiye.`);
  if (!METHODS.includes(method)) fail(`${n}: method ${method} supported nahi hai.`);

  const users = Number(a.users ?? DEFAULTS.users);
  const duration = Number(a.duration ?? DEFAULTS.duration);
  const rampUp = Number(a.ramp_up ?? Math.min(10, duration));
  if (!Number.isInteger(users) || users < 1 || users > 500) fail(`${n}: users 1-500 ke beech hona chahiye.`);
  if (!Number.isFinite(duration) || duration < 5 || duration > 600) fail(`${n}: duration 5-600 sec ke beech hona chahiye.`);
  if (!Number.isFinite(rampUp) || rampUp < 0 || rampUp > duration) fail(`${n}: ramp_up 0 se duration ke beech hona chahiye.`);

  const name = `${method} ${a.path}`;
  if (seen.has(name)) fail(`${n}: "${name}" duplicate hai.`);
  seen.add(name);

  const headers = { ...(a.headers || {}) };
  let body = null;
  if (a.body !== undefined && a.body !== null) {
    body = typeof a.body === 'string' ? a.body : JSON.stringify(a.body);
    if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
  }

  apis.push({
    name,
    path: a.path,
    method,
    users,
    duration,
    ramp_up: rampUp,
    headers,
    body,
    max_avg_response_time: Number(a.max_avg_response_time ?? DEFAULTS.max_avg_response_time),
    max_error_rate: Number(a.max_error_rate ?? DEFAULTS.max_error_rate),
  });
});

const totalUsers = apis.reduce((t, a) => t + a.users, 0);
if (totalUsers > MAX_TOTAL_USERS) fail(`Total users ${totalUsers} hain, limit ${MAX_TOTAL_USERS} hai (sab APIs parallel chalti hain). Users kam karo.`);

const detected = detectApp();
const app = { ...detected, ...appOverride, port: Number(process.env.PORT || 3000) };

writeJson(CONFIG_FILE, { source: found.source, app, apis });
setOutput('valid', 'true');
console.log(`Config OK (${found.source}): ${apis.map((a) => a.name).join(', ')}`);
console.log(`App start command: ${app.start}`);
