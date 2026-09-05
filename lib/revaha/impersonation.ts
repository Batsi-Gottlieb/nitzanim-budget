import "server-only";

export { signAdminId, verifySignedAdminId } from "@/lib/impersonation";

export const REVAHA_IMPERSONATOR_COOKIE = "revaha_impersonator_id";
