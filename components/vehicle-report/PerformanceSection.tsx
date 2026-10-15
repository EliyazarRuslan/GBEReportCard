import { MetricCard } from '../MetricCard';
import { ReportSection } from '../ReportSection';
import type { VehicleParameters } from './types';

type Variant = 'success' | 'warning' | 'danger';

function thresholdVariant(value: number, warnAbove: number, dangerAbove: number): Variant {
  if (value > dangerAbove) return 'danger';
  if (value > warnAbove) return 'warning';
  return 'success';
}

export function PerformanceSection({ parameters }: { parameters: VehicleParameters }) {
  return (
    <ReportSection title="Section A — Performance Parameters" badge="KPIs">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Downtime (days)" value={parameters.downtimeDays} variant={thresholdVariant(parameters.downtimeDays, 12, 25)} />
        <MetricCard label="Comeback Jobs" value={parameters.cbjCount} variant={thresholdVariant(parameters.cbjCount, 0, 3)} />
        <MetricCard label="Breakdown" value={parameters.breakdownCount} variant={thresholdVariant(parameters.breakdownCount, 0, 3)} />
        <MetricCard label="Warranty Repairs" value={parameters.warrantyRepairCount} variant="default" />
        <MetricCard label="Avg Service Wait (hrs)" value={parameters.avgWaitingHours} variant={thresholdVariant(parameters.avgWaitingHours, 48, 120)} />
      </div>
    </ReportSection>
  );
}
