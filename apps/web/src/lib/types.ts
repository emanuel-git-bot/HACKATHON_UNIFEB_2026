export type Role = "student" | "coordinator" | "admin";
export type CheckinMode = "entry" | "exit" | "entry_exit" | "entry_keyword";
export type AttendanceStatus = "incomplete" | "suspect" | "completed" | "rejected";
export type Phase = "entry" | "exit";

export interface User {
  id: string;
  role: Role;
  ra: string;
  name: string;
  courseId: string | null;
  courseName: string | null;
}

export interface Attendance {
  id: string;
  status: AttendanceStatus;
  entryAt: number | null;
  exitAt: number | null;
  keywordOk: boolean;
  keywordTries: number;
  suspectReason: string | null;
  review: "pending" | "confirmed" | "rejected";
  origin: "qr" | "manual";
}

export interface EventInfo {
  id: string;
  courseId: string;
  courseName: string | null;
  title: string;
  description: string;
  speaker: string;
  category: string;
  location: string;
  startsAt: number;
  endsAt: number;
  hours: number;
  checkinMode: CheckinMode;
  entryOpen: boolean;
  exitOpen: boolean;
}

export interface StudentEvent extends EventInfo {
  registered: boolean;
  attendance: Attendance | null;
}

export interface EventCounts {
  registered: number;
  completed: number;
  suspect: number;
  incomplete: number;
  attendance: number;
}

export interface Certificate {
  id: string;
  studentName: string;
  studentRa: string;
  eventTitle: string;
  eventStartsAt: number;
  eventEndsAt: number;
  eventLocation: string;
  courseName: string;
  hours: number;
  issuedAt: number;
  verificationCode: string;
}
