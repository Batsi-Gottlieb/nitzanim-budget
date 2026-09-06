import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandedLoginForm } from "./BrandedLoginForm";

export default async function BrandedLoginPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const adminClient = createAdminClient();
  const { data: company } = await adminClient
    .from("reseller_companies_revaha")
    .select("id, name, logo_url, is_active")
    .eq("url_token", token)
    .maybeSingle();

  if (!company || !company.is_active) notFound();

  return <BrandedLoginForm companyId={company.id} companyName={company.name} logoUrl={company.logo_url} />;
}
