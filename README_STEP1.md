# مرحله ۱ — لاگین امن و نقش‌ها (متناسب با پروژه my-clinic)

## ۱) فایل‌ها را در پروژه کپی کن
محتوای این پوشه را روی پوشه پروژه‌ات کپی کن (ساختار پوشه‌ها یکی است).
فایل‌هایی که جایگزین می‌شوند: `next.config.mjs`، `src/app/login/page.tsx`،
`src/app/api/auth/login/route.ts`، `src/app/dashboard/manager/page.tsx`، `src/app/dashboard/visitor/page.tsx`.

## ۲) این فایل‌های قدیمی را حذف کن
- `src/lib/auth.ts`  (کلید JWT توش به‌صورت عمومی نوشته شده بود)
- `src/actions/auth.ts` (خالی است)
- `src/app/api/auth/register/route.ts` (ثبت‌نام آزاد خطرناک است)

## ۳) .gitignore و پوشه .wrangler
```bash
git rm -r --cached .wrangler
```
و محتوای `GITIGNORE_ADD.txt` را به انتهای `.gitignore` اضافه کن.

## ۴) راز JWT
```bash
cp .dev.vars.example .dev.vars
```
داخل `.dev.vars` یک رشته تصادفی طولانی (۳۲+ کاراکتر) بنویس. این فایل commit نمیشه.
برای سرور واقعی (Cloudflare Pages):
```bash
npx wrangler pages secret put JWT_SECRET --project-name clinic-app
```

## ۵) دیتابیس
اول ببین دیتابیس واقعی‌ات الان چه ستون‌هایی دارد (چون `schema.sql` با کد login فعلی همخوان نبود):
```bash
npx wrangler d1 execute clinic-db --local --command "PRAGMA table_info(users)"
```
بعد migration را اجرا کن:
```bash
npx wrangler d1 migrations apply clinic-db --local
```

## ۶) ساخت اولین مدیر
```bash
npx tsx scripts/make-user.ts admin "رمز-قوی-حداقل-۸-کاراکتر" "مدیر" manager
```
خروجی یک دستور INSERT است. آن را اجرا کن:
```bash
npx wrangler d1 execute clinic-db --local --command "INSERT INTO users ... (همان خروجی)"
```

## ۷) اجرا و تست
```bash
npm install --legacy-peer-deps
npm run dev
```
- با admin وارد شو → باید به `/dashboard/manager` بروی.
- بدون لاگین `/dashboard/manager` را باز کن → باید به `/login` برگردی.
- یک کاربر `visitor` بساز و با او `/dashboard/manager` را باز کن → باید به لاگین برگردد.
- `GET /api/users` با کاربر visitor باید ۴۰۳ بدهد.

## ۸) برای سرور واقعی
همین مراحل با `--remote` (migration و ساخت مدیر) + ثبت `JWT_SECRET` در Pages.
اگر قبلاً رمز `admin123` در سرور بود، حتماً با این migration پاک می‌شود.

## نکته مهم برای همه کدهای بعدی (Cloudflare Pages)
- هر `route.ts` و هر صفحه‌ای که از دیتابیس/کوکی می‌خواند باید خط
  `export const runtime = "edge";` داشته باشد.
- Cron (یادآوری ۲۴ ساعته) روی Pages ممکن نیست؛ همان Worker جداگانه‌ای که قبلاً گفتم لازم است.
