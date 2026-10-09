import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { getWarrantiedVehicles, getVehicleByAssetNum, getFleetCustomers } from '@/src/queries/vehicle-list';
import { buildVehicleReport, getDefaultPeriod } from '@/src/aggregator';
import { getPool } from '@/src/db';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly to override any shell-level ANTHROPIC_API_KEY
const envResult = dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant for the Goldbell Engineering Services Vehicle Report Card dashboard. You help users query and understand vehicle fleet data from the Maximo database.

Context:
- You have access to a fleet of warrantied vehicles managed by Goldbell Engineering Services (site: GBE)
- Vehicles are linked to customers through agreements (pluspagreement)
- You can look up vehicle details, maintenance history, downtime, costs, PM schedules, and entitlements
- The default reporting period is the last 6 months

Available data per vehicle:
- Parameters: downtime days/hours, CBJ (customer breakdown job) count, breakdown count, warranty repair count, avg waiting hours
- Maintenance: service count, repair count, outstanding jobs, outstanding recalls
- Schedule: PM (preventive maintenance) details, overdue status, next service dates
- Entitlements: agreement-linked craft entitlements with used/balance quantities
- Spending: labor cost, material cost, total cost, mileage, cost per km

When answering:
- Be concise and direct
- Format numbers nicely (e.g., currency with $ and 2 decimals, round percentages)
- If a vehicle or customer is not found, say so clearly
- For large datasets, summarize rather than listing everything
- Use tables when comparing multiple items`;

const tools: Anthropic.Tool[] = [
  {
    name: 'get_vehicle_list',
    description: 'Get the list of all warrantied vehicles. Returns assetnum, vehicleNo, description, serialnum, customer, agreement, and warranty dates. Use this to answer questions about how many vehicles there are, find vehicles by customer, or search for a specific vehicle.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_vehicle_report',
    description: 'Get a detailed report for a specific vehicle including downtime, maintenance, PM schedule, entitlements, and costs. Requires the vehicle asset number (e.g., "XD3L", "YC7200"). Optionally accepts a date range; defaults to last 6 months.',
    input_schema: {
      type: 'object' as const,
      properties: {
        assetnum: { type: 'string', description: 'The vehicle asset number' },
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional, defaults to 6 months ago)' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format (optional, defaults to today)' },
      },
      required: ['assetnum'],
    },
  },
  {
    name: 'get_fleet_customers',
    description: 'Get the list of customers that have multiple warrantied vehicles (fleet customers). Returns customer code, name, vehicle count, and counts per sales type (mcpCount=MCP, cmpCount=CMP, pmpCount=PMP).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_database',
    description: `Execute a read-only SQL SELECT query against the Maximo database (MAXDB76). Use this for ad-hoc questions that the other tools cannot answer. Key tables: workorder (wonum, siteid, status, pluspcustomer, worktype), labtrans (labor transactions), matusetrans (material usage), asset (assetnum, serialnum, pluspcustomer), pluspagreement (agreements; gb_salestype CM=MCP, CT=CMP, PP=PMP; MCP/CMP vehicles link via caentitle.gb_vehiclenum, PMP vehicles link via pm.gb_agreement), caentitle (entitlements), pm (preventive maintenance), inventory, item. Always include siteid='GBE' in WHERE clauses. Only SELECT queries are allowed.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string', description: 'A SQL SELECT query to execute. Must be a SELECT statement only.' },
      },
      required: ['sql'],
    },
  },
];

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'get_vehicle_list': {
        const vehicles = await getWarrantiedVehicles();
        return JSON.stringify({
          count: vehicles.length,
          vehicles: vehicles.map(v => ({
            assetnum: v.assetnum,
            vehicleNo: v.vehicleNo,
            description: v.description,
            customer: v.pluspcustomer,
            customerName: v.customerName,
            agreement: v.agreement,
            warrantyEnd: v.warrantyEnd,
          })),
        });
      }

      case 'get_vehicle_report': {
        const vehicle = await getVehicleByAssetNum(input.assetnum);
        if (!vehicle) {
          return JSON.stringify({ error: `Vehicle '${input.assetnum}' not found` });
        }
        const period = getDefaultPeriod();
        const startDate = input.startDate ? new Date(input.startDate) : period.startDate;
        const endDate = input.endDate ? new Date(input.endDate) : period.endDate;
        const report = await buildVehicleReport(vehicle, startDate, endDate);
        return JSON.stringify(report, (_key, value) =>
          value instanceof Date ? value.toISOString() : value
        );
      }

      case 'get_fleet_customers': {
        const customers = await getFleetCustomers();
        return JSON.stringify(customers);
      }

      case 'query_database': {
        const sqlText = (input.sql as string).trim();
        // Enforce read-only
        const upper = sqlText.toUpperCase();
        if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
          return JSON.stringify({ error: 'Only SELECT queries are allowed' });
        }
        const forbidden = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'ALTER ', 'CREATE ', 'TRUNCATE ', 'EXEC ', 'EXECUTE '];
        for (const kw of forbidden) {
          if (upper.includes(kw)) {
            return JSON.stringify({ error: `Forbidden keyword detected: ${kw.trim()}` });
          }
        }
        const pool = await getPool();
        const result = await pool.request().query(sqlText);
        const rows = result.recordset;
        if (rows.length > 100) {
          return JSON.stringify({
            rowCount: rows.length,
            rows: rows.slice(0, 100),
            truncated: true,
            message: `Showing first 100 of ${rows.length} rows`,
          });
        }
        return JSON.stringify({ rowCount: rows.length, rows });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || String(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Build conversation for Claude
    const claudeMessages: Anthropic.MessageParam[] = messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Tool use loop — keep calling Claude until we get a final text response
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: claudeMessages,
    });

    while (response.stop_reason === 'tool_use') {
      // Collect all tool use blocks
      const toolUseBlocks = response.content.filter(
        (block) => block.type === 'tool_use'
      ) as Array<{ type: 'tool_use'; id: string; name: string; input: any }>;

      // Execute all tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Send results back to Claude
      claudeMessages.push({ role: 'assistant', content: response.content as any });
      claudeMessages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: claudeMessages,
      });
    }

    // Extract the text response
    const textBlock = response.content.find(block => block.type === 'text');
    const reply = textBlock && 'text' in textBlock ? textBlock.text : 'No response generated.';

    return Response.json({ reply });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
