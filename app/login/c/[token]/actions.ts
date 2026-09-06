"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

/**
 * Confirms the just-authenticated user actually belongs to the reseller company whose branded
 * login page they used. Without this, anyone's valid credentials would work on ANY company's
 * branded URL — the page would just show the wrong company's logo for a moment, which is exactly
 * the kind of white-label mix-up a reseller must never see. On mismatch, returns the URL the user
 * should actually use instead (their own company's branded login, or the generic /login if they
 * aren't tied to any company).
 */
export async function verifyCompanyLoginMatch(pageCompanyId: string): Promise<{ ok: boolean; correctUrl: string | null }> {
  const session = await getCurrentRevahaProfile();
  if (!session?.profile) return { ok: false, correctUrl: null };

  const { profile } = session;
  if (profile.role === "admin") return { ok: true, correctUrl: null };

  const adminClient = createAdminClient();

  let actualCompanyId = profile.reseller_company_id;
  if (!actualCompanyId && profile.organization_id) {
    const { data: org } = await adminClient
      .from("organizations_revaha")
      .select("reseller_company_id")
      .eq("id", profile.organization_id)
      .maybeSingle();
    actualCompanyId = org?.reseller_company_id ?? null;
  }

  if (actualCompanyId === pageCompanyId) return { ok: true, correctUrl: null };

  if (!actualCompanyId) return { ok: false, correctUrl: null };

  const { data: correctCompany } = await adminClient
    .from("reseller_companies_revaha")
    .select("url_token")
    .eq("id", actualCompanyId)
    .maybeSingle();

  return { ok: false, correctUrl: correctCompany?.url_token ? `/login/c/${correctCompany.url_token}` : null };
}
