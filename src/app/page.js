export const runtime = "edge";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  let token = null;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("auth_token")?.value;
  } catch (e) {
    token = null;
  }

  // اگر توکن ورود وجود ندارد، مستقیماً به صفحه لاگین هدایت شو تا ارور ۵۰۰ رخ ندهد
  if (!token) {
    redirect("/login");
  }

  // اگر توکن داشت به داشبورد هدایت شود
  redirect("/dashboard");
}