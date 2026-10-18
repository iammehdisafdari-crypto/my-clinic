export const runtime = "edge";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/permissions";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const destination = HOME_BY_ROLE[user.role] || "/dashboard/manager";
  redirect(destination);
}