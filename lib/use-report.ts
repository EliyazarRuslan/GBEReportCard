'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchJson } from './fetch-json';
import { defaultReportPeriod, periodQuery, type ReportPeriod } from './report-period';

/**
 * Load a report from `${basePath}/report` for a user-selectable period.
 * The period is part of the SWR key, so changing it refetches automatically.
 */
export function useReport<T>(basePath: string) {
  const [period, setPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const query = periodQuery(period);
  const { data, error, isLoading } = useSWR<T>(`${basePath}/report?${query}`, fetchJson);

  return {
    report: data,
    error: error instanceof Error ? error.message : error ? 'Failed to load report' : null,
    isLoading,
    period,
    setPeriod,
    pdfUrl: `${basePath}/pdf?${query}`,
  };
}
