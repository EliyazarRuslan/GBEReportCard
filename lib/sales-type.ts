export const SALES_TYPES: Record<string, { label: string; className: string }> = {
  CM: { label: 'MCP', className: 'bg-blue-50 text-blue-700' },
  CT: { label: 'CMP', className: 'bg-purple-50 text-purple-700' },
  PP: { label: 'PMP', className: 'bg-emerald-50 text-emerald-700' },
};

/** Human-readable label for a Maximo gb_salestype code. */
export function salesTypeLabel(code: string): string {
  return SALES_TYPES[code]?.label ?? code;
}
