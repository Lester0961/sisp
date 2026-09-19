import apiClient from './client';

export interface FinanceObligation {
  id: string;
  termId: string | null;
  termLabel: string | null;
  academicYear: string | null;
  semester: string;
  amountDue: number;
  amountPaid: number;
  isFullyPaid: boolean;
  paymentStatus: string;
}

export interface FinancePayment {
  id: string;
  amount: number;
  paymentMethod: string | null;
  referenceNumber: string | null;
  status: string;
  paidAt: string | null;
  verifiedAt: string | null;
  termLabel: string | null;
  academicYear: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export interface FinanceSummary {
  student: {
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    program: { code: string; name: string } | null;
  };
  balance: number;
  balanceStatus: string | null;
  totalObligations: number;
  totalPaid: number;
  obligations: FinanceObligation[];
  upcomingObligations: FinanceObligation[];
  payments: FinancePayment[];
}

export interface FinanceStudentRow {
  id: string;
  studentNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  program: { code: string; name: string } | null;
  balance: number | null;
  balanceStatus: string | null;
}

export const financeApi = {
  getMySummary: async (): Promise<FinanceSummary> => {
    const response = await apiClient.get<FinanceSummary>('/finance/me/summary');
    return response.data;
  },

  searchStudents: async (query?: string): Promise<{ data: FinanceStudentRow[]; total: number }> => {
    const response = await apiClient.get('/finance/students', {
      params: query ? { query } : undefined,
    });
    return response.data;
  },

  getStudentSummary: async (studentProfileId: string): Promise<FinanceSummary> => {
    const response = await apiClient.get<FinanceSummary>(
      `/finance/students/${studentProfileId}`,
    );
    return response.data;
  },

  recordTransaction: async (payload: {
    studentProfileId: string;
    amount: number;
    academicTermId?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    paidAt?: string;
  }) => {
    const response = await apiClient.post('/finance/transactions', payload);
    return response.data;
  },

  verifyTransaction: async (id: string, decision: 'verified' | 'rejected') => {
    const response = await apiClient.patch(`/finance/transactions/${id}/verify`, { decision });
    return response.data;
  },

  voidTransaction: async (id: string) => {
    const response = await apiClient.patch(`/finance/transactions/${id}/void`);
    return response.data;
  },
};
