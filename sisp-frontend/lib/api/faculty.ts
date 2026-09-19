import apiClient from './client';

export interface AssignedClass {
  courseId: string;
  course: { code: string | null; title: string | null; units: number };
  term: { id: string; code: string; label: string; academicYear: string } | null;
  section: string;
  studentCount: number;
}

export interface RosterStudent {
  studentId: string | null;
  studentNumber: string | null;
  name: string;
  enrollmentId: string;
  finalGrade: number | null;
  gradeStatus: string | null;
}

export interface ClassRoster {
  class: {
    course: { code: string | null; title: string | null; units: number };
    term: { code: string; label: string; academicYear: string } | null;
    section: string;
    schedulePublished: boolean;
  };
  students: RosterStudent[];
  total: number;
}

export const facultyApi = {
  getAssignedClasses: async (termId?: string): Promise<{ data: AssignedClass[]; total: number }> => {
    const response = await apiClient.get('/faculty/classes', {
      params: termId ? { termId } : undefined,
    });
    return response.data;
  },

  getClassRoster: async (
    courseId: string,
    termId?: string,
    section?: string,
  ): Promise<ClassRoster> => {
    const response = await apiClient.get('/faculty/classes/roster', {
      params: { courseId, ...(termId ? { termId } : {}), ...(section ? { section } : {}) },
    });
    return response.data;
  },
};