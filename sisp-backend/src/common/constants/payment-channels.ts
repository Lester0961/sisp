/**
 * Official Treasury payment channels (P6-04).
 *
 * Real account details are NOT stored in source code. Deployment supplies
 * them through protected environment configuration; when a channel is not
 * configured the API reports `configured: false` and instructs the student
 * to contact the Treasury Office instead of inventing values.
 *
 * Expected environment variables:
 *   PAYMENT_CHANNEL_GCASH_NUMBER, PAYMENT_CHANNEL_GCASH_NAME, PAYMENT_CHANNEL_GCASH_NOTE
 *   PAYMENT_CHANNEL_PNB_ACCOUNT, PAYMENT_CHANNEL_PNB_NAME
 *   PAYMENT_PROOF_RECIPIENT_NAME, PAYMENT_PROOF_RECIPIENT_OFFICE,
 *   PAYMENT_PROOF_RECIPIENT_INSTRUCTION
 */

export const PAYMENT_CHANNEL_CODES = ['gcash', 'pnb'] as const;
export type PaymentChannelCode = (typeof PAYMENT_CHANNEL_CODES)[number];

export interface PaymentChannel {
  label: string;
  number?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string | null;
}

export interface PaymentChannelsResponse {
  configured: boolean;
  instruction: string;
  gcash: PaymentChannel | null;
  pnb: PaymentChannel | null;
  proofRecipient: { name: string; office: string; instruction: string } | null;
}

export function getPaymentChannels(
  env: NodeJS.ProcessEnv = process.env,
): PaymentChannelsResponse {
  const gcashNumber = env.PAYMENT_CHANNEL_GCASH_NUMBER?.trim() || '';
  const gcashName = env.PAYMENT_CHANNEL_GCASH_NAME?.trim() || '';
  const gcashNote = env.PAYMENT_CHANNEL_GCASH_NOTE?.trim() || null;
  const pnbAccount = env.PAYMENT_CHANNEL_PNB_ACCOUNT?.trim() || '';
  const pnbName = env.PAYMENT_CHANNEL_PNB_NAME?.trim() || 'Regis Marie College Inc.';
  const proofName = env.PAYMENT_PROOF_RECIPIENT_NAME?.trim() || '';
  const proofOffice = env.PAYMENT_PROOF_RECIPIENT_OFFICE?.trim() || 'Treasury Office';
  const proofInstruction =
    env.PAYMENT_PROOF_RECIPIENT_INSTRUCTION?.trim() ||
    (proofName
      ? `Send your proof of payment to ${proofName} at the ${proofOffice}.`
      : '');

  const gcash: PaymentChannel | null = gcashNumber
    ? {
        label: 'GCash',
        number: gcashNumber,
        accountName: gcashName || undefined,
        note: gcashNote,
      }
    : null;

  const pnb: PaymentChannel | null = pnbAccount
    ? {
        label: 'PNB Bank Transfer / Deposit',
        accountName: pnbName,
        accountNumber: pnbAccount,
      }
    : null;

  const proofRecipient = proofName
    ? { name: proofName, office: proofOffice, instruction: proofInstruction }
    : null;

  const configured = Boolean(gcash || pnb);

  return {
    configured,
    instruction: configured
      ? 'Use only the official channels below. Submit your proof of payment after completing the transaction.'
      : 'Online payment channels are not configured yet. Please contact the Treasury Office for official payment instructions.',
    gcash,
    pnb,
    proofRecipient,
  };
}
