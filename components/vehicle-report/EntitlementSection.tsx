import { ReportSection } from '../ReportSection';
import { formatDate } from '../../lib/format';
import type { Entitlement } from './types';

function EntitlementRow({ e }: { e: Entitlement }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-2 font-mono">{e.agreement}</td>
      <td className="py-2 px-2 font-mono">{e.opsCode}</td>
      <td className="py-2 px-2 text-gray-700">{e.opsDesc}</td>
      <td className="py-2 px-2 text-right">{e.quantity}</td>
      <td className="py-2 px-2 text-right">{e.usedQty}</td>
      <td className="py-2 px-2 text-right">
        <span className={e.balanceQty <= 0 ? 'text-red-600 font-semibold' : ''}>{e.balanceQty}</span>
      </td>
      <td className="py-2 px-2 text-gray-500 text-xs">
        {formatDate(e.startDate)} — {formatDate(e.endDate)}
      </td>
    </tr>
  );
}

export function EntitlementSection({ entitlements }: { entitlements: Entitlement[] }) {
  return (
    <ReportSection title="Section D — Parts Entitlement Balance">
      {entitlements.length === 0 ? (
        <p className="text-gray-500 text-sm">No entitlements found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Agreement</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Ops Code</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Qty</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Used</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Balance</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {entitlements.map(e => <EntitlementRow key={`${e.agreement}-${e.opsCode}`} e={e} />)}
            </tbody>
          </table>
        </div>
      )}
    </ReportSection>
  );
}
