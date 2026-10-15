import Link from 'next/link';
import { ReportSection } from '../ReportSection';
import { StatusBadge } from '../StatusBadge';
import type { FleetSummary } from './types';

const LINK_CLASS = 'text-[#003366] hover:text-[#C8A951] font-medium';

function VehicleLink({ assetnum }: { assetnum: string }) {
  return <Link href={`/vehicle/${assetnum}`} className={LINK_CLASS}>{assetnum}</Link>;
}

export function AttentionSection({ summary }: { summary: FleetSummary }) {
  const { overdueVehicles, worstDowntime, worstCBJ } = summary;
  const hasCBJ = worstCBJ !== null && worstCBJ.count > 0;
  if (overdueVehicles.length === 0 && !worstDowntime && !hasCBJ) return null;

  return (
    <ReportSection title="Attention Required">
      <div className="space-y-2">
        {overdueVehicles.length > 0 && (
          <div className="flex items-center gap-2">
            <StatusBadge status="danger" label="OVERDUE" />
            <span className="text-sm text-gray-700">
              Service overdue: {overdueVehicles.map(a => (
                <Link key={a} href={`/vehicle/${a}`} className={`${LINK_CLASS} mx-1`}>{a}</Link>
              ))}
            </span>
          </div>
        )}
        {worstDowntime && (
          <div className="flex items-center gap-2">
            <StatusBadge status="warning" label="DOWNTIME" />
            <span className="text-sm text-gray-700">
              Worst downtime: <VehicleLink assetnum={worstDowntime.assetnum} /> ({worstDowntime.days}d)
            </span>
          </div>
        )}
        {hasCBJ && (
          <div className="flex items-center gap-2">
            <StatusBadge status="warning" label="CBJ" />
            <span className="text-sm text-gray-700">
              Most comeback jobs: <VehicleLink assetnum={worstCBJ.assetnum} /> ({worstCBJ.count})
            </span>
          </div>
        )}
      </div>
    </ReportSection>
  );
}
