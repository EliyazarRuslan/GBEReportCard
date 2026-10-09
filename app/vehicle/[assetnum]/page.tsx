'use client';

import { useEffect, useState } from 'react';
import { salesTypeLabel } from '../../../components/SalesTypeBadge';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MetricCard } from '../../../components/MetricCard';
import { StatusBadge, getDowntimeStatus, getCountStatus } from '../../../components/StatusBadge';
import { ReportSection } from '../../../components/ReportSection';
import { DateRangePicker } from '../../../components/DateRangePicker';

interface VehicleReport {
  vehicle: {
    assetnum: string;
    vehicleNo: string;
    description: string;
    serialnum: string;
    pluspcustomer: string;
    customerName: string;
    agreement: string;
    salesType?: string;
    warrantyStart: string | null;
    warrantyEnd: string | null;
  };
  period: { startDate: string; endDate: string };
  parameters: {
    downtimeDays: number;
    downtimeHours: number;
    cbjCount: number;
    breakdownCount: number;
    warrantyRepairCount: number;
    avgWaitingHours: number;
  };
  maintenance: {
    serviceCount: number;
    lastServiceDate: string | null;
    repairCount: number;
    lastRepairDate: string | null;
    outstandingJobs: { wonum: string; description: string; status: string; reportdate: string | null; worktype: string }[];
    outstandingRecalls: { recallnumber: string; campaigncode: string; campaignstatus: string; gb_vehiclemodel: string }[];
  };
  schedule: {
    serviceOverdue: boolean;
    nextServiceDate: string | null;
    pmDetails: { pmnum: string; description: string; servicePkgType: string; wonum: string | null; woStatus: string | null; nextDueDate: string | null; lastCompDate: string | null; mileageReading: number | null; expiryDate: string | null; isOverdue: boolean }[];
  };
  entitlements: {
    agreement: string;
    opsCode: string;
    opsDesc: string;
    quantity: number;
    usedQty: number;
    balanceQty: number;
    startDate: string | null;
    endDate: string | null;
  }[];
  spending: {
    laborCost: number;
    materialCost: number;
    totalCost: number;
    mileageStart: number | null;
    mileageEnd: number | null;
    mileageDelta: number | null;
    costPerKm: number | null;
  };
  generatedAt: string;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(v: number | null): string {
  if (v === null || v === undefined) return '$0.00';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VehicleReportPage() {
  const { assetnum } = useParams<{ assetnum: string }>();
  const [report, setReport] = useState<VehicleReport | null>(null);
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
    fetch(`/api/vehicle/${assetnum}/report?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load report');
        return res.json();
      })
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReport(startDate, endDate);
  }, [assetnum]);

  function handleDateChange(start: Date, end: Date) {
    setStartDate(start);
    setEndDate(end);
    loadReport(start, end);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#C8A951]" />
        <p className="text-gray-500 mt-3">Loading report...</p>
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

  const { vehicle, parameters, maintenance, schedule, entitlements, spending } = report;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-[#003366] hover:text-[#C8A951] transition-colors">
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{vehicle.vehicleNo || vehicle.assetnum}</h2>
            <p className="text-gray-600">{vehicle.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              Chassis: {vehicle.assetnum} &middot; {vehicle.customerName} &middot; Agreement: {vehicle.agreement}{vehicle.salesType ? ` (${salesTypeLabel(vehicle.salesType)})` : ''}
            </p>
          </div>
          <a
            href={`/api/vehicle/${assetnum}/pdf?start=${startDate.toISOString()}&end=${endDate.toISOString()}`}
            className="bg-[#C8A951] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B8953E] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
      </div>

      {/* Section A: Performance Parameters */}
      <ReportSection title="Section A — Performance Parameters" badge="KPIs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            label="Downtime (days)"
            value={parameters.downtimeDays}
            subtitle={`${parameters.downtimeHours} hrs`}
            variant={parameters.downtimeDays > 25 ? 'danger' : parameters.downtimeDays > 12 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Comeback Jobs"
            value={parameters.cbjCount}
            variant={parameters.cbjCount > 3 ? 'danger' : parameters.cbjCount > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Breakdown"
            value={parameters.breakdownCount}
            variant={parameters.breakdownCount > 3 ? 'danger' : parameters.breakdownCount > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Warranty Repairs"
            value={parameters.warrantyRepairCount}
            variant="default"
          />
          <MetricCard
            label="Avg Service Wait (hrs)"
            value={parameters.avgWaitingHours}
            variant={parameters.avgWaitingHours > 120 ? 'danger' : parameters.avgWaitingHours > 48 ? 'warning' : 'success'}
          />
        </div>
      </ReportSection>

      <div className="h-4" />

      {/* Section B: Maintenance */}
      <ReportSection title="Section B — Vehicle Maintenance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <MetricCard label="Services" value={maintenance.serviceCount} variant="default" />
          <MetricCard label="Last Service" value={formatDate(maintenance.lastServiceDate)} variant="default" />
          <MetricCard label="Repairs" value={maintenance.repairCount} variant="default" />
          <MetricCard label="Last Repair" value={formatDate(maintenance.lastRepairDate)} variant="default" />
        </div>

        {maintenance.outstandingJobs.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Outstanding Jobs</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">WO #</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.outstandingJobs.map(job => (
                    <tr key={job.wonum} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-mono">{job.wonum}</td>
                      <td className="py-2 px-2 text-gray-700">{job.description}</td>
                      <td className="py-2 px-2">{job.worktype}</td>
                      <td className="py-2 px-2">
                        <StatusBadge status="warning" label={job.status} />
                      </td>
                      <td className="py-2 px-2 text-gray-500">{formatDate(job.reportdate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ReportSection>

      <div className="h-4" />

      {/* Section C: Schedule */}
      <ReportSection title="Section C — Vehicle Schedule">
        <div className="flex items-center gap-4 mb-4">
          <StatusBadge
            status={schedule.serviceOverdue ? 'danger' : 'success'}
            label={schedule.serviceOverdue ? 'SERVICE OVERDUE' : 'On Schedule'}
          />
          {schedule.nextServiceDate && (
            <span className="text-sm text-gray-600">
              Next service: {formatDate(schedule.nextServiceDate)}
            </span>
          )}
        </div>
        {schedule.pmDetails.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">PM #</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Service Pkg</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">WO #</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">WO Status</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Last Completed</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Next Due Date</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Mileage</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Expiry</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.pmDetails.map(pm => (
                  <tr key={pm.pmnum} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-mono">{pm.pmnum}</td>
                    <td className="py-2 px-2 text-gray-700">{pm.servicePkgType}</td>
                    <td className="py-2 px-2 font-mono">{pm.wonum || '—'}</td>
                    <td className="py-2 px-2">
                      {pm.woStatus ? <StatusBadge status={pm.woStatus === 'INITIATED' ? 'warning' : 'default'} label={pm.woStatus} /> : '—'}
                    </td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(pm.lastCompDate)}</td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(pm.nextDueDate)}</td>
                    <td className="py-2 px-2 text-right">{pm.mileageReading ? pm.mileageReading.toLocaleString() : '—'}</td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(pm.expiryDate)}</td>
                    <td className="py-2 px-2">
                      <StatusBadge
                        status={pm.isOverdue ? 'danger' : 'success'}
                        label={pm.isOverdue ? 'Overdue' : 'OK'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <div className="h-4" />

      {/* Section D: Entitlements */}
      <ReportSection title="Section D — Parts Entitlement Balance">
        {entitlements.length === 0 ? (
          <p className="text-gray-500 text-sm">No entitlements found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Agreement</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Ops Code</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Qty</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Used</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Balance</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Period</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((e, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-mono">{e.agreement}</td>
                    <td className="py-2 px-2 font-mono">{e.opsCode}</td>
                    <td className="py-2 px-2 text-gray-700">{e.opsDesc}</td>
                    <td className="py-2 px-2 text-right">{e.quantity}</td>
                    <td className="py-2 px-2 text-right">{e.usedQty}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={e.balanceQty <= 0 ? 'text-red-600 font-semibold' : ''}>
                        {e.balanceQty}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {formatDate(e.startDate)} — {formatDate(e.endDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <div className="h-4" />

      {/* Section E: Spending */}
      <ReportSection title="Section E — Customer Spending">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Labor Cost" value={formatMoney(spending.laborCost)} variant="default" />
          <MetricCard label="Material Cost" value={formatMoney(spending.materialCost)} variant="default" />
          <MetricCard label="Total Cost" value={formatMoney(spending.totalCost)} variant={spending.totalCost > 10000 ? 'warning' : 'default'} />
          <MetricCard
            label="Cost / KM"
            value={spending.costPerKm !== null ? formatMoney(spending.costPerKm) : '—'}
            subtitle={spending.mileageDelta !== null ? `${spending.mileageDelta.toLocaleString()} km` : 'No mileage data'}
            variant="default"
          />
        </div>
      </ReportSection>

      <div className="h-4" />

      <p className="text-xs text-gray-400 text-center">
        Report generated {new Date(report.generatedAt).toLocaleString('en-SG')}
      </p>
    </div>
  );
}
