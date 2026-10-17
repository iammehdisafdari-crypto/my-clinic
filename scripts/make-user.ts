// ساخت دستور SQL برای اضافه کردن یک کاربر (بدون اینکه رمز جایی ذخیره شود)
// اجرا:  npx tsx scripts/make-user.ts <username> <password> "<نام کامل>" <role>
// role یکی از: manager | doctor | scheduler | visitor | uploader | nurse
import { hashPassword } from "../src/lib/password";

async function main() {
  const [username, password, fullName, role] = process.argv.slice(2);
  const roles = ["manager", "doctor", "scheduler", "visitor", "uploader", "nurse"];
  if (!username || !password || !fullName || !roles.includes(role) || password.length < 8) {
    console.error('استفاده: npx tsx scripts/make-user.ts <username> <password(حداقل ۸)> "<نام کامل>" <role>');
    process.exit(1);
  }
  const q = (s: string) => s.replace(/'/g, "''");
  const hash = await hashPassword(password);
  console.log(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES ('${q(username)}', '${hash}', '${q(fullName)}', '${role}');`
  );
}
main();
