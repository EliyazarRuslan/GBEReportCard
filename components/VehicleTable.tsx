'use client';

import Link from 'next/link';
import { SalesTypeBadge } from './SalesTypeBadge';

interface Vehicle {
  assetnum: string;
  vehicleNo: string;
  description: string;
  pluspcustomer: string;
  customerName: string;
  agreement: string;
  salesType?: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
}

export function VehicleTable({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
        No vehicles found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C8A951]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Vehicle #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Agreement</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Warranty End</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((v, i) => (
              <tr key={`${v.assetnum}-${i}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/vehicle/${v.assetnum}`}
                    className="text-[#003366] font-medium hover:text-[#C8A951] transition-colors"
                  >
                    {v.vehicleNo || v.assetnum}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{v.description}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <Link
                    href={`/fleet/${v.pluspcustomer}`}
                    className="hover:text-[#003366] transition-colors"
                  >
                    {v.customerName || v.pluspcustomer}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{v.agreement}</td>
                <td className="px-4 py-3"><SalesTypeBadge code={v.salesType ?? ''} /></td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {v.warrantyEnd ? new Date(v.warrantyEnd).toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
