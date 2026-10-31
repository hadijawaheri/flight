# CLAUDE.md — حافظه‌ی دائمی پروژه

> این فایل در ابتدای هر جلسه‌ی Claude Code خوانده می‌شود. قبل از هر کار، بخش «وضعیت پروژه» را بخوان و مرحله‌ی فعلی را اعلام کن.

## وضعیت پروژه

- **نام پروژه:** پرواز پلاس، FlySmart (`flight`)
- **هدف نهایی:** وب روی Vercel (پروژه‌ی `flight`) و API روی سرور هادی پشت Caddy (پورت 7791 فقط روی `127.0.0.1`)
- **مرحله‌ی فعلی:** ۵. استقرار (نیمه‌کاره). آخرین commit شاخه‌ی اصلی (`efecd59`) روی Vercel در حالت production و READY است. تا API روی سرور نیاید، بخش‌های وابسته به API خاموش‌اند (تصمیم هادی، ۹ آبان). اجرای `scripts/server/deploy-apis.sh` در `ruflo-hq` با هادی است.
- **مرحله‌ی بعدی:** ۶. نگهداری، بعد از بالا آمدن API و Redeploy پروژه‌ی Vercel.
- **آخرین به‌روزرسانی:** 2026-10-31
- **تصمیم‌های باز:**
  - PR #5 و PR #6 (پیش‌نویس) هنوز بازند، ولی در فهرست تصمیم‌های هادی رد شده‌اند (P1، P2). باید بسته شوند.
  - `next` روی 16.3.6 است و طبق گزارش هفتگی ۳۱ اکتبر آسیب‌پذیری critical دارد؛ پیش از استقرار کامل باید به 16.4.1 یا بالاتر برود.
  - پروازها و درگاه پرداخت هنوز شبیه‌سازی‌اند؛ انتخاب تأمین‌کننده‌ی واقعی (issue #18) با هادی است.
  - هادی باید یک نسخه از `FLIGHT_PII_ENCRYPTION_KEY` را بیرون از سرور نگه دارد.
- **تصمیم‌های ثبت‌شده:**
  - کد ملی و شماره‌ی گذرنامه در دیتابیس رمزنگاری می‌شوند (PR #7).
  - هشدار قیمت با پیامک و تلاش دوباره (PR #8)؛ تاریخچه‌ی قیمت از کرایه‌های دیده‌شده (PR #9).
  - کارهای زمان‌بندی‌شده با GitHub Actions از راه HTTP اجرا می‌شوند (`scheduled-jobs.yml`، PR #19).
  - تا ملی‌پیامک، API با `SMS_PROVIDER=disabled` بالا می‌آید (PR #20).
  - MongoDB به‌صورت replica set، چون رزرو تراکنش لازم دارد.

### مراحل پروژه (به ترتیب)

0. **آماده‌سازی:** ریپو، گیت، محیط توسعه و دسترسی‌ها
1. **برنامه‌ریزی:** نیازمندی‌ها، معماری، ویژگی‌های نهایی
2. **راه‌اندازی محیط:** وابستگی‌ها، متغیرهای محیطی، اجرای لوکال
3. **ساخت:** پیاده‌سازی ویژگی‌ها به ترتیب اولویت
4. **کیفیت:** تست، لینت، بررسی امنیت، دیباگ
5. **استقرار:** انتخاب محل، CI/CD، دامنه، SSL، مانیتورینگ
6. **نگهداری:** باگ‌ها، به‌روزرسانی وابستگی‌ها، پشتیبان‌گیری

## نحوه‌ی کار

- در شروع هر جلسه: مرحله‌ی فعلی را بگو، بگو چه چیزی در جلسه‌ی قبل تمام شد، و **۱ تا ۳ سؤال مشخص** درباره‌ی گام بعدی بپرس تا پروژه به استقرار کامل برسد.
- قبل از رفتن به مرحله‌ی بعد، مطمئن شو که شروط مرحله‌ی فعلی برآورده شده‌اند (مثلاً برای رفتن به «استقرار» باید تست‌ها سبز باشند و محیط لوکال کار کند).
- بعد از هر تغییر در مرحله، یا وقتی تصمیم مهمی گرفته شد، همین بخش «وضعیت پروژه» را به‌روز کن. فقط آنچه واقعاً انجام شده یا تأیید شده را بنویس.
- بدون تأیید صریح کاربر، کد را روی شاخه‌ی اصلی push نکن، چیزی را منتشر یا حذف نکن، و هزینه‌ای ایجاد نکن (سرور، دامنه، سرویس ابری).
- اگر چیزی در وضعیت ثبت‌شده با واقعیت پروژه نمی‌خواند، قبل از ادامه همان را گزارش بده.
- مرحله‌ی همه‌ی پروژه‌ها در `projects.yaml` ریپوی `hadijawaheri/ruflo-hq` هم ثبت است و گزارش هفتگی آن را با این بخش مقایسه می‌کند. اگر مرحله را اینجا عوض کردی، در گزارش کار بگو.

## قواعد فنی

- زبان پاسخ‌ها: فارسی؛ نام‌های فنی، دستورها و کد به انگلیسی.
- کد جدید را همراه با تست یا دست‌کم دستور اجرای دستی بنویس.
- کامیت‌ها کوچک و با پیام واضح باشند.
- اسرار (کلید API، پسورد، توکن) را هرگز داخل کد یا این فایل نگذار؛ از `.env` و متغیرهای محیطی استفاده کن.
- قواعد کدنویسی همین ریپو در بخش «Agent Rules» پایین این فایل آمده است؛ برای کد و ساختار پروژه همان‌ها ملاک است.

## چک‌لیست استقرار (مرحله‌ی ۵)

- [x] ساخت موفق پروژه (`build`): در CI روی شاخه‌ی اصلی سبز است
- [x] تست‌ها سبز هستند (unit، API e2e و web e2e در CI)
- [ ] متغیرهای محیطی تولید تعریف شده‌اند: `INTERNAL_API_URL` روی Vercel گذاشته شده؛ متغیرهای API روی سرور با اجرای اسکریپت ساخته می‌شوند
- [ ] گیت‌هاب ریپو و شاخه‌ی اصلی محافظت شده است (بررسی نشده)
- [x] CI/CD فعال است (GitHub Actions، و Vercel از شاخه‌ی اصلی دیپلوی می‌کند)
- [x] محل استقرار انتخاب و تأیید شده است (وب Vercel، API سرور هادی)
- [ ] دامنه و SSL تنظیم شده‌اند: وب روی `vercel.app` آماده است؛ API هنوز نه
- [ ] پشتیبان‌گیری و مانیتورینگ/لاگ فعال است
- [ ] کاربر استقرار نهایی را تأیید کرده است

## FlySmart — Agent Rules

Source of truth: PROJECT_BLUEPRINT_SHADCN.md. This file is the short, always-loaded subset.

### Commands

- `pnpm dev` | `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm build`
- API e2e tests start an in-memory Mongo replica set. Offline, point them at a local binary:
  `MONGOMS_SYSTEM_BINARY=$(which mongod) MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false pnpm test`
- Web e2e: `pnpm --filter @flysmart/web build && pnpm --filter @flysmart/web test:e2e` (needs MongoDB and apps/api/.env with OTP_FIXED_CODE=123456)
- Use pnpm only. The lockfile is committed. TypeScript and ESLint are pinned in the pnpm catalog on purpose.

### Architecture

- apps/api (NestJS :7781, ESM, relative imports with `.js`), apps/web (Next :7782), packages/contracts (Zod, shared).
- Request/response shapes live ONLY in packages/contracts. Never redefine them in an app.
- API envelope: `{ data }` | `{ data, meta }` | `ApiErrorBody`. Never return raw documents; use mappers.
- The browser only talks to `/api/*` on the web origin (Next rewrite). Tokens are httpOnly cookies.

### Code

- TS strict, no `any`, `catch (e: unknown)`. kebab-case files, named exports, no `I` prefix.
- Mongoose `@Prop` always gets an explicit `type` and values used in decorators are value imports (no `import type`).
- Comments explain WHY only. Imports are sorted by ESLint.
- `page.tsx` = routing only. `"use client"` only on leaves.

### UI (shadcn, RTL)

- Semantic tokens only. No raw colors, no `dark:` overrides, no `space-x/y`.
- Logical classes only (ms/me/ps/pe/start/end). Directional icons: `rtl:rotate-180`.
- Forms: FieldGroup + Field + Controller (RHF + Zod). LTR fields: `dir="ltr"` + `text-start`.
- Run `pnpm dlx shadcn@latest docs <component>` before using a component.

### Done means

typecheck + lint + tests actually run and green, loading/empty/error states handled, ADR for new decisions.
