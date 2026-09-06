import { Facility, FacilityExpenseLineItem, FacilityModelRole, Role, Staff, StaffRoleAssignment } from "./types";

const AVG_WEEKS_PER_MONTH = 4.3;
const DEFAULT_WEEKEND_DAYS_PER_MONTH = 8.6;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Splits one role assignment's weekly hours into a weekday (Sun-Thu) and weekend (Fri-Sat)
 * portion, from whichever schedule method it uses. Detailed shifts crossing midnight (e.g. a
 * night shift 23:00-07:00) wrap around the day. No overtime multiplier applied yet — that engine
 * is a follow-up phase.
 */
export function weeklyHourSplitForAssignment(assignment: StaffRoleAssignment): { weekday: number; weekend: number } {
  if (assignment.schedule_method === "consolidated") {
    return { weekday: assignment.weekday_hours ?? 0, weekend: assignment.weekend_hours ?? 0 };
  }
  const shifts = assignment.daily_shifts ?? {};
  let weekday = 0;
  let weekend = 0;
  for (const [dayIndex, shift] of Object.entries(shifts)) {
    if (!shift?.start || !shift?.end) continue;
    let diff = timeToMinutes(shift.end) - timeToMinutes(shift.start);
    if (diff <= 0) diff += 24 * 60;
    if (Number(dayIndex) >= 5) weekend += diff / 60;
    else weekday += diff / 60;
  }
  return { weekday, weekend };
}

/** Total weekly hours for one role assignment (weekday + weekend combined). */
export function weeklyHoursForAssignment(assignment: StaffRoleAssignment): number {
  const { weekday, weekend } = weeklyHourSplitForAssignment(assignment);
  return weekday + weekend;
}

/**
 * Monthly hours for one role assignment: the weekday portion scales with the average number of
 * weeks per month, the weekend portion scales with the facility's own average Fri+Sat days per
 * month (a "weekend occurrence" spans 2 days, so the multiplier is that count divided by 2).
 * Facilities without an explicit value fall back to 8.6 (=2 days * 4.3 weeks), which reproduces
 * the previous flat-4.3-for-everything behavior exactly.
 */
export function monthlyHoursForAssignment(assignment: StaffRoleAssignment, facility: Pick<Facility, "weekend_days_per_month">): number {
  const { weekday, weekend } = weeklyHourSplitForAssignment(assignment);
  const weekendDaysPerMonth = facility.weekend_days_per_month ?? DEFAULT_WEEKEND_DAYS_PER_MONTH;
  return weekday * AVG_WEEKS_PER_MONTH + weekend * (weekendDaysPerMonth / 2);
}

/**
 * Basic estimate only — no overtime rules yet (planned for a follow-up phase
 * once the detailed clock-in/clock-out reference sheets are available).
 */
export function assignmentHourlyRate(assignment: StaffRoleAssignment): number {
  if (assignment.pay_mode === "hourly") return assignment.hourly_rate ?? 0;
  if (assignment.monthly_hours && assignment.monthly_hours > 0) return (assignment.monthly_salary ?? 0) / assignment.monthly_hours;
  return 0;
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
  facility: Facility,
  expenses: FacilityExpenseLineItem[]
): FacilityBudgetSummary {
  let wageMonthly = 0;
  for (const a of assignments) {
    wageMonthly += monthlyHoursForAssignment(a, facility) * assignmentHourlyRate(a);
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

export type RoleStaffingRow = {
  roleId: string;
  roleName: string;
  roleTypeId: string;
  requiredPositions: number | null;
  requiredMonthlyHours: number | null;
  assignedMonthlyHours: number;
  assignedPositionsEquivalent: number | null;
  deltaMonthlyHours: number | null;
  deltaPositions: number | null;
};

/**
 * Per-role staffing comparison: how many hours/positions this facility's model requires for each
 * role (its תקן, from facility_model_roles_revaha) versus how many are actually assigned today.
 * The occupancy coefficient (actual/tender placements) only scales the requirement for roles the
 * model explicitly flags as occupancy-affected — e.g. a security guard's headcount doesn't shrink
 * just because a facility is under-occupied, but a counselor's might.
 */
export function roleStaffingSummary(
  facility: Facility,
  facilityModelRoles: FacilityModelRole[],
  roles: Pick<Role, "id" | "name" | "role_type_id">[],
  assignments: StaffRoleAssignment[]
): RoleStaffingRow[] {
  const occupancyCoefficient =
    facility.occupancy_tender && facility.occupancy_tender > 0
      ? (facility.occupancy_actual ?? 0) / facility.occupancy_tender
      : null;

  return facilityModelRoles.map((fmr) => {
    const role = roles.find((r) => r.id === fmr.role_id);
    const requiredPositions = fmr.required_positions;
    let requiredMonthlyHours = requiredPositions != null && fmr.monthly_hours_full_time != null
      ? requiredPositions * fmr.monthly_hours_full_time
      : null;
    if (requiredMonthlyHours != null && fmr.affected_by_occupancy && occupancyCoefficient != null) {
      requiredMonthlyHours *= occupancyCoefficient;
    }

    const assignedMonthlyHours = assignments
      .filter((a) => a.role_id === fmr.role_id)
      .reduce((sum, a) => sum + monthlyHoursForAssignment(a, facility), 0);
    const assignedPositionsEquivalent = fmr.monthly_hours_full_time
      ? assignedMonthlyHours / fmr.monthly_hours_full_time
      : null;

    return {
      roleId: fmr.role_id,
      roleName: role?.name ?? "?",
      roleTypeId: role?.role_type_id ?? "",
      requiredPositions,
      requiredMonthlyHours,
      assignedMonthlyHours,
      assignedPositionsEquivalent,
      deltaMonthlyHours: requiredMonthlyHours != null ? assignedMonthlyHours - requiredMonthlyHours : null,
      deltaPositions:
        requiredPositions != null && assignedPositionsEquivalent != null
          ? assignedPositionsEquivalent - requiredPositions
          : null,
    };
  });
}
