export interface User {
  id: string;
  email: string;
  role: 'student' | 'faculty' | 'admin_staff' | 'dean';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
}

export interface StudentProfile {
  id: string;
  studentNumber: string;
  yearLevel: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    role: { name: string };
  };
  program: Program;
  enrollments: Enrollment[];
  accountBalance: AccountBalance | null;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
}

export interface Enrollment {
  id: string;
  status: string;
  section: string | null;
  createdAt: string;
  course: Course;
  grade?: Grade | null;
}

export interface Grade {
  id: string;
  prelim: number | null;
  midterm: number | null;
  finals: number | null;
  finalGrade: number | null;
  isVisible: boolean;
  enrollment: {
    course: Course;
  };
}

export interface AccountBalance {
  balance: string;
  status: string;
}

export interface DocumentRequest {
  id: string;
  type: string;
  typeLabel: string;
  status: string;
  statusStep: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}