// Password hashes created by the older crypto helper treated the hex salt as
// UTF-8 text. The password helper used by user creation decodes that salt into
// bytes. Verify both formats so existing accounts remain usable, and create
// all new hashes with the byte-based format.
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(derived));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${toHex(salt)}:${await deriveHash(password, salt)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (typeof storedHash !== "string") return false;
  const separator = storedHash.indexOf(":");
  if (separator <= 0 || separator === storedHash.length - 1) return false;

  const saltHex = storedHash.slice(0, separator);
  const expectedHash = storedHash.slice(separator + 1);
  const saltBytes = fromHex(saltHex);
  if (!saltBytes || !/^[0-9a-f]{64}$/i.test(expectedHash)) return false;

  const byteBasedHash = await deriveHash(password, saltBytes);
  if (constantTimeEqual(byteBasedHash, expectedHash.toLowerCase())) return true;

  // Compatibility with hashes produced by the old src/lib/crypto.ts helper.
  const textSaltHash = await deriveHash(password, encoder.encode(saltHex));
  return constantTimeEqual(textSaltHash, expectedHash.toLowerCase());
}
