import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // اینجا می‌توانید تنظیمات دیگر را اضافه کنید
};

// این بخش بسیار مهم است: شناسایی دیتابیس در حالت لوکال
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

export default nextConfig;