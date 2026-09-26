export type ServantRole = 'admin' | 'servant';
export type SchoolYear = '1st Prep' | '2nd Prep' | '3rd Prep';
export type AttendanceStatus = 'present' | 'absent' | 'excused';

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
}
