// Slack par notification bhejta hai (job summary jaisa layout). SLACK_WEBHOOK_URL na ho to sirf print karta hai (dry run).
const { SUMMARY_FILE, readJson } = require('./common');

const e = process.env;
const s = readJson(SUMMARY_FILE) || { status: 'run_error', message: 'Pipeline ne summary nahi banayi; workflow logs dekho.', apis: [] };

const icon = { passed: '✅', failed: '❌', config_error: '⚠️', run_error: '⚠️' }[s.status] || '⚠️';
const label = { passed: 'PASSED', failed: 'FAILED', config_error: 'CONFIG ERROR', run_error: 'RUN ERROR' }[s.status] || s.status;
const clean = (t) => String(t || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const L = [`🚀 *API Performance Test Results* ${icon} *${label}*`, `<${e.PR_URL}|${e.REPO}#${e.PR_NUMBER}> ${clean(e.PR_TITLE)} (@${e.PR_AUTHOR})`, ''];
if (s.message) L.push(clean(s.message), '');

if (s.totals) {
  L.push(
    '*JMeter*',
    `• Total Requests: ${s.totals.requests}`,
    `• Avg Response Time: ${s.totals.avg} ms`,
    `• Failed Requests: ${s.totals.failed}`,
    `• Error Rate: ${s.totals.errorRate}%`,
    ''
  );
}
if (s.apis && s.apis.length) {
  const MAX_LINES = 10; // zyada APIs hon to Slack message lamba na ho: failed pehle, baaki "+N more"
  const sorted = [...s.apis].sort((x, y) => Number(x.passed) - Number(y.passed));
  for (const a of sorted.slice(0, MAX_LINES)) {
    L.push(
      a.samples
        ? `${a.passed ? '✅' : '❌'} \`${a.name}\` avg ${a.avg}ms (≤${a.limits.avg}) · p95 ${a.p95}ms · err ${a.errorRate}% (≤${a.limits.errorRate}%)`
        : `❌ \`${a.name}\` koi request nahi gayi`
    );
  }
  if (sorted.length > MAX_LINES) L.push(`_+${sorted.length - MAX_LINES} more APIs (details Job Summary me)_`);
  L.push('');
}
if (s.clinic) {
  L.push(
    '*CPU Profiling*',
    `• Average CPU Usage: ${s.clinic.cpu.avg}%`,
    `• Peak CPU Usage: ${s.clinic.cpu.peak}%`,
    '',
    '*Memory Profiling*',
    `• Average Memory: ${s.clinic.memory.avg} MB`,
    `• Peak Memory: ${s.clinic.memory.peak} MB`,
    ''
  );
}

const links = [];
if (e.JMETER_ARTIFACT_URL) links.push(`<${e.JMETER_ARTIFACT_URL}|JMeter HTML Report>`);
if (e.CLINIC_ARTIFACT_URL) links.push(`<${e.CLINIC_ARTIFACT_URL}|Clinic.js Profiling Report>`);
links.push(`<${e.RUN_URL}|Workflow run>`);
L.push('📊 ' + links.join('  |  '));
const text = L.join('\n');

(async () => {
  if (!e.SLACK_WEBHOOK_URL) {
    console.log('SLACK_WEBHOOK_URL set nahi hai, dry run:\n' + text);
    return;
  }
  const res = await fetch(e.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) console.error(`Slack failed: ${res.status} ${await res.text()}`);
  else console.log('Slack notified');
})().catch((err) => console.error('Slack error:', err.message)); // notification fail hone par job fail nahi hoga
