import apiClient from './client';

export interface CurriculumPrereq {
  requiresCode: string;
  isSelfReference?: boolean;
  isUnresolved?: boolean;
}

export interface CurriculumCourse {
  id: string;
  code: string;
  isCodeSynthesized?: boolean;
  title: string;
  units: number;
  lecUnits?: number;
  labUnits?: number | null;
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

export interface ProgressCourse {
  id: string;
  code: string;
  isCodeSynthesized?: boolean;
  title: string;
  units: number;
  lecUnits?: number;
  labUnits?: number | null;
  prereqText?: string | null;
  yearLevel: number;
  semester: number;
  termNumber?: number;
  termLabel?: string | null;
  status: 'completed' | 'ongoing' | 'remaining';
  prerequisites: Array<{ requiresCode: string; satisfied: boolean }>;
}

export interface CurriculumProgress {
  curriculum: {
    program: { code: string; name: string } | null;
    effectiveYear: number;
    schoolYear?: string | null;
  } | null;
  totals: {
    requiredSubjects: number;
    requiredUnits: number;
    completedSubjects: number;
    completedUnits: number;
    ongoingSubjects: number;
    ongoingUnits: number;
    remainingSubjects: number;
    remainingUnits: number;
    completionPercentage: number;
  };
  prerequisitesMet: boolean;
  unmetPrerequisites: Array<{
    courseCode: string;
    courseTitle: string;
    requiresCode: string;
  }>;
  courses: ProgressCourse[];
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
  // Server-computed progress (P4-06); the page only renders it.
  getMyProgress: async (): Promise<CurriculumProgress> => {
    const res = await apiClient.get<CurriculumProgress>('/curricula/me/progress');
    return res.data;
  },
};
