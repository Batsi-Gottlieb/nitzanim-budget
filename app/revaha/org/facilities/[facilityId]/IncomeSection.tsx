"use client";

import { useState, useTransition } from "react";
import { FACILITY_INCOME_TYPE_LABELS, FacilityIncomeLineItem, FacilityIncomeType } from "@/lib/revaha/types";
import {
  createIncomeLineItem,
  deleteIncomeLineItem,
  updateFacilityIncome,
  updateIncomeLineItem,
} from "./actions";

type IncomeFacility = {
  id: string;
  participant_rate: number | null;
  rent_reimbursement_rate: number | null;
  security_participation_monthly: number | null;
  bat_sherut_rate: number | null;
  bat_ami_rate: number | null;
  bat_sherut_count: number;
  bat_ami_count: number;
};

const INPUT_CLASS = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm";
const TYPE_OPTIONS = Object.keys(FACILITY_INCOME_TYPE_LABELS) as FacilityIncomeType[];

function NumberField({ name, label, defaultValue, step }: { name: string; label: string; defaultValue: number | null; step?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <input name={name} type="number" step={step ?? "0.01"} defaultValue={defaultValue ?? ""} className={INPUT_CLASS} />
    </div>
  );
}

function TypeFields({ defaultType, defaultLabel }: { defaultType: FacilityIncomeType; defaultLabel: string | null }) {
  const [type, setType] = useState<FacilityIncomeType>(defaultType);
  const isOther = type === "other1" || type === "other2";
  return (
    <>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">סוג הכנסה</label>
        <select
          name="income_type"
          value={type}
          onChange={(e) => setType(e.target.value as FacilityIncomeType)}
          className="w-64 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {FACILITY_INCOME_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {isOther && (
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">פרטים</label>
          <input name="label" defaultValue={defaultLabel ?? ""} required className="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
      )}
    </>
  );
}

function IncomeLineRow({ item, facilityId }: { item: FacilityIncomeLineItem; facilityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateIncomeLineItem(item.id, facilityId, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSave} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <TypeFields defaultType={item.income_type} defaultLabel={item.label} />
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">סכום חודשי</label>
        <input
          name="monthly_amount"
          type="number"
          defaultValue={item.monthly_amount ?? ""}
          className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        disabled={isPending}
        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? "שומר..." : "שמירה"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteIncomeLineItem(item.id, facilityId))}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
      >
        הסרה
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}

export function IncomeSection({
  facility,
  items,
}: {
  facility: IncomeFacility;
  items: FacilityIncomeLineItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateFacilityIncome(facility.id, formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  function handleAdd(formData: FormData) {
    setAddError(null);
    startAddTransition(async () => {
      const result = await createIncomeLineItem(facility.id, formData);
      if (result?.error) setAddError(result.error);
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">הכנסות</h2>
      <p className="mb-3 text-xs text-slate-500">
        תעריפי הבסיס הועתקו ממודל הפנימייה כברירת מחדל, וניתן לשנותם עבור פנימייה זו בלבד.
      </p>

      <form action={handleSave} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField name="participant_rate" label="תעריף משתתף (לחודש)" defaultValue={facility.participant_rate} />
        <NumberField name="rent_reimbursement_rate" label='תעריף שיפוי שכ"ד (לחודש)' defaultValue={facility.rent_reimbursement_rate} />
        <NumberField name="security_participation_monthly" label="השתתפות אבטחה חודשית" defaultValue={facility.security_participation_monthly} />
        <div className="hidden sm:block" />
        <NumberField name="bat_sherut_rate" label="תעריף בת שירות" defaultValue={facility.bat_sherut_rate} />
        <NumberField name="bat_sherut_count" label="כמות בנות שירות" defaultValue={facility.bat_sherut_count} step="1" />
        <NumberField name="bat_ami_rate" label="תעריף בת עמי" defaultValue={facility.bat_ami_rate} />
        <NumberField name="bat_ami_count" label="כמות בנות עמי" defaultValue={facility.bat_ami_count} step="1" />
        <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
          <button
            disabled={isPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירת תעריפים"}
          </button>
          {saved && <span className="text-xs text-emerald-600">נשמר</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="mb-2 text-xs font-bold text-slate-700">הכנסות נוספות</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <IncomeLineRow key={`${item.id}:${item.income_type}:${item.label}:${item.monthly_amount}`} item={item} facilityId={facility.id} />
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">אין עדיין הכנסות נוספות</p>}
        </div>

        <form action={handleAdd} className="mt-4 flex flex-wrap items-end gap-2">
          <TypeFields defaultType="welfare_current_expenses" defaultLabel={null} />
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">סכום חודשי</label>
            <input name="monthly_amount" type="number" className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </div>
          <button
            disabled={addPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {addPending ? "מוסיף..." : "הוספת הכנסה"}
          </button>
          {addError && <span className="text-xs text-red-600">{addError}</span>}
        </form>
      </div>
    </section>
  );
}
