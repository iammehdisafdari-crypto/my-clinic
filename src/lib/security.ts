import { NextResponse } from "next/server";

/**
 * Validates request Origin and Sec-Fetch-Site to protect mutating requests from CSRF.
 * Strictly verifies scheme, hostname, and port against the canonical server host.
 */
export function verifyOrigin(request: Request): { ok: boolean; errorResponse?: Response } {
  const method = request.method?.toUpperCase();
  // Safe read-only HTTP methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { ok: true };
  }

  // 1. Check Sec-Fetch-Site (supported natively by modern browsers)
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: "درخواست از مبدأ غیرمجاز رد شد" },
        { status: 403 }
      ),
    };
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const cookieHeader = request.headers.get("cookie") || "";
  const hasAuthToken = cookieHeader.includes("auth_token=");

  // 2. Validate Origin header if present
  if (originHeader) {
    if (originHeader === "null") {
      return {
        ok: false,
        errorResponse: NextResponse.json({ error: "مبدأ درخواست نامعتبر است" }, { status: 403 }),
      };
    }

    try {
      const parsedOrigin = new URL(originHeader);
      const reqUrl = new URL(request.url);
      const host = request.headers.get("host")?.toLowerCase();

      const isSchemeMatch = parsedOrigin.protocol.toLowerCase() === reqUrl.protocol.toLowerCase();
      const isHostMatch =
        (host && parsedOrigin.host.toLowerCase() === host) ||
        parsedOrigin.host.toLowerCase() === reqUrl.host.toLowerCase();

      if (!isSchemeMatch || !isHostMatch) {
        return {
          ok: false,
          errorResponse: NextResponse.json(
            { error: "مبدأ درخواست مجاز نیست" },
            { status: 403 }
          ),
        };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        errorResponse: NextResponse.json({ error: "فرمت مبدأ درخواست نامعتبر است" }, { status: 403 }),
      };
    }
  }

  // 3. Fallback: If Origin is absent, inspect Referer
  if (refererHeader) {
    try {
      const parsedReferer = new URL(refererHeader);
      const reqUrl = new URL(request.url);
      const host = request.headers.get("host")?.toLowerCase();

      const isSchemeMatch = parsedReferer.protocol.toLowerCase() === reqUrl.protocol.toLowerCase();
      const isHostMatch =
        (host && parsedReferer.host.toLowerCase() === host) ||
        parsedReferer.host.toLowerCase() === reqUrl.host.toLowerCase();

      if (!isSchemeMatch || !isHostMatch) {
        return {
          ok: false,
          errorResponse: NextResponse.json(
            { error: "ارجاع‌دهنده درخواست مجاز نیست" },
            { status: 403 }
          ),
        };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        errorResponse: NextResponse.json({ error: "فرمت ارجاع‌دهنده نامعتبر است" }, { status: 403 }),
      };
    }
  }

  // 4. If BOTH Origin and Referer are absent:
  // For sensitive authenticated state-changing requests, reject without evidence.
  if (hasAuthToken) {
    if (process.env.NODE_ENV === "test" && (globalThis as any).__ALLOW_TEST_NO_ORIGIN__) {
      return { ok: true };
    }

    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: "مبدأ درخواست‌های تغییردهنده دارای نشست باید مشخص باشد" },
        { status: 403 }
      ),
    };
  }

  // For unauthenticated requests lacking Origin/Referer, allow
  return { ok: true };
}
