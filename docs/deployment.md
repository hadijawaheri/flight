# انتشار: GitHub، Vercel و سرور

معماری: مرورگر فقط با `/api/*` روی دامنه‌ی وب حرف می‌زند و Next آن را به API می‌فرستد (`INTERNAL_API_URL`). پس وب می‌تواند روی Vercel باشد، به شرط اینکه API یک آدرس عمومی **HTTPS** داشته باشد.

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
- در `apps/api/.env` سرور: `JWT_ACCESS_SECRET` و `OTP_HMAC_SECRET` تصادفی (`openssl rand -base64 48`)، `PII_ENCRYPTION_KEY` تصادفی (`openssl rand -base64 32`؛ بدون آن migrate و API بالا نمی‌آیند، و اگر گم شود کد ملی و گذرنامه‌های ذخیره‌شده خواندنی نیستند، پس جای امنی جدا از سرور هم نگهش دارید)، `DATABASE_URL` به Mongo با replica set، `ALLOW_DEV_AUTH=false` و `OTP_FIXED_CODE` خالی برای سایت عمومی.
- **هشدار:** `ALLOW_DEV_AUTH` حالا فقط در `apps/api/.env` تعیین می‌شود (اگر نباشد، `deploy.sh` برای حفظ رفتار قبلی `true` اضافه می‌کند). برای سایت عمومی: `SMS_PROVIDER=melipayamak` با `MELIPAYAMAK_API_KEY` و `MELIPAYAMAK_OTP_BODY_ID` (الگوی تأییدشده با یک متغیر برای کد)، `MELIPAYAMAK_ALERT_BODY_ID` برای پیامک هشدار قیمت (الگوی تأییدشده با سه متغیر به ترتیب مسیر، تاریخ و قیمت؛ متن پیشنهادی: «پرواز پلاس: بلیت {0} برای {1} به {2} رسید. برای خرید وارد سایت شوید.»؛ بدون آن هشدار فقط در داشبورد دیده می‌شود)، `OTP_FIXED_CODE` خالی، `ALLOW_DEV_AUTH=false` و تا وصل شدن درگاه واقعی `ALLOW_SIMULATED_PAYMENTS=true`. سپس `pm2 startOrReload infra/ecosystem.config.cjs --update-env`.

## ۳. Vercel (وب)

1. Vercel → Add New Project → ریپو را انتخاب کنید.
2. **Root Directory**: `apps/web` و گزینه‌ی «Include source files outside of the Root Directory» روشن بماند. دستورهای install/build در `apps/web/vercel.json` آمده‌اند.
3. Node.js Version: **24.x** (پروژه `engines.node >= 24` می‌خواهد).
4. Environment Variables (هم Build هم Runtime):
   - `INTERNAL_API_URL` = `https://api.<domain>`
   - `NEXT_PUBLIC_SITE_URL` = آدرس نهایی سایت
5. Deploy. بعد از آن `/api/health` و ورود را روی آدرس Vercel امتحان کنید.
6. چون rewrite در زمان build ثبت می‌شود، با تغییر `INTERNAL_API_URL` باید دوباره Deploy کنید.

### زمان‌بندی کارهای پس‌زمینه (هشدار قیمت، تلاش دوباره‌ی پیامک، انقضای رزرو)

تایمرهای داخل API فقط وقتی کار می‌کنند که API یک پردازش دائمی داشته باشد (PM2). اگر API روی Vercel (serverless) اجرا شود، این کارها با درخواست HTTP به `/api/jobs/price-alerts` و `/api/jobs/expire-bookings` اجرا می‌شوند:

1. یک مقدار تصادفی بسازید (`openssl rand -hex 32`) و همان را در سه جا بگذارید: `CRON_SECRET` در Environment Variables پروژه‌ی API، `CRON_SECRET` در پروژه‌ی وب روی Vercel، و GitHub → Settings → Secrets and variables → Actions → Secret به نام `CRON_SECRET`.
2. در همان صفحه‌ی GitHub یک Variable به نام `JOBS_BASE_URL` با آدرس سایت (مثلاً `https://flysmart.vercel.app`) بسازید.
3. `apps/web/vercel.json` روزی یک‌بار هر دو مسیر را صدا می‌زند (پلن رایگان Vercel بیشتر از این اجازه نمی‌دهد). اجرای هر ۱۵ دقیقه با `.github/workflows/scheduled-jobs.yml` انجام می‌شود. در پلن Pro می‌توانید زمان‌بندی `vercel.json` را `*/15 * * * *` کنید و workflow را حذف کنید.

بدون `CRON_SECRET` این مسیرها ۴۰۴ می‌دهند و workflow کاری نمی‌کند. اجرای هم‌زمان تایمر و زمان‌بند مشکلی ندارد، چون هر هشدار و هر پیامک با یک به‌روزرسانی شرطی برداشته می‌شود.

### ریسک‌ها

- دسترسی از ایران: GitHub و Vercel هر دو شرکت آمریکایی‌اند و تحریم‌ها ممکن است حساب یا دسترسی را محدود کنند؛ از طرف Vercel سند رسمی روشنی که بگوید دسترسی بازدیدکنندگان ایرانی محدود است پیدا نشد (فقط گزارش کاربران). حتماً از داخل ایران و بدون VPN تست کنید. اگر دسترسی مشکل داشت، همان مسیر قبلی (سرور + Caddy، یا Cloudflare Worker) را نگه دارید.
- پرواز و پرداخت شبیه‌سازی‌اند؛ سایت را «نسخه‌ی نمایشی» معرفی کنید.
