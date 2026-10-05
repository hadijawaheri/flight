# پرواز پلاس (FlySmart)

سایت خرید بلیت هواپیما با دو نوآوری اصلی:

- **تحلیل قیمت**: برای هر پرواز، تاریخچه‌ی قیمت، روند، پیش‌بینی یک‌هفته‌ای و توصیه‌ی «همین حالا بخر / صبر کن» همراه با دلیل و میزان اطمینان نشان داده می‌شود.
- **دستیار هوش مصنوعی آگاه به قوانین پرواز**: پایگاه دانش ساختاریافته‌ی قوانین بار، مایعات، باتری، استرداد، مدارک، فرودگاه‌ها و… به‌علاوه‌ی ابزارهای محاسبه‌گر؛ با Claude API کار می‌کند و بدون کلید API هم در حالت آفلاین (فقط پایگاه دانش) پاسخ می‌دهد.

> بازار پرواز و درگاه پرداخت در این نسخه **شبیه‌سازی‌شده** هستند (`FLIGHT_PROVIDER=simulation`، `PAYMENT_PROVIDER=mock`). جزئیات در `docs/adr/0003-simulated-market-and-price-insight.md`.

## ساختار

| مسیر                                       | توضیح                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `apps/api`                                 | NestJS 12 + Mongoose، پورت ۷۷۸۱                                          |
| `apps/web`                                 | Next.js 16 + shadcn (RTL)، پورت ۷۷۸۲؛ مرورگر فقط با `/api/*` صحبت می‌کند |
| `packages/contracts`                       | شِمای Zod و منطق خالص دامنه (تحلیل قیمت، تقویم جلالی، نقشه‌ی صندلی…)     |
| `docs/adr`                                 | تصمیم‌های معماری                                                         |
| `PROJECT_BLUEPRINT_SHADCN.md`، `CLAUDE.md` | قواعد پروژه                                                              |
| `PRODUCT.md`، `DESIGN.md`                  | محصول و طراحی                                                            |

## پیش‌نیاز

- Node ≥ 24 و pnpm 11 (فقط pnpm؛ lockfile را commit کنید)
- MongoDB به‌صورت **replica set** (رزرو صندلی و پرداخت از تراکنش استفاده می‌کنند). `pnpm dev:all` خودش یک replica set درون‌حافظه‌ای روی پورت ۲۷۰۱۸ بالا می‌آورد؛ برای دیتابیس پایدار `node scripts/dev-db.mjs` را ببینید

## راه‌اندازی

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# در apps/api/.env این‌ها را پر کنید:
#   JWT_ACCESS_SECRET و OTP_HMAC_SECRET  ->  openssl rand -base64 48
#   (اختیاری) ANTHROPIC_API_KEY برای دستیار با Claude؛ خالی = حالت آفلاین

pnpm build            # dev:all خروجی ساخته‌شده‌ی API را اجرا می‌کند
pnpm dev:all          # Mongo درون‌حافظه‌ای (replica set) + API + وب
```

سایت روی <http://localhost:7782> بالا می‌آید. در توسعه کد پیامک در کنسولِ API چاپ می‌شود (`SMS_PROVIDER=console`)؛ برای ورود ثابت `ALLOW_DEV_AUTH=true` و `OTP_FIXED_CODE=123456` را بگذارید (در production ممنوع است).

## دستورها

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @flysmart/web test:e2e   # Playwright + axe؛ نیاز به Mongo و OTP_FIXED_CODE=123456
```

تست‌های e2e‌ی API یک Mongo replica set درون‌حافظه‌ای بالا می‌آورند؛ بدون اینترنت:
`MONGOMS_SYSTEM_BINARY=$(which mongod) MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false pnpm test`

## نکته‌های امنیتی

- فایل‌های `.env` را commit نکنید. کلیدها فقط در محیط سرور قرار می‌گیرند و توکن‌ها در کوکی httpOnly هستند.
- کد ملی و شماره‌ی گذرنامه‌ی مسافران فعلاً **رمزنگاری‌نشده** در دیتابیس ذخیره می‌شود؛ پیش از production رمزنگاری سطح فیلد اضافه کنید.

## وضعیت راستی‌آزمایی و تحویل

فهرست صادقانه‌ی آنچه اجرا شده و آنچه باید روی سیستم شما اجرا شود: [`docs/HANDOVER.md`](docs/HANDOVER.md).
