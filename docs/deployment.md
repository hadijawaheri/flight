# انتشار: GitHub، Vercel و سرور

معماری: مرورگر فقط با `/api/*` روی دامنه‌ی وب حرف می‌زند و Next آن را به API می‌فرستد (`NEXT_PUBLIC_API_URL`، یا `INTERNAL_API_URL` روی سرور). پس وب می‌تواند روی Vercel باشد، به شرط اینکه API یک آدرس عمومی **HTTPS** داشته باشد.

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
5. هر مقدار سرور (IP، کلید SSH) اکنون از env خوانده می‌شود: `SERVER_HOST`، `SERVER_PORT`، `SERVER_USER`، `SERVER_KEY`، `LIVE_URL`، و برای Worker متغیر `ORIGIN_URL`. هیچ‌کدام را commit نکنید.

## ۲. API روی سرور (پیش‌نیاز Vercel)

- API با PM2 روی سرور اجرا می‌شود (`infra/ecosystem.config.cjs`). برای Vercel باید از بیرون با HTTPS در دسترس باشد: یک دامنه (یا زیردامنه) روی سرور، Caddy با `reverse_proxy 127.0.0.1:7791` برای `api.<domain>`، سپس `https://api.<domain>/health` را بزنید.
- در `apps/api/.env` سرور: `JWT_ACCESS_SECRET` و `OTP_HMAC_SECRET` تصادفی (`openssl rand -base64 48`)، `DATABASE_URL` به Mongo با replica set، `ALLOW_DEV_AUTH=false` و `OTP_FIXED_CODE` خالی برای سایت عمومی.
- **هشدار:** `ALLOW_DEV_AUTH` حالا فقط در `apps/api/.env` تعیین می‌شود (اگر نباشد، `deploy.sh` برای حفظ رفتار قبلی `true` اضافه می‌کند). برای سایت عمومی: `SMS_PROVIDER=melipayamak` با `MELIPAYAMAK_API_KEY` و `MELIPAYAMAK_OTP_BODY_ID` (الگوی تأییدشده با یک متغیر برای کد)، `OTP_FIXED_CODE` خالی، `ALLOW_DEV_AUTH=false` و تا وصل شدن درگاه واقعی `ALLOW_SIMULATED_PAYMENTS=true`. سپس `pm2 startOrReload infra/ecosystem.config.cjs --update-env`.

## ۳. Vercel (وب)

1. Vercel → Add New Project → ریپو را انتخاب کنید.
2. **Root Directory**: `apps/web` و گزینه‌ی «Include source files outside of the Root Directory» روشن بماند. دستورهای install/build در `apps/web/vercel.json` آمده‌اند.
3. Node.js Version: **24.x** (پروژه `engines.node >= 24` می‌خواهد).
4. Environment Variables (هم Build هم Runtime):
   - `NEXT_PUBLIC_API_URL` = `https://api.<domain>` (بدون `/` پایانی و بدون `/v1`؛ اگر نباشد بیلد عمداً خطا می‌دهد)
   - `NEXT_PUBLIC_SITE_URL` = آدرس نهایی سایت
5. Deploy. بعد از آن `/api/health` و ورود را روی آدرس Vercel امتحان کنید.
6. چون rewrite در زمان build ثبت می‌شود، با تغییر `NEXT_PUBLIC_API_URL` باید دوباره Deploy کنید.

### CORS برای دامنه‌های Vercel

مرورگر از طریق `/api/*` همان دامنه‌ی وب حرف می‌زند، پس CORS خط دفاع دوم است. در `apps/api/.env` سرور:

```
CORS_ORIGINS=https://<domain>,https://flysmart-*-<team-slug>.vercel.app
```

`*` فقط یک بخش از نام میزبان را می‌پوشاند. الگوهای خیلی باز مثل `*` یا `https://*.vercel.app` هنگام بوت رد می‌شوند. سپس `pm2 startOrReload infra/ecosystem.config.cjs --update-env`.

### تست محلی قبل از انتشار

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm test

# بکند (نیاز به MongoDB replica set و apps/api/.env؛ از apps/api/.env.example کپی کنید)
pnpm build:backend && pnpm start:backend          # http://127.0.0.1:7781/health

# فرانت مثل Vercel: بدون دیتابیس و بدون اجرای بکند، فقط با آدرس API
VERCEL=1 NEXT_PUBLIC_API_URL=https://api.example.com NEXT_PUBLIC_SITE_URL=http://localhost:7782 pnpm build:frontend
cd apps/web && npx next start -p 7782

# CORS: باید Access-Control-Allow-Origin برگردد
curl -si -H "Origin: https://flysmart-abc-<team-slug>.vercel.app" http://127.0.0.1:7781/health | grep -i access-control
```

### برگرداندن به حالت قبل

پیش از این تغییر، برنچ `backup/pre-vercel-split` از `main` ساخته شد: `git fetch origin && git checkout backup/pre-vercel-split` (یا `git reset --hard origin/backup/pre-vercel-split` روی `main`، که تاریخچه را بازنویسی می‌کند و فقط با اطمینان بزنید). تصمیم معماری در `docs/adr/0011-frontend-on-vercel-backend-on-vps.md` است.

### ریسک‌ها

- محدودیت نرخ (throttle) روی IP است و بین Vercel و API ممکن است IP خود Vercel دیده شود؛ بعد از اولین انتشار بررسی کنید.

- دسترسی از ایران: GitHub و Vercel هر دو شرکت آمریکایی‌اند و تحریم‌ها ممکن است حساب یا دسترسی را محدود کنند؛ از طرف Vercel سند رسمی روشنی که بگوید دسترسی بازدیدکنندگان ایرانی محدود است پیدا نشد (فقط گزارش کاربران). حتماً از داخل ایران و بدون VPN تست کنید. اگر دسترسی مشکل داشت، همان مسیر قبلی (سرور + Caddy، یا Cloudflare Worker) را نگه دارید.
- پرواز و پرداخت شبیه‌سازی‌اند؛ سایت را «نسخه‌ی نمایشی» معرفی کنید.
