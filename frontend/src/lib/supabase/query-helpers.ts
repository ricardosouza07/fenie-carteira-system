type QueryError = {
  message: string;
} | null;

type QueryResult = {
  data: unknown;
  error: QueryError;
};

const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_ID_BATCH_SIZE = 100;

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchAllPages<T>(
  queryPage: (
    from: number,
    to: number,
  ) => PromiseLike<QueryResult>,
  context: string,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryPage(from, from + pageSize - 1);

    if (error) {
      throw new Error(`${context}: ${error.message}`);
    }

    const page = asArray<T>(data);

    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }
  }
}

export async function fetchByIdBatches<T>(
  ids: string[],
  queryBatchPage: (
    batch: string[],
    from: number,
    to: number,
  ) => PromiseLike<QueryResult>,
  context: string,
  batchSize = DEFAULT_ID_BATCH_SIZE,
) {
  const rows: T[] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const batchRows = await fetchAllPages<T>(
      (from, to) => queryBatchPage(batch, from, to),
      context,
    );

    rows.push(...batchRows);
  }

  return rows;
}
