/**
 * Service-request status state machine (Phase 7, P7-02). One shared
 * definition is used by the documents service and its tests so the
 * frontend and backend agree on valid transitions.
 */
export const REQUEST_STATUS_TRANSITIONS: Record<string, string[]> = {
  awaiting_payment: ['pending', 'rejected'],
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['released'],
  released: [],
  rejected: [],
};

export const REQUEST_STATUS_MESSAGES: Record<string, string> = {
  awaiting_payment: 'is awaiting payment confirmation',
  pending: 'is now pending review',
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release or pickup',
  rejected: 'has been rejected',
};