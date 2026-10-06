# گزارش تحویل — بازسازی پرواز پلاس

آخرین به‌روزرسانی: ۱۴ مهر ۱۴۰۵ (۲۰۲۶-۱۰-۰۶)، پس از گشتن در سایت زنده با Playwright و اجرای دوباره‌ی همه‌ی بررسی‌ها. این سند فقط چیزهایی را «سبز» می‌نامد که کاربر روی سیستم خودش با ابزار واقعی اجرا کرده است.

## راستی‌آزمایی‌شده روی سیستم شما (ابزار واقعی)

| بررسی                                                     | نتیجه                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` (contracts، api، web)                    | سبز                                                                                                                                |
| `pnpm lint` (پس از `eslint --fix` و `format`)             | سبز، بدون هشدار                                                                                                                    |
| `pnpm format`                                             | اجرا شد                                                                                                                            |
| `pnpm test`                                               | contracts ۱۱۹، API واحد (دستیار ۲۴، پایگاه دانش ۳۱ و…)، API e2e ۴۶ (Mongo replica set واقعی: تراکنش صندلی/پرداخت)، وب ۴۲ — همه سبز |
| `pnpm build`                                              | سبز (Next 16.3.6)                                                                                                                  |
| `pnpm --filter @flysmart/web test:e2e` (Playwright + axe) | ۱۶ از ۱۶ سبز                                                                                                                       |

گشت دستی با Playwright روی سایت زنده: ۱۰ صفحه در دسکتاپ و موبایل، حالت تیره و روشن با axe (فقط یک مورد heading-order که رفع شد)، ورود با ارقام فارسی، همه‌ی صفحه‌های حساب، ۸ جستجوی نادرست، ۷ سؤال از دستیار و ۱۰ رزرو نادرست از طریق API.

## هنوز اجرا نشده

1. `npx impeccable detect apps/web/src` برای ممیزی طراحی.
2. بررسی دستی چاپ بلیت و نقشه‌ی صندلی روی موبایل.
3. رفتار دستیار با کلید واقعی Claude.
4. پس از آخرین تغییر دستیار (حذف پیشنهاد تکراری) یک‌بار `pnpm build` و راه‌اندازی دوباره‌ی `dev:all` تا در سایت زنده دیده شود.

## باگ‌های واقعی که اجرای واقعی پیدا کرد و رفع شد

- `ANTHROPIC_API_KEY=` خالی (حالت آفلاین مستند در `.env.example`) در اعتبارسنجی env رد می‌شد؛ حالا رشته‌ی خالی یعنی «تنظیم‌نشده».
- شناسه‌ی پرواز بدشکل ۴۰۴ می‌داد؛ حالا ۴۰۰ (`VALIDATION_FAILED`) و فقط شناسه‌ی درست‌شکلِ ناموجود ۴۰۴ است.
- ورود با `?next=`: ترکیب `router.replace` و `router.refresh` رقابت داشت و کاربر را به `/dashboard` می‌برد و مسیر پرداخت گم می‌شد؛ حالا ناوبری کامل (`window.location.replace`).
- نام دسترسی‌پذیر نداشتن اسلایدر قیمت، و نبودن تگ عنوان برای «تحلیل قیمت».
- `lastCabin` در نقشه‌ی صندلی هنگام رندر تغییر می‌کرد (قاعده‌ی React Compiler).
- `FilterQuery` در Mongoose 9 به `QueryFilter` تغییر نام داده است.
- بازیابی دستی: سؤال «مدارک سفر به استانبول» جواب پرواز داخلی می‌داد (پسوند «ی» ریشه‌یابی نمی‌شد و نام شهرهای خارجی در پایگاه دانش نبود)؛ رفع و تست دائمی شد.
- تاریخ تولد آینده یا بیش از ۱۲۰ سال پذیرفته می‌شد؛ حالا با پیام درست رد می‌شود.
- دکمه‌ی «تلاش دوباره» برای خطاهای ۴xx بی‌فایده نشان داده می‌شد؛ حذف شد.
- پیشنهاد بعدی دستیار گاهی همان جواب قبلی را تکرار می‌کرد؛ فیلتر شد.
- صفحه‌ی ورود h1 نداشت و صفحه‌ی قوانین از h1 به h3 می‌پرید؛ رفع شد.

## محدودیت‌ها و ریسک‌های شناخته‌شده

- **محتوای پایگاه دانش** را هوش مصنوعی نوشته و بازبینی انسانی/حقوقی نشده است. مدخل‌های `VOLATILE` (عوارض خروج، نظام‌وظیفه، ارز و گمرک، ویزا و رضایت‌نامه‌ی کودک، حقوق مسافر هنگام تأخیر) مرتب تغییر می‌کنند و باید با منبع رسمی تطبیق داده شوند. دستیار موظف است برای این‌ها «از منبع رسمی تأیید کنید» بگوید.
- «پیش از پاسخ، `search_rules` را صدا بزن» فقط در prompt سیستم است و در کد اجبار نشده.
- بازار پرواز و درگاه پرداخت شبیه‌سازی‌شده‌اند؛ برای production باید `FLIGHT_PROVIDER` و `PAYMENT_PROVIDER` واقعی اضافه شود.
- پرواز خارجی فقط از امام خمینی (IKA) در بازار شبیه‌سازی وجود دارد؛ جستجوی «تهران (مهرآباد)» به مقصد خارجی نتیجه‌ای ندارد و صفحه‌ی خالی راهنمایی نمی‌کند (پیشنهاد: پیام «از امام خمینی یا همه‌ی فرودگاه‌های تهران جست‌وجو کنید»).
- کد ملی و گذرنامه رمزنگاری‌نشده ذخیره می‌شوند.
- رفتار دستیار با کلید واقعی Claude (حلقه‌ی ابزار، timeout) فقط در حالت آفلاین و با شبیه‌ساز آزموده شده است.
- فایل‌های shadcn در `components/ui` هنوز بعضی کلاس‌های `dark:` و فیزیکی دارند و از ESLint مستثنا هستند؛ باید یک‌بار با `pnpm dlx shadcn@latest add --overwrite` یا دست پاکسازی شوند.
- `useOutboundSelection` در `features/flights/filters.ts` استفاده نمی‌شود (قابل حذف).
- پوشه‌ی `scripts/` (deploy و run-remote شامل IP سرور و مسیر کلید) و `infra/cloudflare-worker.js` از فایل‌های اولیه‌ی شما هستند؛ آن‌ها را از git بیرون نگه دارید یا اطلاعات را به env ببرید.

## فایل‌های قدیمی که باید دستی حذف شوند

حذف فایل از محیط ساخت ممکن نبود، پس فایل‌های نسخه‌ی قبلی با stub بی‌اثر (`export {}` یا `describe.skip`) خنثی شده‌اند. همه را پاک کنید و سپس `pnpm typecheck` و `pnpm test` را بزنید.

- API: `infra/flight/{flight.module,mock-flight.provider}.ts`، `infra/payment/payment.module.ts`، `modules/assistant/{knowledge-base.ts,assistant.service.spec.ts,dto/ask-assistant.dto.ts}`، `modules/price-alerts/{price-alerts.mapper.ts,dto/create-price-alert.dto.ts}`، DTOهای قدیمی `create-booking`، `update-booking`، `budget-explore`، `fare-matrix`، `search-flights`، `create-passenger`، `update-passenger`، `initiate-payment`، `verify-payment`، و `deals.service.spec.ts` و `flights.service.spec.ts`
- وب: `components/shared/assistant-widget.tsx`، `features/profile/` (کل پوشه)، `features/flights/components/{fare-matrix-bar,flight-search-box,price-alert-dialog}.tsx`، `features/passengers/components/travelers-vault-selector.tsx`، `features/auth/components/{code-step,logout-button,mobile-step,mobile-step.test}.tsx`
- پوشه‌ی `apps/api/dist` پیش از هر `pnpm build` پاک شود (فایل‌های ساخت قدیمی API را خراب می‌کردند).

## اجرای محلی در ویندوز

```powershell
$env:MONGOMS_SYSTEM_BINARY = (Get-Command mongod).Source
$env:MONGOMS_SYSTEM_BINARY_VERSION_CHECK = "false"
pnpm build
pnpm dev:all
```

برای ورود ثابت در `apps/api/.env`: `ALLOW_DEV_AUTH=true` و `OTP_FIXED_CODE=123456`. اگر پورت‌های ۷۷۸۱/۷۷۸۲ یا `mongod` از اجرای قبلی باز مانده‌اند، پیش از اجرا ببندید.

## تصمیم‌های معماری

`docs/adr/0002` پایگاه دانش و ابزارهای دستیار، `0003` بازار شبیه‌سازی‌شده و تحلیل قیمت، `0004` فیلتر نتایج در مرورگر.
