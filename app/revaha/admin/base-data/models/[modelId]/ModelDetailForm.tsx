"use client";

import { useTransition } from "react";
import { updateFacilityModel } from "../../actions";

type IncomeRateCategory = { id: string; rate_group: "participant" | "rent_reimbursement"; name: string; monthly_amount: number };
type FacilityModel = {
  id: string;
  name: string;
  participant_rate_id: string | null;
  rent_reimbursement_rate_id: string | null;
  security_participation_monthly: number | null;
  bat_sherut_full_rate: number | null;
  bat_sherut_bat_ami_rate: number | null;
};

export function ModelDetailForm({
  model,
  participantRates,
  rentReimbursementRates,
}: {
  model: FacilityModel;
  participantRates: IncomeRateCategory[];
  rentReimbursementRates: IncomeRateCategory[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateFacilityModel(model.id, formData));
  }

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-[#2A2560]">פרטי המודל</h2>
      <form action={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם המודל</label>
          <input
            name="name"
            defaultValue={model.name}
            required
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">תעריף משתתף</label>
          <select
            name="participant_rate_id"
            defaultValue={model.participant_rate_id ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          >
            <option value="">ללא</option>
            {participantRates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">תעריף שיפוי שכ״ד</label>
          <select
            name="rent_reimbursement_rate_id"
            defaultValue={model.rent_reimbursement_rate_id ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          >
            <option value="">ללא</option>
            {rentReimbursementRates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">השתתפות אבטחה חודשית</label>
          <input
            name="security_participation_monthly"
            type="number"
            defaultValue={model.security_participation_monthly ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">תעריף בת שירות (מלא)</label>
          <input
            name="bat_sherut_full_rate"
            type="number"
            defaultValue={model.bat_sherut_full_rate ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">תעריף בת עמי</label>
          <input
            name="bat_sherut_bat_ami_rate"
            type="number"
            defaultValue={model.bat_sherut_bat_ami_rate ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            disabled={isPending}
            className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירת פרטים"}
          </button>
        </div>
      </form>
    </section>
  );
}
