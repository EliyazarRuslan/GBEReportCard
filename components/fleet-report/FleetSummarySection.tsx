import { MetricCard } from '../MetricCard';
import { ReportSection } from '../ReportSection';
import { formatMoney } from '../../lib/format';
import type { FleetSummary } from './types';

function cbjVariant(total: number) {
  if (total > 5) return 'danger';
  if (total > 0) return 'warning';
  return 'success';
}

export function FleetSummarySection({ summary }: { summary: FleetSummary }) {
  return (
    <ReportSection title="Fleet Summary">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Downtime" value={`${summary.totalDowntimeDays} days`} variant={summary.totalDowntimeDays > 60 ? 'danger' : 'default'} />
        <MetricCard label="Avg Downtime" value={`${summary.avgDowntimeDays} days`} variant="default" />
        <MetricCard label="Comeback Jobs" value={summary.totalCBJ} variant={cbjVariant(summary.totalCBJ)} />
        <MetricCard label="Breakdown" value={summary.totalBreakdown} variant={summary.totalBreakdown > 0 ? 'warning' : 'success'} />
        <MetricCard label="Total Services" value={summary.totalServiceCount} variant="default" />
        <MetricCard label="Total Repairs" value={summary.totalRepairCount} variant="default" />
        <MetricCard label="Total Cost" value={formatMoney(summary.totalCost)} variant={summary.totalCost > 50000 ? 'warning' : 'default'} />
        <MetricCard label="Avg Cost/KM" value={summary.avgCostPerKm !== null ? formatMoney(summary.avgCostPerKm) : '—'} variant="default" />
      </div>
    </ReportSection>
  );
}
