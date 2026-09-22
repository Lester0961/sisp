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
    fileName: string;
    fileSize?: number | null;
    mimeType?: string | null;
    status: string;
    reviewNotes?: string | null;
    reviewedAt?: string | null;
    definition: {
      id: string;
      code: string;
      title: string;
      isRequired?: boolean;
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

  getApplicationStatus: async (applicationNo: string, email: string) => {
    const response = await apiClient.get<AdmissionApplication>(`/admission/status/${applicationNo}`, {
      params: { email },
    });
    return response.data;
  },

  submitRequirement: async (
    applicationNo: string,
    data: {
      email: string;
      definitionId: string;
      fileName: string;
      mimeType: string;
      contentBase64: string;
    },
  ) => {
    const response = await apiClient.post(`/admission/status/${applicationNo}/requirements`, data);
    return response.data;
  },

  reviewRequirement: async (
    applicationNo: string,
    submissionId: string,
    status: 'verified' | 'rejected' | 'resubmission_required',
    reviewNotes?: string,
  ) => {
    const response = await apiClient.patch(
      `/admission/applications/${applicationNo}/requirements/${submissionId}/review`,
      { status, reviewNotes },
    );
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

  activateStudentAccount: async (
    studentNumber: string,
    dob: string,
    email: string,
    newPassword: string,
  ) => {
    const response = await apiClient.post('/students/activate', {
      studentNumber,
      dob,
      email,
      newPassword,
    });
    return response.data;
  },
};
