export type KnowledgeBaseOperation = 'load' | 'save' | 'create' | 'archive' | 'reindex';

type ApiErrorShape = {
  response?: {
    data?: {
      code?: string;
    };
  };
};

const MESSAGES: Record<string, string> = {
  KB_ML_AUTH_NOT_CONFIGURED:
    'ARIA service authentication is not configured. Check that the backend and local ML service use the same configured secret.',
  KB_ML_UNAVAILABLE:
    'ARIA ML service is unavailable. Check the local ML service and backend ML_SERVICE_URL, then try again.',
  KB_STORAGE_UNAVAILABLE:
    'Knowledge-base database storage is unavailable. Start the local database and verify its reviewed schema before retrying.',
  KB_STORAGE_OPERATION_FAILED:
    'The knowledge-base database operation failed. Check the local schema and service logs; no success was confirmed.',
  KB_REINDEX_FAILED:
    'The re-index request failed or could not be scheduled. Check ML and database status; indexing completion was not confirmed.',
  KB_UPSTREAM_ERROR:
    'The knowledge-base service could not complete the request. Check its status and logs; no success was confirmed.',
};

const FALLBACKS: Record<KnowledgeBaseOperation, string> = {
  load: 'Could not load knowledge-base records. No successful list response was received.',
  save: 'Could not save the knowledge-base document. No successful save was confirmed.',
  create: 'Could not create the knowledge-base document. No successful creation was confirmed.',
  archive: 'Could not archive the knowledge-base document. No successful archive was confirmed.',
  reindex: 'Could not confirm the re-index request. Indexing completion was not confirmed.',
};

export function knowledgeBaseErrorMessage(error: unknown, operation: KnowledgeBaseOperation): string {
  const code = (error as ApiErrorShape | null)?.response?.data?.code;
  return (code && MESSAGES[code]) || FALLBACKS[operation];
}
