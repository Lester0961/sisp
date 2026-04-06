import apiClient from './client';

export interface CurriculumCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  yearLevel: number;
  semester: number;
}

export const curriculaApi = {
  getMyCurriculum: async (): Promise<CurriculumCourse[]> => {
    const res = await apiClient.get<CurriculumCourse[]>('/curricula/me');
    return res.data;
  },
  getCompletedCourseIds: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>('/enrollments/completed-ids');
    return res.data;
  },
};