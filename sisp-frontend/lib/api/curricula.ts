import apiClient from './client';

export interface CurriculumPrereq {
  requiresCode: string;
  isSelfReference?: boolean;
  isUnresolved?: boolean;
}

export interface CurriculumCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  lecUnits?: number;
  labUnits?: number;
  subjectArea?: string | null;
  catNo?: string | null;
  prereqText?: string | null;
  prerequisites?: CurriculumPrereq[];
  yearLevel: number;
  semester: number;
  termNumber?: number;
  termLabel?: string | null;
}

export interface MyCurriculum {
  program: { code: string; name: string };
  effectiveYear: number;
  schoolYear?: string | null;
  cmo?: string | null;
  sourceFile?: string | null;
  courses: CurriculumCourse[];
}

export interface Program {
  id: string;
  code: string;
  name: string;
}

export const curriculaApi = {
  getMyCurriculum: async (): Promise<CurriculumCourse[]> => {
    const res = await apiClient.get<CurriculumCourse[] | MyCurriculum>('/curricula/me');
    const data = res.data;
    // Backend now returns { program, courses } — unwrap for the checklist.
    if (Array.isArray(data)) return data;
    return data.courses ?? [];
  },
  getMyCurriculumFull: async (): Promise<MyCurriculum | null> => {
    const res = await apiClient.get<CurriculumCourse[] | MyCurriculum>('/curricula/me');
    const data = res.data;
    if (Array.isArray(data)) return null; // legacy shape
    return data;
  },
  getCompletedCourseIds: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>('/enrollments/completed-ids');
    return res.data;
  },
  getPrograms: async (): Promise<Program[]> => {
    const res = await apiClient.get<Program[]>('/curricula/programs');
    return res.data;
  },
};
