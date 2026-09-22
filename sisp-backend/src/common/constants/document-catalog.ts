/** User-approved demo catalog and fee basis. Do not infer turnaround times or assignees. */
export const DOCUMENT_CATALOG = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    code: 'certificate_of_good_moral',
    billingBasis: 'copy',
    label: 'Certificate of good moral',
    fee: 500,
    sortOrder: 10,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'copy_of_grades',
    billingBasis: 'copy',
    label: '2nd copy of grades',
    fee: 150,
    sortOrder: 20,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    code: 'certificate_of_registration',
    billingBasis: 'copy',
    label: 'COR',
    fee: 300,
    sortOrder: 30,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    code: 'certified_true_copy_grades',
    billingBasis: 'copy',
    label: 'certified true copy - copy of grades',
    fee: 300,
    sortOrder: 40,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: 'transcript_of_records',
    billingBasis: 'page',
    label: 'TOR',
    fee: 500,
    sortOrder: 50,
    feeNote: 'per page',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    code: 'certificate_of_enrollment',
    billingBasis: 'copy',
    label: 'COE',
    fee: 300,
    sortOrder: 60,
  },
] as const;

export const DOCUMENT_TYPE_CODES = DOCUMENT_CATALOG.map((item) => item.code);
