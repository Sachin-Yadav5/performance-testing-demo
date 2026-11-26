// Clinic.js doctor ke binary processstat data se CPU (%) aur memory (RSS, MB) ka avg / peak nikalta hai.
const fs = require('fs');
const path = require('path');

const round = (n) => Math.round(n * 100) / 100;

async function readClinicMetrics(clinicDir) {
  if (!fs.existsSync(clinicDir)) return null;
  const dataDir = fs.readdirSync(clinicDir).find((f) => f.endsWith('.clinic-doctor') && fs.statSync(path.join(clinicDir, f)).isDirectory());
  if (!dataDir) return null;
  const statFile = path.join(clinicDir, dataDir, `${dataDir}-processstat`);
  if (!fs.existsSync(statFile)) return null;

  let Decoder;
  try {
    Decoder = require(require.resolve('@clinic/doctor/format/process-stat-decoder.js', { paths: [process.cwd() + '/.perf'] }));
  } catch (e) {
    console.error('Clinic decoder load nahi hua:', e.message);
    return null;
  }

  const rows = await new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(statFile)
      .pipe(new Decoder())
      .on('data', (d) => out.push(d))
      .on('end', () => resolve(out))
      .on('error', reject);
  }).catch((e) => {
    console.error('Clinic data parse error:', e.message);
    return [];
  });
  if (!rows.length) return null;

  const cpu = rows.map((r) => r.cpu * 100); // clinic cpu ko fraction me rakhta hai
  const mem = rows.map((r) => r.memory.rss / 1024 / 1024);
  const avg = (a) => a.reduce((t, v) => t + v, 0) / a.length;
  return {
    samples: rows.length,
    cpu: { avg: round(avg(cpu)), peak: round(Math.max(...cpu)) },
    memory: { avg: round(avg(mem)), peak: round(Math.max(...mem)) },
  };
}

module.exports = { readClinicMetrics };
