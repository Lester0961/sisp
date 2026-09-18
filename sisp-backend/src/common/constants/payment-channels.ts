/**
 * Official Treasury online payment channels (single source of truth).
 *
 * Mirrors the verified "Online Payment Channels" section of the ARIA
 * knowledge base (sisp-ml/app/data/knowledge_base/official_advice.txt).
 * These accounts are published in an official school announcement, so they
 * are safe to serve through the API and display in the portal.
 */
export const PAYMENT_CHANNELS = {
  gcash: {
    label: 'GCash',
    number: '0919 911 8050',
    accountName: 'Richard H.',
    note: 'For amounts exceeding the GCash limit, use bank transfer via PNB instead.',
  },
  pnb: {
    label: 'PNB Bank Transfer / Deposit',
    accountName: 'REGIS MARIE COLLEGE INC.',
    accountNumber: '149110075280',
    note: null as string | null,
  },
  proofRecipient: {
    name: 'Ms. Arlyne Punzalan',
    office: 'Treasury Office',
    instruction:
      'Always send your proof of payment to Ms. Arlyne Punzalan of the Treasury Office after completing your transaction.',
  },
} as const;

export type PaymentChannelCode = keyof Pick<typeof PAYMENT_CHANNELS, 'gcash' | 'pnb'>;

export const PAYMENT_CHANNEL_CODES = ['gcash', 'pnb'] as const;
