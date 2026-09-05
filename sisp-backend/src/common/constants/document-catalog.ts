export const DOCUMENT_CATALOG = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    code: 'transcript_of_records',
    label: 'Transcript of Records',
    fee: 200,
    sortOrder: 10,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'certificate_of_enrollment',
    label: 'Certificate of Enrollment',
    fee: 150,
    sortOrder: 20,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    code: 'certificate_of_good_moral',
    label: 'Certificate of Good Moral Character',
    fee: 100,
    sortOrder: 30,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    code: 'diploma',
    label: 'Diploma',
    fee: 500,
    sortOrder: 40,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: 'course_description',
    label: 'Course Description',
    fee: 50,
    sortOrder: 50,
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    code: 'authentication',
    label: 'Document Authentication',
    fee: 300,
    sortOrder: 60,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    code: 'other',
    label: 'Other Document',
    fee: 100,
    sortOrder: 70,
  },
] as const;

export const DOCUMENT_TYPE_CODES = DOCUMENT_CATALOG.map((item) => item.code);
