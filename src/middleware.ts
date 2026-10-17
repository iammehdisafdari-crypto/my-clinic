import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// فقط یک «دربان ساده»: اگر کوکی ورود نیست، به صفحه لاگین می‌فرستد.
// بررسی واقعی نقش و اعتبار توکن در خود API/صفحه‌ها انجام می‌شود (guard / requireRole).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsLogin = pathname.startsWith("/dashboard") || pathname.startsWith("/api/users");
  if (needsLogin && !req.cookies.get("auth_token")) {
    if (pathname.startsWith("/api/"))
      return Response.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/api/users/:path*"] };
