// GitHub Actions run page ke "Summary" tab ke liye markdown likhta hai ($GITHUB_STEP_SUMMARY).
const fs = require('fs');
const { SUMMARY_FILE, readJson } = require('./common');

const e = process.env;
const s = readJson(SUMMARY_FILE);
if (!s || !e.GITHUB_STEP_SUMMARY) process.exit(0);

const icon = { passed: '✅', failed: '❌', config_error: '⚠️', run_error: '⚠️' }[s.status] || '⚠️';
const md = [`## 🚀 API Performance Test Results ${icon} ${s.status.toUpperCase().replace('_', ' ')}`, ''];
if (s.message) md.push(`> ${s.message}`, '');

if (s.totals) {
  md.push(
    '### JMeter',
    `- Total Requests: ${s.totals.requests}`,
    `- Avg Response Time: ${s.totals.avg} ms`,
    `- Failed Requests: ${s.totals.failed}`,
    `- Error Rate: ${s.totals.errorRate}%`,
    ''
  );
}

if (s.apis && s.apis.length) {
  md.push('| | API | Users | Avg (limit) | p95 | Errors (limit) |', '|---|---|---|---|---|---|');
  for (const a of s.apis) {
    md.push(
      a.samples
        ? `| ${a.passed ? '✅' : '❌'} | \`${a.name}\` | ${a.users} | ${a.avg} ms (${a.limits.avg}) | ${a.p95} ms | ${a.errorRate}% (${a.limits.errorRate}%) |`
        : `| ❌ | \`${a.name}\` | ${a.users} | no requests | - | - |`
    );
  }
  md.push('');
}

if (s.clinic) {
  md.push(
    '### CPU Profiling',
    `- Average CPU Usage: ${s.clinic.cpu.avg}%`,
    `- Peak CPU Usage: ${s.clinic.cpu.peak}%`,
    '',
    '### Memory Profiling',
    `- Average Memory: ${s.clinic.memory.avg} MB`,
    `- Peak Memory: ${s.clinic.memory.peak} MB`,
    ''
  );
}

const links = [];
if (e.JMETER_ARTIFACT_URL) links.push(`- [JMeter HTML Report](${e.JMETER_ARTIFACT_URL})`);
if (e.CLINIC_ARTIFACT_URL) links.push(`- [Clinic.js Profiling Report](${e.CLINIC_ARTIFACT_URL})`);
if (links.length) md.push('### 📊 Reports', ...links, '');

fs.appendFileSync(e.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
console.log('Job summary written');
