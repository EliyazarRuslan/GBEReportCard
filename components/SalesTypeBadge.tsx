const SALES_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  CM: { label: 'MCP', className: 'bg-blue-50 text-blue-700' },
  CT: { label: 'CMP', className: 'bg-purple-50 text-purple-700' },
  PP: { label: 'PMP', className: 'bg-emerald-50 text-emerald-700' },
};

/** Human-readable label for a Maximo gb_salestype code. */
export function salesTypeLabel(code: string): string {
  return SALES_TYPE_LABELS[code]?.label ?? code;
}

export function SalesTypeBadge({ code }: { code: string }) {
  if (!code) return null;
  const meta = SALES_TYPE_LABELS[code] ?? { label: code, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${meta.className}`}>
      {meta.label}
    </span>
  );
}
