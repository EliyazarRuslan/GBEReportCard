export interface ReportPeriod {
  start: Date;
  end: Date;
}

/** Default reporting window: the 6 months up to today (local midnight). */
export function defaultReportPeriod(): ReportPeriod {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  return { start, end };
}

export function periodQuery(period: ReportPeriod): string {
  return `start=${period.start.toISOString()}&end=${period.end.toISOString()}`;
}
