import { query, sql } from '../db';
import { config } from '../config';

export interface SpendingData {
  contractBilling: number;
  laborCost: number;
  materialCost: number;
  miscCost: number;
  totalCost: number;
  mileageStart: number | null;
  mileageEnd: number | null;
  mileageDelta: number | null;
  costPerKm: number | null;
}

/**
 * Section E: Customer Spending for a vehicle over a date range, from the
 * customer's perspective — what Maximo actually billed them:
 *   contract (service) billing + WO billing split into labour, material, misc.
 * Only WO bills invoiced to the customer (batch pre-tax total > 0) count;
 * contract-covered (CM/PM/...) and warranty (RP) bills carry a zero total.
 * Cost per km uses the first and last gb_mileagereading on work orders
 * completed within the same period.
 */
export async function getSpendingData(
  assetnum: string,
  startDate: Date,
  endDate: Date
): Promise<SpendingData> {
  const params = {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  };

  // Contract billing: billing-schedule lines (no WO) on the vehicle's agreements.
  // Lines carry no asset, so each line is split evenly across the agreement's vehicles.
  const [contract] = await query<{ total: number }>(`
    WITH agreements AS (
      SELECT ce.agreement, ce.orgid FROM caentitle ce
      WHERE ce.siteid = @siteId AND ce.gb_vehiclenum = @assetnum
      UNION
      SELECT p.gb_agreement, p.orgid FROM pm p
      WHERE p.siteid = @siteId AND p.assetnum = @assetnum AND p.gb_agreement IS NOT NULL
    ),
    fleet AS (
      SELECT a.agreement, a.orgid, COUNT(DISTINCT v.assetnum) AS vehicles
      FROM agreements a
      CROSS APPLY (
        SELECT ce.gb_vehiclenum AS assetnum FROM caentitle ce
        WHERE ce.agreement = a.agreement AND ce.orgid = a.orgid
        UNION
        SELECT p.assetnum FROM pm p
        WHERE p.gb_agreement = a.agreement AND p.orgid = a.orgid
      ) v
      GROUP BY a.agreement, a.orgid
    )
    SELECT ISNULL(SUM(bl.billedprice / f.vehicles), 0) AS total
    FROM fleet f
    JOIN pluspbillbatch bb ON bb.agreement = f.agreement AND bb.orgid = f.orgid
    JOIN pluspbillline bl ON bl.billbatchnum = bb.billbatchnum AND bl.orgid = bb.orgid
    WHERE bl.refwo IS NULL
      AND bb.status = 'BILLED'
      AND bb.statusdate >= @startDate
      AND bb.statusdate < @endDate
  `, params);

  // WO billing: bill lines on batches invoiced to the customer; each links to the transactions billed on it.
  // Labour = labour transactions + "LABOUR CHARGES" fixed charges;
  // Material = parts issued; Misc = vendor services (DDE) and other fixed charges.
  const [wo] = await query<{ labor: number; material: number; misc: number }>(`
    WITH lines AS (
      SELECT bl.billbatchnum, bl.linenum, bl.orgid
      FROM workorder w
      JOIN pluspbillline bl ON bl.refwo = w.wonum AND bl.siteid = w.siteid
      JOIN pluspbillbatch bb ON bb.billbatchnum = bl.billbatchnum AND bb.orgid = bl.orgid
      WHERE w.siteid = @siteId
        AND w.assetnum = @assetnum
        AND bb.status = 'BILLED'
        AND bb.pretaxtotal > 0
        AND bb.statusdate >= @startDate
        AND bb.statusdate < @endDate
    )
    SELECT
      ISNULL(SUM(CASE
        WHEN tr.ownertable = 'LABTRANS' THEN lt.pluspbillprice
        WHEN tr.ownertable = 'PLUSPGBTRANS' AND g.description LIKE 'LABOUR%' THEN g.billprice
      END), 0) AS labor,
      ISNULL(SUM(CASE WHEN tr.ownertable = 'MATUSETRANS' THEN mt.pluspbillprice END), 0) AS material,
      ISNULL(SUM(CASE
        WHEN tr.ownertable = 'SERVRECTRANS' THEN st.pluspbillprice
        WHEN tr.ownertable = 'PLUSPGBTRANS' AND ISNULL(g.description, '') NOT LIKE 'LABOUR%' THEN g.billprice
      END), 0) AS misc
    FROM lines l
    JOIN pluspbilllinetr tr ON tr.billbatchnum = l.billbatchnum AND tr.linenum = l.linenum AND tr.orgid = l.orgid
    LEFT JOIN labtrans lt ON tr.ownertable = 'LABTRANS' AND lt.labtransid = tr.ownerid
    LEFT JOIN matusetrans mt ON tr.ownertable = 'MATUSETRANS' AND mt.matusetransid = tr.ownerid
    LEFT JOIN servrectrans st ON tr.ownertable = 'SERVRECTRANS' AND st.servrectransid = tr.ownerid
    LEFT JOIN pluspgbtrans g ON tr.ownertable = 'PLUSPGBTRANS' AND g.pluspgbtransid = tr.ownerid
    OPTION (RECOMPILE) -- cached plan for these params ran >60s on GBITR01V; fresh plan ~3s
  `, params);

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
  `, params);

  const contractBilling = contract?.total ?? 0;
  const laborCost = wo?.labor ?? 0;
  const materialCost = wo?.material ?? 0;
  const miscCost = wo?.misc ?? 0;
  const totalCost = contractBilling + laborCost + materialCost + miscCost;

  const { mileageStart, mileageEnd } = getMileageRange(readings.map((r) => r.mileage));
  const mileageDelta = (mileageStart !== null && mileageEnd !== null)
    ? mileageEnd - mileageStart
    : null;
  const costPerKm = (mileageDelta && mileageDelta > 0)
    ? Math.round((totalCost / mileageDelta) * 100) / 100
    : null;

  return {
    contractBilling: Math.round(contractBilling * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    miscCost: Math.round(miscCost * 100) / 100,
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
