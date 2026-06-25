import { query, sql } from '../db';
import { config } from '../config';

export interface ScheduleData {
  serviceOverdue: boolean;
  nextServiceDate: Date | null;
  pmDetails: PMDetail[];
}

export interface PMDetail {
  pmnum: string;
  description: string;
  servicePkgType: string;
  wonum: string | null;
  woStatus: string | null;
  nextDueDate: Date | null;
  lastCompDate: Date | null;
  mileageReading: number | null;
  expiryDate: Date | null;
  isOverdue: boolean;
}

const COMPLETED_WO_STATUSES =
  "('JOBCOMPLETED','VEHCOLLECTED','CLOSED','CLOSE','COMP','WORKCOMPLETED')";

/**
 * Add a PM frequency interval to a date, in UTC (DB datetimes are SGT
 * wall-clock tagged as UTC, so all date math stays in UTC to avoid drift).
 */
function addFrequency(date: Date, frequency: number, frequnit: string | null): Date | null {
  const d = new Date(date);
  switch ((frequnit ?? '').toUpperCase()) {
    case 'MONTHS': d.setUTCMonth(d.getUTCMonth() + frequency); return d;
    case 'WEEKS':  d.setUTCDate(d.getUTCDate() + frequency * 7); return d;
    case 'DAYS':   d.setUTCDate(d.getUTCDate() + frequency); return d;
    case 'YEARS':  d.setUTCFullYear(d.getUTCFullYear() + frequency); return d;
    default: return null;
  }
}

/**
 * Section C: Vehicle Schedule — a snapshot as of the reporting period end.
 *
 * "Last Completed", "Mileage" and "Next Due Date" are derived from the most
 * recent PM service actually completed WITHIN the period (actfinish < endDate),
 * so regenerating the report later reproduces the same values and stays
 * consistent with Section B's Last Service Date. The WO#/WO Status columns
 * still reflect the current open PM work order (forward-looking).
 *
 * Next due date cascade:
 *   1. Last in-period completed WO's pmnextduedate, else
 *   2. that WO's actfinish + pm.frequency, else (no completed WO in period)
 *   3. pm.nextdate, else pm.laststartdate
 *
 * Overdue is evaluated against the period end (asOf), not "now".
 */
export async function getScheduleData(
  assetnum: string,
  endDate: Date
): Promise<ScheduleData> {
  const pms = await query<{
    pmnum: string;
    description: string | null;
    servicePkgType: string | null;
    frequency: number | null;
    frequnit: string | null;
    nextdate: Date | null;
    laststartdate: Date | null;
    expiryDate: Date | null;
    wonum: string | null;
    woStatus: string | null;
    lastCompDate: Date | null;
    mileageRaw: string | null;
    lastWoNextDue: Date | null;
  }>(`
    SELECT
      pm.pmnum,
      pm.description,
      pm.gb_servicepkgtype AS servicePkgType,
      pm.frequency,
      pm.frequnit,
      pm.nextdate,
      pm.laststartdate,
      pm.GB_EXPIRYDATE AS expiryDate,
      cur.wonum,
      cur.status AS woStatus,
      lw.actfinish AS lastCompDate,
      lw.gb_mileagereading AS mileageRaw,
      lw.pmnextduedate AS lastWoNextDue
    FROM pm
    OUTER APPLY (
      SELECT TOP 1 wonum, status
      FROM workorder w
      WHERE w.pmnum = pm.pmnum AND w.siteid = pm.siteid
      ORDER BY w.workorderid DESC
    ) cur
    OUTER APPLY (
      SELECT TOP 1 actfinish, gb_mileagereading, pmnextduedate
      FROM workorder w
      WHERE w.pmnum = pm.pmnum AND w.siteid = pm.siteid
        AND w.actfinish IS NOT NULL
        AND w.actfinish < @endDate
        AND w.status IN ${COMPLETED_WO_STATUSES}
      ORDER BY w.actfinish DESC
    ) lw
    WHERE pm.siteid = @siteId
      AND pm.assetnum = @assetnum
      AND pm.assetnum IS NOT NULL
      AND pm.status = 'ACTIVE'
    ORDER BY pm.pmnum
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    endDate: { type: sql.DateTime, value: endDate },
  });

  const asOf = new Date(endDate);
  const pmDetails: PMDetail[] = pms.map(pm => {
    const nextDueDate = pm.lastCompDate
      ? (pm.lastWoNextDue ?? addFrequency(pm.lastCompDate, pm.frequency ?? 0, pm.frequnit))
      : (pm.nextdate ?? pm.laststartdate);
    const mileage = pm.mileageRaw != null && pm.mileageRaw.trim() !== ''
      ? Number(pm.mileageRaw)
      : null;
    return {
      pmnum: pm.pmnum,
      description: pm.description ?? '',
      servicePkgType: pm.servicePkgType ?? '',
      wonum: pm.wonum,
      woStatus: pm.woStatus,
      nextDueDate: nextDueDate ?? null,
      lastCompDate: pm.lastCompDate,
      mileageReading: Number.isFinite(mileage as number) ? mileage : null,
      expiryDate: pm.expiryDate,
      isOverdue: nextDueDate ? new Date(nextDueDate) < asOf : false,
    };
  });

  const serviceOverdue = pmDetails.some(pm => pm.isOverdue);

  const nextServicePm = pmDetails
    .filter(pm => !pm.isOverdue && pm.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())[0];

  return {
    serviceOverdue,
    nextServiceDate: nextServicePm?.nextDueDate ?? null,
    pmDetails,
  };
}
