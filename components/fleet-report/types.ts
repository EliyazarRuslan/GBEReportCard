export interface FleetVehicleRow {
  vehicle: { assetnum: string; vehicleNo: string; description: string; pluspcustomer: string; customerName: string };
  parameters: { downtimeDays: number; cbjCount: number; breakdownCount: number; warrantyRepairCount: number; avgWaitingHours: number };
  maintenance: { serviceCount: number; repairCount: number };
  schedule: { serviceOverdue: boolean };
  spending: { contractBilling: number; laborCost: number; materialCost: number; miscCost: number; totalCost: number; costPerKm: number | null };
}

export interface FleetSummary {
  totalDowntimeDays: number;
  avgDowntimeDays: number;
  totalCBJ: number;
  totalBreakdown: number;
  totalServiceCount: number;
  totalRepairCount: number;
  totalContractBilling: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalMiscCost: number;
  totalCost: number;
  avgCostPerKm: number | null;
  overdueVehicles: string[];
  worstDowntime: { assetnum: string; days: number } | null;
  worstCBJ: { assetnum: string; count: number } | null;
}

export interface FleetReport {
  customer: string;
  customerName: string;
  vehicleCount: number;
  vehicles: FleetVehicleRow[];
  summary: FleetSummary;
  generatedAt: string;
}
