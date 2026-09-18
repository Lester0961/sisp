import apiClient from './client';

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  applicantType: string;
  status: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  dob: string;
  sex?: string;
  nationality?: string;
  email: string;
  mobile: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode?: string;
  guardianName: string;
  guardianRelation: string;
  guardianContact: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyContact: string;
  lastSchoolName: string;
  lastSchoolType?: string;
  yearGraduated?: number;
  previousProgram?: string;
  strandTrack?: string;
  programId: string;
  reviewNotes?: string;
  program?: {
    id: string;
    code: string;
    name: string;
  };
  requirements?: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    status: string;
    definition: {
      id: string;
      code: string;
      title: string;
    };
  }>;
}

export interface RequirementDefinition {
  id: string;
  code: string;
  title: string;
  description?: string;
  applicantType?: string;
  isRequired: boolean;
  sortOrder: number;
}

export const admissionApi = {
  getRequirementDefinitions: async (applicantType?: string) => {
    const response = await apiClient.get<RequirementDefinition[]>('/admission/requirements/definitions', {
      params: { applicantType },
    });
    return response.data;
  },

  createApplication: async (data: Record<string, any>) => {
    const response = await apiClient.post<AdmissionApplication>('/admission/apply', data);
    return response.data;
  },

  getApplicationStatus: async (applicationNo: string) => {
    const response = await apiClient.get<AdmissionApplication>(`/admission/status/${applicationNo}`);
    return response.data;
  },

  submitRequirement: async (applicationNo: string, data: { definitionId: string; fileUrl: string; fileName: string; fileSize?: number; mimeType?: string }) => {
    const response = await apiClient.post(`/admission/status/${applicationNo}/requirements`, data);
    return response.data;
  },

  listApplications: async (status?: string, programId?: string, applicantType?: string) => {
    const response = await apiClient.get<AdmissionApplication[]>('/admission/applications', {
      params: { status, programId, applicantType },
    });
    return response.data;
  },

  reviewApplication: async (applicationNo: string, status: string, reviewNotes?: string, curriculumId?: string) => {
    const response = await apiClient.patch<AdmissionApplication>(`/admission/applications/${applicationNo}/review`, {
      status,
      reviewNotes,
      curriculumId,
    });
    return response.data;
  },

  activateStudentAccount: async (studentNumber: string, dob: string, email: string) => {
    const response = await apiClient.post('/students/activate', {
      studentNumber,
      dob,
      email,
    });
    return response.data;
  },
};
