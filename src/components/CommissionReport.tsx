// src/components/CommissionReport.tsx
'use client';

import { useState } from 'react';
import { generateCommissionReport } from '@/app/actions';

type Period = 'day' | 'week' | 'month';

export function CommissionReport() {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<Array<{ driver: string; amount: string }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async (p: Period) => {
    setLoading(true);
    setPeriod(p);
    const result = await generateCommissionReport(p);
    setData(result);
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-semibold text-blue-700">საკომისიოს შემოსავალი 6%</h2>
      
      <div className="flex gap-2">
        <button onClick={() => load('day')} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {loading && period === 'day' ? 'ითვირთება...' : 'დღე'}
        </button>
        <button onClick={() => load('week')} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {loading && period === 'week' ? 'ითვირთება...' : 'კვირა'}
        </button>
        <button onClick={() => load('month')} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {loading && period === 'month' ? 'ითვირთება...' : 'თვე'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">ითვირთება...</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500">მონაცემები ამ პერიოდში ვერ მოძებნა</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">მძღოლი</th>
                <th className="border p-2 text-right">საკომისიო 6% (GEL)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2">{row.driver}</td>
                  <td className="border p-2 text-right font-medium">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}