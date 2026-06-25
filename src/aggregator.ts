import { WarrantiedVehicle, getWarrantiedVehicles, getFleetCustomers } from './queries/vehicle-list';
import { VehicleParameters, getVehicleParameters } from './queries/parameters';
import { MaintenanceData, getMaintenanceData } from './queries/maintenance';
import { ScheduleData, getScheduleData } from './queries/schedule';
import { EntitlementItem, getEntitlementData } from './queries/entitlement';
import { SpendingData, getSpendingData } from './queries/spending';

export interface VehicleReport {
  vehicle: WarrantiedVehicle;
  period: { startDate: Date; endDate: Date };
  parameters: VehicleParameters;
  maintenance: MaintenanceData;
  schedule: ScheduleData;
  entitlements: EntitlementItem[];
  spending: SpendingData;
  generatedAt: Date;
}

export interface FleetReport {
  customer: string;
  customerName: string;
  vehicleCount: number;
  period: { startDate: Date; endDate: Date };
  vehicles: VehicleReport[];
  summary: FleetSummary;
  generatedAt: Date;
}

export interface FleetSummary {
  totalDowntimeDays: number;
  totalDowntimeHours: number;
  avgDowntimeDays: number;
  avgDowntimeHours: number;
  totalCBJ: number;
  totalBreakdown: number;
  totalServiceCount: number;
  totalRepairCount: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalCost: number;
  avgCostPerKm: number | null;
  overdueVehicles: string[];
  worstDowntime: { assetnum: string; days: number; hours: number } | null;
  worstCBJ: { assetnum: string; count: number } | null;
}

/**
 * Get the default 6-month reporting period (last 6 months from today).
 */
export function getDefaultPeriod(): { startDate: Date; endDate: Date } {
  // Use UTC midnight so the bounds line up with DB datetimes (which are
  // SGT wall-clock tagged as UTC) and render correctly via the UTC-based
  // formatDate helper.
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const startDate = new Date(endDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - 6);
  return { startDate, endDate };
}

/**
 * Build a complete report for a single vehicle.
 */
export async function buildVehicleReport(
  vehicle: WarrantiedVehicle,
  startDate: Date,
  endDate: Date
): Promise<VehicleReport> {
  console.log(`  Building report for ${vehicle.assetnum} (${vehicle.description})...`);

  const [parameters, maintenance, schedule, entitlements, spending] = await Promise.all([
    getVehicleParameters(vehicle.assetnum, startDate, endDate),
    getMaintenanceData(vehicle.assetnum, startDate, endDate),
    getScheduleData(vehicle.assetnum, endDate),
    getEntitlementData(vehicle.assetnum),
    getSpendingData(vehicle.assetnum, startDate, endDate),
  ]);

  return {
    vehicle,
    period: { startDate, endDate },
    parameters,
    maintenance,
    schedule,
    entitlements,
    spending,
    generatedAt: new Date(),
  };
}

/**
 * Build fleet summary from individual vehicle reports.
 */
function buildFleetSummary(vehicles: VehicleReport[]): FleetSummary {
  const totalDowntimeDays = vehicles.reduce((s, v) => s + v.parameters.downtimeDays, 0);
  const totalDowntimeHours = vehicles.reduce((s, v) => s + v.parameters.downtimeHours, 0);
  const totalCBJ = vehicles.reduce((s, v) => s + v.parameters.cbjCount, 0);
  const totalBreakdown = vehicles.reduce((s, v) => s + v.parameters.breakdownCount, 0);
  const totalServiceCount = vehicles.reduce((s, v) => s + v.maintenance.serviceCount, 0);
  const totalRepairCount = vehicles.reduce((s, v) => s + v.maintenance.repairCount, 0);
  const totalLaborCost = vehicles.reduce((s, v) => s + v.spending.laborCost, 0);
  const totalMaterialCost = vehicles.reduce((s, v) => s + v.spending.materialCost, 0);
  const totalCost = totalLaborCost + totalMaterialCost;

  // Average cost per km (only vehicles with valid mileage data)
  const validCostPerKm = vehicles.filter(v => v.spending.costPerKm !== null);
  const avgCostPerKm = validCostPerKm.length > 0
    ? Math.round(validCostPerKm.reduce((s, v) => s + v.spending.costPerKm!, 0) / validCostPerKm.length * 100) / 100
    : null;

  // Overdue vehicles
  const overdueVehicles = vehicles
    .filter(v => v.schedule.serviceOverdue)
    .map(v => v.vehicle.assetnum);

  // Worst performers
  const worstDowntime = vehicles.length > 0
    ? vehicles.reduce((worst, v) =>
        v.parameters.downtimeDays > (worst?.days ?? 0)
          ? { assetnum: v.vehicle.assetnum, days: v.parameters.downtimeDays, hours: v.parameters.downtimeHours }
          : worst,
        null as { assetnum: string; days: number; hours: number } | null
      )
    : null;

  const worstCBJ = vehicles.length > 0
    ? vehicles.reduce((worst, v) =>
        v.parameters.cbjCount > (worst?.count ?? 0)
          ? { assetnum: v.vehicle.assetnum, count: v.parameters.cbjCount }
          : worst,
        null as { assetnum: string; count: number } | null
      )
    : null;

  return {
    totalDowntimeDays,
    totalDowntimeHours,
    avgDowntimeDays: vehicles.length > 0 ? Math.round(totalDowntimeDays / vehicles.length) : 0,
    avgDowntimeHours: vehicles.length > 0 ? Math.round(totalDowntimeHours / vehicles.length) : 0,
    totalCBJ,
    totalBreakdown,
    totalServiceCount,
    totalRepairCount,
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    avgCostPerKm,
    overdueVehicles,
    worstDowntime,
    worstCBJ,
  };
}

/**
 * Build all vehicle reports for all warrantied vehicles.
 */
export async function buildAllVehicleReports(
  startDate?: Date,
  endDate?: Date
): Promise<VehicleReport[]> {
  const period = startDate && endDate ? { startDate, endDate } : getDefaultPeriod();
  const vehicles = await getWarrantiedVehicles();
  console.log(`Found ${vehicles.length} warrantied vehicles`);

  const reports: VehicleReport[] = [];
  for (const vehicle of vehicles) {
    const report = await buildVehicleReport(vehicle, period.startDate, period.endDate);
    reports.push(report);
  }
  return reports;
}

/**
 * Build fleet reports for all multi-vehicle customers.
 */
export async function buildFleetReports(
  startDate?: Date,
  endDate?: Date
): Promise<FleetReport[]> {
  const period = startDate && endDate ? { startDate, endDate } : getDefaultPeriod();
  const fleetCustomers = await getFleetCustomers();
  console.log(`Found ${fleetCustomers.length} fleet customers`);

  const vehicles = await getWarrantiedVehicles();
  const fleetReports: FleetReport[] = [];

  for (const fc of fleetCustomers) {
    console.log(`Building fleet report for ${fc.pluspcustomer} (${fc.customerName})...`);
    const customerVehicles = vehicles.filter(v => v.pluspcustomer === fc.pluspcustomer);

    const vehicleReports: VehicleReport[] = [];
    for (const vehicle of customerVehicles) {
      const report = await buildVehicleReport(vehicle, period.startDate, period.endDate);
      vehicleReports.push(report);
    }

    fleetReports.push({
      customer: fc.pluspcustomer,
      customerName: fc.customerName,
      vehicleCount: customerVehicles.length,
      period,
      vehicles: vehicleReports,
      summary: buildFleetSummary(vehicleReports),
      generatedAt: new Date(),
    });
  }

  return fleetReports;
}
