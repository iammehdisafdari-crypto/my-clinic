import { destroySession } from "@/lib/session";

export const runtime = "edge";

export async function POST() {
  await destroySession();
  return Response.json({ success: true });
}
