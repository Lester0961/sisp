import apiClient from './client';

export interface AdviserCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  _count?: { adviserAssignments: number };
}

export interface AdviserAssignmentRow {
  id: string;
  status: string;
  academicYear: string | null;
  createdAt: string;
  adviser: { id: string; firstName: string; lastName: string; email: string };
  student: {
    id: string;
    studentNumber: string;
    user: { firstName: string; lastName: string; email: string };
    program: { code: string } | null;
  };
  academicTerm: { code: string; label: string; academicYear: string } | null;
}

interface ListResponse<T> {
  data: T[];
}

export const advisersApi = {
  listAdvisers: async (): Promise<ListResponse<AdviserCandidate>> => {
    const response = await apiClient.get('/registrar/adviser-assignments/advisers');
    return response.data;
  },

  listAssignments: async (search?: string): Promise<ListResponse<AdviserAssignmentRow>> => {
    const response = await apiClient.get('/registrar/adviser-assignments', {
      params: search ? { search } : {},
    });
    return response.data;
  },

  assign: async (payload: {
    adviserId: string;
    studentId: string;
    academicYear?: string;
  }): Promise<{ message: string; data: AdviserAssignmentRow }> => {
    const response = await apiClient.post('/registrar/adviser-assignments', payload);
    return response.data;
  },

  setStatus: async (
    id: string,
    status: 'active' | 'inactive',
  ): Promise<{ message: string; data: AdviserAssignmentRow }> => {
    const response = await apiClient.patch(`/registrar/adviser-assignments/${id}`, { status });
    return response.data;
  },
};
