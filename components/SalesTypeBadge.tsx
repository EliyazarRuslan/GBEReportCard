import { SALES_TYPES } from '../lib/sales-type';

export function SalesTypeBadge({ code }: { code: string }) {
  if (!code) return null;
  const meta = SALES_TYPES[code] ?? { label: code, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${meta.className}`}>
      {meta.label}
    </span>
  );
}
