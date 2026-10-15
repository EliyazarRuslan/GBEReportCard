'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangePicker } from '../../../components/DateRangePicker';
import { PdfDownloadLink, ReportError, ReportLoading } from '../../../components/ReportStates';
import { FleetSummarySection } from '../../../components/fleet-report/FleetSummarySection';
import { AttentionSection } from '../../../components/fleet-report/AttentionSection';
import { VehicleBreakdownSection } from '../../../components/fleet-report/VehicleBreakdownSection';
import type { FleetReport } from '../../../components/fleet-report/types';
import { formatTimestamp } from '../../../lib/format';
import { useReport } from '../../../lib/use-report';

export default function FleetReportPage() {
  const { customer } = useParams<{ customer: string }>();
  const { report, error, isLoading, period, setPeriod, pdfUrl } =
    useReport<FleetReport>(`/api/fleet/${customer}`);

  if (isLoading) return <ReportLoading label="Loading fleet report..." />;
  if (error || !report) return <ReportError message={error || 'Report not found'} />;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Link href="/fleet" className="text-sm text-[#003366] hover:text-[#C8A951] transition-colors">
          &larr; Back to Fleet List
        </Link>
        <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{report.customerName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Customer: {report.customer} &middot; {report.vehicleCount} vehicles
            </p>
          </div>
          <PdfDownloadLink href={pdfUrl} label="Download Fleet PDF" />
        </div>
      </div>
      <div className="mb-6">
        <DateRangePicker period={period} onChange={setPeriod} />
      </div>
      <FleetSummarySection summary={report.summary} />
      <AttentionSection summary={report.summary} />
      <VehicleBreakdownSection vehicles={report.vehicles} />
      <p className="text-xs text-gray-400 text-center">
        Report generated {formatTimestamp(report.generatedAt)}
      </p>
    </div>
  );
}
