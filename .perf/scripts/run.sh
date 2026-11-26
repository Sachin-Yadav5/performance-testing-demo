#!/usr/bin/env bash
# App ko Clinic.js ke under start karta hai, port ready hone par JMeter load deta hai,
# phir Clinic ko SIGINT dekar band karta hai taaki wo profile report bana de.
# (Clinic ka --on-port naye Node versions par toot jata hai, isliye port khud poll karte hain.)
set -uo pipefail

OUT=.perf/out
export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-production}"
export NO_INSIGHT=1 NO_UPDATE_NOTIFIER=1   # clinic ka interactive analytics prompt CI me hang/exit karata hai
LOAD_SCRIPT="${LOAD_SCRIPT:-.perf/scripts/jmeter.sh}"
READY_TIMEOUT="${READY_TIMEOUT:-60}"

START_CMD=$(node -e "console.log(require('./$OUT/config.json').app.start)")
echo "Starting under Clinic.js: $START_CMD (PORT=$PORT)"

rm -rf "$OUT/jmeter-report" "$OUT/results.jtl" "$OUT/clinic"
mkdir -p "$OUT/clinic"

# $START_CMD jaan-boojhkar unquoted hai taaki "node server.js" alag args me tut jaye
.perf/node_modules/.bin/clinic doctor --dest "$OUT/clinic" -- $START_CMD > "$OUT/app.log" 2>&1 &
CLINIC_PID=$!

stop_clinic() {
  if kill -0 "$CLINIC_PID" 2>/dev/null; then
    kill -INT "$CLINIC_PID" 2>/dev/null || true
  fi
  wait "$CLINIC_PID" 2>/dev/null || true
}
trap stop_clinic EXIT

echo "Waiting for app on port $PORT (max ${READY_TIMEOUT}s)..."
ready=0
for _ in $(seq 1 "$READY_TIMEOUT"); do
  if ! kill -0 "$CLINIC_PID" 2>/dev/null; then break; fi
  if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then ready=1; break; fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "App port $PORT par ready nahi hui. App log:"
  tail -n 40 "$OUT/app.log" || true
  exit 1
fi

echo "App ready, load shuru..."
bash "$LOAD_SCRIPT"
LOAD_RC=$?

stop_clinic
trap - EXIT
echo "Clinic report generation done"
tail -n 5 "$OUT/app.log" || true

test -s "$OUT/results.jtl" || { echo "JMeter results nahi bane"; exit 1; }
exit "$LOAD_RC"
