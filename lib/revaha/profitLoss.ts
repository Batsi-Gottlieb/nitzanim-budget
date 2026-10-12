import {
  ExpenseDetailRow,
  ProfitLossSummary,
  addFacilityIncomes,
  computeFacilityIncome,
  computeProfitLoss,
  employerCostRowsToRoleTypes,
  facilityEmployerCostByAssignment,
} from "./calc";
import {
  Facility,
  FacilityExpenseLineItem,
  FacilityIncomeLineItem,
  Role,
  RoleType,
  Staff,
  StaffRoleAssignment,
} from "./types";

/**
 * Profit & loss across a set of facilities (the whole network, or one organization's facilities):
 * income from each facility's own tariffs + extra income lines, against employer-cost wages and
 * operating expenses — with per-employee / per-expense detail so the table can expand each line.
 */
export function buildProfitLoss(args: {
  facilities: Facility[];
  staff: Staff[];
  assignments: StaffRoleAssignment[];
  expenses: FacilityExpenseLineItem[];
  incomeItems: FacilityIncomeLineItem[];
  roles: Pick<Role, "id" | "name" | "role_type_id">[];
  roleTypes: Pick<RoleType, "id" | "name">[];
}): ProfitLossSummary {
  const { facilities, staff, assignments, expenses, incomeItems, roles, roleTypes } = args;
  const showFacilityNames = facilities.length > 1;

  const incomes = facilities.map((f) =>
    computeFacilityIncome(f, incomeItems.filter((i) => i.facility_id === f.id), showFacilityNames ? f.name : undefined)
  );

  const wageDetail = facilities.flatMap((f) => {
    const fStaff = staff.filter((s) => s.facility_id === f.id);
    const fStaffIds = new Set(fStaff.map((s) => s.id));
    const fAssignments = assignments.filter((a) => fStaffIds.has(a.staff_id));
    return facilityEmployerCostByAssignment(fStaff, fAssignments, f, roles, roleTypes, showFacilityNames ? f.name : undefined);
  });
  const wageMonthly = wageDetail.reduce((sum, r) => sum + r.employerCostMonthly, 0);

  const facilityNameById = new Map(facilities.map((f) => [f.id, f.name]));
  const facilityIds = new Set(facilities.map((f) => f.id));
  const relevantExpenses = expenses.filter((e) => facilityIds.has(e.facility_id));
  const expensesMonthly = relevantExpenses.reduce((sum, e) => sum + (e.monthly_amount ?? 0), 0);
  const expenseDetail: ExpenseDetailRow[] = relevantExpenses
    .filter((e) => (e.monthly_amount ?? 0) !== 0)
    .map((e) => ({
      label: e.category,
      monthly: e.monthly_amount ?? 0,
      facilityName: showFacilityNames ? facilityNameById.get(e.facility_id) : undefined,
    }));

  return computeProfitLoss(addFacilityIncomes(incomes), wageMonthly, expensesMonthly, employerCostRowsToRoleTypes(wageDetail), {
    wageDetail,
    expenseDetail,
  });
}
