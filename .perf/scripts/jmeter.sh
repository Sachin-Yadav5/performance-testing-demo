#!/usr/bin/env bash
# Clinic.js isko tab chalata hai jab app port par listen karne lage ($PORT set hota hai).
set -euo pipefail
OUT=.perf/out
jmeter -n \
  -t "$OUT/plan.jmx" \
  -l "$OUT/results.jtl" \
  -j "$OUT/jmeter.log" \
  -e -o "$OUT/jmeter-report" \
  -Jhost=localhost -Jport="$PORT"
