import { query, sql } from '../db';
import { config } from '../config';
import { getDeductionDays } from '../holidays-sg';

export interface VehicleParameters {
  downtimeDays: number;
  downtimeHours: number;
  cbjCount: number;
  breakdownCount: number;
  warrantyRepairCount: number;
  avgWaitingHours: number;
}

/**
 * Section A: Performance Parameters for a vehicle over a date range.
 */
export async function getVehicleParameters(
  assetnum: string,
  startDate: Date,
  endDate: Date
): Promise<VehicleParameters> {
  // Downtime (TAT): Use REGISTERED date from wostatus as the start and the
  // WKSPCOMPLETED (workshop completed) status date as the end — actfinish /
  // WORKCOMPLETED trail the physical job by administrative delays. Falls back
  // to actfinish/statusdate for WOs that never reached WKSPCOMPLETED.
  const woIntervals = await query<{ regDate: Date; endDate: Date }>(`
    SELECT
      ws.changedate AS regDate,
      ISNULL(wksp.wkspDate, ISNULL(w.actfinish, w.statusdate)) AS endDate
    FROM workorder w
    JOIN wostatus ws ON ws.wonum = w.wonum AND ws.siteid = w.siteid AND ws.status = 'REGISTERED'
    OUTER APPLY (
      SELECT MAX(x.changedate) AS wkspDate
      FROM wostatus x
      WHERE x.wonum = w.wonum AND x.siteid = w.siteid AND x.status = 'WKSPCOMPLETED'
    ) wksp
    WHERE w.siteid = @siteId
      AND w.assetnum = @assetnum
      AND ws.changedate >= @startDate
      AND ws.changedate < @endDate
      AND ws.changedate IS NOT NULL
    ORDER BY ws.changedate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Same-visit dedup: multiple jobs opened on the same day for the same
  // vehicle are one workshop visit — collapse them into a single interval
  // (earliest registration → latest completion) so TAT is not double-counted.
  // Then merge any remaining overlapping intervals across visits.
  const visits = groupByVisitDay(
    woIntervals
      .map(r => ({ start: new Date(r.regDate), end: new Date(r.endDate) }))
      .filter(iv => !isNaN(iv.start.getTime()) && !isNaN(iv.end.getTime()) && iv.end > iv.start)
  );
  const merged = mergeIntervals(visits);

  let totalHours = 0;
  let totalDays = 0;
  for (const interval of merged) {
    const ms = interval.end.getTime() - interval.start.getTime();
    const calendarDays = ms / (1000 * 60 * 60 * 24);
    totalHours += ms / (1000 * 60 * 60);
    // Deduct Sundays (1 day), Saturdays (0.5 day), and public holidays (1 day)
    const deduction = getDeductionDays(interval.start, interval.end);
    totalDays += calendarDays - deduction;
  }
  totalHours = Math.round(totalHours);
  totalDays = Math.max(0, Math.round(totalDays * 10) / 10); // 1 decimal place, never negative

  // CBJ (Comeback Jobs)
  const [cbj] = await query<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND worktype = 'CBJ'
      AND reportdate >= @startDate
      AND reportdate < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Breakdown count (worktype = 'BREAKDOWN' only)
  const [breakdown] = await query<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND worktype = 'BREAKDOWN'
      AND reportdate >= @startDate
      AND reportdate < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Warranty repairs (gb_salestype WE or RP)
  const [warranty] = await query<{ cnt: number }>(`
    SELECT COUNT(DISTINCT wonum) AS cnt
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND gb_salestype IN ('WE','RP')
      AND reportdate >= @startDate
      AND reportdate < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Average waiting time from queue tickets (createdate → csa_attendedtime)
  const [waiting] = await query<{ avgHours: number }>(`
    SELECT ISNULL(AVG(CAST(
      DATEDIFF(MINUTE, q.createdate, q.csa_attendedtime)
    AS FLOAT) / 60), 0) AS avgHours
    FROM gb_queuetkts q
    JOIN workorder w ON w.wonum = q.pmwonum AND w.siteid = q.siteid
    WHERE w.siteid = @siteId
      AND w.assetnum = @assetnum
      AND q.createdate >= @startDate
      AND q.createdate < @endDate
      AND q.createdate IS NOT NULL
      AND q.csa_attendedtime IS NOT NULL
      AND q.csa_attendedtime > q.createdate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  return {
    downtimeDays: totalDays,
    downtimeHours: totalHours,
    cbjCount: cbj?.cnt ?? 0,
    breakdownCount: breakdown?.cnt ?? 0,
    warrantyRepairCount: warranty?.cnt ?? 0,
    avgWaitingHours: Math.round((waiting?.avgHours ?? 0) * 10) / 10,
  };
}

/**
 * Collapse work orders registered on the same calendar day (one workshop
 * visit) into a single interval: earliest registration → latest completion.
 * DB dates are treated as UTC throughout the app, so the day key uses UTC.
 */
function groupByVisitDay(intervals: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
  const byDay = new Map<string, { start: Date; end: Date }>();
  for (const iv of intervals) {
    const key = iv.start.toISOString().slice(0, 10);
    const existing = byDay.get(key);
    if (!existing) {
      byDay.set(key, { start: iv.start, end: iv.end });
    } else {
      byDay.set(key, {
        start: iv.start < existing.start ? iv.start : existing.start,
        end: iv.end > existing.end ? iv.end : existing.end,
      });
    }
  }
  return [...byDay.values()];
}

/**
 * Merge overlapping time intervals to prevent double-counting.
 */
function mergeIntervals(intervals: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
  if (intervals.length === 0) return [];
  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start.getTime() <= last.end.getTime()) {
      // Overlapping — extend the end if needed
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }
  return merged;
}
