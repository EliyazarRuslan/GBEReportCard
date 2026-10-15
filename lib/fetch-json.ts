/** SWR fetcher: GET a JSON endpoint and surface the API's error message on non-2xx. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
