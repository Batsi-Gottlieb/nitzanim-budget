import "server-only";
import crypto from "node:crypto";

const SECRET = process.env.SUPABASE_SECRET_KEY!;
export const IMPERSONATOR_COOKIE = "impersonator_id";

function hmac(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

/** Sign an admin user id so it can be safely round-tripped through a client-writable cookie. */
export function signAdminId(adminUserId: string) {
  return `${adminUserId}.${hmac(adminUserId)}`;
}

/** Verify a signed admin id; returns the admin user id if valid, otherwise null. */
export function verifySignedAdminId(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const [adminUserId, sig] = signed.split(".");
  if (!adminUserId || !sig) return null;
  const expected = hmac(adminUserId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return adminUserId;
}
