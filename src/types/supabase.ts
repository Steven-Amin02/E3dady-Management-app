import type { Attendance, Servant, Youth, ServiceSchedule, FollowUpLog, DailyFollowUpTask } from './database';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Shape<Row> = { [Key in keyof Row]: Row[Key] };
type Table<Row> = { Row: Shape<Row>; Insert: Partial<Shape<Row>>; Update: Partial<Shape<Row>>; Relationships: [] };

// Kept alongside the versioned migration. Regenerate with `supabase gen types typescript`
// against the deployed schema after applying migrations (see README).
export interface Database {
  public: {
    Tables: {
      servants: Table<Servant & { auth_user_id: string | null; created_at: string }>;
      youth: Table<Youth & { created_at: string }>;
      attendance: Table<Attendance & { version: number; created_at: string }>;
      service_schedules: Table<ServiceSchedule & { created_at: string }>;
      follow_up_logs: Table<FollowUpLog & { created_at: string }>;
      daily_follow_up_tasks: Table<DailyFollowUpTask>;
      youth_school_years: Table<{ youth_id: string; academic_year_start: string; school_year: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      record_attendance_changes: { Args: { p_operation_id: string; p_changes: Json; p_audit_category?: string; p_audit_notes?: string }; Returns: Json };
      record_follow_up: { Args: { p_operation_id: string; p_youth_id: string; p_method: string; p_outcome: string; p_notes: string; p_contacted_at: string }; Returns: Json };
      claim_daily_follow_up_task: { Args: { p_youth_id: string }; Returns: DailyFollowUpTask[] };
      promote_academic_year: { Args: Record<string, never>; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
