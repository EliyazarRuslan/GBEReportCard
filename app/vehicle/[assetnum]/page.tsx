'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangePicker } from '../../../components/DateRangePicker';
import { PdfDownloadLink, ReportError, ReportLoading } from '../../../components/ReportStates';
import { PerformanceSection } from '../../../components/vehicle-report/PerformanceSection';
import { MaintenanceSection } from '../../../components/vehicle-report/MaintenanceSection';
import { ScheduleSection } from '../../../components/vehicle-report/ScheduleSection';
import { EntitlementSection } from '../../../components/vehicle-report/EntitlementSection';
import { SpendingSection } from '../../../components/vehicle-report/SpendingSection';
import type { VehicleInfo, VehicleReport } from '../../../components/vehicle-report/types';
import { formatTimestamp } from '../../../lib/format';
import { salesTypeLabel } from '../../../lib/sales-type';
import { useReport } from '../../../lib/use-report';

function VehicleHeader({ vehicle, pdfUrl }: { vehicle: VehicleInfo; pdfUrl: string }) {
  const salesType = vehicle.salesType ? ` (${salesTypeLabel(vehicle.salesType)})` : '';
  return (
    <div className="mb-6">
      <Link href="/" className="text-sm text-[#003366] hover:text-[#C8A951] transition-colors">
        &larr; Back to Dashboard
      </Link>
      <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{vehicle.vehicleNo || vehicle.assetnum}</h2>
          <p className="text-gray-600">{vehicle.description}</p>
          <p className="text-sm text-gray-500 mt-1">
            Chassis: {vehicle.assetnum} &middot; {vehicle.customerName} &middot; Agreement: {vehicle.agreement}{salesType}
          </p>
        </div>
        <PdfDownloadLink href={pdfUrl} label="Download PDF" />
      </div>
    </div>
  );
}

export default function VehicleReportPage() {
  const { assetnum } = useParams<{ assetnum: string }>();
  const { report, error, isLoading, period, setPeriod, pdfUrl } =
    useReport<VehicleReport>(`/api/vehicle/${assetnum}`);

  if (isLoading) return <ReportLoading label="Loading report..." />;
  if (error || !report) return <ReportError message={error || 'Report not found'} />;

  return (
    <div className="space-y-4">
      <VehicleHeader vehicle={report.vehicle} pdfUrl={pdfUrl} />
      <div className="mb-6">
        <DateRangePicker period={period} onChange={setPeriod} />
      </div>
      <PerformanceSection parameters={report.parameters} />
      <MaintenanceSection maintenance={report.maintenance} />
      <ScheduleSection schedule={report.schedule} />
      <EntitlementSection entitlements={report.entitlements} />
      <SpendingSection spending={report.spending} />
      <p className="text-xs text-gray-400 text-center">
        Report generated {formatTimestamp(report.generatedAt)}
      </p>
    </div>
  );
}
