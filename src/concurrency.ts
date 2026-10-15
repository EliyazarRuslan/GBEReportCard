/**
 * Map over items running at most `limit` async tasks at once, preserving input
 * order in the result. Rejects on the first failure (like Promise.all).
 * Used to parallelise per-vehicle DB queries and PDF rendering without
 * exhausting the SQL connection pool or launching too many Chrome instances.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    const index = next++;
    if (index >= items.length) return;
    results[index] = await fn(items[index], index);
    return worker();
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/** Vehicles built in parallel; each one already runs 5 queries concurrently (pool max 10). */
export const VEHICLE_REPORT_CONCURRENCY = 2;

/** PDFs rendered in parallel; each launches its own headless Chrome. */
export const PDF_CONCURRENCY = 2;
