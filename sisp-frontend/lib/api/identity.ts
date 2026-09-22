import apiClient from './client';

export interface IdentityVerificationRecord {
  id: string;
  applicantEmail: string;
  verificationType: 'returning' | 'alumni';
  claimedStudentNumber: string | null;
  claimedFirstName: string;
  claimedMiddleName: string | null;
  claimedLastName: string;
  previousName: string | null;
  status: string;
  remarks: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  matchedExistingRecord?: boolean;
  matchedStudentProfile?: {
    id: string;
    studentNumber: string;
    lifecycleStatus: string;
    user: { firstName: string; lastName: string; email: string };
  } | null;
  documents?: Array<{
    id: string;
    documentType: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
    reviewStatus: string;
  }>;
}

export const identityApi = {
  submit: async (payload: {
    verificationType: 'returning' | 'alumni';
    applicantEmail: string;
    claimedStudentNumber?: string;
    claimedFirstName: string;
    claimedMiddleName?: string;
    claimedLastName: string;
    previousName?: string;
    dateOfBirth?: string;
  }): Promise<{ id: string; status: string; matchedExistingRecord: boolean; message: string }> => {
    const response = await apiClient.post('/identity-verifications', payload);
    return response.data;
  },

  getStatus: async (id: string, email: string): Promise<IdentityVerificationRecord> => {
    const response = await apiClient.get(`/identity-verifications/${id}/status`, {
      params: { email },
    });
    return response.data;
  },

  uploadDocument: async (
    id: string,
    payload: {
      documentType: string;
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
    },
  ) => {
    const response = await apiClient.post(`/identity-verifications/${id}/documents`, payload);
    return response.data;
  },

  listForReview: async (status?: string): Promise<{ data: IdentityVerificationRecord[]; total: number }> => {
    const response = await apiClient.get('/admin/identity-verifications', { params: { status } });
    return response.data;
  },

  review: async (
    id: string,
    payload: { decision: 'under_review' | 'approved' | 'rejected' | 'needs_info'; remarks?: string; matchedStudentProfileId?: string | null },
  ) => {
    const response = await apiClient.patch(`/admin/identity-verifications/${id}/review`, payload);
    return response.data;
  },
};
