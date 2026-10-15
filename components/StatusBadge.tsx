'use client';

export type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusStyles: Record<Status, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
};

export function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label: string;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {label}
    </span>
  );
}
