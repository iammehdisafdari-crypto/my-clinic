import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

// در حالت توسعه، دیتابیس D1 محلی و فایل .dev.vars را در دسترس می‌گذارد
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

export default nextConfig;
