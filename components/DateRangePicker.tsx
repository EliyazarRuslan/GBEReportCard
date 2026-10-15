'use client';

import { useId, useState } from 'react';
import type { ReportPeriod } from '../lib/report-period';

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function DateRangePicker({
  period,
  onChange,
}: {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}) {
  const startId = useId();
  const endId = useId();
  const [start, setStart] = useState(() => toInputDate(period.start));
  const [end, setEnd] = useState(() => toInputDate(period.end));

  function handleApply() {
    onChange({ start: new Date(start), end: new Date(end) });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label htmlFor={startId} className="text-sm text-gray-600">From</label>
        <input
          id={startId}
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={endId} className="text-sm text-gray-600">To</label>
        <input
          id={endId}
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleApply}
        className="bg-[#C8A951] text-white text-sm px-4 py-1.5 rounded hover:bg-[#B8953E] transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
