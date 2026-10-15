'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchJson } from '../lib/fetch-json';
import { MetricCard } from '../components/MetricCard';
import { VehicleTable } from '../components/VehicleTable';

interface Vehicle {
  assetnum: string;
  vehicleNo: string;
  description: string;
  serialnum: string;
  pluspcustomer: string;
  customerName: string;
  agreement: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
}

export default function DashboardPage() {
  const { data, error: fetchError, isLoading: loading } = useSWR<Vehicle[]>('/api/vehicles', fetchJson);
  const vehicles = data ?? [];
  const error = fetchError ? 'Failed to load vehicles' : null;
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (v.assetnum ?? '').toLowerCase().includes(s) ||
      (v.vehicleNo ?? '').toLowerCase().includes(s) ||
      (v.description ?? '').toLowerCase().includes(s) ||
      (v.customerName ?? '').toLowerCase().includes(s) ||
      (v.pluspcustomer ?? '').toLowerCase().includes(s) ||
      (v.agreement ?? '').toLowerCase().includes(s)
    );
  });

  const uniqueCustomers = new Set(vehicles.map(v => v.pluspcustomer));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Warrantied vehicles overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Total Vehicles"
          value={loading ? '...' : vehicles.length}
          variant="default"
        />
        <MetricCard
          label="Fleet Customers"
          value={loading ? '...' : uniqueCustomers.size}
          variant="default"
        />
        <MetricCard
          label="Active Agreements"
          value={loading ? '...' : new Set(vehicles.map(v => v.agreement)).size}
          variant="default"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <label htmlFor="vehicle-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search vehicles
        </label>
        <input
          id="vehicle-search"
          type="search"
          placeholder="Search by vehicle no, chassis, description, or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent"
        />
      </div>

      {/* Vehicle list */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#C8A951]" />
          <p className="text-gray-500 mt-3">Loading vehicles...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Showing {filtered.length} of {vehicles.length} vehicles
          </p>
          <VehicleTable vehicles={filtered} />
        </>
      )}
    </div>
  );
}
