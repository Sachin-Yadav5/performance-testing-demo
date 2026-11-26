# PR Perf Test Pipeline (JMeter + Clinic.js + Slack)

## Flow
PR (label `perf-test`) → GitHub Actions → app Clinic.js ke under start → JMeter usi par load → analysis (thresholds) → job summary + 2 artifacts (jmeter-html-report, clinic-cpu-report) → Slack

## Setup (ek baar)
1. `.github/` aur `.perf/` folders repo me copy karo.
2. Repo secret banao: `SLACK_WEBHOOK_URL` (Slack Incoming Webhook).
3. (Optional) label `perf-test` banao.

## Developer kya kare
PR description me `perf` block add karo (template me example comment me hai). Block save hote hi test apne aap chalta hai, label ki zaroorat nahi (label `perf-test` optional hai: .perf/perf-test.yml file wale flow ke liye). Jitni APIs chahiye (default max 20, total users max 500; workflow env `PERF_MAX_APIS` / `PERF_MAX_TOTAL_USERS` se badlo).

```perf
- path: /api/products
  method: GET
  users: 50
  ramp_up: 10            # sec (default 10)
  duration: 60           # sec (5-600)
  max_avg_response_time: 300   # ms (default 500)
  max_error_rate: 1            # % (default 1)
  # optional: headers: {Authorization: "Bearer x"}, body: {...}
```
Block PR description me na ho to `.perf/perf-test.yml` file padhi jati hai.

## Start command
Auto-detect: Next.js → `next start`; baaki → `package.json` ka `scripts.start` (agar `node ...` se shuru ho) ya `main`.
Override karna ho to config me:
```yaml
app:
  start: node dist/server.js
apis:
  - path: /api/products
```
App `PORT` env var par listen kare (3000 default).

## Notes
- Threshold cross hone par ya config/run error par job fail hota hai aur Slack me ❌/⚠️ jata hai.
- Fork PRs me secrets nahi milte, Slack notification wahan skip hogi.
- DB/Redis jaisi dependencies chahiye to workflow me `services:` add karo.
