import Link from 'next/link';
import { ReportSection } from '../ReportSection';
import { StatusBadge } from '../StatusBadge';
import { formatMoney } from '../../lib/format';
import type { FleetVehicleRow } from './types';

function BreakdownRow({ v }: { v: FleetVehicleRow }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-2">
        <Link href={`/vehicle/${v.vehicle.assetnum}`} className="text-[#003366] font-medium hover:text-[#C8A951]">
          {v.vehicle.vehicleNo || v.vehicle.assetnum}
        </Link>
      </td>
      <td className="py-2 px-2 text-gray-700">{v.vehicle.description}</td>
      <td className="py-2 px-2 text-right">{v.parameters.downtimeDays}d</td>
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
  );
}

export function VehicleBreakdownSection({ vehicles }: { vehicles: FleetVehicleRow[] }) {
  return (
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
            {vehicles.map(v => <BreakdownRow key={v.vehicle.assetnum} v={v} />)}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}
