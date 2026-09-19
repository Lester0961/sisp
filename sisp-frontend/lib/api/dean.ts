import apiClient from './client';

export interface Advisee {
  assignmentId: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    program: { code: string; name: string } | null;
  };
  term: { code: string; label: string; academicYear: string } | null;
  academicYear: string | null;
  completionPercentage: number;
}

export interface AdvisingConcern {
  id: string;
  studentId: string;
  studentName: string;
  category: string;
  summary: string;
  status: 'open' | 'in_review' | 'resolved';
  notes?: string | null;
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AdviseeDetail {
  student: {
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    program: { code: string; name: string } | null;
  };
  progress: {
    totals: {
      completedSubjects: number;
      completedUnits: number;
      ongoingSubjects: number;
      failedSubjects?: never;
      remainingSubjects: number;
      requiredUnits: number;
      completionPercentage: number;
    };
  };
  standing: {
    completedSubjects: number;
    failedSubjects: number;
    ongoingSubjects: number;
    droppedSubjects: number;
    completionPercentage: number;
    enrollmentStatuses: string[];
    recentResults: Array<{
      courseCode: string | null;
      courseTitle: string | null;
      term: string | null;
      finalGrade: number | null;
    }>;
  };
  concerns: AdvisingConcern[];
}

export const deanApi = {
  getAdvisees: async (): Promise<{ data: Advisee[]; total: number }> => {
    const response = await apiClient.get('/dean/advisees');
    return response.data;
  },

  getAdviseeDetail: async (studentProfileId: string): Promise<AdviseeDetail> => {
    const response = await apiClient.get(`/dean/advisees/${studentProfileId}`);
    return response.data;
  },

  getConcerns: async (): Promise<{ data: AdvisingConcern[]; total: number }> => {
    const response = await apiClient.get('/dean/concerns');
    return response.data;
  },

  createConcern: async (payload: {
    studentProfileId: string;
    category: string;
    summary: string;
  }) => {
    const response = await apiClient.post('/dean/concerns', payload);
    return response.data;
  },

  updateConcern: async (
    id: string,
    payload: { status?: string; notes?: string; resolution?: string },
  ) => {
    const response = await apiClient.patch(`/dean/concerns/${id}`, payload);
    return response.data;
  },

  deleteConcern: async (id: string) => {
    const response = await apiClient.delete(`/dean/concerns/${id}`);
    return response.data;
  },
};