import { aggregateMockRows } from './mock-aggregate';

describe('aggregateMockRows', () => {
  const rows: Array<Record<string, unknown>> = [
    { studentId: 'student-1', status: 'verified', amount: 1000.25 },
    { studentId: 'student-1', status: 'pending', amount: 500 },
    { studentId: 'student-2', status: 'verified', amount: 750 },
  ];

  it('aggregates only matching rows and requested fields', () => {
    const result = aggregateMockRows(
      rows,
      {
        where: { studentId: 'student-1', status: 'verified' },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { _all: true, amount: true },
      },
      (row, where) => Object.entries(where).every(([field, value]) => row[field] === value),
    );

    expect(result).toEqual({
      _sum: { amount: 1000.25 },
      _avg: { amount: 1000.25 },
      _count: { _all: 1, amount: 1 },
    });
  });

  it('returns Prisma-like null aggregates for empty input and zero counts', () => {
    const result = aggregateMockRows([], {
      _sum: { amountDue: true },
      _avg: { amountDue: true },
      _count: { _all: true, amountDue: true },
    });

    expect(result).toEqual({
      _sum: { amountDue: null },
      _avg: { amountDue: null },
      _count: { _all: 0, amountDue: 0 },
    });
  });

  it('supports the shorthand row count', () => {
    expect(aggregateMockRows(rows, { _count: true })).toEqual({ _count: 3 });
  });

  it('rejects unsupported operators rather than returning fabricated results', () => {
    expect(() => aggregateMockRows(rows, { _min: { amount: true } }))
      .toThrow('Mock aggregate operator "_min" is not supported.');
  });

  it('rejects non-numeric values in a numeric aggregate', () => {
    expect(() => aggregateMockRows([{ amount: 'unknown' }], { _sum: { amount: true } }))
      .toThrow('Mock aggregate field "amount" contains a non-numeric value.');
  });
});
