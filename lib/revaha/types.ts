export type RevahaRole = "admin" | "org_user" | "company_admin" | "company_staff";

export type RevahaProfile = {
  id: string;
  role: RevahaRole;
  organization_id: string | null;
  reseller_company_id: string | null;
  full_name: string | null;
  email: string | null;
};

export type Organization = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  reseller_company_id: string | null;
};

export type ResellerCompany = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  url_token: string | null;
  billing_notes: string | null;
  billing_customer_ref: string | null;
  is_active: boolean;
};

export type Payment = {
  id: string;
  reseller_company_id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  card_last4: string | null;
  reference: string | null;
  notes: string | null;
};

export type RoleType = {
  id: string;
  name: string;
  reseller_company_id: string | null;
};

export type Role = {
  id: string;
  name: string;
  role_type_id: string;
  reseller_company_id: string | null;
};

export type IncomeRateGroup = "participant" | "rent_reimbursement";

export type IncomeRateCategory = {
  id: string;
  rate_group: IncomeRateGroup;
  name: string;
  monthly_amount: number;
  reseller_company_id: string | null;
};

export type FacilityModel = {
  id: string;
  name: string;
  participant_rate_id: string | null;
  rent_reimbursement_rate_id: string | null;
  security_participation_monthly: number | null;
  bat_sherut_full_rate: number | null;
  bat_sherut_bat_ami_rate: number | null;
  reseller_company_id: string | null;
};

export type FacilityModelRole = {
  id: string;
  facility_model_id: string;
  role_id: string;
  required_positions: number | null;
  monthly_hours_full_time: number | null;
  workdays_per_month: number | null;
  workdays_per_week: number | null;
  max_percent: number | null;
  affected_by_occupancy: boolean;
  notes: string | null;
  reseller_company_id: string | null;
};

export type Facility = {
  id: string;
  organization_id: string;
  name: string;
  facility_model_id: string | null;
  occupancy_actual: number | null;
  occupancy_tender: number | null;
  weekend_days_per_month: number | null;
};

export type PayMode = "hourly" | "monthly";
export type EmploymentType = "שכיר" | "עצמאי";

export type Staff = {
  id: string;
  facility_id: string;
  full_name: string;
  phone: string | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: EmploymentType;
};

export type ScheduleMethod = "detailed" | "consolidated";
export const WEEKDAY_LABELS = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"] as const;
/** Roles allowed to choose between detailed (day-by-day) and consolidated scheduling. All other roles use consolidated only. */
export const SCHEDULE_CHOICE_ROLES = ["מדריכים", "אם בית"];
/** User-facing phrasing for the two scheduling methods, used consistently across the UI, the bulk-import template, and the parser. */
export const SCHEDULE_METHOD_LABELS: Record<ScheduleMethod, string> = {
  detailed: "א-ש (שכר קבוע)",
  consolidated: "א-ה בנפרד ושישי שבת בנפרד",
};

export type DayShift = { start: string; end: string };
/** Keyed by weekday index as a string: "0" = Sunday ... "6" = Saturday. */
export type DailyShifts = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayShift>>;

export type StaffRoleAssignment = {
  id: string;
  staff_id: string;
  role_id: string;
  pay_mode: PayMode;
  hourly_rate: number | null;
  monthly_salary: number | null;
  monthly_hours: number | null;
  schedule_method: ScheduleMethod;
  weekday_hours: number | null;
  weekend_hours: number | null;
  daily_shifts: DailyShifts | null;
};

export type FacilityExpenseLineItem = {
  id: string;
  facility_id: string;
  category: string;
  monthly_amount: number | null;
  notes: string | null;
};
