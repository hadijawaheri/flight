# انتشار: GitHub و سرور (PM2 + Caddy)

طبق بند ۱۳ سند Blueprint، استقرار روی یک سرور با **PM2 + Caddy** و بدون Docker انجام می‌شود:

```text
Internet → Caddy (:80/:443، TLS خودکار) → web (127.0.0.1:7782) → rewrite /api/* → api (127.0.0.1:7781) → MongoDB
```

فقط Caddy عمومی است. API و web فقط روی loopback گوش می‌دهند.

## ۱. GitHub (ریپوی خصوصی)

1. در GitHub یک ریپوی **Private** بسازید (بدون README).
2. در پوشه‌ی پروژه:
   ```bash
   git init -b main
   git add .
   git status        # باید .env، deploy_key، node_modules و dist در لیست نباشند
   git commit -m "feat: initial import of FlySmart"
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. commitlint و husky فعال‌اند؛ پیام commit باید `feat:`، `fix:`، `chore:` … باشد.
4. CI (`.github/workflows/ci.yml`) خودش روی push اجرا می‌شود: typecheck، lint، test، build و Playwright. نیاز به secret ندارد.
5. مقدار سرور (IP، کلید SSH) از env خوانده می‌شود: `SERVER_HOST`، `SERVER_PORT`، `SERVER_USER`، `SERVER_KEY`، `LIVE_URL`، و برای Worker متغیر `ORIGIN_URL`. هیچ‌کدام را commit نکنید.

## ۲. سرور

- Node (نسخه `.nvmrc`)، corepack، MongoDB با replica set، و Caddy از مخزن رسمی نصب شود.
- یک کاربر غیر-root برای PM2 بسازید. فایروال فقط پورت‌های ۸۰، ۴۴۳ و SSH را باز بگذارد (`scripts/harden-server.sh`).
- Caddy: `infra/Caddyfile` را با دامنه‌ی واقعی `SITE_ADDRESS` کپی کنید؛ Caddy گواهی TLS را خودکار می‌گیرد.
- `apps/api/.env` سرور: `JWT_ACCESS_SECRET` و `OTP_HMAC_SECRET` تصادفی (`openssl rand -base64 48`)، `DATABASE_URL` به Mongo با replica set، `ALLOW_DEV_AUTH=false` و `OTP_FIXED_CODE` خالی.
- برای سایت عمومی: `SMS_PROVIDER=melipayamak` با `MELIPAYAMAK_API_KEY` و `MELIPAYAMAK_OTP_BODY_ID`، و تا وصل شدن درگاه واقعی `ALLOW_SIMULATED_PAYMENTS=true`.
- هشدار: `ALLOW_DEV_AUTH` فقط در `apps/api/.env` تعیین می‌شود. اگر نباشد، `deploy.sh` برای حفظ رفتار قبلی `true` اضافه می‌کند.
- استقرار: `./scripts/deploy.sh` را از ریشه‌ی ریپو اجرا کنید. این اسکریپت install، build، migration (`pnpm --filter @flysmart/api migrate`) و سپس `pm2 reload` را انجام می‌دهد.
- بعد از استقرار `https://<domain>/api/health` را بزنید.

## ۳. نکته‌ها

- پرواز و پرداخت در این نسخه شبیه‌سازی‌اند؛ سایت را «نسخه‌ی نمایشی» معرفی کنید.
- بکاپ MongoDB با `scripts/backup-mongo.sh` و تست بازیابی دوره‌ای الزامی است.
