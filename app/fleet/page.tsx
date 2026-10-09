'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '../../components/MetricCard';
import { SalesTypeBadge } from '../../components/SalesTypeBadge';

interface FleetCustomer {
  pluspcustomer: string;
  customerName: string;
  vehicleCount: number;
  mcpCount: number;
  cmpCount: number;
  pmpCount: number;
}

export default function FleetListPage() {
  const [customers, setCustomers] = useState<FleetCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fleet')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load fleet customers');
        return res.json();
      })
      .then(setCustomers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalVehicles = customers.reduce((s, c) => s + c.vehicleCount, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Fleet Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Customers with multiple vehicles on active MCP, CMP or PMP agreements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <MetricCard label="Fleet Customers" value={loading ? '...' : customers.length} variant="default" />
        <MetricCard label="Total Fleet Vehicles" value={loading ? '...' : totalVehicles} variant="default" />
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#C8A951]" />
          <p className="text-gray-500 mt-3">Loading fleet customers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <Link
              key={c.pluspcustomer}
              href={`/fleet/${c.pluspcustomer}`}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border border-transparent hover:border-[#C8A951]/30"
            >
              <h3 className="font-semibold text-gray-900">{c.customerName || c.pluspcustomer}</h3>
              <p className="text-sm text-gray-500 mt-1">Code: {c.pluspcustomer}</p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="bg-[#C8A951]/10 text-[#C8A951] text-sm font-medium px-2.5 py-0.5 rounded">
                  {c.vehicleCount} vehicles
                </span>
                {c.mcpCount > 0 && <span className="text-xs text-gray-500"><SalesTypeBadge code="CM" /> {c.mcpCount}</span>}
                {c.cmpCount > 0 && <span className="text-xs text-gray-500"><SalesTypeBadge code="CT" /> {c.cmpCount}</span>}
                {c.pmpCount > 0 && <span className="text-xs text-gray-500"><SalesTypeBadge code="PP" /> {c.pmpCount}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
