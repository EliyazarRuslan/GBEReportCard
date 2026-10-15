import { Command } from 'commander';
import { getPool, closePool } from './db';
import { getDefaultPeriod, buildVehicleReport, buildAllVehicleReports, buildFleetReports } from './aggregator';
import { getVehicleByAssetNum, getWarrantiedVehicles } from './queries/vehicle-list';
import { generateVehicleReportPdf, generateFleetReportPdf } from './pdf-generator';
import { sendReport, buildVehicleEmailBody, buildFleetEmailBody } from './email-sender';
import { startScheduler } from './scheduler';
import path from 'path';
import { mapWithConcurrency, PDF_CONCURRENCY } from './concurrency';

const program = new Command();

program
  .name('vehicle-report-card')
  .description('Generate vehicle and fleet performance report cards from Maximo DB')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate all vehicle and fleet reports')
  .option('--email', 'Send reports via email')
  .option('--start <date>', 'Period start date (YYYY-MM-DD)')
  .option('--end <date>', 'Period end date (YYYY-MM-DD)')
  .action(async (opts) => {
    try {
      await getPool();
      const period = parsePeriod(opts.start, opts.end);

      console.log(`\n=== Generating Vehicle Reports ===`);
      console.log(`Period: ${period.startDate.toDateString()} — ${period.endDate.toDateString()}\n`);

      const vehicleReports = await buildAllVehicleReports(period.startDate, period.endDate);
      console.log(`\nGenerating PDFs for ${vehicleReports.length} vehicles...`);

      await mapWithConcurrency(vehicleReports, PDF_CONCURRENCY, generateVehicleReportPdf);

      console.log(`\n=== Generating Fleet Reports ===\n`);
      const fleetReports = await buildFleetReports(period.startDate, period.endDate);
      await mapWithConcurrency(fleetReports, PDF_CONCURRENCY, generateFleetReportPdf);

      console.log(`\nDone! Generated ${vehicleReports.length} vehicle reports and ${fleetReports.length} fleet reports.`);
    } catch (error) {
      console.error('Error generating reports:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  });

program
  .command('vehicle <assetnum>')
  .description('Generate report for a single vehicle')
  .option('--email <address>', 'Send report to email address')
  .option('--start <date>', 'Period start date (YYYY-MM-DD)')
  .option('--end <date>', 'Period end date (YYYY-MM-DD)')
  .action(async (assetnum: string, opts) => {
    try {
      await getPool();
      const period = parsePeriod(opts.start, opts.end);

      console.log(`\n=== Vehicle Report: ${assetnum} ===`);
      console.log(`Period: ${period.startDate.toDateString()} — ${period.endDate.toDateString()}\n`);

      const vehicle = await getVehicleByAssetNum(assetnum);
      if (!vehicle) {
        console.error(`Vehicle ${assetnum} not found`);
        process.exit(1);
      }

      const report = await buildVehicleReport(vehicle, period.startDate, period.endDate);
      const pdfPath = await generateVehicleReportPdf(report);

      if (opts.email) {
        await sendReport({
          to: opts.email,
          subject: `Vehicle Performance Report - ${assetnum}`,
          body: buildVehicleEmailBody(assetnum, vehicle.customerName, period.endDate),
          attachments: [{ filename: path.basename(pdfPath), path: pdfPath }],
        });
      }

      console.log(`\nDone! Report saved to ${pdfPath}`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  });

program
  .command('fleet [customer]')
  .description('Generate fleet report for a customer (or all fleet customers)')
  .option('--email <address>', 'Send report to email address')
  .option('--start <date>', 'Period start date (YYYY-MM-DD)')
  .option('--end <date>', 'Period end date (YYYY-MM-DD)')
  .action(async (customer: string | undefined, opts) => {
    try {
      await getPool();
      const period = parsePeriod(opts.start, opts.end);

      console.log(`\n=== Fleet Report ===`);
      console.log(`Period: ${period.startDate.toDateString()} — ${period.endDate.toDateString()}\n`);

      const fleetReports = await buildFleetReports(period.startDate, period.endDate);
      const filtered = customer
        ? fleetReports.filter(r => r.customer === customer)
        : fleetReports;

      if (filtered.length === 0) {
        console.log(customer ? `No fleet found for customer ${customer}` : 'No fleet customers found');
        process.exit(0);
      }

      // One fleet at a time so each email goes out once its PDFs are ready.
      await mapWithConcurrency(filtered, 1, async report => {
        // Fleet PDF and the individual vehicle PDFs are independent.
        const [fleetPdfPath, vehiclePdfs] = await Promise.all([
          generateFleetReportPdf(report),
          mapWithConcurrency(report.vehicles, PDF_CONCURRENCY, generateVehicleReportPdf),
        ]);

        if (opts.email) {
          const attachments = [
            { filename: path.basename(fleetPdfPath), path: fleetPdfPath },
            ...vehiclePdfs.map(p => ({ filename: path.basename(p), path: p })),
          ];
          await sendReport({
            to: opts.email,
            subject: `Fleet Performance Report - ${report.customerName}`,
            body: buildFleetEmailBody(report.customerName, report.vehicleCount, period.endDate),
            attachments,
          });
        }
      });

      console.log(`\nDone! Generated ${filtered.length} fleet reports.`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  });

program
  .command('schedule')
  .description('Start the scheduler for 6-monthly automatic report generation')
  .action(async () => {
    console.log('Starting report scheduler...');
    startScheduler(async () => {
      try {
        await getPool();
        const period = getDefaultPeriod();
        const vehicleReports = await buildAllVehicleReports(period.startDate, period.endDate);
        await mapWithConcurrency(vehicleReports, PDF_CONCURRENCY, generateVehicleReportPdf);
        const fleetReports = await buildFleetReports(period.startDate, period.endDate);
        await mapWithConcurrency(fleetReports, PDF_CONCURRENCY, generateFleetReportPdf);
        console.log(`Generated ${vehicleReports.length} vehicle + ${fleetReports.length} fleet reports`);
      } finally {
        await closePool();
      }
    });
    // Keep process alive
    process.on('SIGINT', () => { console.log('Scheduler stopped.'); process.exit(0); });
  });

function parsePeriod(start?: string, end?: string) {
  if (start && end) {
    return { startDate: new Date(start), endDate: new Date(end) };
  }
  return getDefaultPeriod();
}

program.parse();
