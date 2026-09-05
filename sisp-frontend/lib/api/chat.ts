import apiClient from './client';

export interface ChatMessageApi {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessagePayload {
  message: string;
  history?: ChatMessageApi[];
  preferredLanguage?: string;
}

export interface ChatSource {
  source: string;
  category: string;
  similarity: number;
  content_snippet: string;
}

export interface SendMessageResponse {
  chatId: string;
  response: string;
  intent: string;
  confidence: number;
  escalated: boolean;
  sessionId: string | null;
  sources: ChatSource[];
  route: string;
  action?: string | null;
  language?: {
    code: string;
    name: string;
    confidence?: number;
    codeSwitched?: boolean;
    register?: string;
    nativeReviewRequired?: boolean;
  };
  moderationCategories?: string[];
  quota?: ChatQuota;
  createdAt: string;
}

export interface ChatQuota {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

export interface ChatLogDb {
  id: string;
  userId: string;
  message: string;
  response: string;
  intent: string | null;
  confidence: number | null;
  createdAt: string;
  escalation?: {
    id: string;
    chatId: string;
    status: string;
    assignedTo: string | null;
    resolution: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface EscalationRecord {
  id: string;
  chatId: string;
  status: string;
  assignedTo: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  chat: {
    id: string;
    message: string;
    response: string;
    intent: string | null;
    confidence: number | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface ChatSessionRecord {
  id: string;
  studentId: string;
  escalationId: string | null;
  agentId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    studentNumber: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  agent?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  messages?: ChatSessionMessage[];
}

export interface ChatSessionMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const chatApi = {
  // Student endpoints
  sendMessage: async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
    const response = await apiClient.post<SendMessageResponse>('/chat', payload);
    return response.data;
  },

  getChatHistory: async (): Promise<ChatLogDb[]> => {
    const response = await apiClient.get<ChatLogDb[]>('/chat/history');
    return response.data;
  },

  getQuota: async (): Promise<ChatQuota> => {
    const response = await apiClient.get<ChatQuota>('/chat/quota');
    return response.data;
  },

  // Adviser / Admin endpoints
  getEscalations: async (): Promise<EscalationRecord[]> => {
    const response = await apiClient.get<EscalationRecord[]>('/admin/escalations');
    return response.data;
  },

  resolveEscalation: async (id: string, resolution: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/escalations/${id}`, { resolution });
    return response.data;
  },

  // Live Agent Session endpoints
  getSessions: async (status?: string): Promise<ChatSessionRecord[]> => {
    const response = await apiClient.get('/chat/sessions', { params: { status } });
    return response.data;
  },

  getAssignedSessions: async (): Promise<ChatSessionRecord[]> => {
    const response = await apiClient.get('/chat/sessions/assigned');
    return response.data;
  },

  getMySessions: async (): Promise<ChatSessionRecord[]> => {
    const response = await apiClient.get('/chat/sessions/me');
    return response.data;
  },

  getSessionMessages: async (sessionId: string): Promise<ChatSessionMessage[]> => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  sendSessionMessage: async (sessionId: string, content: string): Promise<ChatSessionMessage> => {
    const response = await apiClient.post(`/chat/sessions/${sessionId}/messages`, { content });
    return response.data;
  },

  assignSession: async (sessionId: string): Promise<ChatSessionRecord> => {
    const response = await apiClient.patch(`/chat/sessions/${sessionId}/assign`);
    return response.data;
  },

  closeSession: async (sessionId: string): Promise<ChatSessionRecord> => {
    const response = await apiClient.patch(`/chat/sessions/${sessionId}/close`);
    return response.data;
  },
};
