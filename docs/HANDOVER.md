# گزارش تحویل — بازسازی پرواز پلاس

این سند صادقانه می‌گوید چه چیزی در محیط ساخت واقعاً اجرا شد و چه چیزی **باید روی سیستم شما** اجرا شود. محیط ساخت به npm دسترسی نداشت، پس هیچ وابستگی‌ای نصب نشد.

## اجرا شده (با ابزار موقت، خارج از pnpm)

- تست‌های واحد با harness مبتنی بر esbuild و shim برای vitest: همه سبز
  - contracts: تقویم جلالی ۱۵، دامنه ۳۱، پروازها ۱۹، تحلیل قیمت ۱۳، داده‌ی مرجع ۱۵، شِماها ۷، کد ملی/موبایل ۱۷
  - API: شبیه‌ساز بازار ۱۹، دستیار ۲۳، پایگاه دانش ۲۵
  - وب: chat-state ۲، checkout-schema ۵، countdown ۳، filter-offers ۵، selection ۴، target-schema ۲، format ۷
- typecheck «شل» (با stub برای React/Next/Nest/Mongoose): خطای واقعی در کد باقی نماند. چون stubها جای تایپ‌های واقعی را گرفته‌اند، این **جایگزین `pnpm typecheck` نیست**.

## اجرا نشده — پیش از هر چیز این‌ها را اجرا کنید

1. `pnpm install` (lockfile ممکن است تغییر کند؛ commit کنید)
2. `pnpm typecheck` — بیشترین ریسک: تایپ‌های واقعی React 19، Next 16، react-hook-form (`useForm<Input, unknown, Output>`، generic بودن `PassengerFields`)، Radix/shadcn
3. `pnpm lint` — ESLint (ترتیب import، قواعد react-hooks و React Compiler). `pnpm format` هم لازم است زیرا prettier روی همه‌ی فایل‌ها اجرا نشده
4. `pnpm test` با vitest واقعی، به‌همراه e2e‌ی API روی Mongo replica set (تراکنش‌های نگه‌داشتن صندلی/پرداخت)
5. `pnpm build` — رفتار Next 16 (async `params`/`searchParams`، `proxy.ts`، `cookies()` ناهمگام) و اسکریپت `apps/web/scripts/postbuild.mjs`
6. `pnpm --filter @flysmart/web test:e2e` (Playwright + axe) — انتخابگرهای تست‌ها هنوز با UI واقعی تطبیق داده نشده‌اند
7. `npx impeccable detect apps/web/src` برای ممیزی طراحی
8. بررسی دستی در مرورگر: RTL، حالت تیره، چاپ بلیت، نقشه‌ی صندلی، نمودار قیمت، موبایل

## محدودیت‌ها و ریسک‌های شناخته‌شده

- **محتوای پایگاه دانش** را هوش مصنوعی نوشته و بازبینی انسانی/حقوقی نشده است. مدخل‌های با برچسب `VOLATILE` (عوارض خروج، نظام‌وظیفه، ارز و گمرک، ویزا و رضایت‌نامه‌ی کودک، حقوق مسافر هنگام تأخیر) مرتب تغییر می‌کنند و باید با منبع رسمی تطبیق داده شوند. دستیار موظف است برای این‌ها «از منبع رسمی تأیید کنید» بگوید.
- «پیش از پاسخ، `search_rules` را صدا بزن» فقط در prompt سیستم است و در کد اجبار نشده.
- بازار پرواز و درگاه پرداخت شبیه‌سازی‌شده‌اند. برای production باید پیاده‌سازی واقعی `FLIGHT_PROVIDER` و `PAYMENT_PROVIDER` اضافه شود.
- کد ملی و گذرنامه رمزنگاری‌نشده ذخیره می‌شوند.
- فرض شده API `pingCheck` در Terminus 12 همان شکل مورد استفاده در health controller است؛ اگر typecheck خطا داد همان‌جا اصلاح کنید.
- فایل‌های shadcn در `components/ui` هنوز بعضی کلاس‌های `dark:` و فیزیکی دارند (مثلاً `badge.tsx`، `button.tsx`) و `import { cn } from "cn"` از پکیج `cn` می‌آید. مطابق قاعده‌ی پروژه (توکن‌های معنایی، کلاس‌های منطقی) باید یک‌بار با `pnpm dlx shadcn@latest add --overwrite` یا دست پاکسازی شوند.
- `useOutboundSelection` در `features/flights/filters.ts` فعلاً استفاده نمی‌شود (می‌توان حذف کرد).
- فیلد `savedPassengerId` در checkout و تایپ‌های generic فرم مسافر با تایپ واقعی RHF راستی‌آزمایی نشده‌اند.
- پوشه‌ی `scripts/` (deploy و run-remote شامل IP سرور و مسیر کلید) از فایل‌های اولیه‌ی شماست و دست‌نخورده است؛ آن را از git بیرون نگه دارید یا اطلاعاتش را به env ببرید.
- در بسته‌ی اولیه‌ی آپلودی چند فایل API و `apps/web/scripts/postbuild.mjs` وجود نداشتند؛ از نو نوشته شدند.

## فایل‌های قدیمی که باید دستی حذف شوند

بازنویسی روی فایل‌های موجود نوشته شد ولی حذف فایل از محیط ساخت ممکن نبود. فایل‌های نسخه‌ی قبلی که در بسته‌ی آپلودی نبودند یا جایگزین شدند، با stub بی‌اثر (`export {}` یا `describe.skip`) خنثی شده‌اند تا typecheck رد شود؛ همه‌ی آن‌ها را پاک کنید.

**حتماً پاک شود (stub ندارد و `next build` را خراب می‌کند):** سه پوشه‌ی مسیر قدیمی `apps/web/src/app/(marketing)`، `(dashboard)` و `(checkout)`. مسیرهایشان با `(site)` تکراری است.

**stubها (پاک شوند):**

- API: `infra/flight/{flight.module,mock-flight.provider}.ts`، `infra/payment/payment.module.ts`، `modules/assistant/{knowledge-base.ts,assistant.service.spec.ts,dto/ask-assistant.dto.ts}`، `modules/price-alerts/{price-alerts.mapper.ts,dto/create-price-alert.dto.ts}`، DTOهای قدیمی `create-booking`، `update-booking`، `budget-explore`، `fare-matrix`، `search-flights`، `create-passenger`، `update-passenger`، `initiate-payment`، `verify-payment`، و `deals.service.spec.ts` و `flights.service.spec.ts`
- وب: `components/shared/assistant-widget.tsx`، `features/profile/` (کل پوشه)، `features/flights/components/{fare-matrix-bar,flight-search-box,price-alert-dialog}.tsx`، `features/passengers/components/travelers-vault-selector.tsx`، `features/auth/components/{code-step,logout-button,mobile-step,mobile-step.test}.tsx`
- قراردادها: `flights/flights.schema.test.ts`، `bookings/bookings.schema.test.ts` و `passengers/passengers.schema.test.ts` با تست‌های جدید همان نام جایگزین شدند و می‌مانند.

سپس `apps/web/.next` را هم پاک کنید (کش قدیمی مسیرها).

## تصمیم‌های معماری

`docs/adr/0002` پایگاه دانش و ابزارهای دستیار، `0003` بازار شبیه‌سازی‌شده و تحلیل قیمت، `0004` فیلتر نتایج در مرورگر.
