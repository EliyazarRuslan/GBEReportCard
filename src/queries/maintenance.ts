import { query, sql } from '../db';
import { config } from '../config';

export interface MaintenanceData {
  serviceCount: number;
  lastServiceDate: Date | null;
  repairCount: number;
  lastRepairDate: Date | null;
  outstandingJobs: OutstandingJob[];
  outstandingRecalls: OutstandingRecall[];
}

export interface OutstandingJob {
  wonum: string;
  description: string;
  status: string;
  reportdate: Date | null;
  worktype: string;
}

export interface OutstandingRecall {
  recallnumber: string;
  campaigncode: string;
  campaignstatus: string;
  gb_vehiclemodel: string;
}

interface PeriodWorkOrder {
  wonum: string;
  worktype: string;
  status: string;
  actfinish: Date | null;
  gb_mileagereading: string | null;
  description: string | null;
}

/**
 * Normalize a work order description down to its complaint lines
 * (numbered lines like "01. CHECK FRONT BRAKE WORN"), ignoring
 * job-runner annotations and parts-ordering notes. Falls back to the
 * full description when no numbered lines exist.
 */
function complaintKey(description: string | null): string {
  if (!description) return '';
  const lines = description
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => /^\d+\s*\./.test(l))
    .map(l => l.replace(/\s+/g, ' ').toUpperCase())
    .sort();
  if (lines.length > 0) return lines.join('|');
  return description.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Count work orders for the period, deduplicating entries that represent
 * the same physical job. Only work actually performed counts: the WO must
 * have an actual finish within the period (open/INITIATED placeholders and
 * cancelled WOs are excluded — they surface under Outstanding Jobs instead).
 *
 * Dedup key: services dedupe on mileage reading alone (one visit = one
 * service, even when split across WOs); repairs dedupe on mileage +
 * complaint lines, since distinct faults are often fixed at the same
 * mileage but a parts-order WO duplicating the original complaint at the
 * same mileage is the same job.
 */
function countPerformed(
  workorders: PeriodWorkOrder[],
  dedupe: 'mileage' | 'mileage+complaint'
): number {
  const keys = new Set<string>();
  for (const wo of workorders) {
    const mileage = wo.gb_mileagereading?.trim() || `wo:${wo.wonum}`;
    keys.add(
      dedupe === 'mileage'
        ? mileage
        : `${mileage}::${complaintKey(wo.description)}`
    );
  }
  return keys.size;
}

function lastFinishDate(workorders: PeriodWorkOrder[]): Date | null {
  let last: Date | null = null;
  for (const wo of workorders) {
    if (wo.actfinish && (!last || wo.actfinish > last)) last = wo.actfinish;
  }
  return last;
}

/**
 * Section B: Vehicle Maintenance data for a vehicle over a date range.
 */
export async function getMaintenanceData(
  assetnum: string,
  startDate: Date,
  endDate: Date
): Promise<MaintenanceData> {
  const COMPLETED_STATUSES = "('CLOSED','CAN','JOBCOMPLETED','WORKCOMPLETED','COMP')";

  // All service/repair work performed within the period.
  // actfinish (actual work completion) bounds the period — statusdate is an
  // administrative closure date that can lag the real work by weeks.
  const periodWos = await query<PeriodWorkOrder>(`
    SELECT wonum, worktype, status, actfinish, gb_mileagereading, description
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND worktype IN ('SERVICE','REPAIR')
      AND status <> 'CAN'
      AND actfinish IS NOT NULL
      AND actfinish >= @startDate
      AND actfinish < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  const serviceWos = periodWos.filter(wo => wo.worktype === 'SERVICE');
  const repairWos = periodWos.filter(wo => wo.worktype === 'REPAIR');

  // Outstanding jobs (not completed/cancelled)
  const outstandingJobs = await query<OutstandingJob>(`
    SELECT TOP 20
      wonum, description, status, reportdate, worktype
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND status NOT IN ${COMPLETED_STATUSES}
    ORDER BY reportdate DESC
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
  });

  // Outstanding recalls (gb_vehicle_recall uses recallnumber, campaigncode, campaignstatus)
  let outstandingRecalls: OutstandingRecall[] = [];
  try {
    outstandingRecalls = await query<OutstandingRecall>(`
      SELECT
        recallnumber,
        campaigncode,
        campaignstatus,
        ISNULL(gb_vehiclemodel, '') AS gb_vehiclemodel
      FROM gb_vehicle_recall
      WHERE siteid = @siteId
        AND assetnum = @assetnum
        AND ISNULL(campaignstatus, '') NOT IN ('COMP','CLOSED')
    `, {
      siteId: { type: sql.VarChar, value: config.siteId },
      assetnum: { type: sql.VarChar, value: assetnum },
    });
  } catch {
    // Table may not exist in all environments
  }

  return {
    serviceCount: countPerformed(serviceWos, 'mileage'),
    lastServiceDate: lastFinishDate(serviceWos),
    repairCount: countPerformed(repairWos, 'mileage+complaint'),
    lastRepairDate: lastFinishDate(repairWos),
    outstandingJobs,
    outstandingRecalls,
  };
}
