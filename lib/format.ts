// Shared display formatters. Intl formatters are built once at module load,
// and every date formatter pins an explicit timeZone so server and browser
// render identical text.

// DB datetimes are SGT wall-clock values tagged as UTC, so render them in UTC.
const dbDateFormatter = new Intl.DateTimeFormat('en-SG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

// Real timestamps (e.g. generatedAt) are shown in Singapore time.
const timestampFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Singapore',
});

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('en-SG');

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return dbDateFormatter.format(new Date(d));
}

export function formatTimestamp(d: string): string {
  return timestampFormatter.format(new Date(d));
}

export function formatMoney(v: number | null | undefined): string {
  return '$' + moneyFormatter.format(v ?? 0);
}

export function formatNumber(v: number): string {
  return integerFormatter.format(v);
}
