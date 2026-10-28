# 0013 — Price alerts are delivered by SMS, with retries and a visible status

Status: accepted · Date: 2026-10-28

Context: a price alert that reached its target only changed its status in the dashboard. The service did call
`sendNotification`, but the Melipayamak provider skipped every text unless a dedicated line (`MELIPAYAMAK_FROM`)
was set, failures were swallowed, and nothing recorded whether the traveller was told. Iranian operators also
filter free-text messages from shared lines, so a dedicated line alone is unreliable.

Decision:

- `SmsProvider.sendPriceAlert(mobile, { route, date, price })` replaces the free-text `sendNotification`. Melipayamak
  sends it through an approved pattern (`MELIPAYAMAK_ALERT_BODY_ID`, three variables in the order route, date,
  price) when one exists, otherwise as free text from `MELIPAYAMAK_FROM`, otherwise returns `SKIPPED` and boot logs
  a warning. The console provider logs the text.
- The alert stores the delivery: `smsStatus` (`PENDING`, `SENT`, `FAILED`, `SKIPPED`), `smsAttempts`, `smsClaimedAt`,
  `smsSentAt` and `smsLastError` (support only, never in the API). The trigger write claims the first attempt, so
  two sweeps that see the same fare still send one text.
- The 15-minute watcher retries `FAILED` attempts, and `PENDING` ones older than a 10-minute lease (their process
  died), up to `MAX_ALERT_SMS_ATTEMPTS` (3), within 24 hours of the trigger and before the flight date. Each retry
  claims with a conditional update on the state it read; the outcome is written only for that same attempt, so a
  re-armed or deleted alert never receives a stale result.
- Re-arming an alert resets the SMS fields. The dashboard shows "sent", "sending" or "not delivered" on a fired
  alert; `SKIPPED` shows nothing.
- An SMS failure never fails creating, updating or sweeping an alert.

Consequences: production needs the alert pattern approved in the Melipayamak console (suggested text:
`پرواز پلاس: بلیت {0} برای {1} به {2} رسید. برای خرید وارد سایت شوید.`) and its id in
`MELIPAYAMAK_ALERT_BODY_ID`. Each sent alert costs one SMS. There is no per-user opt-out yet; alerts are created by
the traveller and deleting the alert stops the texts.
