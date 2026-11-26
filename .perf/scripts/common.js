const fs = require('fs');
const path = require('path');

const OUT = path.join('.perf', 'out');
const CONFIG_FILE = path.join(OUT, 'config.json');
const SUMMARY_FILE = path.join(OUT, 'summary.json');

const readJson = (f, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};

const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2));
};

const setOutput = (key, value) => {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { OUT, CONFIG_FILE, SUMMARY_FILE, readJson, writeJson, setOutput, escapeHtml };
