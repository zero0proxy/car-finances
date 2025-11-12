'use client';

import { useState } from 'react';
import { generateMonthlyDriverReport } from '@/app/actions';

export function MonthlyDriverReport() {
  const [month, setMonth] = useState('2025-11'); // Текущий месяц
  const [data, setData] = useState<Array<{
    driverName: string;
    id: string;
    totalIncome: string;
    cash: string;
    card: string;
    tip: string;
    promotions: string;
    bonuses: string;
    serviceFee: string;
    deductions: string;
    totalPaid: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async (m: string) => {
    setLoading(true);
    setMonth(m);
    const result = await generateMonthlyDriverReport(m);
    setData(result);
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-semibold text-green-700">შეჯამებული მოხსენება მძღოლების მიერ</h2>
      
      <div className="flex gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => load(e.target.value)}
          className="p-2 border rounded"
        />
        <button onClick={() => load(month)} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'იტვირთება...' : 'გენერაცია'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">იტვირთება...</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500">მონაცემები არ არის</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">სრული სახელი</th>
                <th className="border p-2 text-left">პირადი ნომერი</th>
                <th className="border p-2 text-right">შემოსავალი (დაღ. მდგ. მანამდე)</th>
                <th className="border p-2 text-right">ნაღდი</th>
                <th className="border p-2 text-right">ბარათი</th>
                <th className="border p-2 text-right">ტიპი</th>
                <th className="border p-2 text-right">პრომო</th>
                <th className="border p-2 text-right">ბონუსი</th>
                <th className="border p-2 text-right">სერვის ფასა</th>
                <th className="border p-2 text-right">გამოკლება</th>
                <th className="border p-2 text-right">სულ გადახდილი</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2">{row.driverName}</td>
                  <td className="border p-2">{row.id}</td>
                  <td className="border p-2 text-right">{row.totalIncome}</td>
                  <td className="border p-2 text-right">{row.cash}</td>
                  <td className="border p-2 text-right">{row.card}</td>
                  <td className="border p-2 text-right">{row.tip}</td>
                  <td className="border p-2 text-right">{row.promotions}</td>
                  <td className="border p-2 text-right">{row.bonuses}</td>
                  <td className="border p-2 text-right">{row.serviceFee}</td>
                  <td className="border p-2 text-right">{row.deductions}</td>
                  <td className="border p-2 text-right font-bold">{row.totalPaid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}