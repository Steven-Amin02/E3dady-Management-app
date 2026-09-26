export type ServantRole = 'admin' | 'servant';
export type SchoolYear = '1st Prep' | '2nd Prep' | '3rd Prep';
export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type PastoralTriageCategory =
  | 'critical_dropout'    // 🔴 3+ consecutive absences
  | 'newcomer_risk'       // 🟠 joined recently, attended 1-2, missed last 2
  | 'fading_regular'      // 🟡 historical engagement dropped recently
  | 'regular_active';     // 🟢 regular attendee

export type PastoralOutcomeCategory =
  | 'exams_study'         // 📚 امتحانات ومذاكرة
  | 'illness_health'      // 🩺 ظروف صحية ومرض
  | 'travel_relocation'   // 🚗 سفر وخارج المحافظة
  | 'spiritual_lukewarm'  // 🕊️ فتور روحي وبعد عن الكنيسة
  | 'unreachable'         // 📵 لم يرد / مغلق
  | 'family_circumstance' // 🏠 ظروف أسرية وخاصة
  | 'encouraged_attending';// ✅ تواصل مشجع ومستعد للحضور

export interface Servant {
  id: string;
  name: string;
  phone: string;
  role: ServantRole;
  created_at?: string;
}

export interface Youth {
  id: string;
  name: string;
  phone: string;
  school_year: SchoolYear;
  assigned_servant_id: string | null;
  notes: string;
  last_contacted_at?: string | null;
  created_at?: string;
}

export interface FollowUpLog {
  id: string;
  youth_id: string;
  servant_id: string;
  contact_date: string; // ISO date 'YYYY-MM-DD'
  method: 'call' | 'whatsapp';
  outcome?: PastoralOutcomeCategory;
  notes?: string;
  created_at?: string;
}

export interface Attendance {
  id: string;
  youth_id: string;
  session_date: string; // ISO date 'YYYY-MM-DD'
  status: AttendanceStatus;
  recorded_by: string | null;
  created_at?: string;
}

export interface ServiceSchedule {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  speaker_servant_id: string | null;
  lesson_title: string;
  activity_notes: string;
  created_at?: string;
}

export interface YouthWithDetails extends Youth {
  assigned_servant?: Servant | null;
  last_attendance_status?: AttendanceStatus | null;
  consecutive_absences?: number;
  total_sessions?: number;
  present_sessions?: number;
  attendance_rate?: number;
  triage_category?: PastoralTriageCategory;
  last_follow_up_outcome?: PastoralOutcomeCategory;
}

