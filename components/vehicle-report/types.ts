export interface VehicleInfo {
  assetnum: string;
  vehicleNo: string;
  description: string;
  serialnum: string;
  pluspcustomer: string;
  customerName: string;
  agreement: string;
  salesType?: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
}

export interface VehicleParameters {
  downtimeDays: number;
  downtimeHours: number;
  cbjCount: number;
  breakdownCount: number;
  warrantyRepairCount: number;
  avgWaitingHours: number;
}

export interface OutstandingJob {
  wonum: string;
  description: string;
  status: string;
  reportdate: string | null;
  worktype: string;
}

export interface VehicleMaintenance {
  serviceCount: number;
  lastServiceDate: string | null;
  repairCount: number;
  lastRepairDate: string | null;
  outstandingJobs: OutstandingJob[];
}

export interface PMDetail {
  pmnum: string;
  description: string;
  servicePkgType: string;
  wonum: string | null;
  woStatus: string | null;
  nextDueDate: string | null;
  lastCompDate: string | null;
  mileageReading: number | null;
  isOverdue: boolean;
}

export interface VehicleSchedule {
  serviceOverdue: boolean;
  nextServiceDate: string | null;
  pmDetails: PMDetail[];
}

export interface Entitlement {
  agreement: string;
  opsCode: string;
  opsDesc: string;
  quantity: number;
  usedQty: number;
  balanceQty: number;
  startDate: string | null;
  endDate: string | null;
}

export interface VehicleSpending {
  contractBilling: number;
  laborCost: number;
  materialCost: number;
  miscCost: number;
  totalCost: number;
  mileageDelta: number | null;
  costPerKm: number | null;
}

export interface VehicleReport {
  vehicle: VehicleInfo;
  parameters: VehicleParameters;
  maintenance: VehicleMaintenance;
  schedule: VehicleSchedule;
  entitlements: Entitlement[];
  spending: VehicleSpending;
  generatedAt: string;
}
