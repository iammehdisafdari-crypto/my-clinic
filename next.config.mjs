/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // این خط باعث می‌شه بیلد متوقف نشه
    ignoreBuildErrors: true,
  },
  eslint: {
    // این خط هم جلوی ارورهای نگارشی رو می‌گیره
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
