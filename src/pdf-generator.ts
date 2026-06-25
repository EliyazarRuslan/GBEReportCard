import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { VehicleReport, FleetReport } from './aggregator';
import { config } from './config';

// Register Handlebars helpers
// DB datetimes are SGT wall-clock values that the SQL driver tags as UTC.
// Render in UTC so the stored calendar day is shown verbatim (no +8 shift
// that would push a late-evening finish onto the next day). Period bounds
// are constructed at UTC midnight (see getDefaultPeriod) for the same reason.
Handlebars.registerHelper('formatDate', (date: Date | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-SG', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
});

Handlebars.registerHelper('formatDateTime', (date: Date | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-SG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
});

Handlebars.registerHelper('formatMoney', (value: number | null) => {
  if (value === null || value === undefined) return '0.00';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

Handlebars.registerHelper('downtimeClass', (hours: number) => {
  if (hours > 200) return 'danger';
  if (hours > 100) return 'warning';
  return 'success';
});

Handlebars.registerHelper('countClass', (count: number) => {
  if (count > 3) return 'danger';
  if (count > 0) return 'warning';
  return 'success';
});

// Load templates
const vehicleTemplatePath = path.resolve(process.cwd(), 'src/templates/vehicle-report.hbs');
const fleetTemplatePath = path.resolve(process.cwd(), 'src/templates/fleet-report.hbs');

let vehicleTemplate: Handlebars.TemplateDelegate;
let fleetTemplate: Handlebars.TemplateDelegate;

function loadTemplates() {
  vehicleTemplate = Handlebars.compile(fs.readFileSync(vehicleTemplatePath, 'utf-8'));
  fleetTemplate = Handlebars.compile(fs.readFileSync(fleetTemplatePath, 'utf-8'));
}

async function htmlToPdf(html: string, outputPath: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    return outputPath;
  } finally {
    await browser.close();
  }
}

/**
 * Generate PDF for a single vehicle report.
 */
export async function generateVehicleReportPdf(report: VehicleReport): Promise<string> {
  loadTemplates();
  const html = vehicleTemplate(report);

  // Ensure output directory exists
  fs.mkdirSync(config.outputDir, { recursive: true });

  const filename = `vehicle-report-${report.vehicle.assetnum}-${formatFilenameDate(report.period.endDate)}.pdf`;
  const outputPath = path.join(config.outputDir, filename);

  await htmlToPdf(html, outputPath);
  console.log(`  PDF generated: ${outputPath}`);
  return outputPath;
}

/**
 * Generate PDF for a fleet report.
 */
export async function generateFleetReportPdf(report: FleetReport): Promise<string> {
  loadTemplates();
  const html = fleetTemplate(report);

  fs.mkdirSync(config.outputDir, { recursive: true });

  const filename = `fleet-report-${report.customer}-${formatFilenameDate(report.period.endDate)}.pdf`;
  const outputPath = path.join(config.outputDir, filename);

  await htmlToPdf(html, outputPath);
  console.log(`  PDF generated: ${outputPath}`);
  return outputPath;
}

function formatFilenameDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
