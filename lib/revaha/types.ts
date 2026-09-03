export type RevahaProfile = {
  id: string;
  role: "admin" | "org_user";
  organization_id: string | null;
  full_name: string | null;
  email: string | null;
};

export type Organization = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
};

export type RoleType = {
  id: string;
  name: string;
};

export type Role = {
  id: string;
  name: string;
  role_type_id: string;
};

export type IncomeRateGroup = "participant" | "rent_reimbursement";

export type IncomeRateCategory = {
  id: string;
  rate_group: IncomeRateGroup;
  name: string;
  monthly_amount: number;
};

export type FacilityModel = {
  id: string;
  name: string;
  participant_rate_id: string | null;
  rent_reimbursement_rate_id: string | null;
  security_participation_monthly: number | null;
  bat_sherut_full_rate: number | null;
  bat_sherut_bat_ami_rate: number | null;
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
};

export type Facility = {
  id: string;
  organization_id: string;
  name: string;
  facility_model_id: string | null;
  occupancy_actual: number | null;
  occupancy_tender: number | null;
};

export type PayMode = "hourly" | "monthly";
export type EmploymentType = "שכיר" | "עצמאי";

export type Staff = {
  id: string;
  facility_id: string;
  full_name: string;
  pay_mode: PayMode;
  hourly_rate: number | null;
  monthly_salary: number | null;
  monthly_hours: number | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: EmploymentType;
};

export type StaffRoleTypeRate = {
  id: string;
  staff_id: string;
  role_type_id: string;
  hourly_rate: number | null;
};

export type StaffRoleAssignment = {
  id: string;
  staff_id: string;
  role_id: string;
  weekly_hours: number | null;
};

export type FacilityExpenseLineItem = {
  id: string;
  facility_id: string;
  category: string;
  monthly_amount: number | null;
  notes: string | null;
};
