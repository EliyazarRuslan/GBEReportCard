import { ReportSection } from '../ReportSection';
import { StatusBadge } from '../StatusBadge';
import { formatDate, formatNumber } from '../../lib/format';
import type { PMDetail, VehicleSchedule } from './types';

function PMRow({ pm }: { pm: PMDetail }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-2 font-mono">{pm.pmnum}</td>
      <td className="py-2 px-2 text-gray-700">{pm.servicePkgType}</td>
      <td className="py-2 px-2 font-mono">{pm.wonum || '—'}</td>
      <td className="py-2 px-2">
        {pm.woStatus ? <StatusBadge status={pm.woStatus === 'INITIATED' ? 'warning' : 'neutral'} label={pm.woStatus} /> : '—'}
      </td>
      <td className="py-2 px-2 text-gray-500">{formatDate(pm.lastCompDate)}</td>
      <td className="py-2 px-2 text-gray-500">{formatDate(pm.nextDueDate)}</td>
      <td className="py-2 px-2 text-right">{pm.mileageReading ? formatNumber(pm.mileageReading) : '—'}</td>
      <td className="py-2 px-2">
        <StatusBadge status={pm.isOverdue ? 'danger' : 'success'} label={pm.isOverdue ? 'Overdue' : 'OK'} />
      </td>
    </tr>
  );
}

function PMTable({ pms }: { pms: PMDetail[] }) {
  return (
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
            <th className="text-left py-2 px-2 text-gray-500 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {pms.map(pm => <PMRow key={pm.pmnum} pm={pm} />)}
        </tbody>
      </table>
    </div>
  );
}

export function ScheduleSection({ schedule }: { schedule: VehicleSchedule }) {
  return (
    <ReportSection title="Section C — Vehicle Schedule">
      <div className="flex items-center gap-4 mb-4">
        <StatusBadge
          status={schedule.serviceOverdue ? 'danger' : 'success'}
          label={schedule.serviceOverdue ? 'SERVICE OVERDUE' : 'On Schedule'}
        />
        {schedule.nextServiceDate && (
          <span className="text-sm text-gray-600">Next service: {formatDate(schedule.nextServiceDate)}</span>
        )}
      </div>
      {schedule.pmDetails.length > 0 && <PMTable pms={schedule.pmDetails} />}
    </ReportSection>
  );
}
