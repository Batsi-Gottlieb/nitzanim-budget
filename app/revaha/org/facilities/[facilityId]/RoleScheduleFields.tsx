"use client";

import { useState } from "react";
import { DailyShifts, ScheduleMethod, SCHEDULE_CHOICE_ROLES, WEEKDAY_LABELS } from "@/lib/revaha/types";

export function RoleScheduleFields({
  roleName,
  namePrefix = "",
  defaultMethod = "consolidated",
  defaultWeekdayHours,
  defaultWeekendHours,
  defaultDailyShifts,
}: {
  roleName: string;
  namePrefix?: string;
  defaultMethod?: ScheduleMethod;
  defaultWeekdayHours?: number | null;
  defaultWeekendHours?: number | null;
  defaultDailyShifts?: DailyShifts | null;
}) {
  const canChooseDetailed = SCHEDULE_CHOICE_ROLES.includes(roleName);
  const [method, setMethod] = useState<ScheduleMethod>(canChooseDetailed ? defaultMethod : "consolidated");
  const field = (name: string) => `${namePrefix}${name}`;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      {canChooseDetailed ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-slate-500">שיטת שיבוץ:</span>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMethod("consolidated")}
              className={`px-2.5 py-1 transition-colors ${method === "consolidated" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              מרוכזת
            </button>
            <button
              type="button"
              onClick={() => setMethod("detailed")}
              className={`px-2.5 py-1 transition-colors ${method === "detailed" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              מפורטת
            </button>
          </div>
          <input type="hidden" name={field("schedule_method")} value={method} />
        </div>
      ) : (
        <input type="hidden" name={field("schedule_method")} value="consolidated" />
      )}

      {method === "consolidated" ? (
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">שעות שבועיות (א׳-ה׳)</label>
            <input
              name={field("weekday_hours")}
              type="number"
              step="0.5"
              defaultValue={defaultWeekdayHours ?? ""}
              className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">שעות (שישי-שבת)</label>
            <input
              name={field("weekend_hours")}
              type="number"
              step="0.5"
              defaultValue={defaultWeekendHours ?? ""}
              className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const shift = defaultDailyShifts?.[String(i) as "0"];
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-12 shrink-0 text-slate-500">{label}</span>
                <input
                  type="time"
                  name={field(`shift_${i}_start`)}
                  defaultValue={shift?.start ?? ""}
                  className="w-24 rounded-lg border border-slate-200 px-1.5 py-1 text-xs"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  name={field(`shift_${i}_end`)}
                  defaultValue={shift?.end ?? ""}
                  className="w-24 rounded-lg border border-slate-200 px-1.5 py-1 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
