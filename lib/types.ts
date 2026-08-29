export type ModelCategory = "גנים" | "בתי_ספר";

export type Year = {
  id: string;
  hebrew_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export const MONTHS: { calendar_month: number; month_order: number; label: string }[] = [
  { calendar_month: 9, month_order: 1, label: "ספטמבר" },
  { calendar_month: 10, month_order: 2, label: "אוקטובר" },
  { calendar_month: 11, month_order: 3, label: "נובמבר" },
  { calendar_month: 12, month_order: 4, label: "דצמבר" },
  { calendar_month: 1, month_order: 5, label: "ינואר" },
  { calendar_month: 2, month_order: 6, label: "פברואר" },
  { calendar_month: 3, month_order: 7, label: "מרץ" },
  { calendar_month: 4, month_order: 8, label: "אפריל" },
  { calendar_month: 5, month_order: 9, label: "מאי" },
  { calendar_month: 6, month_order: 10, label: "יוני" },
];

export type YearGeneralData = {
  id: string;
  year_id: string;
  calendar_month: number;
  month_order: number;
  activity_days: number;
  feeding_days: number;
};

export type Model = {
  id: string;
  code: string;
  name: string;
  category: ModelCategory;
};

export type ModelBaseData = {
  id: string;
  year_id: string;
  model_id: string;
  lead_daily_hours: number;
  lead_hourly_rate: number;
  assistant_daily_hours: number;
  assistant_hourly_rate: number;
  inclusion_assistant_daily_hours: number;
  inclusion_assistant_hourly_rate: number;
  coordinator_daily_hours: number;
  coordinator_hourly_rate: number;
  avg_participants: number;
  min_clubs: number;
  max_clubs: number;
};

export type ModelLamasIncome = {
  id: string;
  year_id: string;
  model_id: string;
  lamas_level: number;
  participant_income_monthly: number;
  ministry_income_monthly: number;
};

export type Client = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  auth_user_id: string | null;
};

export type Profile = {
  id: string;
  role: "admin" | "client";
  client_id: string | null;
  full_name: string | null;
};

export type ClientYear = {
  id: string;
  client_id: string;
  year_id: string;
  lamas_level: number | null;
};

export type ClientModel = {
  id: string;
  client_year_id: string;
  client_id: string;
  model_id: string;
};

export type SubModel = {
  id: string;
  client_model_id: string;
  client_id: string;
  name: string;
  avg_weeks_per_month: number;
  active_months_count: number;
  participants_count: number;
  groups_count: number;
};

export type SubModelMonth = {
  id: string;
  sub_model_id: string;
  client_id: string;
  calendar_month: number;
  month_order: number;
  activity_days: number | null;
  feeding_days: number | null;
  short_camp_days: number;
  long_camp_days: number;
};

export type BudgetItemType =
  | "שכר"
  | "חוג_העשרה"
  | "מתכלים"
  | "הזנה"
  | "תקורה"
  | "הכנסה_משתתף"
  | "הכנסת_משרד";

export type CalcMethod = "ימים" | "שבועות";
export type SpreadMethod = "לפי_ימים" | "לפי_חודשי_פעילות";

export type BudgetLineItem = {
  id: string;
  sub_model_id: string;
  client_id: string;
  item_type: BudgetItemType;
  role_label: string | null;
  hourly_rate: number | null;
  employer_cost_multiplier: number | null;
  hours_per_day: number | null;
  hours_per_week: number | null;
  calc_method: CalcMethod | null;
  spread_method: SpreadMethod | null;
  weekly_count: number | null;
  session_cost: number | null;
  annual_cost: number | null;
  meal_cost: number | null;
  overhead_pct: number | null;
  income_monthly_override: number | null;
  notes: string | null;
  source: "base_default" | "manual";
};
