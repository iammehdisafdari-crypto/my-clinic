export const runtime = "edge";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/permissions";

export default async function Home() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const dest = HOME_BY_ROLE[user.role] || "/dashboard/manager";
  redirect(dest);
}