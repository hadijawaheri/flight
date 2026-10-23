# Project Blueprint — Next.js + NestJS + shadcn/ui

> **مخاطب این سند: AI agent.** این سند مشخصات الزام‌آور ساخت و توسعه پروژه است. هر قانون «باید/نباید» یک دستور است، نه پیشنهاد.
> **تاریخ بازبینی:** ۲۰۲۶-۱۰-۰۳. **زبان:** توضیحات فارسی؛ کد، نام‌ها، کامنت‌ها، commit و stringهای کد انگلیسی (به‌جز متن‌های UI و پیام‌های API که فارسی‌اند).
> **Package manager:** فقط `pnpm`.
> **پیاده‌سازی مرجع:** ریپوی `skeleton` همین سند را پیاده کرده و در ۲۰۲۶-۱۰-۰۳ با typecheck، lint، ۵۶ تست خودکار (contracts ۱۷، API ۱۹، web ۲۰) و ۴ سناریوی Playwright روی build تولیدی سبز شده است. هر جا سند و اسکلت اختلاف داشتند، اسکلت (که اجرا شده) درست است؛ اختلاف را گزارش کن. تله‌های کشف‌شده در [بخش ۲۰](#۲۰-تلههای-تأییدشده-gotchas).

---

## فهرست

1. [قوانین عملیاتی Agent](#۱-قوانین-عملیاتی-agent)
2. [اصول و دفتر تصمیم‌ها](#۲-اصول-و-دفتر-تصمیمها)
3. [معماری و ساختار ریپو](#۳-معماری-و-ساختار-ریپو)
4. [استک](#۴-استک)
5. [قراردادهای کدنویسی](#۵-قراردادهای-کدنویسی)
6. [پکیج contracts (منبع حقیقت مشترک)](#۶-پکیج-contracts)
7. [Backend — NestJS](#۷-backend--nestjs)
8. [احراز هویت و نشست](#۸-احراز-هویت-و-نشست)
9. [Frontend — Next.js + shadcn](#۹-frontend--nextjs--shadcn)
10. [قوانین UI با shadcn](#۱۰-قوانین-ui-با-shadcn)
11. [فارسی‌سازی و RTL](#۱۱-فارسیسازی-و-rtl)
12. [تست و کیفیت](#۱۲-تست-و-کیفیت)
13. [ابزار، CI و استقرار](#۱۳-ابزار-ci-و-استقرار)
14. [چک‌لیست امنیت](#۱۴-چکلیست-امنیت)
15. [Environment Variables](#۱۵-environment-variables)
16. [دستور ساخت پروژه (گام‌به‌گام)](#۱۶-دستور-ساخت-پروژه)
17. [Recipe: ساخت یک Feature کامل](#۱۷-recipe-ساخت-یک-feature-کامل)
18. [Definition of Done](#۱۸-definition-of-done)
19. [قالب CLAUDE.md برای پروژه‌ها](#۱۹-قالب-claudemd-برای-پروژهها)
20. [تله‌های تأییدشده (Gotchas)](#۲۰-تلههای-تأییدشده-gotchas)

- [پیوست — موارد مشروط](#پیوست--موارد-مشروط-فقط-با-شرط-ورود)
- [پیوست — پرامپت‌های آماده](#پیوست--پرامپتهای-آماده-برای-انسان-agent-این-بخش-را-نادیده-بگیرد)

---

## ۱. قوانین عملیاتی Agent

### اولویت منابع (در تعارض، بالاتر برنده است)

1. دستور صریح کاربر در همین گفتگو
2. `CLAUDE.md` / `AGENTS.md` خود پروژه
3. این Blueprint
4. الگوی کد موجود در پروژه (فقط وقتی با ۱ تا ۳ تعارض ندارد)

اگر نیاز محصول با Blueprint تعارض دارد: **متوقف شو، تعارض را در یک‌دو جمله بگو، یک پیشنهاد بده**، و پس از تأیید ادامه بده. تصمیم تأییدشده را در `docs/adr/` ثبت کن.

### گردش کار (برای هر تسک)

1. **بررسی:** فایل‌های مرتبط و مشابه را بخوان. حدس نزن؛ verify کن.
2. **برنامه:** برای تسک بزرگ یا مبهم، قبل از ویرایش، برنامه و فایل‌هایی که لمس می‌کنی را کوتاه بگو.
3. **اجرا:** کوچک‌ترین راه‌حل کامل. بدون refactor نامرتبط، بدون abstraction یا وابستگی اضافه.
4. **تأیید:** `pnpm typecheck && pnpm lint && pnpm test` (و `pnpm build` برای تغییرات meaningful) را **واقعاً** اجرا کن.
5. **گزارش:** نتیجه واقعی را بگو. چیزی که اجرا نکرده‌ای را «انجام‌شده» یا «تأییدشده» ننویس. اگر چکی fail شد، خروجی را گزارش کن.

### چه موقع بپرس، چه موقع تصمیم بگیر

- **بپرس:** تعارض با Blueprint، تغییر مدل داده‌ی موجود، حذف داده، تغییر قرارداد API عمومی، افزودن سرویس/وابستگی بزرگ، هر کار غیرقابل‌برگشت یا خارج از مخزن.
- **تصمیم بگیر و بگو:** هر چیزی که Blueprint پاسخش را دارد، یا انتخاب‌های بی‌پیامد (نام متغیر، ترتیب فایل‌ها). تصمیم را در یک جمله در گزارش بنویس.

### برچسب‌های اطمینان در این سند

- `[CERTAIN]` از مستندات رسمی تأیید شده است.
- `[LIKELY]` مبتنی بر دانش است ولی اجرا نشده. **قبل از اتکا verify کن** (مستندات رسمی، `pnpm dlx shadcn@latest docs <name>`، یا اجرای یک آزمایش کوچک). اگر با واقعیت نخواند، واقعیت را اجرا کن و مغایرت را گزارش بده.
- در گزارش‌هایت از همین برچسب‌ها برای ادعاهای نامطمئن استفاده کن؛ حدس را به‌عنوان واقعیت ارائه نده.

### نسخه پکیج‌ها

- نسخه‌ای در این سند نیست. هنگام **افزودن** پکیج، آخرین stable را بگیر (`pnpm add <pkg>`، بدون پین دستی).
- `pnpm-lock.yaml` همیشه commit می‌شود؛ CI با `--frozen-lockfile`. آپدیت‌ها فقط در PR جدا.
- پکیج جدید = یک جمله توجیه در PR: چرا لازم است، جایگزین‌ها چه بود، چرا کتابخانه‌ی موجود کافی نبود.

### قوانین ثابت

- قبل از نوشتن هر کد، یک فایل مشابه موجود را بخوان و از آن پیروی کن.
- مستندات (README، ADR) فقط وقتی تصمیم یا راه‌اندازی جدید ایجاد می‌شود؛ مستند اضافه نساز.
- Secret، توکن، کد OTP یا داده شخصی را در لاگ، commit یا خروجی چاپ نکن.
- هر چیز غیرقابل‌برگشت (حذف داده، `git push --force`، تغییر production) فقط با تأیید صریح.

---

## ۲. اصول و دفتر تصمیم‌ها

### اصول (به ترتیب اولویت)

**درستی ← سادگی ← نگه‌داری‌پذیری ← پایداری ← تجربه کاربر ← مقیاس‌پذیری**

برای دوام ۱۰ ساله:

1. **مرزها را محکم کن، نه ابزارها را.** هر وابستگی خارجی (SMS، پرداخت، ذخیره فایل، ایمیل) پشت یک interface است. عوض کردن ارائه‌دهنده = یک فایل.
2. **یک منبع حقیقت.** Schemaهای Zod در `packages/contracts` هم backend را validate می‌کنند هم فرم frontend را. دو کپی از یک قانون = باگ آینده.
3. **امن به‌صورت پیش‌فرض.** Guard سراسری، `@Public()` برای استثنا. Whitelist برای ورودی. Token هرگز در JS قابل‌خواندن نیست.
4. **مالکیت کد UI.** shadcn کد را داخل پروژه می‌گذارد؛ پروژه به آپدیت یک کتابخانه UI قفل نیست.
5. **وابستگی کم.** اگر کاری ۱۰ خط کد است (نرمال‌سازی ارقام، کد ملی)، پکیج نصب نکن.
6. **هر چیز غیرقابل‌برگشت، صریح.** پول عدد صحیح، زمان UTC، حذف نرم، migration نسخه‌دار.
7. **ساده بمان تا مجبور نشدی.** Redis، صف، i18n، microservice فقط وقتی «شرط ورود»شان محقق شد ([پیوست ب](#پیوست--موارد-مشروط-فقط-با-شرط-ورود)).

### دفتر تصمیم‌ها (Decision Log)

| حوزه                   | انتخاب                                                            | ردشده                                      | دلیل                                                                                      | چه زمانی بازبینی                                                   |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ساختار ریپو            | **pnpm workspace** (`apps/api`, `apps/web`, `packages/contracts`) | دو ریپوی جدا                               | اشتراک schema/type بدون کپی؛ یک PR برای تغییر API+UI                                      | اگر تیم‌های جدا با چرخه release جدا شدند                           |
| Task runner            | فقط `pnpm -r` / `--filter`                                        | Turborepo/Nx                               | اضافه‌بار بی‌دلیل در شروع                                                                 | CI بیش از ~۵ دقیقه شد → Turborepo                                  |
| UI                     | **shadcn/ui** (Radix) + Tailwind v4                               | کتابخانه‌های UI بسته (HeroUI، MUI)         | کد در پروژه، قابل‌شخصی‌سازی، RTL رسمی، اکوسیستم registry                                  | اگر Radix نگهداری‌اش افت کرد → `migrate-radix-to-base`             |
| Server state           | **TanStack Query**                                                | Redux thunk                                | cache، retry، invalidation آماده؛ کد کمتر                                                 | —                                                                  |
| Client state           | `useState`/Context؛ در صورت نیاز **Zustand**                      | Redux Toolkit                              | RTK برای state سراسری _کلاینتی_ کوچک، boilerplate سنگین است                               | اگر state سراسری پیچیده شد                                         |
| فرم                    | **react-hook-form + Zod**                                         | Formik + Yup                               | الگوی رسمی shadcn؛ Formik تقریباً متروک؛ Zod مشترک با backend                             | —                                                                  |
| Validation backend     | Zod + `createZodDto` و pipe **خودنوشت** (حدود ۲۵ خط)              | class-validator، `nestjs-zod`              | حذف دوگانگی با frontend؛ peer پکیج `nestjs-zod` تا Nest 11 است و با Nest 12 تست نشده      | اگر `nestjs-zod` رسماً Nest 12 را پشتیبانی کرد می‌توان جایگزین کرد |
| تست backend            | **Vitest** (پیش‌فرض Nest 12)                                      | Jest                                       | Nest 12 با Vitest و ESM می‌آید؛ مهاجرت بی‌دلیل است                                        | —                                                                  |
| Lint                   | **یک** ESLint در ریشه (+ `eslint-config-next` برای web)           | oxlint پیش‌فرض Nest، config جدا برای هر اپ | یک قانون برای کل ریپو                                                                     | —                                                                  |
| نسخه TypeScript/ESLint | پین با **pnpm catalog** (`~6.0`، `~9.39`)                         | آخرین نسخه                                 | TS 7 و ESLint 10 زنجیره ابزار را می‌شکنند (بخش ۲۰)                                        | وقتی peerهای typescript-eslint/eslint-plugin-react پشتیبانی کردند  |
| HTTP client            | `fetch` با wrapper نازک                                           | axios                                      | بدون وابستگی؛ با cache/streaming Next سازگار                                              | —                                                                  |
| Auth                   | **JWT در httpOnly cookie** + refresh rotation                     | JWT در js-cookie ۹۰ روزه                   | محافظت از XSS، توکن کوتاه‌عمر                                                             | افزودن SSO/OAuth                                                   |
| نقش‌ها                 | یک مدل User + `role` + RBAC                                       | سه strategy جدا                            | کد کمتر، یک مسیر auth                                                                     | —                                                                  |
| Toast                  | **sonner**                                                        | react-toastify                             | استاندارد shadcn، RTL و تم داخلی                                                          | —                                                                  |
| آیکون                  | **lucide-react**                                                  | iconsax-reactjs                            | کامپوننت‌های shadcn خودشان lucide دارند؛ ترکیب دو کتابخانه = ناهماهنگی                    | —                                                                  |
| تاریخ                  | `Intl` (`fa-IR-u-ca-persian`) + `date-fns-jalali`/DayPicker       | jalali-moment                              | moment منسوخ و سنگین                                                                      | —                                                                  |
| ارقام فارسی            | تابع ۶ خطی `normalizeDigits` در contracts                         | ap-to-english                              | یک بار در schema، نه در هر service                                                        | —                                                                  |
| نام فایل               | **kebab-case** همه‌جا                                             | PascalCase.tsx                             | macOS بزرگ/کوچک را یکی می‌داند، Linux نه → باگ CI                                         | —                                                                  |
| Export                 | **named export** (به‌جز فایل‌های ویژه Next)                       | default export                             | rename امن، auto-import دقیق                                                              | —                                                                  |
| Barrel `index.ts`      | فقط در مرز feature                                                | در هر پوشه                                 | barrel زیاد = کندی build و dev                                                            | —                                                                  |
| استقرار                | **PM2 + Caddy** روی سرور (بدون Docker)                            | Docker/Kubernetes                          | سادگی، دیباگ مستقیم، TLS خودکار با Caddy؛ Docker فقط اختیاری برای سرویس‌های dev           | اگر چند سرور یا autoscaling لازم شد                                |
| Migration              | **migrate-mongo** (پوشه `apps/api/migrations`)                    | runner خودنوشت، `autoIndex` در prod        | ابزار استاندارد با changelog و قفل؛ تست drift ایندکس schema را با migration مقایسه می‌کند | —                                                                  |
| عمر نشست               | refresh چرخشی با سقف **۷ روز بی‌فعالیتی** و **۳۰ روز مطلق**       | فقط ۳۰ روز لغزان                           | نشست دزدیده‌شده با refresh پیاپی تا ابد زنده نمی‌ماند                                     | —                                                                  |
| CSRF                   | `SameSite=Lax` + `CrossSiteGuard` (هدر `Sec-Fetch-Site`)          | CSRF token                                 | لایه دوم بدون state؛ مرورگر هدر را می‌گذارد و اسکریپت نمی‌تواند جعلش کند                  | اگر فرم cross-site یا `SameSite=None` لازم شد → CSRF token         |
| i18n                   | فقط فارسی، بدون کتابخانه                                          | next-intl از روز اول                       | هزینه بی‌مورد                                                                             | اولین نیاز به زبان دوم → next-intl (کلاس‌های logical آماده‌اند)    |

> **قانون انحراف:** پیش‌فرض‌های پرتأثیر این سند **مونوریپو، Zod مشترک و نبود Redux** هستند. اگر محصول جدا بودن ریپوها را الزام کند، `packages/contracts` را به‌صورت پکیج خصوصی منتشر کن و بقیه Blueprint را بدون تغییر نگه دار؛ این انحراف باید با تأیید کاربر و ADR باشد.

---

## ۳. معماری و ساختار ریپو

```text
{project}/
├── apps/
│   ├── api/                      # NestJS — پورت 7781
│   └── web/                      # Next.js — پورت 7782
├── packages/
│   └── contracts/                # Zod schemas، types، constants، utils مشترک
├── infra/
│   ├── ecosystem.config.cjs      # PM2: api و web (cluster)
│   ├── Caddyfile                 # reverse proxy + TLS خودکار
│   └── docker-compose.yml        # اختیاری: mongo (replica set) برای توسعه
├── scripts/
│   └── deploy.sh                 # pull → install → build → pm2 reload
├── docs/adr/                     # Architecture Decision Records (یک فایل کوتاه برای هر تصمیم)
├── .github/
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── CLAUDE.md                     # قوانین برای AI (قالب در بخش ۱۹)
├── package.json                  # scripts ریشه + packageManager + engines
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc / .editorconfig / .nvmrc / .gitignore
├── commitlint.config.mjs
└── renovate.json
```

- **جریان داده:** Browser → `web` (همان origin) → rewrite `/api/*` → `api`. مرورگر هرگز مستقیم با API حرف نمی‌زند ⇒ کوکی first-party، بدون دردسر CORS/Domain، و آدرس API پنهان است.
- **API:** URI versioning (`/v1/...`)، پورت ۷۷۸۱. **Web:** پورت ۷۷۸۲.
- **زبان UI:** فارسی، `lang="fa" dir="rtl"`. پیام‌های خطای API هم فارسی، همراه یک `code` ماشین‌خوان.
- **زمان:** در DB همیشه UTC؛ نمایش با `Asia/Tehran`. **پول:** عدد صحیح (ریال)، هرگز float.

### ساختار `apps/api/src`

```text
src/
├── main.ts
├── app.module.ts
├── config/
│   └── env.ts                    # اعتبارسنجی env با Zod
├── common/                       # چیزهای مشترک بین ماژول‌ها
│   ├── decorators/               # @Public، @Roles، @CurrentUser
│   ├── filters/                  # AllExceptionsFilter
│   ├── guards/                   # JwtAuthGuard، RolesGuard
│   ├── database/                 # soft-delete plugin
│   └── types/
├── infra/                        # ارائه‌دهنده‌های بیرونی پشت interface
│   ├── sms/                      # sms.provider.ts + console / melipayamak
│   ├── storage/                  # S3-compatible
│   └── payment/                  # zarinpal
├── health/
└── modules/
    └── {feature}/
        ├── {feature}.module.ts
        ├── {feature}.controller.ts
        ├── {feature}.service.ts
        ├── {feature}.mapper.ts   # document → DTO (هرگز document خام برنگردان)
        ├── dto/                  # createZodDto از contracts
        ├── schemas/{entity}.schema.ts
        └── enums/ (در صورت نیاز)
test/                             # e2e
```

### ساختار `apps/web/src`

ساختار **feature-based** است، نه «پوشه‌های سراسری برای interface و validator». هر feature کد خودش را یک‌جا دارد.

```text
src/
├── app/                          # فقط routing — بدون منطق
│   ├── layout.tsx
│   ├── globals.css
│   ├── not-found.tsx · error.tsx · global-error.tsx · loading.tsx
│   ├── sitemap.ts · robots.ts · manifest.ts
│   ├── (marketing)/page.tsx
│   ├── (auth)/sign-in/page.tsx
│   └── (dashboard)/dashboard/
│       ├── layout.tsx
│       └── {page}/page.tsx
├── proxy.ts                      # (Next ≥ 16؛ در نسخه‌های قدیمی‌تر middleware.ts)
├── components/
│   ├── ui/                       # shadcn (تولید CLI، قابل ویرایش)
│   ├── shared/                   # کامپوننت‌های ترکیبی app-wide: page-header، data-table، confirm-dialog
│   ├── layout/                   # site-header، dashboard-shell
│   └── providers/                # app-providers، query-provider، theme-provider
├── features/
│   └── {feature}/
│       ├── components/           # UI مخصوص همین feature
│       ├── api.ts                # توابع fetch تایپ‌شده
│       ├── queries.ts            # query keys + hooks (useQuery/useMutation)
│       └── index.ts              # API عمومی feature (تنها barrel مجاز)
├── lib/
│   ├── api/ (client.ts · server.ts · parse.ts)
│   ├── auth/dal.ts               # getSession / requireSession (server-only)
│   ├── env.ts · utils.ts (cn) · format.ts · paths.ts · seo.ts · safe-redirect.ts
└── hooks/
```

**قوانین App Router:**

- `page.tsx` فقط import و render؛ **بدون منطق**. دریافت داده در Server Component، تعامل در Client Component.
- `"use client"` فقط روی برگ‌های درخت؛ هرگز روی layout بزرگ.
- هر route group یک `loading.tsx` و `error.tsx` معنادار دارد؛ صفحه سفید نباید ممکن باشد.

---

## ۴. استک

### Backend

| ابزار                                                                            | کاربرد                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| NestJS + TypeScript (`strict`)                                                   | فریمورک                                                                |
| MongoDB + Mongoose                                                               | دیتابیس (replica set حتی در dev برای transaction)                      |
| `@nestjs/jwt`                                                                    | امضا و تأیید توکن (بدون passport — وابستگی کمتر)                       |
| `zod`                                                                            | validation و DTO (`createZodDto` + pipe خودنوشت)                       |
| `helmet`, `cookie-parser`                                                        | امنیت HTTP و کوکی                                                      |
| `@nestjs/throttler`                                                              | rate limit                                                             |
| `@nestjs/config` + Zod                                                           | env با fail-fast                                                       |
| `nestjs-pino`                                                                    | structured logging با request-id                                       |
| `@nestjs/terminus`                                                               | health check                                                           |
| `vitest` + `supertest` + `mongodb-memory-server`                                 | تست unit و e2e                                                         |
| _(هنگام نیاز)_ `@aws-sdk/client-s3`, `sharp`, `migrate-mongo`, `@nestjs/swagger` | آپلود فایل (S3-compatible)، تصویر، migration، OpenAPI. در اسکلت نیستند |

### Frontend

| ابزار                                                | کاربرد                               |
| ---------------------------------------------------- | ------------------------------------ |
| Next.js (App Router) + React + TypeScript (`strict`) | فریمورک                              |
| Tailwind CSS v4 (CSS-first)                          | استایل                               |
| **shadcn/ui** (Radix)                                | کامپوننت UI                          |
| `react-hook-form` + `zod` + `@hookform/resolvers`    | فرم                                  |
| `@tanstack/react-query`                              | server state                         |
| `nuqs`                                               | state در URL (فیلتر، صفحه‌بندی، تب)  |
| `@tanstack/react-table`                              | جدول‌ها (الگوی data-table در shadcn) |
| `sonner`                                             | toast                                |
| `lucide-react`                                       | آیکون                                |
| `motion`                                             | انیمیشن (فقط `motion/react`)         |
| `next-themes`                                        | تم روشن/تیره                         |
| `@bprogress/next`                                    | نوار پیشرفت ناوبری (اختیاری)         |
| `vitest` + Testing Library + `msw`                   | تست unit/component                   |
| `@playwright/test` + `@axe-core/playwright`          | e2e و accessibility                  |

### مشترک

| ابزار                                                                    | کاربرد                                |
| ------------------------------------------------------------------------ | ------------------------------------- |
| `tsup`                                                                   | build دوگانه CJS+ESM برای `contracts` |
| ESLint (flat) + `typescript-eslint` + `eslint-plugin-simple-import-sort` | lint و مرتب‌سازی import               |
| Prettier + `prettier-plugin-tailwindcss`                                 | فرمت                                  |
| Husky + lint-staged + commitlint                                         | hook و Conventional Commits           |
| Renovate                                                                 | آپدیت وابستگی‌ها                      |
| Sentry                                                                   | خطاهای production (api و web)         |

### پکیج‌های فارسی/محلی (حداقل)

- **ارقام / کد ملی / موبایل:** کد خودمان در `contracts` (بخش ۶).
- **قالب‌بندی عدد، پول، تاریخ:** `Intl.NumberFormat('fa-IR')` و `Intl.DateTimeFormat('fa-IR-u-ca-persian')`.
- **عدد به حروف، شماره شبا/کارت و …:** `@persian-tools/persian-tools` فقط در صورت نیاز واقعی `[LIKELY]`.
- **تقویم شمسی در فرم:** DayPicker نسخه ۹ حالت Persian دارد (`react-day-picker/persian`) `[LIKELY]`؛ کامپوننت `calendar` در shadcn دستی برای RTL تنظیم می‌شود.

---

## ۵. قراردادهای کدنویسی

### TypeScript

- `strict: true` در **همه** tsconfigها (`noImplicitAny: false` یا غیرفعال‌کردن هر گزینه strict ممنوع است).
- اضافه: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- نسخه `typescript` و `eslint` را فقط از **pnpm catalog** بگیر (`"typescript": "catalog:"`)؛ دلیل در بخش ۲۰.
- `any` ممنوع (ESLint = error). `catch (err: unknown)` و narrowing. برای ورودی نامطمئن `unknown` + Zod.
- `type`/`interface` هر دو مجاز: برای شکل داده object از `interface`، برای union و ابزارها `type`.

### نام‌گذاری

| نوع              | الگو                                                      | مثال                                             |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------ |
| فایل (همه)       | `kebab-case`                                              | `national-code-input.tsx`, `create-order.dto.ts` |
| کامپوننت React   | PascalCase export                                         | `export function NationalCodeInput()`            |
| Class            | PascalCase                                                | `UsersService`, `CreateOrderDto`                 |
| Interface / Type | PascalCase **بدون** پیشوند `I`                            | `AuthUser`, `SignInInput`                        |
| Enum             | PascalCase بدون suffix؛ در frontend ترجیحاً union literal | `PaymentStatus`                                  |
| Zod schema       | `camelCase` + `Schema`                                    | `signInSchema`                                   |
| Hook             | `useXxx`                                                  | `useSession`                                     |
| ثابت             | `UPPER_SNAKE` (مقدار ساده) / `camelCase` object           | `COOKIE_NAMES`, `paths`                          |
| تابع boolean     | `is/has/can`                                              | `isAuthenticated`                                |

> چرا `I` حذف شد؟ راهنمای رسمی TypeScript و Nest آن را توصیه نمی‌کنند و با `type` ناسازگار می‌شود. چرا kebab-case؟ shadcn خودش `button.tsx`, `input-otp.tsx` تولید می‌کند؛ یک قاعده برای کل ریپو.

### Export و Import

- **Named export** همه‌جا. تنها استثنا: `page.tsx`, `layout.tsx`, `route.ts` و … که Next الزام می‌کند.
- **Barrel (`index.ts`)** فقط در مرز feature برای API عمومی‌اش. هرگز برای `components/ui`.
- Alias `@/` → `src/` فقط در **web**. در **api** (ESM، `nodenext`) فقط import نسبی با پسوند `.js` (`./auth.service.js`)؛ `tsc` مسیر aliasها را بازنویسی نمی‌کند و build خروجی در runtime می‌شکند.
- ترتیب import را **ابزار** تعیین می‌کند (`simple-import-sort`)؛ کامنت‌های `//Interfaces`, `//Redux`, … حذف شدند چون دستی‌اند، در refactor می‌پوسند و Prettier/ESLint کارشان را بهتر می‌کنند.

### کامنت

- فقط **«چرا»**، نه «چه». انگلیسی و کوتاه.
- مثال خوب: `// Refresh tokens may be reused within 10s: parallel RSC requests share one cookie.`
- JSDoc فقط برای API عمومی `contracts` و توابع util مشترک.
- `eslint-disable` فقط با توضیح همان خط: `// eslint-disable-next-line rule -- reason`.

### Git

- **Conventional Commits** (`feat(api): ...`, `fix(web): ...`) با commitlint.
- Trunk-based: branch کوتاه‌عمر (`feat/…`, `fix/…`) → PR → squash merge. `main` همیشه قابل deploy.

---

## ۶. پکیج contracts

`packages/contracts` تنها جایی است که شکل داده بین front و back تعریف می‌شود.

```text
packages/contracts/
├── package.json        # name: "@{project}/contracts"، exports (import + require)
├── tsup.config.ts      # format: ['esm','cjs']، dts: true
└── src/
    ├── index.ts
    ├── common/ (digits.ts · iran.ts · pagination.ts · api.ts · errors.ts)
    ├── auth/ (auth.schema.ts)
    └── {feature}/ ({feature}.schema.ts)
```

Dev: `tsup --watch` در `contracts`، همزمان با api و web. `apps/web` در `next.config.ts` به `transpilePackages` نیاز ندارد چون خروجی build شده است.

### ارقام، موبایل، کد ملی (بدون وابستگی)

```ts
// common/digits.ts
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}
```

```ts
// common/iran.ts
import { z } from "zod";
import { normalizeDigits } from "./digits";

export const digitsString = z.string().trim().transform(normalizeDigits);

export const mobileSchema = digitsString.pipe(
  z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
);

export function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((acc, digit, index) => acc + digit * (10 - index), 0);
  const remainder = sum % 11;
  const check = digits[9];
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

export const nationalCodeSchema = digitsString.pipe(
  z.string().refine(isValidNationalCode, "کد ملی معتبر نیست"),
);
```

### قالب پاسخ API (یکنواخت و تایپ‌شده)

```ts
// common/api.ts
export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
export interface ApiResponse<T> {
  data: T;
}
export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

// common/errors.ts
export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string; // فارسی، قابل نمایش به کاربر
  details?: unknown; // مثلاً خطاهای فیلد (فقط برای VALIDATION_FAILED)
  requestId?: string;
}
```

```ts
// common/pagination.ts
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
```

> پاسخ همیشه `{ data }` یا `{ data, meta }`. خطا همیشه `ApiErrorBody`. شکل‌های پراکنده مثل `{ user }`, `{ contracts }`, `{ items }` ممنوع است.

---

## ۷. Backend — NestJS

### `config/env.ts` — fail-fast

`apps/api/src/config/env.ts`

```ts
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(7781),
    // Behind Caddy the API must not be reachable from outside the machine
    HOST: z.string().default("127.0.0.1"),
    DATABASE_URL: z.string().startsWith("mongodb"),
    JWT_ACCESS_SECRET: z.string().min(32),
    OTP_HMAC_SECRET: z.string().min(32),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:7782")
      .transform((value) => value.split(",").map((origin) => origin.trim())),
    SMS_PROVIDER: z.enum(["console", "melipayamak"]).default("console"),
    OTP_FIXED_CODE: z.string().length(6).optional(),
    THROTTLE_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
  })
  .refine(
    (env) =>
      env.NODE_ENV !== "production" || (!env.OTP_FIXED_CODE && env.SMS_PROVIDER !== "console"),
    { message: "OTP_FIXED_CODE and the console SMS provider are forbidden in production" },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
```

- هیچ مقدار fallback برای secret یا `DATABASE_URL` وجود ندارد؛ بدون env اپ بالا نمی‌آید.
- فایل `.env` ثابت (نه `.env.${NODE_ENV}`). `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`.
- **`ConfigModule.forRoot` هنگام import ماژول validate می‌شود**، نه هنگام `compile()`. تست‌ها باید env را قبل از import (با `await import(...)`) تنظیم کنند.
- refresh token «opaque» و hash‌شده در DB است؛ پس `JWT_REFRESH_SECRET` وجود ندارد.

### `configure-app.ts` و `main.ts`

`configureApp` بین `main.ts` و تست‌های e2e مشترک است تا تست‌ها همان تنظیمات واقعی HTTP را اجرا کنند.

`apps/api/src/configure-app.ts`

```ts
import { VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import type { Env } from "./config/env.js";

// Shared by main.ts and e2e tests so tests exercise the real HTTP setup
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.enableCors({ origin: config.get("CORS_ORIGINS", { infer: true }), credentials: true });
  app.enableShutdownHooks();
}
```

`apps/api/src/main.ts`

```ts
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.js";
import { configureApp } from "./configure-app.js";

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
configureApp(app);
const config = app.get<ConfigService<Env, true>>(ConfigService);
await app.listen(config.get("PORT", { infer: true }), config.get("HOST", { infer: true }));
```

### `app.module.ts`

`apps/api/src/app.module.ts`

```ts
import { randomUUID } from "node:crypto";

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { ZodValidationPipe } from "./common/zod/zod-validation.pipe.js";
import type { Env } from "./config/env.js";
import { validateEnv } from "./config/env.js";
import { HealthModule } from "./health/health.module.js";
import { SmsModule } from "./infra/sms/sms.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const nodeEnv = config.get("NODE_ENV", { infer: true });
        return {
          pinoHttp: {
            level: nodeEnv === "test" ? "silent" : "info",
            genReqId: (req, res) => {
              const incoming = req.headers["x-request-id"];
              const id = typeof incoming === "string" ? incoming : randomUUID();
              res.setHeader("x-request-id", id);
              return id;
            },
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
            ],
            transport: nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get("DATABASE_URL", { infer: true }),
        // Production indexes are created by migrations, never at boot
        autoIndex: config.get("NODE_ENV", { infer: true }) !== "production",
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        skipIf: () => !config.get("THROTTLE_ENABLED", { infer: true }),
      }),
    }),
    JwtModule.register({ global: true }),
    SmsModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- Guard سراسری (`JwtAuthGuard`) و `ThrottlerGuard` و `RolesGuard` با `APP_GUARD`؛ pipe و filter هم سراسری.
- `skipIf` در Throttler با `THROTTLE_ENABLED` کنترل می‌شود (تست‌ها آن را خاموش می‌کنند، یک تست مخصوص روشنش می‌کند).
- در Nest 12 اسکلت با top-level `await` در `main.ts` اجرا می‌شود (ESM).

### Controller

```ts
// apps/api/src/modules/users/users.controller.ts
import { Body, Controller, Delete, HttpCode, Patch } from "@nestjs/common";
import type { ApiResponse, UserDto } from "@flysmart/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { UsersService } from "./users.service.js";

@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<UserDto>> {
    return { data: await this.usersService.updateProfile(user.id, dto) };
  }
}
// حذف حساب اینجا نیست: با re-auth OTP در `POST /v1/auth/account/delete` (بخش ۸)
```

قوانین:

- Guard سراسری است؛ endpoint عمومی صراحتاً `@Public()` می‌گیرد؛ نقش با `@Roles(Role.Admin)`.
- **هرگز** `@Request() req` بدون تایپ. از `@CurrentUser()` استفاده کن.
- **هرگز** document مونگو را برنگردان؛ همیشه از `*.mapper.ts` به DTO تبدیل کن (جلوگیری از نشت فیلد داخلی).
- نوع برگشتی هر handler صریح: `ApiResponse<T>` یا `PaginatedResponse<T>`.
- لیست‌ها: `@Query() query: PaginationQueryDto` (نه `page: string` خام).

### DTO از contracts (بدون وابستگی اضافه)

`apps/api/src/common/zod/create-zod-dto.ts`

```ts
import type { z, ZodType } from "zod";

export interface ZodDtoStatic<S extends ZodType> {
  new (): z.infer<S>;
  readonly schema: S;
}

export function createZodDto<S extends ZodType>(schema: S): ZodDtoStatic<S> {
  class ZodDto {
    static readonly schema = schema;
  }
  return ZodDto as unknown as ZodDtoStatic<S>;
}
```

`apps/api/src/common/zod/zod-validation.pipe.ts`

```ts
import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { ZodError, ZodType } from "zod";

export class ZodValidationException extends BadRequestException {
  constructor(readonly error: ZodError) {
    super("اطلاعات وارد شده معتبر نیست");
  }
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = (metadata.metatype as { schema?: ZodType } | undefined)?.schema;
    if (!schema || metadata.type === "custom") return value;

    const result = schema.safeParse(value);
    if (!result.success) throw new ZodValidationException(result.error);
    return result.data;
  }
}
```

```ts
// modules/users/dto/update-profile.dto.ts
import { updateProfileSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
```

- pipe سراسری با `APP_PIPE`؛ فقط پارامترهایی را اعتبارسنجی می‌کند که `metatype.schema` دارند.
- خروجی `safeParse` (نه ورودی خام) به handler می‌رسد؛ پس فیلد اضافه حذف و transform (نرمال‌سازی ارقام، trim) اعمال می‌شود. تست e2e این را برای `role: "admin"` تزریق‌شده ثابت می‌کند.
- نوع `@Body() dto: UpdateProfileDto` همان `z.infer` است و `!`/`strictPropertyInitialization` مطرح نیست.

### Service

```ts
// apps/api/src/modules/users/users.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { UserDto } from "@flysmart/contracts";
import { Model } from "mongoose";

import type { UpdateProfileDto } from "./dto/update-profile.dto.js";
import type { UserDocument } from "./schemas/user.schema.js";
import { User } from "./schemas/user.schema.js";
import { toUserDto } from "./users.mapper.js";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async getById(id: string): Promise<UserDto> {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException("کاربر یافت نشد");
    return toUserDto(user);
  }

  async findOrCreateByMobile(mobile: string): Promise<UserDto> {
    const user = await this.userModel
      .findOneAndUpdate(
        { mobile },
        { $setOnInsert: { mobile, role: "user" } },
        { upsert: true, returnDocument: "after" },
      )
      .lean();
    return toUserDto(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: "after" })
      .lean();
    if (!user) throw new NotFoundException("کاربر یافت نشد");
    return toUserDto(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
  }
}
```

- `private readonly` برای DI. بدون `convertAPToEnglish` در service: نرمال‌سازی ارقام داخل schema مشترک انجام شده.
- Exception با پیام فارسی (`BadRequestException`, `NotFoundException`, `ConflictException` …)؛ filter سراسری `code` را اضافه می‌کند.
- خواندن‌ها با `.lean()`. به‌روزرسانی با `$set`. چند سند وابسته → transaction.
- `findOne().lean()` سندی بدون method برمی‌گرداند؛ mapper نوع را درست می‌کند.

### Schema (Mongoose) + حذف نرم

`apps/api/src/modules/users/schemas/user.schema.ts`

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { Role } from "@flysmart/contracts";
import { ROLES } from "@flysmart/contracts";
import type { HydratedDocument, Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  mobile!: string;

  @Prop({ type: String, default: null, trim: true })
  firstName!: string | null;

  @Prop({ type: String, default: null, trim: true })
  lastName!: string | null;

  @Prop({ type: String, enum: ROLES, default: "user" })
  role!: Role;

  // Added by softDeletePlugin
  deletedAt?: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(softDeletePlugin);
// Unique only among live users, so a soft-deleted mobile can register again
UserSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
```

`apps/api/src/common/database/soft-delete.plugin.ts`

```ts
import type { Query, Schema } from "mongoose";

export function softDeletePlugin(schema: Schema): void {
  schema.add({ deletedAt: { type: Date, default: null } });
  schema.index({ deletedAt: 1 });
  schema.pre(/^(find|count|update)/, function (this: Query<unknown, unknown>) {
    if (!this.getOptions().withDeleted) this.where({ deletedAt: null });
  });
}
```

- **هر `@Prop` نوع صریح می‌گیرد** (`type: String`، `type: Types.ObjectId`) و هر نوعی که در decorator یا DI استفاده می‌شود **import مقداری** است نه `import type` (در غیر این صورت metadata خالی می‌ماند و Mongoose خطای «Cannot determine a type» می‌دهد).
- `deletedAt` به‌جای `deleted: boolean`؛ فیلتر را plugin خودکار اعمال می‌کند. `aggregate()` را پوشش نمی‌دهد: دستی `$match: { deletedAt: null }`.
- یکتایی فیلد با حذف نرم: ایندکس unique با `partialFilterExpression: { deletedAt: null }` (تست e2e تأیید می‌کند شماره حذف‌شده دوباره ثبت‌نام می‌شود).
- در Mongoose 9 برای برگرداندن سند جدید از `returnDocument: "after"` استفاده کن (نه `new: true`).
- نام کلاس مفرد (`User`).

### Exception Filter

```ts
// apps/api/src/common/filters/all-exceptions.filter.ts
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException } from "@nestjs/common";
import type { ApiErrorBody, ErrorCode } from "@flysmart/contracts";
import type { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";

import { AppException } from "../app-exception.js";
import { ZodValidationException } from "../zod/zod-validation.pipe.js";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

const INTERNAL_MESSAGE = "خطای غیرمنتظره‌ای رخ داد";
const RATE_LIMIT_MESSAGE = "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید";

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === "string") return response;
  const message = (response as { message?: string | string[] }).message;
  return Array.isArray(message) ? (message[0] ?? INTERNAL_MESSAGE) : (message ?? exception.message);
}

export function toErrorBody(exception: unknown, requestId?: string): ApiErrorBody {
  if (exception instanceof ZodValidationException) {
    return {
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: exception.message,
      details: exception.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      requestId,
    };
  }
  if (exception instanceof AppException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      message: messageOf(exception),
      requestId,
    };
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const code = STATUS_TO_CODE[statusCode] ?? "INTERNAL";
    return {
      statusCode,
      code,
      message: statusCode === 429 ? RATE_LIMIT_MESSAGE : messageOf(exception),
      requestId,
    };
  }
  return { statusCode: 500, code: "INTERNAL", message: INTERNAL_MESSAGE, requestId };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const body = toErrorBody(exception, String(req.id ?? ""));
    if (body.statusCode >= 500) this.logger.error({ err: exception }, "Unhandled exception");

    res.status(body.statusCode).json(body);
  }
}
```

- خطای ۵۰۰ هرگز جزئیات داخلی را به کاربر نشان نمی‌دهد: «خطای غیرمنتظره‌ای رخ داد».
- خطاهای validation: `code: "VALIDATION_FAILED"` و `details` شامل خطای هر فیلد.

### آپلود فایل

- فایل مستقیم به object storage (S3-compatible) می‌رود، **نه** به دیسک سرور و `ServeStatic`. (دیسک کانتینر ephemeral است و دستکاری مسیر با `substring` شکننده؛ هیچ‌کدام مجاز نیست.)
- الگوی ترجیحی: `POST /v1/uploads/presign` ← کلاینت مستقیم به storage آپلود می‌کند ← کلید فایل در سند ذخیره می‌شود.
- اعتبارسنجی: whitelist نوع MIME (بررسی بایت‌های ابتدایی فایل، نه فقط پسوند)، سقف حجم، نام تصادفی (UUID)، `sharp` برای resize/strip-metadata تصاویر.

### Providerهای بیرونی (پشت interface)

`SmsModule` provider را با `SMS_PROVIDER` انتخاب می‌کند و provider پیاده‌نشده را **در boot** رد می‌کند (کد در `apps/api/src/infra/sms/sms.module.ts`).

```ts
export abstract class SmsProvider {
  abstract send(to: string, template: string, args: string[]): Promise<void>;
}
// ConsoleSmsProvider (dev)، MelipayamakSmsProvider (prod) — با useFactory بر اساس SMS_PROVIDER
```

همین الگو برای `PaymentProvider` (زرین‌پال) و `StorageProvider`. تست‌ها از پیاده‌سازی in-memory استفاده می‌کنند.

### Health و لاگ

- `GET /health/live` و `/health/ready` (پینگ Mongo) با Terminus — برای orchestrator.
- Pino: JSON در production؛ `x-request-id` را بخوان یا بساز و در پاسخ برگردان؛ header `authorization` و کوکی‌ها redact شوند.
- OpenAPI در اسکلت نیست (`@nestjs/swagger` فقط class-validator را می‌شناسد). اگر لازم شد، از `z.toJSONSchema` خروجی بساز؛ فقط dev/staging.

### tsconfig و build (api)

Nest 12 پروژه را **ESM** می‌سازد: `"type": "module"`، `module/moduleResolution: "nodenext"`، `emitDecoratorMetadata` و `experimentalDecorators` روشن، Vitest به‌جای Jest. CLI را با `nest new api --strict` بساز و این‌ها را نگه دار:

- import نسبی با `.js` (بالا).
- `tsconfig.json` پروژه را با `strict` نگه دار؛ `strictPropertyInitialization: false` فقط به‌خاطر کلاس‌های Mongoose با `!` است.
- `contracts` با `tsup` به‌صورت dual (ESM و CJS) build می‌شود؛ اپ ESM آن را مستقیم import می‌کند.
- `pnpm build` ریشه ابتدا `contracts` را build می‌کند؛ `typecheck` و `test` هم همین‌طور (چون به `dist` آن وابسته‌اند).

---

## ۸. احراز هویت و نشست

### طراحی

| مورد                    | تصمیم                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ورود                    | OTP پیامکی (موبایل)                                                                                                                                                     |
| توکن دسترسی             | JWT، **۱۵ دقیقه**، کوکی `access_token`                                                                                                                                  |
| توکن refresh            | opaque (تصادفی)، کوکی `refresh_token`، در DB به‌صورت **hash** با `familyId`؛ **۷ روز بی‌فعالیتی** (`SESSION_IDLE_MS`) و **۳۰ روز مطلق** از ورود (`SESSION_ABSOLUTE_MS`) |
| کوکی‌ها                 | `HttpOnly; SameSite=Lax; Secure` (در prod); `Path=/`                                                                                                                    |
| ذخیره در JS             | **هیچ‌چیز**. `js-cookie` و `localStorage` برای توکن ممنوع                                                                                                               |
| نقش‌ها                  | `user`, `business`, `admin` (فیلد `role`) — یک مسیر auth، نه سه                                                                                                         |
| Mobile app / API client | همان guard، توکن از `Authorization: Bearer` هم خوانده می‌شود                                                                                                            |

> چرا عوض شد؟ توکن ۹۰ روزه در کوکی قابل‌خواندن با JS یعنی هر XSS = سرقت نشست سه‌ماهه، بدون امکان ابطال. با کوکی httpOnly + توکن کوتاه + refresh چرخشی، سرقت توکن عملاً بی‌اثر می‌شود.

### جریان

```text
1. POST /v1/auth/otp/request   { mobile }          → 204 (همیشه، حتی اگر کاربر وجود نداشت)
2. POST /v1/auth/otp/verify    { mobile, code }    → Set-Cookie ×2 + { data: { user } }
3. GET  /v1/auth/me                                 → { data: { user } }
4. POST /v1/auth/refresh                            → کوکی‌های جدید (چرخش)
5. POST /v1/auth/logout                             → پاک‌سازی کوکی‌ها + ابطال family
6. POST /v1/auth/logout-all                         → ابطال همه نشست‌های کاربر (همه دستگاه‌ها)
7. POST /v1/auth/reauth/request                     → ارسال OTP تأیید دوباره به موبایل خود کاربر
8. POST /v1/auth/account/delete  { code }           → حذف حساب فقط با OTP تازه + ابطال همه نشست‌ها
```

- `expiresAt` هر refresh جدید = کمینه «اکنون + ۷ روز» و «شروع family + ۳۰ روز»؛ بعد از سقف مطلق، ورود دوباره لازم است.
- کارهای برگشت‌ناپذیر (حذف حساب) فقط با **re-auth با OTP** انجام می‌شوند، نه فقط با کوکی نشست؛ پس `@Delete("me")` بدون کد ممنوع است.
- ابطال همه نشست‌ها با `userId` انجام شود؛ اگر `userId` در مدل رشته ذخیره شده، filter هر دو شکل رشته و `ObjectId` را پوشش دهد.

ثبت‌نام و ورود **یک مسیر** هستند: اگر موبایل ناشناخته بود، بعد از verify کاربر ساخته می‌شود (و اگر پروفایل ناقص بود، فرانت به onboarding می‌رود).

### OTP — قوانین امن

```ts
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const code = randomInt(100_000, 1_000_000).toString(); // نه Math.random
const codeHash = createHmac("sha256", secret).update(`${mobile}:${code}`).digest("hex");
// ذخیره: { mobile, codeHash, expiresAt: now + 2min, attempts: 0 }

// verify: constant-time compare
const ok = timingSafeEqual(Buffer.from(candidateHash), Buffer.from(record.codeHash));
```

- کد **هرگز** در DB خام ذخیره نمی‌شود و **هرگز** در پاسخ برنمی‌گردد.
- TTL index روی `expiresAt` (`expireAfterSeconds: 0`) برای پاک‌سازی خودکار.
- حداکثر **۵ تلاش** برای هر کد؛ بعد از آن باطل.
- درخواست کد جدید، کد قبلی را باطل می‌کند؛ cooldown ۲ دقیقه برای هر موبایل (در DB) **و** `@Throttle` روی IP (مثلاً ۳ در دقیقه).
- پاسخ `otp/request` برای موبایل ثبت‌شده و ثبت‌نشده یکسان است (جلوگیری از user enumeration).
- Dev: `ConsoleSmsProvider` کد را در لاگ چاپ می‌کند؛ تست/Playwright از `OTP_FIXED_CODE` استفاده می‌کند. Zod env این‌ها را در production ممنوع می‌کند.

### Refresh چرخشی

- هر refresh: توکن قدیمی ابطال و توکن جدید در همان `familyId` صادر می‌شود.
- **استفاده مجدد از توکن ابطال‌شده** خارج از بازه تحمل = نشانه سرقت ⇒ کل family باطل.
- **چرخش اتمیک:** `findOneAndUpdate({ tokenHash, revokedAt: null, familyRevoked: false, expiresAt: { $gt: now } })`؛ فقط یک درخواست هم‌زمان برنده می‌شود.
- **بازه تحمل ۱۰ ثانیه:** چند درخواست موازی (prefetch در RSC، چند تب) ممکن است با یک refresh token هم‌زمان برسند؛ بدون این بازه کاربر بی‌دلیل logout می‌شود.
- نقش کاربر داخل JWT است؛ تغییر نقش تا ۱۵ دقیقه اعمال نمی‌شود (قابل قبول). برای ابطال فوری، family را باطل کن.

### پیاده‌سازی کامل سرویس (تست‌شده با e2e)

```ts
// apps/api/src/modules/auth/auth.service.ts
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import type { UserDto } from "@flysmart/contracts";
import { Model } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import type { JwtPayload } from "../../common/types/auth.js";
import type { Env } from "../../config/env.js";
import { SmsProvider } from "../../infra/sms/sms.provider.js";
import { UsersService } from "../users/users.service.js";
import type { SessionTokens } from "./auth.cookies.js";
import { ACCESS_TTL_MS, REFRESH_TTL_MS } from "./auth.cookies.js";
import type { OtpDocument } from "./schemas/otp.schema.js";
import { Otp } from "./schemas/otp.schema.js";
import type { RefreshTokenDocument } from "./schemas/refresh-token.schema.js";
import { RefreshToken } from "./schemas/refresh-token.schema.js";

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_COOLDOWN_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
// Parallel requests (RSC prefetch, several tabs) can present the same refresh token at once
const REFRESH_REUSE_GRACE_MS = 10 * 1000;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshModel: Model<RefreshTokenDocument>,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: SmsProvider,
  ) {}

  async requestOtp(mobile: string): Promise<void> {
    const now = Date.now();
    const existing = await this.otpModel.findOne({ mobile }).lean();
    if (existing && now - existing.sentAt.getTime() < OTP_COOLDOWN_MS) {
      throw new AppException(429, "RATE_LIMITED", "برای دریافت کد جدید کمی صبر کنید");
    }

    const code =
      this.config.get("OTP_FIXED_CODE", { infer: true }) ??
      randomInt(100_000, 1_000_000).toString();
    await this.otpModel.findOneAndUpdate(
      { mobile },
      {
        $set: {
          codeHash: this.hashOtp(mobile, code),
          sentAt: new Date(now),
          expiresAt: new Date(now + OTP_TTL_MS),
          attempts: 0,
        },
      },
      { upsert: true },
    );

    try {
      await this.sms.sendOtp(mobile, code);
    } catch (error) {
      await this.otpModel.deleteOne({ mobile });
      throw error;
    }
  }

  async verifyOtp(mobile: string, code: string): Promise<{ user: UserDto; tokens: SessionTokens }> {
    // Increment first so concurrent guesses cannot exceed the attempt limit
    const otp = await this.otpModel
      .findOneAndUpdate({ mobile }, { $inc: { attempts: 1 } }, { returnDocument: "after" })
      .lean();
    if (!otp || otp.expiresAt.getTime() < Date.now() || otp.attempts > OTP_MAX_ATTEMPTS) {
      throw new AppException(400, "OTP_EXPIRED", "کد تأیید منقضی شده است؛ کد جدید بگیرید");
    }

    const candidate = Buffer.from(this.hashOtp(mobile, code));
    const stored = Buffer.from(otp.codeHash);
    if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
      throw new AppException(400, "OTP_INVALID", "کد تأیید نادرست است");
    }

    await this.otpModel.deleteOne({ mobile });
    const user = await this.usersService.findOrCreateByMobile(mobile);
    return { user, tokens: await this.issueSession(user, randomUUID()) };
  }

  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    const unauthenticated = () =>
      new AppException(401, "UNAUTHENTICATED", "نشست شما منقضی شده است");
    if (!refreshToken) throw unauthenticated();

    const tokenHash = sha256(refreshToken);
    const now = new Date();

    // Atomic rotate: only one concurrent caller wins the revokedAt flip
    const rotated = await this.refreshModel
      .findOneAndUpdate(
        { tokenHash, revokedAt: null, familyRevoked: false, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { returnDocument: "after" },
      )
      .lean();

    let userId: string;
    let familyId: string;

    if (rotated) {
      userId = rotated.userId.toString();
      familyId = rotated.familyId;
    } else {
      const previous = await this.refreshModel.findOne({ tokenHash }).lean();
      if (!previous || previous.expiresAt < now || previous.familyRevoked) throw unauthenticated();

      const withinGrace =
        previous.revokedAt !== null &&
        now.getTime() - previous.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
      if (!withinGrace) {
        // Reuse of a rotated token outside the grace window means the token leaked
        await this.revokeFamily(previous.familyId);
        throw unauthenticated();
      }
      userId = previous.userId.toString();
      familyId = previous.familyId;
    }

    const user = await this.usersService.getById(userId).catch(() => {
      throw unauthenticated();
    });
    return this.issueSession(user, familyId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const token = await this.refreshModel.findOne({ tokenHash: sha256(refreshToken) }).lean();
    if (token) await this.revokeFamily(token.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshModel.updateMany(
      { familyId },
      { $set: { familyRevoked: true, revokedAt: new Date() } },
    );
  }

  private async issueSession(user: UserDto, familyId: string): Promise<SessionTokens> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
    });

    const refreshToken = randomBytes(32).toString("base64url");
    await this.refreshModel.create({
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return { accessToken, refreshToken };
  }

  private hashOtp(mobile: string, code: string): string {
    return createHmac("sha256", this.config.get("OTP_HMAC_SECRET", { infer: true }))
      .update(`${mobile}:${code}`)
      .digest("hex");
  }
}
```

### Guard

```ts
// apps/api/src/common/guards/jwt-auth.guard.ts
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { COOKIE_NAMES } from "@flysmart/contracts";

import type { Env } from "../../config/env.js";
import { IS_PUBLIC } from "../decorators/public.decorator.js";
import type { AuthedRequest, JwtPayload } from "../types/auth.js";

function extractBearer(req: AuthedRequest): string | undefined {
  const [type, token] = req.headers.authorization?.split(" ") ?? [];
  return type === "Bearer" ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = cookies?.[COOKIE_NAMES.access] ?? extractBearer(req);
    if (!token) throw new UnauthorizedException("لطفاً وارد حساب خود شوید");

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      });
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException("نشست شما منقضی شده است");
    }
  }
}
```

### CSRF

`SameSite=Lax` + بدنه JSON (preflight اجباری) + لیست مجاز CORS برای درخواست‌های تغییردهنده کافی است. اگر روزی از `SameSite=None` یا فرم‌های cross-site استفاده شد، CSRF token اضافه کن.

لایه دوم، **الزامی**: `CrossSiteGuard` سراسری روی متدهای تغییردهنده (`POST/PUT/PATCH/DELETE`) درخواستی را که مرورگر با `Sec-Fetch-Site: cross-site` یا `same-site` فرستاده با 403 رد می‌کند (زیردامنه هم‌سایت هم اپ ما نیست). درخواست بدون این هدر (fetch سمت سرور Next، curl) رد نمی‌شود چون CSRF مرورگری نیست. استثنا (مثلاً callback درگاه پرداخت) فقط با `@AllowCrossSite()` صریح.

---

## ۹. Frontend — Next.js + shadcn

### راه‌اندازی shadcn (نکات مهم)

- دستور تأییدشده: `pnpm dlx shadcn@latest init -t next -b radix -p nova --rtl --no-monorepo -n web -y` `[CERTAIN]`. فلگ `--rtl` هم `"rtl": true` را می‌گذارد و کامپوننت‌ها را logical می‌کند.
- CLI یک **پروژه مستقل** می‌سازد (فولدر `app/` در ریشه، `.git`، `pnpm-lock.yaml` و `pnpm-workspace.yaml` خودش). برای ورود به workspace: آن‌ها را پاک کن، `app components hooks lib` را زیر `src/` ببر، `paths` در tsconfig را `./src/*` و `tailwind.css` در `components.json` را `src/app/globals.css` کن، نام پکیج را `@project/web` و `typescript` را `catalog:` بگذار، سپس `pnpm install` از ریشه.
- `lib/utils.ts` تولیدی `cn` را از پکیج `cn` re-export می‌کند؛ همان را نگه دار.
- `components/theme-provider.tsx` تولیدی میان‌بر تک‌کلیدی `d` برای تغییر تم دارد؛ **حذفش کن** (WCAG 2.1.4: میان‌بر تک‌کاراکتری).
- `Spinner` برچسب انگلیسی `Loading` دارد؛ همیشه `aria-label` فارسی بده.
- `AGENTS.md` تولیدی Next (دستور خواندن `node_modules/next/dist/docs/` پیش از کدنویسی) را نگه دار.

- `components.json`: `"rtl": true` را **قبل از افزودن کامپوننت‌ها** بگذار تا CLI کلاس‌ها را به logical تبدیل کند (`left/right` → `start/end`) `[CERTAIN]`. برای پروژه موجود: `pnpm dlx shadcn@latest migrate rtl` `[CERTAIN]`.
- سه کامپوننت پس از تبدیل خودکار، دستی RTL می‌خواهند: **Calendar، Pagination، Sidebar**. آیکون‌های جهت‌دار (`ArrowRight` …) کلاس `rtl:rotate-180` می‌گیرند `[CERTAIN]`.
- مشکل شناخته‌شده با `tw-animate-css`: برای محتوای portal مثل Popover/Tooltip، `dir="rtl"` را مستقیم پاس بده `[CERTAIN]`.
- `pnpm dlx shadcn@latest add direction` و `DirectionProvider` در ریشه `[CERTAIN]`.
- سبک (style/preset) را یک بار در ui.shadcn.com/create انتخاب و **کد preset را در README ثبت کن** تا پروژه قابل بازتولید باشد.
- قبل از ساختن UI سفارشی: `pnpm dlx shadcn@latest search` و `docs <component>` را بزن؛ کامپوننت موجود را ترکیب کن، دوباره‌سازی نکن.

### `app/layout.tsx`

```tsx
// apps/web/src/app/layout.tsx
import "./globals.css";

import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { defaultMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={cn("antialiased", vazirmatn.variable)}
    >
      <body className="bg-background text-foreground min-h-dvh font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

> `overflow-x-hidden` روی body حذف شد؛ این یک پنهان‌کننده باگ layout است. علت overflow را پیدا و رفع کن.

### `globals.css` — توکن‌ها

- رنگ‌ها فقط از **توکن‌های معنایی** (`--primary`, `--muted`, `--destructive` …) می‌آیند؛ هیچ `bg-emerald-500` مستقیم در کامپوننت‌ها نیست.
- هویت برند (emerald) در توکن‌ها تعریف می‌شود. **`bg-emerald-500` با متن سفید کنتراست AA را رد می‌کند** (حدود ۲٫۵:۱)؛ پس primary باید این‌طور تعریف شود:

```css
@theme inline {
  --font-sans: var(--font-vazirmatn), ui-sans-serif, system-ui, sans-serif;
}

:root {
  /* emerald-700 on white ≈ 5.5:1 (AA). Verify with a contrast checker after any change. */
  --primary: oklch(50.8% 0.118 165.612);
  --primary-foreground: oklch(98.5% 0 0);
}

.dark {
  --primary: oklch(69.6% 0.17 162.48); /* emerald-500 */
  --primary-foreground: oklch(20% 0.02 160); /* dark text on bright primary */
}
```

`[LIKELY]` مقادیر oklch از پالت Tailwind؛ قبل از commit کنتراست را با ابزار چک کن.

- گرادیان (`emerald → cyan`) فقط برای یکی-دو نقطه تأکید (hero، CTA اصلی)، نه سطح‌های عمومی.
- حالت تیره از روز اول: با `next-themes` و توکن‌ها رایگان است؛ **`dark:` دستی روی رنگ ممنوع**.

### Providers

```tsx
// apps/web/src/components/providers/app-providers.tsx
"use client";

import type { PropsWithChildren } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <DirectionProvider dir="rtl">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster dir="rtl" position="top-center" closeButton />
          </TooltipProvider>
        </QueryProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
```

```tsx
// apps/web/src/components/providers/query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

import { ApiError } from "@/lib/api/parse";

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

`DirectionProvider` (پراپ **`dir`**، نه `direction`) و `Toaster` از `@/components/ui/*` می‌آیند `[CERTAIN]`. `@bprogress/next` اگر خواستی داخل `QueryProvider` اضافه کن.

### `next.config.ts`

```ts
// apps/web/next.config.ts
import type { NextConfig } from "next";

const apiOrigin = process.env.INTERNAL_API_URL ?? "http://localhost:7781";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

`[CERTAIN]` با `output: "standalone"`: `next start` **نادیده می‌گیرد** و `proxy.ts` هم در آن اجرا نمی‌شود. production را با `node .next/standalone/apps/web/server.js` اجرا کن و `.next/static` و `public` را با script `postbuild` به `.next/standalone/apps/web/` کپی کن (وگرنه JS بارگذاری نمی‌شود و صفحه hydrate نمی‌شود).

با React Compiler فعال، `useMemo/useCallback/memo` دستی را ننویس مگر با دلیل measured. CSP با **nonce** الزامی است: `proxy.ts` برای هر درخواست nonce تازه می‌سازد، هدر `Content-Security-Policy` را می‌گذارد و nonce را با هدر درخواست به layout می‌دهد (`script-src 'nonce-…' 'strict-dynamic'`؛ `unsafe-eval` فقط در development).

### API client

یک `parse` مشترک، یک client مرورگر، یک client سرور.

```ts
// apps/web/src/lib/api/parse.ts
import type { ApiErrorBody, ErrorCode } from "@flysmart/contracts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body as Partial<ApiErrorBody> | null;
    throw new ApiError(
      res.status,
      error?.code ?? "INTERNAL",
      error?.message ?? "خطای غیرمنتظره‌ای رخ داد",
      error?.details,
    );
  }
  return body as T;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "خطای غیرمنتظره‌ای رخ داد";
}
```

```ts
// apps/web/src/lib/api/client.ts
import { paths } from "../paths";
import { parseResponse } from "./parse";

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

let refreshing: Promise<boolean> | null = null;

// Single-flight: concurrent 401s share one refresh request
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, { json, ...init }: ApiInit = {}): Promise<T> {
  const send = () =>
    fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });

  let res = await send();
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      res = await send();
    } else if (typeof window !== "undefined") {
      // Hard navigation on purpose: drops all client state of the expired session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(
        `${paths.signIn}?next=${encodeURIComponent(window.location.pathname)}`,
      );
    }
  }
  return parseResponse<T>(res);
}
```

```ts
// apps/web/src/lib/api/server.ts
import "server-only";

import { cookies } from "next/headers";

import { env } from "../env";
import { parseResponse } from "./parse";

export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${env.INTERNAL_API_URL}/v1${path}`, {
    ...init,
    headers: { cookie: cookieHeader, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  return parseResponse<T>(res);
}
```

- اگر refresh در کلاینت هم شکست خورد: ریدایرکت به `paths.signIn` همراه `?next=`.
- `cache: "no-store"` برای داده‌های شخصی. داده عمومی با `next: { revalidate, tags }`.

### لایه دسترسی به داده + proxy

**اصل:** `proxy.ts` فقط **بررسی خوش‌بینانه** است (UX و ریدایرکت سریع). امنیت واقعی در **backend guard** و **DAL سمت سرور** است، چون ریدایرکت proxy به‌تنهایی کافی نیست (درس CVE-2025-29927 — دور زدن middleware).

```ts
// apps/web/src/lib/auth/dal.ts
import "server-only";

import type { ApiResponse, UserDto } from "@flysmart/contracts";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ApiError } from "../api/parse";
import { serverApi } from "../api/server";
import { paths } from "../paths";

export const getSession = cache(async (): Promise<UserDto | null> => {
  try {
    const { data } = await serverApi<ApiResponse<{ user: UserDto }>>("/auth/me");
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
});

// Call close to data access (pages, actions), not only in layouts: layouts do not re-render on navigation
export async function requireSession(): Promise<UserDto> {
  const user = await getSession();
  if (!user) redirect(paths.signIn);
  return user;
}
```

- `requireSession()` را **نزدیک خود دسترسی به داده** صدا بزن (در page و Server Actionها)، نه فقط در layout: layoutها هنگام ناوبری دوباره render نمی‌شوند.
- نقش: `requireRole(Role.Admin)` بالای همین الگو.

فایل باید `src/proxy.ts` باشد وقتی پروژه پوشه `src/` دارد؛ در ریشه پروژه **بی‌صدا نادیده گرفته می‌شود**. بعد از build باید در خروجی `ƒ Proxy (Middleware)` دیده شود.

```ts
// apps/web/src/proxy.ts
import { COOKIE_NAMES } from "@flysmart/contracts";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_ORIGIN = process.env.INTERNAL_API_URL ?? "http://localhost:7781";
const PROTECTED_PREFIXES = ["/dashboard"];

function redirectToSignIn(request: NextRequest): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.cookies.delete(COOKIE_NAMES.access);
  response.cookies.delete(COOKIE_NAMES.refresh);
  return response;
}

// Server Components cannot set cookies, so an expired access token is rotated here
async function refreshAndContinue(request: NextRequest): Promise<NextResponse> {
  const res = await fetch(`${API_ORIGIN}/v1/auth/refresh`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return redirectToSignIn(request);

  const setCookies = res.headers.getSetCookie();
  const jar = new Map(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
  for (const line of setCookies) {
    const pair = line.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }

  // The same request must see the fresh tokens, the browser gets them via Set-Cookie
  const headers = new Headers(request.headers);
  headers.set("cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
  const response = NextResponse.next({ request: { headers } });
  for (const line of setCookies) response.headers.append("set-cookie", line);
  return response;
}

// Optimistic check only: real authorization lives in the API guards and the server-side DAL
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hasAccess = request.cookies.has(COOKIE_NAMES.access);
  const hasRefresh = request.cookies.has(COOKIE_NAMES.refresh);

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (hasAccess) return NextResponse.next();
    if (hasRefresh) return refreshAndContinue(request);
    return redirectToSignIn(request);
  }

  if (pathname === "/sign-in" && (hasAccess || hasRefresh)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
```

`[CERTAIN]` (تست‌شده روی dev server و build standalone) الگوی `refreshAndContinue` (خواندن `res.headers.getSetCookie()`، افزودن به `response.headers`، بازنویسی header `cookie` درخواست و `NextResponse.next({ request: { headers } })`) را هنگام پیاده‌سازی با تست واقعی تأیید کن، به‌ویژه سناریوی چند درخواست موازی (بازه تحمل ۱۰ ثانیه‌ای backend برای همین است).

### State و Data fetching

| نوع داده                    | ابزار                                         |
| --------------------------- | --------------------------------------------- |
| داده سرور، اولیه            | Server Component + `serverApi`                |
| داده سرور، تعاملی           | TanStack Query                                |
| mutation                    | `useMutation` + `invalidateQueries` + `toast` |
| وضعیت URL (فیلتر، صفحه، تب) | `nuqs`                                        |
| state محلی UI               | `useState`                                    |
| state سراسری کلاینتی (نادر) | Context → Zustand                             |

```ts
// features/orders/queries.ts
export const orderKeys = {
  all: ["orders"] as const,
  list: (query: PaginationQuery) => [...orderKeys.all, "list", query] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};

export function useOrders(query: PaginationQuery) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
  });
}
```

Session روی کلاینت: `useSession()` با `initialData` از layout سرور؛ بعد از ورود/خروج `router.refresh()` + `setQueryData`.

### فرم‌ها (RHF + Zod + shadcn Field)

الگوی رسمی shadcn: `Controller` + `Field` + `FieldError`، با `data-invalid` روی Field و `aria-invalid` روی کنترل `[CERTAIN]`.

```tsx
// apps/web/src/features/auth/components/mobile-step.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RequestOtpInput } from "@flysmart/contracts";
import { requestOtpSchema } from "@flysmart/contracts";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";

import { useRequestOtp } from "../queries";

interface MobileStepProps {
  onSent: (mobile: string) => void;
}

export function MobileStep({ onSent }: MobileStepProps) {
  const form = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    mode: "onTouched",
    defaultValues: { mobile: "" },
  });
  const requestOtp = useRequestOtp();

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await requestOtp.mutateAsync(values);
      onSent(values.mobile);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="mobile"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>شماره موبایل</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                className="text-start"
                placeholder="09123456789"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" size="lg" disabled={requestOtp.isPending}>
          {requestOtp.isPending && <Spinner data-icon="inline-start" aria-label="در حال ارسال" />}
          دریافت کد تأیید
        </Button>
      </FieldGroup>
    </form>
  );
}
```

قوانین فرم:

- schema فقط از `contracts`. هرگز دو بار نوشتن قانون در front.
- ارقام فارسی خودکار نرمال می‌شوند چون `mobileSchema` transform دارد.
- فیلدهای LTR (موبایل، کد، ایمیل، URL، شبا): `dir="ltr"` + `className="text-start"`.
- `InputOTP`: داخل wrapper با `dir="ltr"`، `autoComplete="one-time-code"`، `inputMode="numeric"`. **`pattern` نگذار** (ارقام فارسی کیبورد را پیش از `onChange` رد می‌کند)؛ در `onChange` با `normalizeDigits` و حذف غیررقم نرمال کن و پس از ۶ رقم خودکار submit کن.
- `<form>` را **بیرون** `Card` بگذار (`<form><Card>…</Card></form>`)؛ فرم داخل Card فاصله‌ی `gap` هدر/محتوا را می‌شکند.
- loading دکمه: `Spinner` + `disabled` (Button پراپ `isLoading` ندارد).
- خطای سرور مربوط به فیلد: `form.setError(name, { message })` از `ApiError.details`؛ خطای عمومی: toast.
- بعد از ۳ فیلد تکراری، wrapper `ControlledField` بساز؛ زودتر نه.
- بعد از ورود موفق: `router.replace(safeRedirect(next))` و `router.refresh()`.

```ts
// lib/safe-redirect.ts — prevents open redirects
export function safeRedirect(next: string | null | undefined, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
```

### SEO

- `lib/seo.ts` شامل `defaultMetadata` (title template، description، OG، `metadataBase`، `lang`).
- `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts` با Metadata API. صفحات خصوصی `robots: { index: false }`.
- تصویر OG با `opengraph-image.tsx`. داده ساختاریافته JSON-LD برای صفحات محتوایی.
- تصاویر فقط با `next/image` و `sizes` درست.

### Paths

```ts
export const paths = {
  home: "/",
  signIn: "/sign-in",
  dashboard: "/dashboard",
  profile: "/dashboard/profile",
  order: (id: string) => `/dashboard/orders/${id}`,
  admin: "/admin",
} as const;
```

### Performance و Accessibility (بودجه)

- LCP < 2٫5s، INP < 200ms، CLS < 0٫1 در شبکه موبایل.
- ترجیح Server Component؛ `dynamic()` برای کامپوننت‌های سنگین (chart، editor).
- هر عکس/آیکون تعاملی لیبل دارد؛ ناوبری کامل با کیبورد؛ focus-visible هرگز حذف نمی‌شود؛ `prefers-reduced-motion` رعایت می‌شود (در `motion`).
- axe در e2e برای صفحات کلیدی.

---

## ۱۰. قوانین UI با shadcn

هدف: کدی که با قراردادهای shadcn هم‌سو باشد تا آپدیت و کپی‌کردن از registry دردسر نشود. (AI حتماً بخواند.)

**استایل**

- `className` برای **layout** است، نه بازنویسی رنگ/تایپوگرافی کامپوننت. از variantهای آماده (`variant`, `size`) استفاده کن.
- رنگ فقط توکن معنایی: `bg-primary`, `text-muted-foreground`. ممنوع: `bg-blue-500`، `dark:` دستی.
- فاصله با `flex` + `gap-*` (نه `space-x-*`/`space-y-*`). ستون: `flex flex-col gap-4`.
- ابعاد مساوی: `size-10` (نه `w-10 h-10`). `truncate` (نه سه کلاس جدا). شرطی: `cn()`.
- `z-index` دستی روی Dialog/Sheet/Popover ممنوع؛ خودشان مدیریت می‌کنند.
- فقط **logical properties**: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. هرگز `ml/mr/pl/pr/left/right/text-left/text-right`.

**فرم‌ها**

- `FieldGroup` + `Field` + `FieldLabel` + `FieldError`؛ نه `div` با `space-y`.
- گروه چک‌باکس/رادیو: `FieldSet` + `FieldLegend`.
- دکمه/آیکون داخل input: `InputGroup` + `InputGroupAddon` + `InputGroupInput` (نه `Input` خام داخل `InputGroup`).
- ۲ تا ۷ گزینه‌ی انتخابی: `ToggleGroup`.

**ساختار**

- آیتم‌ها داخل Group: `SelectItem` در `SelectGroup`، `DropdownMenuItem` در `DropdownMenuGroup`، `CommandItem` در `CommandGroup`.
- `Dialog`/`Sheet`/`Drawer`/`AlertDialog` همیشه Title دارند (اگر نباید دیده شود `className="sr-only"`).
- `Card` کامل: `CardHeader/CardTitle/CardDescription/CardContent/CardFooter`.
- `TabsTrigger` فقط داخل `TabsList`. `Avatar` همیشه `AvatarFallback` دارد.
- تریگر سفارشی: `asChild` (Radix).

**به‌جای markup سفارشی**

| نیاز                | کامپوننت                                         |
| ------------------- | ------------------------------------------------ |
| هشدار/توضیح         | `Alert`                                          |
| حالت خالی           | `Empty`                                          |
| جداکننده            | `Separator` (نه `<hr>`/border-t)                 |
| لودینگ              | `Skeleton` / `Spinner` (نه `animate-pulse` دستی) |
| برچسب وضعیت         | `Badge`                                          |
| تأیید عملیات خطرناک | `AlertDialog`                                    |
| پیام گذرا           | `toast` از `sonner`                              |

**آیکون**

- در `Button`: `data-icon="inline-start"` / `"inline-end"` و **بدون** کلاس اندازه (`size-4`).
- آیکون جهت‌دار (فلش، chevron): `rtl:rotate-180`.
- آیکون به‌عنوان component پاس بده، نه string.

**الگوهای هر صفحه** (رعایت اجباری)

- لیست: `Skeleton` هنگام لودینگ ← `Empty` اگر خالی ← خطا با `Alert` + دکمه «تلاش دوباره» ← داده.
- حذف: `AlertDialog` با متن مشخص (نام آیتم) و دکمه destructive.
- Mutation: دکمه disabled + Spinner، سپس toast موفقیت/خطا، سپس invalidate.
- Mobile-first: همه صفحات از ۳۲۰px به بالا بدون اسکرول افقی؛ جدول‌ها در موبایل تبدیل به کارت.

---

## ۱۱. فارسی‌سازی و RTL

- **فونت:** Vazirmatn (متغیر CSS `--font-vazirmatn` ← `--font-sans`). ارقام فونت لاتین‌اند؛ نمایش ارقام فارسی با `Intl`.
- **ذخیره:** ارقام همیشه انگلیسی در DB/API. **نمایش:** `formatNumber`, `formatPrice`, `formatDate` در `lib/format.ts`:

```ts
const nf = new Intl.NumberFormat("fa-IR");
export const formatNumber = (n: number) => nf.format(n);
export const formatToman = (rial: number) => `${nf.format(Math.round(rial / 10))} تومان`;
export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeZone: "Asia/Tehran",
  }).format(new Date(d));
```

- **جهت:** `dir="rtl"` روی `<html>` + `DirectionProvider`. محتوای LTR داخل متن (ایمیل، کد، URL) با `dir="ltr"` یا `<bdi>` ایزوله شود.
- **اعداد در جدول/آمار:** `tabular-nums`.
- **ورودی کاربر:** هر فیلد عددی از schema مشترک می‌گذرد (ارقام فارسی/عربی → انگلیسی).
- **پیام‌های Zod فارسی:** پیام‌ها را در خود schema بنویس. تنظیم یک‌جای locale فارسی Zod ممکن است موجود باشد `[LIKELY]` (`z.config(z.locales.fa())`).
- **تقویم:** شمسی با `Intl`/DayPicker Persian؛ ذخیره ISO UTC.
- **آماده برای زبان دوم:** چون فقط logical class داریم و متن‌ها در کامپوننت‌های feature جمع‌اند، افزودن `next-intl` بعدها مهاجرت ارزان است.

---

## ۱۲. تست و کیفیت

| لایه          | ابزار                                                                  | چه چیزی                                                            |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Contracts     | Vitest                                                                 | schemaها، `normalizeDigits`، `isValidNationalCode` (تست‌های جدولی) |
| API unit      | Vitest                                                                 | guardها و serviceها با mock provider                               |
| API e2e       | Vitest + supertest + `mongodb-memory-server` (replica set) `[CERTAIN]` | OTP، refresh چرخشی، guard، حذف نرم، rate limit                     |
| Web component | Vitest + Testing Library + MSW                                         | فرم‌ها، حالت‌های loading/error/empty                               |
| E2E           | Playwright                                                             | ورود با OTP ثابت، یک جریان اصلی محصول، دسترسی غیرمجاز              |
| A11y          | `@axe-core/playwright`                                                 | صفحات کلیدی                                                        |

- تست‌ها رفتار را می‌سنجند، نه پیاده‌سازی.
- `mongodb-memory-server` در `allowBuilds` خاموش است (postinstall دانلود می‌کند). آفلاین: `MONGOMS_SYSTEM_BINARY=$(which mongod) MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false`. در CI می‌تواند خودش دانلود کند.
- `globalSetup` ریپلیکاست را بالا می‌آورد؛ هر فایل تست دیتابیس یکتا می‌گیرد و AppModule را با `await import()` پس از تنظیم `DATABASE_URL` می‌سازد.
- Playwright: ورودی‌های server-rendered قبل از hydrate شدن با `fill()` پاک می‌شوند؛ از `expect(async () => { await fill; await expect(input).toHaveValue(v) }).toPass()` استفاده کن. سرورها را با پورت بکش، نه `pkill -f` (نام پروسه `next-server` است).
- هر باگ production: اول یک تست قرمز، بعد رفع.
- پوشش عددی هدف نیست؛ مسیرهای **پول، احراز هویت، دسترسی** باید تست داشته باشند.

---

## ۱۳. ابزار، CI و استقرار

### پایه

- `.nvmrc` + `engines` در `package.json`: آخرین Active LTS Node (در زمان نگارش ۲۴ `[LIKELY]`).
- `packageManager` در `package.json` (corepack) برای پین‌شدن نسخه pnpm.
- pnpm 11 اسکریپت‌های نصب را **به‌صورت پیش‌فرض مسدود** می‌کند؛ در `pnpm-workspace.yaml` نقشه `allowBuilds: { esbuild: true, sharp: true, … }` بنویس (نام `onlyBuiltDependencies` در این نسخه کار نمی‌کند). `catalog:` برای پین نسخه مشترک `typescript` و `eslint`.
- `husky`: اسکریپت `prepare` را **بعد از** نصب husky اضافه کن (وگرنه `pnpm add` با خطا می‌شکند).
- `pnpm-workspace.yaml` با تنظیمات امنیتی: `minimumReleaseAge` (چند روز تأخیر برای نسخه‌های تازه‌منتشرشده، دفاع در برابر supply-chain) و `onlyBuiltDependencies` (فقط پکیج‌های مجاز اسکریپت نصب اجرا کنند) `[LIKELY]` برای نام دقیق گزینه‌ها در نسخه‌ی pnpm شما.
- Husky: `pre-commit` → lint-staged (ESLint + Prettier روی فایل‌های تغییر کرده)؛ `commit-msg` → commitlint.

### scripts ریشه

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm --filter contracts build && pnpm -r --filter '!contracts' build",
    "typecheck": "pnpm -r typecheck",
    "lint": "eslint .",
    "test": "pnpm -r test",
    "format": "prettier --write ."
  }
}
```

### CI (`.github/workflows/ci.yml`)

مراحل: checkout ← setup pnpm/node (cache) ← `pnpm install --frozen-lockfile` ← `typecheck` ← `lint` ← `test` ← `build` ← (job جدا) Playwright. PR بدون سبز بودن همه، merge نمی‌شود. `pnpm audit --prod` به‌صورت هشدار.

### استقرار با PM2 و Caddy (بدون Docker)

معماری: `Internet → Caddy (:80/:443, TLS خودکار) → web (127.0.0.1:7782) → rewrite /api/* → api (127.0.0.1:7781) → MongoDB`. فقط Caddy عمومی است؛ API و web فقط روی loopback گوش می‌دهند (`HOST` و `HOSTNAME`).

**فایل‌ها (همه در اسکلت):**

`infra/ecosystem.config.cjs`

```js
// Run from the repo root: pm2 startOrReload infra/ecosystem.config.cjs --update-env
const path = require("node:path");

const root = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "app-api",
      cwd: path.join(root, "apps/api"), // the API reads its secrets from apps/api/.env
      script: "dist/main.js",
      // cluster x2 gives zero-downtime reloads (verified). The in-memory rate limiter is per worker,
      // so the effective limit is limit x instances; use fork + instances: 1 for strict limits
      // (costs ~0.5s of downtime per deploy) or move the throttler storage to Redis.
      exec_mode: "cluster",
      instances: 2,
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
      kill_timeout: 10_000, // lets Nest finish in-flight requests (enableShutdownHooks)
      autorestart: true,
      time: true,
    },
    {
      name: "app-web",
      cwd: path.join(root, "apps/web"),
      script: ".next/standalone/apps/web/server.js",
      exec_mode: "cluster",
      instances: 2,
      env: {
        NODE_ENV: "production",
        PORT: "7782",
        HOSTNAME: "127.0.0.1",
        INTERNAL_API_URL: "http://127.0.0.1:7781",
      },
      max_memory_restart: "768M",
      kill_timeout: 10_000,
      autorestart: true,
      time: true,
    },
  ],
};
```

`infra/Caddyfile`

```caddyfile
# Production: replace with your domain, e.g. example.com. Caddy obtains and renews TLS automatically.
{$SITE_ADDRESS:http://localhost:8080} {
	encode zstd gzip

	# Only the web app is public; it proxies /api/* to the API on loopback
	reverse_proxy 127.0.0.1:7782 {
		# Hides the short gap while PM2 restarts a process during deploys
		lb_try_duration 10s
		lb_try_interval 250ms
	}

	header {
		-Server
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
	}

	log {
		output file /var/log/caddy/app.log
	}
}
```

`scripts/deploy.sh`

```bash
#!/usr/bin/env bash
# Run on the server from the repo root. Stops before the PM2 reload if install or build fails.
# Note: `next build` rewrites .next while the old web process is still running; keep deploys short and off-peak.
set -euo pipefail

git pull --ff-only
corepack enable
pnpm install --frozen-lockfile
# INTERNAL_API_URL is baked into the Next rewrites at build time
INTERNAL_API_URL="http://127.0.0.1:7781" pnpm build
pm2 startOrReload infra/ecosystem.config.cjs --update-env
pm2 save
```

**راه‌اندازی اولیه سرور (یک‌بار):**

```bash
# Node (نسخه .nvmrc)، corepack، MongoDB (replica set یا سرویس مدیریت‌شده)، Caddy از مخزن رسمی
npm i -g pm2                      # بدون pm2 جهانی هم می‌شود، ولی deploy.sh فرض می‌کند در PATH است
pm2 startup systemd               # دستور خروجی را با sudo اجرا کن تا با ریبوت بالا بیاید
pm2 install pm2-logrotate
sudo cp infra/Caddyfile /etc/caddy/Caddyfile   # SITE_ADDRESS=example.com در محیط سرویس Caddy
sudo systemctl reload caddy
# secrets در apps/api/.env (chmod 600، خارج از git)
./scripts/deploy.sh
```

**قوانین (بعضی آزمایش‌شده، بعضی طبق مستندات):**

- `[CERTAIN]` PM2 7 با API ESM در حالت **cluster** کار می‌کند و `pm2 reload` حین ۶۰ درخواست پیوسته هیچ خطایی نداد (۰ خطا). حالت fork هنگام reload حدود نیم‌ثانیه قطعی داد (۳ پاسخ ناموفق از ۴۰).
- `[CERTAIN]` rate limiter حافظه‌ای **برای هر worker جدا** است؛ با ۲ worker سقف «۳ در دقیقه» عملاً ۶ شد. یا `instances: 1` (قطعی کوتاه هنگام deploy) یا storage مشترک (Redis) برای Throttler.
- `[CERTAIN]` فایل config باید `ecosystem.config.cjs` (یا `*.config.cjs`) نام داشته باشد؛ نام دیگر با `Cannot read properties of undefined (reading 'deploy')` می‌شکند. `PM2_HOME` برای سوکت یونیکس کوتاه بماند (<۱۰۰ کاراکتر).
- `[CERTAIN]` rewrite وب (`INTERNAL_API_URL`) در **زمان build** ثبت می‌شود، نه runtime؛ deploy.sh آن را هنگام build می‌دهد.
- `[CERTAIN]` Next هدر `X-Forwarded-For` را دست‌نخورده به API می‌رساند؛ Caddy آن را با IP واقعی کلاینت جایگزین می‌کند، پس `trust proxy 1` در API درست است **به شرطی که Next مستقیم در دسترس اینترنت نباشد** (فقط loopback).
- `[CERTAIN]` در `NODE_ENV=production` اپ با `OTP_FIXED_CODE` یا SMS کنسولی بالا نمی‌آید و provider پیاده‌نشده در boot خطا می‌دهد؛ پیش از اولین استقرار یک `SmsProvider` واقعی بنویس.
- `[LIKELY]` Caddyfile: ساختار استاندارد است ولی در محیط تست Caddy نصب نبود و اجرا نشده. پیش از اولین استفاده `caddy validate --config infra/Caddyfile` را بزن.
- بکاپ MongoDB، فایروال (فقط ۸۰ و ۴۴۳ و SSH باز)، و کاربر غیر-root برای PM2 الزامی است.

### مشاهده‌پذیری

- Sentry در api و web (source map). لاگ ساختاریافته با `requestId` که در پاسخ و Sentry هم هست.
- هشدار روی: نرخ ۵xx، تأخیر `otp/verify`، شکست ارسال SMS.

### داده

- ایندکس‌ها و تغییرات schema با `migrate-mongo` نسخه‌دار (در production `autoIndex` خاموش).
- بکاپ خودکار + **تست دوره‌ای بازیابی** (بکاپی که restore نشده باشد، بکاپ نیست).

---

## ۱۴. چک‌لیست امنیت

- [ ] هیچ secret در ریپو؛ `.env` در `.gitignore`؛ `.env.example` به‌روز.
- [ ] Zod env: بدون fallback برای secret؛ اپ بدون env درست بالا نمی‌آید.
- [ ] Token فقط در کوکی httpOnly؛ `Secure` در production؛ `SameSite=Lax`.
- [ ] Guard سراسری + `@Public()` صریح؛ RBAC با `@Roles()`.
- [ ] هر ورودی با Zod validate؛ فیلد اضافه رد/حذف می‌شود.
- [ ] هیچ document خام در پاسخ؛ فقط DTO از mapper.
- [ ] Rate limit سراسری + سخت‌گیرانه روی OTP، login، refresh.
- [ ] OTP: `crypto.randomInt`، HMAC، محدودیت تلاش، cooldown، بدون user enumeration.
- [ ] `helmet` فعال؛ هدرهای امنیتی در Next؛ `poweredByHeader: false`.
- [ ] CORS فقط allowlist (در حالت rewrite عملاً فقط همان origin).
- [ ] آپلود: MIME واقعی، سقف حجم، نام تصادفی، خارج از دیسک سرور.
- [ ] `safeRedirect` برای `next`؛ بدون `dangerouslySetInnerHTML` مگر با sanitizer.
- [ ] Mongo: بدون `$where`، ورودی کاربر مستقیم داخل query object نرود (Zod ساختار را ثابت می‌کند — از `z.object` استفاده کن نه `z.any()`).
- [ ] لاگ شامل توکن/کد OTP/شماره کامل نباشد (mask).
- [ ] وابستگی‌ها: lockfile commit، Renovate، `minimumReleaseAge`.
- [ ] بکاپ و restore تست‌شده.
- [ ] نشست: سقف بی‌فعالیتی و سقف مطلق؛ «خروج از همه دستگاه‌ها»؛ کار برگشت‌ناپذیر فقط با re-auth OTP.
- [ ] `CrossSiteGuard` سراسری؛ CSP با nonce در `proxy.ts`.
- [ ] Production بدون میان‌بر dev: `OTP_FIXED_CODE`، SMS کنسولی و پرداخت شبیه‌سازی‌شده در boot رد می‌شوند مگر با فلگ صریح (`ALLOW_DEV_AUTH`، `ALLOW_SIMULATED_PAYMENTS`) که فقط در `.env` سرور و موقت تنظیم شود.
- [ ] SMS واقعی (مثلاً ملی‌پیامک با `SMS_PROVIDER=melipayamak` و الگوی OTP) پیش از اولین ورود کاربر واقعی.
- [ ] Migration (`pnpm --filter <api> migrate`) در deploy قبل از `pm2 reload`؛ تست drift ایندکس در CI.

---

## ۱۵. Environment Variables

### `apps/api/.env` (و `.env.example` بدون مقدار حساس)

```env
NODE_ENV=development
PORT=7781
HOST=127.0.0.1
DATABASE_URL=mongodb://127.0.0.1:27018/skeleton?replicaSet=rs0

# generate: openssl rand -base64 48
JWT_ACCESS_SECRET=
OTP_HMAC_SECRET=

CORS_ORIGINS=http://localhost:7782

# console prints the OTP in dev; forbidden in production
SMS_PROVIDER=console
OTP_FIXED_CODE=
THROTTLE_ENABLED=true

# SMS_PROVIDER=melipayamak needs these (OTP pattern body id from the panel)
MELIPAYAMAK_API_KEY=
MELIPAYAMAK_OTP_BODY_ID=
MELIPAYAMAK_FROM=

# temporary production escape hatches; keep false and set only in the server .env
ALLOW_DEV_AUTH=false
ALLOW_SIMULATED_PAYMENTS=false
```

هنگام افزودن قابلیت‌ها (آپلود، پرداخت، SMS واقعی) کلیدهای آن‌ها را هم در `env.ts` (Zod) و `.env.example` اضافه کن؛ پیش از آن نباید در سند/ریپو باشند.

### `apps/web/.env.local`

```env
# server-side only: where Next rewrites /api/* and where Server Components fetch
INTERNAL_API_URL=http://localhost:7781
NEXT_PUBLIC_SITE_URL=http://localhost:7782
```

> فقط چیزی که واقعاً باید در مرورگر باشد `NEXT_PUBLIC_` می‌گیرد. `lib/env.ts` (server-only) هم با Zod validate می‌شود.

---

## ۱۶. دستور ساخت پروژه

> ترتیب زیر در اسکلت اجرا و تأیید شده است. همه‌چیز با pnpm. نسخه‌ها فقط از catalog و lockfile.

```bash
# 1) ریشه
mkdir {project} && cd {project} && git init
# package.json: private، packageManager (pnpm@<نسخه نصب‌شده>)، engines، scripts (بخش ۱۳)
# pnpm-workspace.yaml: packages، allowBuilds، catalog (typescript ~6.0، eslint ~9.39)
mkdir -p apps packages/contracts/src infra docs/adr .github/workflows
pnpm add -D -w eslint @eslint/js typescript-eslint eslint-plugin-simple-import-sort eslint-config-next globals \
  prettier prettier-plugin-tailwindcss husky lint-staged @commitlint/cli @commitlint/config-conventional typescript
# سپس script `prepare: husky` را اضافه کن و `.husky/pre-commit` و `commit-msg` را بساز

# 2) contracts  (tsup + type: module + ignoreDeprecations در tsconfig)
cd packages/contracts && pnpm add zod && pnpm add -D tsup vitest typescript && cd ../..

# 3) api  (Nest 12: ESM، Vitest)
cd apps && pnpm dlx @nestjs/cli@latest new api --package-manager pnpm --skip-git --skip-install --strict && cd api
# نام را @{project}/api بگذار، typescript را catalog، oxlint/prettier تولیدی را حذف کن، بعد:
pnpm add '@{project}/contracts@workspace:*' @nestjs/config @nestjs/mongoose mongoose @nestjs/jwt \
  @nestjs/throttler @nestjs/terminus nestjs-pino pino pino-http helmet cookie-parser zod
pnpm add -D @types/cookie-parser pino-pretty mongodb-memory-server
cd ..

# 4) web  (shadcn؛ مراحل ساختاردهی در بخش ۹)
pnpm dlx shadcn@latest init -t next -b radix -p nova --rtl --no-monorepo -n web -y
cd web
pnpm dlx shadcn@latest add button card input field input-otp spinner sonner direction alert empty \
  skeleton badge separator tooltip dropdown-menu avatar label -y
pnpm add react-hook-form zod @hookform/resolvers @tanstack/react-query nuqs motion server-only '@{project}/contracts@workspace:*'
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom \
  @vitejs/plugin-react @playwright/test @axe-core/playwright babel-plugin-react-compiler
pnpm exec playwright install chromium
```

بررسی نهایی (همه باید سبز باشند):

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- [ ] `pnpm --filter @{project}/web test:e2e` (نیاز به MongoDB و `apps/api/.env` با `OTP_FIXED_CODE`)
- [ ] خروجی build web شامل `ƒ Proxy (Middleware)` است
- [ ] پورت‌ها: api=۷۷۸۱، web=۷۷۸۲
- [ ] README ریشه: کد preset shadcn، دستور dev، دستور تست
- [ ] ADR اول: «چرا این Blueprint»

---

## ۱۷. Recipe: ساخت یک Feature کامل

مثال: `orders`. ترتیب کار مهم است (از قرارداد به UI).

1. **Contract** — `packages/contracts/src/orders/orders.schema.ts`: `createOrderSchema`, `orderDtoSchema`, `OrderStatus`. Build.
2. **Schema + ماژول** — `apps/api/src/modules/orders/`: `schemas/order.schema.ts` (با `softDeletePlugin`، ایندکس‌ها)، `dto/` (با `createZodDto`)، `orders.mapper.ts`, `orders.service.ts`, `orders.controller.ts`, `orders.module.ts`؛ ثبت در `AppModule`.
3. **تست API** — unit service + e2e (دسترسی، pagination، حالت‌های خطا).
4. **Frontend API** — `features/orders/api.ts` (توابع تایپ‌شده با نوع‌های contracts) و `queries.ts` (key factory + hooks).
5. **UI** — `features/orders/components/` (لیست با Skeleton/Empty/Error، فرم با RHF+Zod، حذف با AlertDialog)، **سپس** `app/(dashboard)/dashboard/orders/page.tsx` که فقط render می‌کند.
6. **State URL** — فیلتر/صفحه با `nuqs`.
7. **تست web + e2e** — فرم، حالت‌ها، یک جریان Playwright.
8. **بازبینی** — [Definition of Done](#۱۸-definition-of-done).

لیست **pagination** در backend:

```ts
@Get()
async list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<PaginatedResponse<OrderDto>> {
  return this.ordersService.list(user.id, query); // { data, meta }
}
```

---

## ۱۸. Definition of Done

هیچ تسکی «تمام» نیست مگر:

- [ ] `typecheck`, `lint`, `test`, `build` واقعاً اجرا و سبز شده‌اند
- [ ] ورودی/خروجی از contracts؛ بدون `any`
- [ ] حالت‌های loading / empty / error / unauthorized در UI پیاده شده
- [ ] RTL و موبایل (۳۲۰px) و حالت تیره بررسی شده
- [ ] فقط کامپوننت/توکن shadcn و قوانین بخش ۱۰
- [ ] دسترسی با کیبورد و برچسب‌های a11y
- [ ] تست برای منطق پول/auth/دسترسی
- [ ] بدون secret/لاگ حساس
- [ ] تصمیم معماری جدید ← ADR
- [ ] گزارش واقعی: چه چیزی اجرا و چک شد، چه چیزی نه

---

## ۱۹. قالب CLAUDE.md برای پروژه‌ها

این فایل را در ریشه هر پروژه بگذار؛ کوتاه و همیشه‌بارگذاری‌شده نگه دار (نسخه‌ی تأییدشده اسکلت؛ `skeleton` و `@flysmart/*` را با نام پروژه عوض کن):

```markdown
# Skeleton — Agent Rules

Source of truth: PROJECT_BLUEPRINT_SHADCN.md. This file is the short, always-loaded subset.

## Commands

- `pnpm dev` | `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm build`
- API e2e tests start an in-memory Mongo replica set. Offline, point them at a local binary:
  `MONGOMS_SYSTEM_BINARY=$(which mongod) MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false pnpm test`
- Web e2e: `pnpm --filter @flysmart/web build && pnpm --filter @flysmart/web test:e2e` (needs MongoDB and apps/api/.env with OTP_FIXED_CODE=123456)
- Use pnpm only. The lockfile is committed. TypeScript and ESLint are pinned in the pnpm catalog on purpose.

## Architecture

- apps/api (NestJS :7781, ESM, relative imports with `.js`), apps/web (Next :7782), packages/contracts (Zod, shared).
- Request/response shapes live ONLY in packages/contracts. Never redefine them in an app.
- API envelope: `{ data }` | `{ data, meta }` | `ApiErrorBody`. Never return raw documents; use mappers.
- The browser only talks to `/api/*` on the web origin (Next rewrite). Tokens are httpOnly cookies.

## Code

- TS strict, no `any`, `catch (e: unknown)`. kebab-case files, named exports, no `I` prefix.
- Mongoose `@Prop` always gets an explicit `type` and values used in decorators are value imports (no `import type`).
- Comments explain WHY only. Imports are sorted by ESLint.
- `page.tsx` = routing only. `"use client"` only on leaves.

## UI (shadcn, RTL)

- Semantic tokens only. No raw colors, no `dark:` overrides, no `space-x/y`.
- Logical classes only (ms/me/ps/pe/start/end). Directional icons: `rtl:rotate-180`.
- Forms: FieldGroup + Field + Controller (RHF + Zod). LTR fields: `dir="ltr"` + `text-start`.
- Run `pnpm dlx shadcn@latest docs <component>` before using a component.

## Done means

typecheck + lint + tests actually run and green, loading/empty/error states handled, ADR for new decisions.
```

## ۲۰. تله‌های تأییدشده (Gotchas)

همه‌ی این‌ها هنگام ساخت اسکلت واقعاً رخ دادند و رفع شدند. قبل از «رفع» هر خطای مشابه، این جدول را بخوان.

| #   | علامت                                                                   | علت                                                                            | راه‌حل                                                                                |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | `tsup` در مرحله dts با `useCaseSensitiveFileNames` می‌شکند              | `pnpm add typescript` نسخه ۷ (بدون API قدیمی) نصب می‌کند                       | `typescript` را با catalog روی `~6.0` پین کن (peer `typescript-eslint` هم `<6.1` است) |
| 2   | خطای `TS5101 baseUrl deprecated` در build dts                           | tsup به tsconfig `baseUrl` تزریق می‌کند                                        | `"ignoreDeprecations": "6.0"` در tsconfig پکیج contracts                              |
| 3   | `eslint .` با `contextOrFilename.getFilename is not a function` می‌شکند | ESLint 10 با `eslint-plugin-react` (داخل `eslint-config-next`) ناسازگار است    | `eslint` و `@eslint/js` را روی `~9.39` پین کن                                         |
| 4   | `ERR_PNPM_IGNORED_BUILDS` و esbuild کار نمی‌کند                         | pnpm 11 اسکریپت‌های نصب را مسدود می‌کند و `onlyBuiltDependencies` را نمی‌شناسد | `allowBuilds: { esbuild: true, … }` در `pnpm-workspace.yaml`                          |
| 5   | `pnpm add` با `husky: command not found` می‌شکند                        | `prepare: husky` پیش از نصب husky                                              | ابتدا نصب، سپس افزودن script                                                          |
| 6   | exports پکیج contracts اشتباه (`index.mjs` در برابر `index.js`)         | بدون `"type": "module"` نام خروجی‌های tsup فرق می‌کند                          | `"type": "module"` + نقشه `exports` با `import`/`require`                             |
| 7   | Nest 12 با Jest/CJS/`@/` مطابق انتظار کار نمی‌کند                       | Nest 12 ESM + Vitest + oxlint می‌سازد                                          | import نسبی با `.js`؛ Vitest؛ ESLint ریشه                                             |
| 8   | `nestjs-zod` با Nest 12                                                 | peer تا Nest 11                                                                | `createZodDto` + pipe خودنوشت (بخش ۷)                                                 |
| 9   | `Cannot determine a type for the "X.userId" field`                      | `import type { Types }` متادیتای decorator را از بین می‌برد                    | `type: Types.ObjectId` صریح و import مقداری                                           |
| 10  | تست e2e با `DATABASE_URL: undefined` می‌شکند                            | `ConfigModule.forRoot` هنگام import validate می‌کند                            | env را قبل از `await import("../src/app.module.js")` تنظیم کن                         |
| 11  | `proxy.ts` اجرا نمی‌شود (redirect بدون `?next=`، refresh کار نمی‌کند)   | فایل در ریشه وب است نه `src/`                                                  | `src/proxy.ts`؛ در خروجی build دنبال `ƒ Proxy (Middleware)` بگرد                      |
| 12  | همان علامت در production                                                | `next start` با `output: "standalone"` proxy را اجرا نمی‌کند                   | `node .next/standalone/apps/web/server.js`                                            |
| 13  | صفحه در production hydrate نمی‌شود (فرم کار نمی‌کند)                    | `.next/static` و `public` در standalone نیست                                   | script `postbuild` که آن‌ها را کپی کند                                                |
| 14  | `DirectionProvider` خطای تایپ `dir missing` می‌دهد                      | پراپ الزامی `dir` است                                                          | `<DirectionProvider dir="rtl">`                                                       |
| 15  | فرم در Card فاصله ندارد                                                 | فرم داخل Card ساختار flex gap را می‌شکند                                       | `<form><Card>…</Card></form>`                                                         |
| 16  | InputOTP ارقام فارسی را نمی‌پذیرد                                       | `pattern` پیش از `onChange` رد می‌کند                                          | بدون `pattern` + `normalizeDigits` در `onChange`                                      |
| 17  | تست Playwright مقدار فیلد را «گم» می‌کند                                | `fill` پیش از hydrate شدن React پاک می‌شود                                     | `toPass()` helper (بخش ۱۲)                                                            |
| 18  | تست‌ها به سرور قدیمی وصل می‌شوند                                        | `pkill -f "next start"` پروسه `next-server` را نمی‌کشد                         | با `lsof -tiTCP:<port>` پروسه را بکش                                                  |
| 19  | میان‌بر `d` تم را عوض می‌کند                                            | scaffold shadcn `ThemeHotkey` دارد                                             | حذف (WCAG 2.1.4)                                                                      |
| 21  | `pm2 --version` پوشه `~/.pm2` و daemon می‌سازد                          | اجرای هر دستور pm2 daemon بالا می‌آورد                                         | در تست `PM2_HOME` موقت و کوتاه بده و آخر `pm2 kill` بزن                               |
| 22  | `Cannot read properties of undefined (reading 'deploy')` از pm2         | نام فایل config `ecosystem.config.cjs` نیست                                    | نام استاندارد                                                                         |
| 23  | `connect EINVAL …/rpc.sock`                                             | مسیر `PM2_HOME` برای سوکت یونیکس بلند است                                      | مسیر کوتاه مثل `/tmp/pm2h`                                                            |
| 24  | سقف rate limit با چند worker چند برابر می‌شود                           | Throttler حافظه‌ای است                                                         | `instances: 1` یا storage Redis                                                       |
| 25  | `SMS_PROVIDER=melipayamak` بی‌صدا از کنسول استفاده می‌کرد               | provider در ماژول ثابت بود                                                     | factory که provider پیاده‌نشده را در boot رد می‌کند                                   |
| 20  | اسکریپت `pnpm dev` وب بدون env کار نمی‌کند                              | `lib/env.ts` با Zod و مقدار default                                            | `.env.example` را کپی کن؛ `INTERNAL_API_URL` پیش‌فرض دارد                             |

### آنچه هنوز اجرا نشده است (صادقانه)

- `Caddyfile` (Caddy در محیط تست نبود) و `scripts/deploy.sh` روی یک سرور واقعی؛ `pm2 startup` و logrotate.
- بالا آمدن در `NODE_ENV=production` (نیازمند `SmsProvider` واقعی)؛ مکانیزم PM2 با `NODE_ENV=development` تست شد.
- workflow گیت‌هاب (`ci.yml`) روی GitHub.
- SMS واقعی، آپلود فایل، پرداخت، RBAC روی یک endpoint واقعی (فقط `RolesGuard` با تست unit).
- تقویم شمسی در فرم، Sentry. (`migrate-mongo` با تست e2e و تست drift ایندکس تأیید شده است.)

---

## پیوست — موارد مشروط (فقط با شرط ورود)

هر مورد را **فقط** وقتی شرط ورودش محقق شد اضافه کن؛ زودتر نه. اضافه‌کردن هر مورد = ADR.

| مورد                                   | شرط ورود                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- |
| **Redis** (cache، throttler مشترک، صف) | بیش از یک instance API، یا نیاز به صف                                   |
| **BullMQ** (صف کار)                    | کار طولانی/ارسال گروهی SMS/ایمیل، retry لازم                            |
| **OpenAPI → client تولیدی**            | اگر کلاینت غیر-TS (موبایل) اضافه شد                                     |
| **Feature flags**                      | نیاز به release تدریجی                                                  |
| **Turborepo**                          | CI کند شد                                                               |
| **next-intl**                          | اولین زبان دوم                                                          |
| **Storybook / رجیستری داخلی shadcn**   | چند پروژه‌ای که UI مشترک می‌خواهند (registry شخصی با `shadcn build`)    |
| **OpenTelemetry**                      | نیاز به trace توزیع‌شده                                                 |
| **Passkey/WebAuthn**                   | کاهش وابستگی به SMS                                                     |
| **Template ریپو**                      | پروژه سوم با این Blueprint؛ آنگاه کد تکرارشونده را به template تبدیل کن |

---

## پیوست — پرامپت‌های آماده (برای انسان؛ agent این بخش را نادیده بگیرد)

جاهای `{…}` را پر کن و فقط متن داخل بلوک را به agent بده. همراه پرامپت شروع، همین سند و پوشه `skeleton/` را پیوست کن.

### نسخه خلاصه

**شروع پروژه جدید**

```text
پروژه «{name}» را طبق PROJECT_BLUEPRINT_SHADCN.md بساز؛ از کپی skeleton/ شروع کن، نه از صفر.
محصول: {توضیح در چند جمله، نقش‌های کاربری، موجودیت‌های اصلی}
اول CLAUDE.md و بخش‌های ۱، ۲ و ۲۰ بلوپرینت را بخوان (بقیه را هنگام نیاز).
فقط برنامه بده: ماژول‌ها، صفحات، مدل‌ها، تعارض‌ها با بلوپرینت و حداکثر ۵ سؤال. بعد منتظر تأیید من بمان.
پس از هر مرحله typecheck + lint + test + build را واقعاً اجرا کن و نتیجه واقعی را بگو؛ چیزی که اجرا نکرده‌ای را «انجام‌شده» نخوان.
```

**تسک روی پروژه موجود**

```text
طبق CLAUDE.md پروژه این تسک را انجام بده: {تسک و معیار پذیرش}.
ترتیب: contracts ← API ← تست ← frontend ← تست. کوچک‌ترین راه‌حل کامل، بدون refactor نامرتبط.
اگر نیاز تسک با بلوپرینت تعارض دارد قبل از کدنویسی بگو. در پایان چک‌ها را واقعاً اجرا و نتیجه را صادقانه گزارش بده.
```

**استقرار**

```text
بخش «استقرار با PM2 و Caddy» بلوپرینت را اجرا کن. سرور: {…} دامنه: {…}
قبل از هر دستور روی سرور فهرست کارها را بده و تأیید بگیر. secret را چاپ نکن. در پایان سلامت و یک ورود کامل را تست و نتیجه واقعی را بگو.
```

### نسخه کامل

نسخه‌های کامل و دقیق‌تر هر سه پرامپت در فایل `AGENT_PROMPT.md` کنار این سند است. برای پروژه‌های بزرگ یا اولین اجرا از نسخه کامل استفاده کن.
