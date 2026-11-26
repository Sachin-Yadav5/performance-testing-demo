// Last step: thresholds cross hue ya koi error aaya to job ko fail karta hai (PR check red dikhe).
const { SUMMARY_FILE, readJson } = require('./common');

const s = readJson(SUMMARY_FILE);
if (!s || s.status !== 'passed') {
  console.error(`Perf test status: ${s ? s.status : 'no summary'}`);
  process.exit(1);
}
console.log('Perf test passed');
