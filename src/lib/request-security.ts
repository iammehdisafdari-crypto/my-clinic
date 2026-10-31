/** Reject cross-origin state-changing requests when an authenticated cookie is present. */
export function verifyMutationOrigin(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    return Response.json({ error: "درخواست از مبدأ غیرمجاز رد شد" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const hasAuthCookie = (request.headers.get("cookie") || "").includes("auth_token=");
  const candidate = origin || referer;

  if (candidate) {
    if (candidate === "null") return Response.json({ error: "مبدأ درخواست نامعتبر است" }, { status: 403 });
    try {
      const parsed = new URL(candidate);
      const requestUrl = new URL(request.url);
      const host = request.headers.get("host")?.toLowerCase();
      const schemeMatches = parsed.protocol.toLowerCase() === requestUrl.protocol.toLowerCase();
      const hostMatches = (host && parsed.host.toLowerCase() === host) || parsed.host.toLowerCase() === requestUrl.host.toLowerCase();
      if (!schemeMatches || !hostMatches) {
        return Response.json({ error: "مبدأ درخواست مجاز نیست" }, { status: 403 });
      }
      return null;
    } catch {
      return Response.json({ error: "مبدأ درخواست نامعتبر است" }, { status: 403 });
    }
  }

  if (hasAuthCookie) {
    return Response.json({ error: "مبدأ درخواست تغییردهنده باید مشخص باشد" }, { status: 403 });
  }
  return null;
}
