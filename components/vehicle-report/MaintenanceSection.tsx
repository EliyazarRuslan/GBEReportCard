import { MetricCard } from '../MetricCard';
import { ReportSection } from '../ReportSection';
import { formatDate } from '../../lib/format';
import type { OutstandingJob, VehicleMaintenance } from './types';

function OutstandingJobsTable({ jobs }: { jobs: OutstandingJob[] }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Outstanding Jobs</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-gray-500 font-medium">WO #</th>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.wonum} className="border-b border-gray-100">
                <td className="py-2 px-2 font-mono">{job.wonum}</td>
                <td className="py-2 px-2 text-gray-700">{job.description}</td>
                <td className="py-2 px-2">{job.worktype}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MaintenanceSection({ maintenance }: { maintenance: VehicleMaintenance }) {
  return (
    <ReportSection title="Section B — Vehicle Maintenance">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricCard label="Services" value={maintenance.serviceCount} variant="default" />
        <MetricCard label="Last Service" value={formatDate(maintenance.lastServiceDate)} variant="default" />
        <MetricCard label="Repairs" value={maintenance.repairCount} variant="default" />
        <MetricCard label="Last Repair" value={formatDate(maintenance.lastRepairDate)} variant="default" />
      </div>
      {maintenance.outstandingJobs.length > 0 && <OutstandingJobsTable jobs={maintenance.outstandingJobs} />}
    </ReportSection>
  );
}
