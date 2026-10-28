# 0015 — HTTP-triggered background jobs for serverless hosting

Status: accepted · Date: 2026-10-28

Context: the price-alert sweep (and, with ADR 0013, SMS retries) and the booking expiry sweep run on
`setInterval` inside the API process. On Vercel's serverless runtime there is no long-lived process, so these
timers never fire reliably and triggered alerts would never be found or texted.

Decision:

- `GET /v1/jobs/price-alerts` and `GET /v1/jobs/expire-bookings` call the same service methods as the timers.
  They are public to the JWT guard, skip throttling, and are protected by `CronSecretGuard`, which requires
  `Authorization: Bearer <CRON_SECRET>` (timing-safe compare). With `CRON_SECRET` unset the routes answer 404.
  GET is used because that is all Vercel Cron sends.
- The web app's `vercel.json` schedules both paths daily through the existing `/api/*` rewrite, which forwards
  the header to the API wherever it runs. Daily is the most the Hobby plan allows; a scheduled GitHub Actions
  workflow calls the same paths every 15 minutes and is a no-op until `JOBS_BASE_URL` and `CRON_SECRET` exist.
- The in-process timers stay. Both sweeps claim work with conditional updates, so a scheduled call overlapping a
  timer cannot fire an alert or send an SMS twice.

Consequences: running on serverless needs one shared secret in the API, the web project and GitHub. GitHub's
scheduler can be late by several minutes under load, which is acceptable for alerts checked every 15 minutes.
On a Pro plan the Vercel schedule can replace the workflow.
