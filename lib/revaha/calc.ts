import { Facility, FacilityExpenseLineItem, Role, Staff, StaffRoleAssignment, StaffRoleTypeRate } from "./types";

const AVG_WEEKS_PER_MONTH = 4.3;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Total weekly hours for one role assignment, from whichever schedule method it uses.
 * Detailed shifts crossing midnight (e.g. a night shift 23:00-07:00) wrap around the day.
 * No overtime multiplier applied yet — that engine is a follow-up phase.
 */
export function weeklyHoursForAssignment(assignment: StaffRoleAssignment): number {
  if (assignment.schedule_method === "consolidated") {
    return (assignment.weekday_hours ?? 0) + (assignment.weekend_hours ?? 0);
  }
  const shifts = assignment.daily_shifts ?? {};
  let total = 0;
  for (const shift of Object.values(shifts)) {
    if (!shift?.start || !shift?.end) continue;
    let diff = timeToMinutes(shift.end) - timeToMinutes(shift.start);
    if (diff <= 0) diff += 24 * 60;
    total += diff / 60;
  }
  return total;
}

/**
 * Basic estimate only — no overtime rules yet (planned for a follow-up phase
 * once the detailed clock-in/clock-out reference sheets are available).
 */
export function staffBaseHourlyRate(staff: Staff): number {
  if (staff.pay_mode === "hourly") return staff.hourly_rate ?? 0;
  if (staff.monthly_hours && staff.monthly_hours > 0) return (staff.monthly_salary ?? 0) / staff.monthly_hours;
  return 0;
}

function roleTypeRateFor(
  staffId: string,
  roleTypeId: string | undefined,
  rates: StaffRoleTypeRate[],
  fallbackHourly: number
): number {
  if (!roleTypeId) return fallbackHourly;
  const specific = rates.find((r) => r.staff_id === staffId && r.role_type_id === roleTypeId);
  return specific?.hourly_rate ?? fallbackHourly;
}

export type FacilityBudgetSummary = {
  wageMonthly: number;
  staffAdditionsMonthly: number;
  expensesMonthly: number;
  totalMonthly: number;
};

export function computeFacilityBudget(
  assignments: StaffRoleAssignment[],
  staffList: Staff[],
  roles: Role[],
  roleTypeRates: StaffRoleTypeRate[],
  expenses: FacilityExpenseLineItem[]
): FacilityBudgetSummary {
  let wageMonthly = 0;
  for (const a of assignments) {
    const staff = staffList.find((s) => s.id === a.staff_id);
    if (!staff) continue;
    const role = roles.find((r) => r.id === a.role_id);
    const baseRate = staffBaseHourlyRate(staff);
    const rate = roleTypeRateFor(staff.id, role?.role_type_id, roleTypeRates, baseRate);
    wageMonthly += weeklyHoursForAssignment(a) * rate * AVG_WEEKS_PER_MONTH;
  }

  const staffAdditionsMonthly = staffList.reduce(
    (s, st) => s + (st.monthly_addition ?? 0) + (st.monthly_travel ?? 0),
    0
  );
  const expensesMonthly = expenses.reduce((s, e) => s + (e.monthly_amount ?? 0), 0);

  return {
    wageMonthly,
    staffAdditionsMonthly,
    expensesMonthly,
    totalMonthly: wageMonthly + staffAdditionsMonthly + expensesMonthly,
  };
}

export function addFacilityBudgets(summaries: FacilityBudgetSummary[]): FacilityBudgetSummary {
  return summaries.reduce(
    (acc, s) => ({
      wageMonthly: acc.wageMonthly + s.wageMonthly,
      staffAdditionsMonthly: acc.staffAdditionsMonthly + s.staffAdditionsMonthly,
      expensesMonthly: acc.expensesMonthly + s.expensesMonthly,
      totalMonthly: acc.totalMonthly + s.totalMonthly,
    }),
    { wageMonthly: 0, staffAdditionsMonthly: 0, expensesMonthly: 0, totalMonthly: 0 }
  );
}

export function requiredPositionsSummary(facility: Facility) {
  const coefficient =
    facility.occupancy_tender && facility.occupancy_tender > 0
      ? (facility.occupancy_actual ?? 0) / facility.occupancy_tender
      : null;
  return { coefficient };
}
