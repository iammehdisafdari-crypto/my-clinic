import { destroySession } from "@/lib/session";
import { verifyOrigin } from "@/lib/security";

export const runtime = "edge";

export async function POST(request: Request) {
  const originCheck = verifyOrigin(request);
  if (!originCheck.ok && originCheck.errorResponse) {
    return originCheck.errorResponse;
  }

  await destroySession();
  return Response.json({ success: true });
}
