import apiClient from './client';

export interface ChatMessageApi {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessagePayload {
  message: string;
  history?: ChatMessageApi[];
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
  sources: ChatSource[];
  createdAt: string;
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

  // Adviser / Admin endpoints
  getEscalations: async (): Promise<EscalationRecord[]> => {
    const response = await apiClient.get<EscalationRecord[]>('/admin/escalations');
    return response.data;
  },

  resolveEscalation: async (id: string, resolution: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/escalations/${id}`, { resolution });
    return response.data;
  },
};
