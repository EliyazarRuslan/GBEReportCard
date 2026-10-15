import { query, sql } from '../db';
import { config } from '../config';

export interface EntitlementItem {
  agreement: string;
  opsCode: string;
  opsDesc: string;
  quantity: number;
  usedQty: number;
  balanceQty: number;
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Section D: Parts entitlement balance for a vehicle.
 * Uses caentitle.gb_vehiclenum to match the asset.
 *
 * Mirrors Maximo's "Entitlement - Ops Codes" tab:
 *   - shows caentitle.opscode (not the internal craft id)
 *   - only the latest contract revision (carevnum) of each agreement, since
 *     every revision re-copies the entitlement rows
 *   - only agreements whose validity overlaps the reporting period, so
 *     expired agreements from a previous owner/contract are excluded
 */
export async function getEntitlementData(
  assetnum: string,
  startDate: Date,
  endDate: Date
): Promise<EntitlementItem[]> {
  return query<EntitlementItem>(`
    WITH latest AS (
      SELECT ce.*,
        MAX(ce.carevnum) OVER (PARTITION BY ce.agreement) AS maxRev
      FROM caentitle ce
      WHERE ce.siteid = @siteId
        AND ce.gb_vehiclenum = @assetnum
    )
    SELECT
      ce.agreement,
      ISNULL(ce.opscode, ISNULL(ce.craft, '')) AS opsCode,
      ISNULL(MAX(cr.description), '') AS opsDesc,
      MAX(ISNULL(ce.quantity, 0)) AS quantity,
      ISNULL(SUM(ce.usedqty), 0) AS usedQty,
      MAX(ISNULL(ce.balanceqty, 0)) AS balanceQty,
      MIN(ce.startdate) AS startDate,
      MAX(ce.enddate) AS endDate
    FROM latest ce
    LEFT JOIN craft cr ON cr.craft = ce.craft AND cr.orgid = ce.orgid
    WHERE ce.carevnum = ce.maxRev
      AND (ce.startdate IS NULL OR ce.startdate < @endDate)
      AND (ce.enddate IS NULL OR ce.enddate >= @startDate)
    GROUP BY ce.agreement, ISNULL(ce.opscode, ISNULL(ce.craft, ''))
    ORDER BY ce.agreement, opsCode
  `, {
    siteId: { type: sql.VarChar, value: config.siteId },
    assetnum: { type: sql.VarChar, value: assetnum },
    startDate: { type: sql.DateTime, value: startDate },
    endDate: { type: sql.DateTime, value: endDate },
  });
}
