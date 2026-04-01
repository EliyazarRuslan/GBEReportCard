import { query, sql } from '../db';
import { config } from '../config';

export interface WarrantiedVehicle {
  assetnum: string;
  vehicleNo: string;
  description: string;
  serialnum: string;
  pluspcustomer: string;
  customerName: string;
  agreement: string;
  warrantyStart: Date | null;
  warrantyEnd: Date | null;
}

/**
 * Get all warrantied vehicles with active agreements (within first 5 years).
 * Links through caentitle.gb_vehiclenum → asset.assetnum.
 */
export async function getWarrantiedVehicles(): Promise<WarrantiedVehicle[]> {
  return query<WarrantiedVehicle>(`
    WITH ranked AS (
      SELECT
        a.assetnum,
        ISNULL(a.gb_assetregistrationno, '') AS vehicleNo,
        a.description,
        a.serialnum,
        a.pluspcustomer,
        c.name AS customerName,
        ag.agreement,
        ag.startdate AS warrantyStart,
        ag.enddate AS warrantyEnd,
        ROW_NUMBER() OVER (PARTITION BY a.assetnum ORDER BY ag.enddate DESC, ag.startdate DESC) AS rn
      FROM caentitle ce
      JOIN asset a ON a.assetnum = ce.gb_vehiclenum AND a.siteid = ce.siteid
      JOIN pluspagreement ag ON ag.agreement = ce.agreement AND ag.orgid = ce.orgid
      LEFT JOIN pluspcustomer c ON c.customer = a.pluspcustomer
      WHERE ce.siteid = @siteId
        AND ag.status = 'ACTIVE'
        AND ag.startdate >= DATEADD(YEAR, -5, GETDATE())
        AND ag.agreement NOT LIKE '%CCM%'
    )
    SELECT assetnum, vehicleNo, description, serialnum, pluspcustomer, customerName, agreement, warrantyStart, warrantyEnd
    FROM ranked
    WHERE rn = 1
    ORDER BY pluspcustomer, assetnum
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
  });
}

/**
 * Get a single vehicle by asset number.
 */
export async function getVehicleByAssetNum(assetnum: string): Promise<WarrantiedVehicle | null> {
  const rows = await query<WarrantiedVehicle>(`
    SELECT TOP 1
      a.assetnum,
      ISNULL(a.gb_assetregistrationno, '') AS vehicleNo,
      a.description,
      a.serialnum,
      a.pluspcustomer,
      c.name AS customerName,
      ISNULL(ag.agreement, '') AS agreement,
      ag.startdate AS warrantyStart,
      ag.enddate AS warrantyEnd
    FROM asset a
    LEFT JOIN caentitle ce ON ce.gb_vehiclenum = a.assetnum AND ce.siteid = a.siteid
    LEFT JOIN pluspagreement ag ON ag.agreement = ce.agreement AND ag.orgid = ce.orgid AND ag.status = 'ACTIVE' AND ag.agreement NOT LIKE '%CCM%'
    LEFT JOIN pluspcustomer c ON c.customer = a.pluspcustomer
    WHERE a.siteid = @siteId
      AND a.assetnum = @assetnum
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
  });
  return rows[0] || null;
}

/**
 * Get customers with more than one warrantied vehicle (for fleet reports).
 */
export async function getFleetCustomers(): Promise<{ pluspcustomer: string; customerName: string; vehicleCount: number }[]> {
  return query(`
    SELECT
      a.pluspcustomer,
      c.name AS customerName,
      COUNT(DISTINCT a.assetnum) AS vehicleCount
    FROM caentitle ce
    JOIN asset a ON a.assetnum = ce.gb_vehiclenum AND a.siteid = ce.siteid
    JOIN pluspagreement ag ON ag.agreement = ce.agreement AND ag.orgid = ce.orgid
    LEFT JOIN pluspcustomer c ON c.customer = a.pluspcustomer
    WHERE ce.siteid = @siteId
      AND ag.status = 'ACTIVE'
      AND ag.startdate >= DATEADD(YEAR, -5, GETDATE())
      AND ag.agreement NOT LIKE '%CCM%'
    GROUP BY a.pluspcustomer, c.name
    HAVING COUNT(DISTINCT a.assetnum) > 1
    ORDER BY vehicleCount DESC
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
  });
}
