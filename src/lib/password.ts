// هش رمز با PBKDF2 (سازگار با Cloudflare؛ سقف مجاز تکرار ۱۰۰۰۰۰ است)
const enc = new TextEncoder();
const toHex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) =>
  new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 100000 },
    key,
    256
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${toHex(salt)}:${toHex(await derive(password, salt))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [s, h] = (stored || "").split(":");
  if (!s || !h) return false;
  return toHex(await derive(password, fromHex(s))) === h;
}
