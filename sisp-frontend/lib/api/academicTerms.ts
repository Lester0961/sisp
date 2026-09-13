import apiClient from './client';

export interface AcademicTerm {
  id: string;
  academicYear: string;
  termNumber: number;
  code: string;
  label: string;
  startsOn?: string | null;
  endsOn?: string | null;
  status: 'planned' | 'active' | 'closed' | string;
  isCurrent: boolean;
}

export const academicTermsApi = {
  list: async (): Promise<AcademicTerm[]> => {
    const response = await apiClient.get<{ data?: AcademicTerm[] } | AcademicTerm[]>('/academic-terms');
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },
  current: async (): Promise<AcademicTerm | null> => {
    const response = await apiClient.get<AcademicTerm | null>('/academic-terms/current');
    return response.data;
  },
};
