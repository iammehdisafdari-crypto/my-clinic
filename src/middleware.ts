import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;

  // اگر کاربر قصد ورود به پنل را دارد و توکن ندارد، ریدایرکت مستقیم به لاگین
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // اگر کاربر روی صفحه اصلی یا روت لاگین است و لاگین نیست، اجازه دسترسی بده
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};