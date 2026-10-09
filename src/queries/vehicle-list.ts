import { query, sql } from '../db';
import { config } from '../config';

/** Maximo gb_salestype codes included in warranty reporting. */
export const SALES_TYPES = {
  MCP: 'CM',
  CMP: 'CT',
  PMP: 'PP',
} as const;

export type SalesType = (typeof SALES_TYPES)[keyof typeof SALES_TYPES];

export interface WarrantiedVehicle {
  assetnum: string;
  vehicleNo: string;
  description: string;
  serialnum: string;
  pluspcustomer: string;
  customerName: string;
  agreement: string;
  salesType: SalesType | '';
  warrantyStart: Date | null;
  warrantyEnd: Date | null;
}

export interface FleetCustomer {
  pluspcustomer: string;
  customerName: string;
  vehicleCount: number;
  mcpCount: number;
  cmpCount: number;
  pmpCount: number;
}

/**
 * Shared CTE listing every active warranty agreement per vehicle.
 *
 * Two link paths exist in Maximo:
 *   - MCP (CM) and CMP (CT) agreements link vehicles via caentitle.gb_vehiclenum.
 *   - PMP (PP) agreements have no caentitle rows; they link via pm.gb_agreement.
 *
 * Both paths require agreement status ACTIVE and exclude CCM agreements.
 * One row per (assetnum, agreement); ranked so rn = 1 is the latest agreement.
 */
const WARRANTY_LINKS_CTE = `
  links AS (
    SELECT ce.gb_vehiclenum AS assetnum, ce.siteid, ag.agreement, ag.gb_salestype, ag.startdate, ag.enddate
    FROM caentitle ce
    JOIN pluspagreement ag ON ag.agreement = ce.agreement AND ag.orgid = ce.orgid
    WHERE ce.siteid = @siteId
      AND ag.status = 'ACTIVE'
      AND ag.gb_salestype IN ('CM', 'CT')
      AND ag.agreement NOT LIKE '%CCM%'
    UNION
    SELECT p.assetnum, p.siteid, ag.agreement, ag.gb_salestype, ag.startdate, ag.enddate
    FROM pm p
    JOIN pluspagreement ag ON ag.agreement = p.gb_agreement AND ag.orgid = p.orgid
    WHERE p.siteid = @siteId
      AND ag.status = 'ACTIVE'
      AND ag.gb_salestype = 'PP'
      AND ag.agreement NOT LIKE '%CCM%'
  ),
  ranked AS (
    SELECT
      a.assetnum,
      ISNULL(a.gb_assetregistrationno, '') AS vehicleNo,
      a.description,
      a.serialnum,
      a.pluspcustomer,
      c.name AS customerName,
      l.agreement,
      ISNULL(l.gb_salestype, '') AS salesType,
      l.startdate AS warrantyStart,
      l.enddate AS warrantyEnd,
      ROW_NUMBER() OVER (PARTITION BY a.assetnum ORDER BY l.enddate DESC, l.startdate DESC) AS rn
    FROM links l
    JOIN asset a ON a.assetnum = l.assetnum AND a.siteid = l.siteid
    LEFT JOIN pluspcustomer c ON c.customer = a.pluspcustomer
  )
`;

const VEHICLE_COLUMNS = `
  assetnum, vehicleNo, description, serialnum, pluspcustomer, customerName,
  agreement, salesType, warrantyStart, warrantyEnd
`;

/**
 * Get all warrantied vehicles with active MCP, CMP or PMP agreements.
 * Returns one row per vehicle (latest agreement wins).
 */
export async function getWarrantiedVehicles(): Promise<WarrantiedVehicle[]> {
  return query<WarrantiedVehicle>(`
    WITH ${WARRANTY_LINKS_CTE}
    SELECT ${VEHICLE_COLUMNS}
    FROM ranked
    WHERE rn = 1
    ORDER BY pluspcustomer, assetnum
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
  });
}

/**
 * Get a single vehicle by asset number.
 * Falls back to asset details with empty agreement when no active warranty exists.
 */
export async function getVehicleByAssetNum(assetnum: string): Promise<WarrantiedVehicle | null> {
  const rows = await query<WarrantiedVehicle>(`
    WITH ${WARRANTY_LINKS_CTE}
    SELECT TOP 1
      a.assetnum,
      ISNULL(a.gb_assetregistrationno, '') AS vehicleNo,
      a.description,
      a.serialnum,
      a.pluspcustomer,
      c.name AS customerName,
      ISNULL(r.agreement, '') AS agreement,
      ISNULL(r.salesType, '') AS salesType,
      r.warrantyStart,
      r.warrantyEnd
    FROM asset a
    LEFT JOIN pluspcustomer c ON c.customer = a.pluspcustomer
    LEFT JOIN ranked r ON r.assetnum = a.assetnum AND r.rn = 1
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
 * Counts per sales type use each vehicle's latest agreement.
 */
export async function getFleetCustomers(): Promise<FleetCustomer[]> {
  return query<FleetCustomer>(`
    WITH ${WARRANTY_LINKS_CTE}
    SELECT
      pluspcustomer,
      MAX(customerName) AS customerName,
      COUNT(*) AS vehicleCount,
      SUM(CASE WHEN salesType = 'CM' THEN 1 ELSE 0 END) AS mcpCount,
      SUM(CASE WHEN salesType = 'CT' THEN 1 ELSE 0 END) AS cmpCount,
      SUM(CASE WHEN salesType = 'PP' THEN 1 ELSE 0 END) AS pmpCount
    FROM ranked
    WHERE rn = 1
    GROUP BY pluspcustomer
    HAVING COUNT(*) > 1
    ORDER BY vehicleCount DESC
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
  });
}
