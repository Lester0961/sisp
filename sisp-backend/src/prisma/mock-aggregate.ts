type MockWhereMatcher<Row> = (row: Row, where: Record<string, unknown>) => boolean;

type MockAggregateArgs = {
  where?: Record<string, unknown>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _count?: boolean | Record<string, boolean>;
  [key: string]: unknown;
};

function selectedFields(selection: Record<string, boolean>): string[] {
  return Object.entries(selection)
    .filter(([, selected]) => selected)
    .map(([field]) => field);
}

function numericValues<Row extends Record<string, unknown>>(rows: Row[], field: string): number[] {
  return rows.flatMap((row) => {
    const value = row[field];
    if (value === null || value === undefined) return [];

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw new TypeError(`Mock aggregate field "${field}" contains a non-numeric value.`);
    }
    return [numericValue];
  });
}

/**
 * Implements only Prisma aggregate operations used by this application in
 * offline mock mode. Unsupported aggregate operators fail explicitly instead
 * of returning unrelated or plausible-looking values.
 */
export function aggregateMockRows<Row extends Record<string, unknown>>(
  rows: Row[],
  args: MockAggregateArgs = {},
  matchesWhere: MockWhereMatcher<Row> = () => true,
): Record<string, unknown> {
  const supportedOperators = new Set(['_sum', '_avg', '_count']);
  for (const key of Object.keys(args)) {
    if (key.startsWith('_') && !supportedOperators.has(key)) {
      throw new Error(`Mock aggregate operator "${key}" is not supported.`);
    }
  }

  const filteredRows = rows.filter((row) => matchesWhere(row, args.where ?? {}));
  const result: Record<string, unknown> = {};

  if (args._sum) {
    const sums: Record<string, number | null> = {};
    for (const field of selectedFields(args._sum)) {
      const values = numericValues(filteredRows, field);
      sums[field] = values.length ? values.reduce((total, value) => total + value, 0) : null;
    }
    result._sum = sums;
  }

  if (args._avg) {
    const averages: Record<string, number | null> = {};
    for (const field of selectedFields(args._avg)) {
      const values = numericValues(filteredRows, field);
      averages[field] = values.length
        ? values.reduce((total, value) => total + value, 0) / values.length
        : null;
    }
    result._avg = averages;
  }

  if (args._count === true) {
    result._count = filteredRows.length;
  } else if (args._count) {
    const counts: Record<string, number> = {};
    for (const field of selectedFields(args._count)) {
      counts[field] = field === '_all'
        ? filteredRows.length
        : filteredRows.filter((row) => row[field] !== null && row[field] !== undefined).length;
    }
    result._count = counts;
  }

  return result;
}
