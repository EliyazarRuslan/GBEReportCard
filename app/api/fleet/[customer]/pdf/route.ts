import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getWarrantiedVehicles } from '../../../../../src/queries/vehicle-list';
import { buildCustomerFleetReport, getDefaultPeriod } from '../../../../../src/aggregator';
import { generateFleetReportPdf } from '../../../../../src/pdf-generator';

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

    const allVehicles = await getWarrantiedVehicles();
    const customerVehicles = allVehicles.filter(v => v.pluspcustomer === customer);

    if (customerVehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles found for this customer' }, { status: 404 });
    }

    const fleetReport = await buildCustomerFleetReport(
      customer, customerVehicles[0].customerName, customerVehicles, startDate, endDate
    );

    const pdfPath = await generateFleetReportPdf(fleetReport);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const filename = `fleet-report-${customer}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate fleet PDF:', error);
    return NextResponse.json({ error: 'Failed to generate fleet PDF' }, { status: 500 });
  }
}
