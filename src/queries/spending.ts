import { query, sql } from '../db';
import { config } from '../config';

export interface SpendingData {
  laborCost: number;
  materialCost: number;
  totalCost: number;
  mileageStart: number | null;
  mileageEnd: number | null;
  mileageDelta: number | null;
  costPerKm: number | null;
}

/**
 * Section E: Customer Spending for a vehicle over a date range.
 * Cost per km uses the first and last gb_mileagereading on work orders
 * completed within the same period.
 */
export async function getSpendingData(
  assetnum: string,
  startDate: Date,
  endDate: Date
): Promise<SpendingData> {
  // Chargeable labor cost
  const [labor] = await query<{ total: number }>(`
    SELECT ISNULL(SUM(lt.linecost), 0) AS total
    FROM labtrans lt
    JOIN workorder w ON w.wonum = lt.refwo AND w.siteid = lt.siteid
    WHERE lt.siteid = @siteId
      AND w.assetnum = @assetnum
      AND lt.gb_ischargeable = 1
      AND lt.transdate >= @startDate
      AND lt.transdate < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Material cost (issued items)
  const [material] = await query<{ total: number }>(`
    SELECT ISNULL(SUM(ABS(mt.linecost)), 0) AS total
    FROM matusetrans mt
    JOIN workorder w ON w.wonum = mt.refwo AND w.siteid = mt.siteid
    WHERE mt.siteid = @siteId
      AND w.assetnum = @assetnum
      AND mt.issuetype = 'ISSUE'
      AND mt.actualdate >= @startDate
      AND mt.actualdate < @endDate
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  // Odometer readings from work orders completed within the period
  const readings = await query<{ mileage: number }>(`
    SELECT TRY_CONVERT(NUMERIC, gb_mileagereading) AS mileage
    FROM workorder
    WHERE siteid = @siteId
      AND assetnum = @assetnum
      AND TRY_CONVERT(NUMERIC, gb_mileagereading) > 0
      AND actfinish IS NOT NULL
      AND actfinish >= @startDate
      AND actfinish < @endDate
    ORDER BY actfinish
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });

  const laborCost = labor?.total ?? 0;
  const materialCost = material?.total ?? 0;
  const totalCost = laborCost + materialCost;

  const { mileageStart, mileageEnd } = getMileageRange(readings.map((r) => r.mileage));
  const mileageDelta = (mileageStart !== null && mileageEnd !== null)
    ? mileageEnd - mileageStart
    : null;
  const costPerKm = (mileageDelta && mileageDelta > 0)
    ? Math.round((totalCost / mileageDelta) * 100) / 100
    : null;

  return {
    laborCost: Math.round(laborCost * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    mileageStart,
    mileageEnd,
    mileageDelta,
    costPerKm,
  };
}

/**
 * Odometers only go up, so a reading higher than any later one is a typo
 * (e.g. 692,565 between 180,476 and 194,212). Drop those, then take the
 * first and last remaining readings. Input must be in chronological order.
 */
export function getMileageRange(
  readings: readonly number[]
): { mileageStart: number | null; mileageEnd: number | null } {
  const valid = readings.filter((value, i) => readings.slice(i + 1).every((later) => value <= later));
  return {
    mileageStart: valid[0] ?? null,
    mileageEnd: valid.at(-1) ?? null,
  };
}
