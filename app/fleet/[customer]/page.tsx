'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MetricCard } from '../../../components/MetricCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { ReportSection } from '../../../components/ReportSection';
import { DateRangePicker } from '../../../components/DateRangePicker';

interface FleetReport {
  customer: string;
  customerName: string;
  vehicleCount: number;
  period: { startDate: string; endDate: string };
  vehicles: {
    vehicle: { assetnum: string; vehicleNo: string; description: string; pluspcustomer: string; customerName: string };
    parameters: { downtimeDays: number; downtimeHours: number; cbjCount: number; breakdownCount: number; warrantyRepairCount: number; avgWaitingHours: number };
    maintenance: { serviceCount: number; repairCount: number };
    schedule: { serviceOverdue: boolean };
    spending: { laborCost: number; materialCost: number; totalCost: number; costPerKm: number | null };
  }[];
  summary: {
    totalDowntimeDays: number;
    totalDowntimeHours: number;
    avgDowntimeDays: number;
    avgDowntimeHours: number;
    totalCBJ: number;
    totalBreakdown: number;
    totalServiceCount: number;
    totalRepairCount: number;
    totalLaborCost: number;
    totalMaterialCost: number;
    totalCost: number;
    avgCostPerKm: number | null;
    overdueVehicles: string[];
    worstDowntime: { assetnum: string; days: number; hours: number } | null;
    worstCBJ: { assetnum: string; count: number } | null;
  };
  generatedAt: string;
}

function formatMoney(v: number | null): string {
  if (v === null || v === undefined) return '$0.00';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FleetReportPage() {
  const { customer } = useParams<{ customer: string }>();
  const [report, setReport] = useState<FleetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultEnd = new Date();
  defaultEnd.setHours(0, 0, 0, 0);
  const defaultStart = new Date(defaultEnd);
  defaultStart.setMonth(defaultStart.getMonth() - 6);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  function loadReport(start: Date, end: Date) {
    setLoading(true);
    setError(null);
    fetch(`/api/fleet/${customer}/report?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load fleet report');
        return res.json();
      })
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReport(startDate, endDate);
  }, [customer]);

  function handleDateChange(start: Date, end: Date) {
    setStartDate(start);
    setEndDate(end);
    loadReport(start, end);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#C8A951]" />
        <p className="text-gray-500 mt-3">Loading fleet report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'Report not found'}
      </div>
    );
  }

  const { summary, vehicles } = report;

  return (
    <div>
      {/* Header */}
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
          <a
            href={`/api/fleet/${customer}/pdf?start=${startDate.toISOString()}&end=${endDate.toISOString()}`}
            className="bg-[#C8A951] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B8953E] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Fleet PDF
          </a>
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
      </div>

      {/* Fleet Summary */}
      <ReportSection title="Fleet Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Downtime" value={`${summary.totalDowntimeDays} days`} variant={summary.totalDowntimeDays > 60 ? 'danger' : 'default'} />
          <MetricCard label="Avg Downtime" value={`${summary.avgDowntimeDays} days`} variant="default" />
          <MetricCard label="Comeback Jobs" value={summary.totalCBJ} variant={summary.totalCBJ > 5 ? 'danger' : summary.totalCBJ > 0 ? 'warning' : 'success'} />
          <MetricCard label="Breakdown" value={summary.totalBreakdown} variant={summary.totalBreakdown > 0 ? 'warning' : 'success'} />
          <MetricCard label="Total Services" value={summary.totalServiceCount} variant="default" />
          <MetricCard label="Total Repairs" value={summary.totalRepairCount} variant="default" />
          <MetricCard label="Total Cost" value={formatMoney(summary.totalCost)} variant={summary.totalCost > 50000 ? 'warning' : 'default'} />
          <MetricCard label="Avg Cost/KM" value={summary.avgCostPerKm !== null ? formatMoney(summary.avgCostPerKm) : '—'} variant="default" />
        </div>
      </ReportSection>

      <div className="h-4" />

      {/* Attention Required */}
      {(summary.overdueVehicles.length > 0 || summary.worstDowntime || summary.worstCBJ) && (
        <>
          <ReportSection title="Attention Required">
            <div className="space-y-2">
              {summary.overdueVehicles.length > 0 && (
                <div className="flex items-center gap-2">
                  <StatusBadge status="danger" label="OVERDUE" />
                  <span className="text-sm text-gray-700">
                    Service overdue: {summary.overdueVehicles.map(a => (
                      <Link key={a} href={`/vehicle/${a}`} className="text-[#003366] hover:text-[#C8A951] font-medium mx-1">{a}</Link>
                    ))}
                  </span>
                </div>
              )}
              {summary.worstDowntime && (
                <div className="flex items-center gap-2">
                  <StatusBadge status="warning" label="DOWNTIME" />
                  <span className="text-sm text-gray-700">
                    Worst downtime: <Link href={`/vehicle/${summary.worstDowntime.assetnum}`} className="text-[#003366] hover:text-[#C8A951] font-medium">{summary.worstDowntime.assetnum}</Link> ({summary.worstDowntime.days}d / {summary.worstDowntime.hours}h)
                  </span>
                </div>
              )}
              {summary.worstCBJ && summary.worstCBJ.count > 0 && (
                <div className="flex items-center gap-2">
                  <StatusBadge status="warning" label="CBJ" />
                  <span className="text-sm text-gray-700">
                    Most comeback jobs: <Link href={`/vehicle/${summary.worstCBJ.assetnum}`} className="text-[#003366] hover:text-[#C8A951] font-medium">{summary.worstCBJ.assetnum}</Link> ({summary.worstCBJ.count})
                  </span>
                </div>
              )}
            </div>
          </ReportSection>
          <div className="h-4" />
        </>
      )}

      {/* Per-vehicle breakdown */}
      <ReportSection title="Vehicle Breakdown">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Vehicle #</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Downtime</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">CBJ</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Services</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Repairs</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Total Cost</th>
                <th className="text-center py-2 px-2 text-gray-500 font-medium">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.vehicle.assetnum} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <Link href={`/vehicle/${v.vehicle.assetnum}`} className="text-[#003366] font-medium hover:text-[#C8A951]">
                      {v.vehicle.vehicleNo || v.vehicle.assetnum}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-gray-700">{v.vehicle.description}</td>
                  <td className="py-2 px-2 text-right">{v.parameters.downtimeDays}d <span className="text-gray-400 text-xs">({v.parameters.downtimeHours}h)</span></td>
                  <td className="py-2 px-2 text-right">{v.parameters.cbjCount}</td>
                  <td className="py-2 px-2 text-right">{v.maintenance.serviceCount}</td>
                  <td className="py-2 px-2 text-right">{v.maintenance.repairCount}</td>
                  <td className="py-2 px-2 text-right">{formatMoney(v.spending.totalCost)}</td>
                  <td className="py-2 px-2 text-center">
                    <StatusBadge
                      status={v.schedule.serviceOverdue ? 'danger' : 'success'}
                      label={v.schedule.serviceOverdue ? 'Overdue' : 'OK'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <div className="h-4" />
      <p className="text-xs text-gray-400 text-center">
        Report generated {new Date(report.generatedAt).toLocaleString('en-SG')}
      </p>
    </div>
  );
}
