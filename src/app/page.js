export const runtime = "edge";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/permissions";

export default async function Home() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const dest = HOME_BY_ROLE[String(user.role || "").trim().toLowerCase()];
  if (!dest) redirect("/login?error=unsupported-role");
  redirect(dest);
}