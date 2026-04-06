import { create } from 'zustand';
import { StudentProfile, Grade, Enrollment } from '@/types';
import { studentsApi } from '@/lib/api/students';
import { gradesApi } from '@/lib/api/grades';
import { enrollmentsApi } from '@/lib/api/enrollments';

interface StudentState {
  // State
  profile: StudentProfile | null;
  grades: Grade[];
  enrollments: Enrollment[];
  totalUnits: number;
  isLoadingProfile: boolean;
  isLoadingGrades: boolean;
  isLoadingEnrollments: boolean;
  profileError: string | null;
  gradesError: string | null;
  enrollmentsError: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  fetchGrades: () => Promise<void>;
  fetchEnrollments: () => Promise<void>;
  fetchAll: () => Promise<void>;
  clearStudent: () => void;
}

export const useStudentStore = create<StudentState>()((set, get) => ({
  // Initial state
  profile: null,
  grades: [],
  enrollments: [],
  totalUnits: 0,
  isLoadingProfile: false,
  isLoadingGrades: false,
  isLoadingEnrollments: false,
  profileError: null,
  gradesError: null,
  enrollmentsError: null,

  fetchProfile: async () => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const data = await studentsApi.getMyProfile();
      set({ profile: data, isLoadingProfile: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        profileError:
          err?.response?.data?.message ?? 'Failed to load profile',
        isLoadingProfile: false,
      });
    }
  },

  fetchGrades: async () => {
    set({ isLoadingGrades: true, gradesError: null });
    try {
      const data = await gradesApi.getMyGrades();
      set({ grades: data.data ?? [], isLoadingGrades: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        gradesError:
          err?.response?.data?.message ?? 'Failed to load grades',
        isLoadingGrades: false,
      });
    }
  },

  fetchEnrollments: async () => {
    set({ isLoadingEnrollments: true, enrollmentsError: null });
    try {
      const data = await enrollmentsApi.getMyEnrollments();
      const enrollments: Enrollment[] = data.data ?? [];
      const totalUnits = enrollments
        .filter((e) => e.status === 'enrolled')
        .reduce((sum, e) => sum + (e.course?.units ?? 0), 0);
      set({
        enrollments,
        totalUnits,
        isLoadingEnrollments: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        enrollmentsError:
          err?.response?.data?.message ?? 'Failed to load enrollments',
        isLoadingEnrollments: false,
      });
    }
  },

  fetchAll: async () => {
    const { fetchProfile, fetchGrades, fetchEnrollments } = get();
    await Promise.all([fetchProfile(), fetchGrades(), fetchEnrollments()]);
  },

  clearStudent: () => {
    set({
      profile: null,
      grades: [],
      enrollments: [],
      totalUnits: 0,
      isLoadingProfile: false,
      isLoadingGrades: false,
      isLoadingEnrollments: false,
      profileError: null,
      gradesError: null,
      enrollmentsError: null,
    });
  },
}));