import { MetricCard } from '../MetricCard';
import { ReportSection } from '../ReportSection';
import { formatMoney, formatNumber } from '../../lib/format';
import type { VehicleSpending } from './types';

export function SpendingSection({ spending }: { spending: VehicleSpending }) {
  return (
    <ReportSection title="Section E — Customer Spending">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Labor Cost" value={formatMoney(spending.laborCost)} variant="default" />
        <MetricCard label="Material Cost" value={formatMoney(spending.materialCost)} variant="default" />
        <MetricCard label="Total Cost" value={formatMoney(spending.totalCost)} variant={spending.totalCost > 10000 ? 'warning' : 'default'} />
        <MetricCard
          label="Cost / KM"
          value={spending.costPerKm !== null ? formatMoney(spending.costPerKm) : '—'}
          subtitle={spending.mileageDelta !== null ? `${formatNumber(spending.mileageDelta)} km` : 'No mileage data'}
          variant="default"
        />
      </div>
    </ReportSection>
  );
}
