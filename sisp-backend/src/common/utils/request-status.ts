/**
 * Service-request status state machine (Phase 7, P7-02). One shared
 * definition is used by the documents service and its tests so the
 * frontend and backend agree on valid transitions.
 */
export const REQUEST_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Page-based (TOR) requests leave awaiting_page_confirmation only through
  // DocumentsService.confirmTorQuote, which recomputes the final fee. A plain
  // status PATCH must never move them to awaiting_payment (fee bypass).
  awaiting_page_confirmation: ['rejected'],
  // Keep pending available to the dedicated Treasury confirmation flow, which
  // verifies proof of payment before setting both fields atomically. Generic
  // status updates are separately blocked from using this transition.
  awaiting_payment: ['pending', 'rejected'],
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['released'],
  released: [],
  rejected: [],
};

export const REQUEST_STATUS_MESSAGES: Record<string, string> = {
  awaiting_page_confirmation: 'is awaiting Records Office page-count confirmation',
  awaiting_payment: 'is awaiting payment confirmation',
  pending: 'is now pending review',
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release or pickup',
  rejected: 'has been rejected',
};
