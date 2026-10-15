import { NextRequest, NextResponse } from 'next/server';
import { getWarrantiedVehicles } from '../../../../../src/queries/vehicle-list';
import { buildCustomerFleetReport, getDefaultPeriod } from '../../../../../src/aggregator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer: string }> }
) {
  try {
    const { customer } = await params;
    const searchParams = request.nextUrl.searchParams;

    const defaultPeriod = getDefaultPeriod();
    const startDate = searchParams.get('start')
      ? new Date(searchParams.get('start')!)
      : defaultPeriod.startDate;
    const endDate = searchParams.get('end')
      ? new Date(searchParams.get('end')!)
      : defaultPeriod.endDate;

    // Get all warrantied vehicles and filter to this customer
    const allVehicles = await getWarrantiedVehicles();
    const customerVehicles = allVehicles.filter(v => v.pluspcustomer === customer);

    if (customerVehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles found for this customer' }, { status: 404 });
    }

    const fleetReport = await buildCustomerFleetReport(
      customer, customerVehicles[0].customerName, customerVehicles, startDate, endDate
    );

    return NextResponse.json(fleetReport);
  } catch (error) {
    console.error('Failed to build fleet report:', error);
    return NextResponse.json({ error: 'Failed to build fleet report' }, { status: 500 });
  }
}
