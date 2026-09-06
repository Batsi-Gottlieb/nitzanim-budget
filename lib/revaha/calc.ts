import { Facility, FacilityExpenseLineItem, FacilityModel, FacilityModelRole, IncomeRateCategory, Role, RoleType, Staff, StaffRoleAssignment } from "./types";

export const AVG_WEEKS_PER_MONTH = 4.3;
export const DEFAULT_WEEKENDS_PER_MONTH = 4.3;

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
 * weeks per month, the weekend portion scales with the facility's own average number of weekends
 * (Fri+Sat occurrences) per month — not every facility staffs every single weekend. Facilities
 * without an explicit value fall back to 4.3 (one every week), which reproduces the previous
 * flat-4.3-for-everything behavior exactly.
 */
export function monthlyHoursForAssignment(assignment: StaffRoleAssignment, facility: Pick<Facility, "weekends_per_month">): number {
  const { weekday, weekend } = weeklyHourSplitForAssignment(assignment);
  const weekendsPerMonth = facility.weekends_per_month ?? DEFAULT_WEEKENDS_PER_MONTH;
  return weekday * AVG_WEEKS_PER_MONTH + weekend * weekendsPerMonth;
}

/**
 * Effective hourly rate for display/reference only (e.g. "תעריף שעתי אפקטיבי" in the pay-detail
 * report) — NOT used to compute the actual monthly wage for a "monthly" assignment, since a fixed
 * salary must not silently zero out just because monthly_hours was left blank. See
 * assignmentMonthlyWage for the actual cost calculation.
 */
export function assignmentHourlyRate(assignment: StaffRoleAssignment): number {
  if (assignment.pay_mode === "hourly") return assignment.hourly_rate ?? 0;
  if (assignment.monthly_hours && assignment.monthly_hours > 0) return (assignment.monthly_salary ?? 0) / assignment.monthly_hours;
  return 0;
}

/**
 * Actual monthly wage cost for one assignment. An hourly assignment is hours actually scheduled
 * times its rate; a monthly assignment is simply its fixed salary — it does not scale with
 * scheduled hours (those may be entered for reference/occupancy-% purposes only), and must not
 * disappear just because monthly_hours was left blank.
 */
export function assignmentMonthlyWage(assignment: StaffRoleAssignment, facility: Pick<Facility, "weekends_per_month">): number {
  if (assignment.pay_mode === "monthly") return assignment.monthly_salary ?? 0;
  return monthlyHoursForAssignment(assignment, facility) * (assignment.hourly_rate ?? 0);
}

/** A staff member's total gross salary for the month — the sum of assignmentMonthlyWage across
 * every role they hold. */
export function staffGrossSalaryMonthly(
  staffId: string,
  assignments: StaffRoleAssignment[],
  facility: Pick<Facility, "weekends_per_month">
): number {
  return assignments
    .filter((a) => a.staff_id === staffId)
    .reduce((sum, a) => sum + assignmentMonthlyWage(a, facility), 0);
}

/**
 * Employer cost (עלות מעביד) — what it actually costs to employ this person, regardless of how
 * many roles they hold — used as the wage figure for the profit & loss report, per the employer's
 * own formula:
 *   שכיר, ללא קרן השתלמות: (ברוטו + תוספות קבועות) * 1.35 + נסיעות * 1.12
 *   שכיר, עם קרן השתלמות:   (ברוטו + תוספות קבועות) * 1.425 + נסיעות * 1.12
 *   עצמאי:                  ברוטו + תוספות קבועות + נסיעות (no multiplier — no employer contributions)
 * "תוספות קבועות" and "נסיעות" live on the staff record (shared across all their roles), so this
 * is computed once per employee, not per role, to avoid counting them more than once.
 */
export function staffEmployerCostMonthly(
  staff: Pick<Staff, "id" | "monthly_addition" | "monthly_travel" | "has_training_fund" | "employment_type">,
  assignments: StaffRoleAssignment[],
  facility: Pick<Facility, "weekends_per_month">
): number {
  const grossSalary = staffGrossSalaryMonthly(staff.id, assignments, facility);
  const fixedAdditions = staff.monthly_addition ?? 0;
  const travel = staff.monthly_travel ?? 0;

  if (staff.employment_type === "עצמאי") {
    return grossSalary + fixedAdditions + travel;
  }
  const multiplier = staff.has_training_fund ? 1.425 : 1.35;
  return (grossSalary + fixedAdditions) * multiplier + travel * 1.12;
}

/** Total employer cost across every staff member in a facility — the wage-cost line for the
 * profit & loss report (see staffEmployerCostMonthly). */
export function facilityEmployerCostMonthly(
  staffList: Pick<Staff, "id" | "monthly_addition" | "monthly_travel" | "has_training_fund" | "employment_type">[],
  assignments: StaffRoleAssignment[],
  facility: Pick<Facility, "weekends_per_month">
): number {
  return staffList.reduce((sum, staff) => sum + staffEmployerCostMonthly(staff, assignments, facility), 0);
}

export type FacilityIncomeSummary = {
  participantIncomeMonthly: number;
  rentReimbursementIncomeMonthly: number;
  securityIncomeMonthly: number;
  totalIncomeMonthly: number;
};

/**
 * Monthly income for one facility, from its model's rate definitions (set once by the admin in
 * base-data) applied to how many children are actually placed there today:
 *   הכנסות משתתפים = מושמים בפועל * תעריף המשתתף של המודל
 *   שיפוי שכ"ד      = מושמים בפועל * תעריף שיפוי שכ"ד של המודל
 *   השתתפות שמירה   = סכום קבוע חודשי מהמודל (לא תלוי במושמים)
 */
export function computeFacilityIncome(
  facility: Pick<Facility, "occupancy_actual">,
  facilityModel: Pick<FacilityModel, "participant_rate_id" | "rent_reimbursement_rate_id" | "security_participation_monthly"> | undefined,
  incomeRateCategories: Pick<IncomeRateCategory, "id" | "monthly_amount">[]
): FacilityIncomeSummary {
  const occupancy = facility.occupancy_actual ?? 0;
  const rateById = new Map(incomeRateCategories.map((c) => [c.id, c.monthly_amount]));
  const participantRate = facilityModel?.participant_rate_id ? rateById.get(facilityModel.participant_rate_id) ?? 0 : 0;
  const rentReimbursementRate = facilityModel?.rent_reimbursement_rate_id
    ? rateById.get(facilityModel.rent_reimbursement_rate_id) ?? 0
    : 0;
  const participantIncomeMonthly = occupancy * participantRate;
  const rentReimbursementIncomeMonthly = occupancy * rentReimbursementRate;
  const securityIncomeMonthly = facilityModel?.security_participation_monthly ?? 0;
  return {
    participantIncomeMonthly,
    rentReimbursementIncomeMonthly,
    securityIncomeMonthly,
    totalIncomeMonthly: participantIncomeMonthly + rentReimbursementIncomeMonthly + securityIncomeMonthly,
  };
}

export function addFacilityIncomes(summaries: FacilityIncomeSummary[]): FacilityIncomeSummary {
  return summaries.reduce(
    (acc, s) => ({
      participantIncomeMonthly: acc.participantIncomeMonthly + s.participantIncomeMonthly,
      rentReimbursementIncomeMonthly: acc.rentReimbursementIncomeMonthly + s.rentReimbursementIncomeMonthly,
      securityIncomeMonthly: acc.securityIncomeMonthly + s.securityIncomeMonthly,
      totalIncomeMonthly: acc.totalIncomeMonthly + s.totalIncomeMonthly,
    }),
    { participantIncomeMonthly: 0, rentReimbursementIncomeMonthly: 0, securityIncomeMonthly: 0, totalIncomeMonthly: 0 }
  );
}

export type ProfitLossSummary = {
  income: FacilityIncomeSummary;
  wageMonthly: number;
  expensesMonthly: number;
  totalCostsMonthly: number;
  netMonthly: number;
  netAnnual: number;
  totalIncomeAnnual: number;
  totalCostsAnnual: number;
};

/** Monthly + annual profit & loss: income (see computeFacilityIncome) against employer-cost wages
 * (see facilityEmployerCostMonthly, NOT gross salary) plus general operating expenses. Annual
 * figures are simply the monthly ones times 12, matching how the reference model itself projects
 * a "צפי שנתי" from its "חודש ממוצע" columns. */
export function computeProfitLoss(income: FacilityIncomeSummary, wageMonthly: number, expensesMonthly: number): ProfitLossSummary {
  const totalCostsMonthly = wageMonthly + expensesMonthly;
  const netMonthly = income.totalIncomeMonthly - totalCostsMonthly;
  return {
    income,
    wageMonthly,
    expensesMonthly,
    totalCostsMonthly,
    netMonthly,
    netAnnual: netMonthly * 12,
    totalIncomeAnnual: income.totalIncomeMonthly * 12,
    totalCostsAnnual: totalCostsMonthly * 12,
  };
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
    wageMonthly += assignmentMonthlyWage(a, facility);
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

export type RoleTypeStaffingRow = {
  roleTypeId: string;
  roleTypeName: string;
  requiredPositions: number | null;
  requiredMonthlyHours: number | null;
  assignedPositionsEquivalent: number | null;
  assignedMonthlyHours: number;
  deltaPositions: number | null;
  deltaMonthlyHours: number | null;
};

/** Rolls up per-role staffing rows (roleStaffingSummary) into one row per role TYPE — matching the
 * "ארגון צוות" reference sheet's header block, which compares נדרש/משובץ at the broader category
 * level (e.g. "מדריך") rather than per specific role. */
export function roleTypeStaffingSummary(
  rows: RoleStaffingRow[],
  roleTypes: Pick<RoleType, "id" | "name">[]
): RoleTypeStaffingRow[] {
  const byType = new Map<string, RoleStaffingRow[]>();
  for (const row of rows) {
    if (!byType.has(row.roleTypeId)) byType.set(row.roleTypeId, []);
    byType.get(row.roleTypeId)!.push(row);
  }

  const sumOrNull = (group: RoleStaffingRow[], select: (r: RoleStaffingRow) => number | null) => {
    const values = group.map(select).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };

  return Array.from(byType.entries()).map(([roleTypeId, group]) => {
    const requiredPositions = sumOrNull(group, (r) => r.requiredPositions);
    const requiredMonthlyHours = sumOrNull(group, (r) => r.requiredMonthlyHours);
    const assignedPositionsEquivalent = sumOrNull(group, (r) => r.assignedPositionsEquivalent);
    const assignedMonthlyHours = group.reduce((s, r) => s + r.assignedMonthlyHours, 0);
    return {
      roleTypeId,
      roleTypeName: roleTypes.find((rt) => rt.id === roleTypeId)?.name ?? "?",
      requiredPositions,
      requiredMonthlyHours,
      assignedPositionsEquivalent,
      assignedMonthlyHours,
      deltaPositions:
        requiredPositions != null && assignedPositionsEquivalent != null
          ? assignedPositionsEquivalent - requiredPositions
          : null,
      deltaMonthlyHours: requiredMonthlyHours != null ? assignedMonthlyHours - requiredMonthlyHours : null,
    };
  });
}

/** Merges per-facility roleStaffingSummary results into one row per role across the whole network —
 * summing each facility's own required/assigned figures (each already scaled by that facility's own
 * occupancy coefficient and weekend-days setting) rather than recomputing anything from scratch. */
export function mergeRoleStaffingSummaries(perFacility: RoleStaffingRow[][]): RoleStaffingRow[] {
  const byRole = new Map<string, RoleStaffingRow[]>();
  for (const rows of perFacility) {
    for (const row of rows) {
      if (!byRole.has(row.roleId)) byRole.set(row.roleId, []);
      byRole.get(row.roleId)!.push(row);
    }
  }

  const sumOrNull = (group: RoleStaffingRow[], select: (r: RoleStaffingRow) => number | null) => {
    const values = group.map(select).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };

  return Array.from(byRole.entries()).map(([roleId, group]) => {
    const requiredPositions = sumOrNull(group, (r) => r.requiredPositions);
    const requiredMonthlyHours = sumOrNull(group, (r) => r.requiredMonthlyHours);
    const assignedPositionsEquivalent = sumOrNull(group, (r) => r.assignedPositionsEquivalent);
    const assignedMonthlyHours = group.reduce((s, r) => s + r.assignedMonthlyHours, 0);
    return {
      roleId,
      roleName: group[0].roleName,
      roleTypeId: group[0].roleTypeId,
      requiredPositions,
      requiredMonthlyHours,
      assignedPositionsEquivalent,
      assignedMonthlyHours,
      deltaPositions:
        requiredPositions != null && assignedPositionsEquivalent != null
          ? assignedPositionsEquivalent - requiredPositions
          : null,
      deltaMonthlyHours: requiredMonthlyHours != null ? assignedMonthlyHours - requiredMonthlyHours : null,
    };
  });
}

/** A role's standard full-time WEEKLY hours, derived from the facility model's monthly standard.
 * Used to express one assignment's actual weekly hours as an occupancy percentage ("אחוזי משרה בפועל"). */
export function weeklyFullTimeHoursForRole(roleId: string, facilityModelRoles: FacilityModelRole[]): number | null {
  const fmr = facilityModelRoles.find((f) => f.role_id === roleId);
  if (!fmr?.monthly_hours_full_time) return null;
  return fmr.monthly_hours_full_time / AVG_WEEKS_PER_MONTH;
}
