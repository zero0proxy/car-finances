// Файл: src/components/ReportGenerator.tsx
'use client';

import { useState, useTransition } from 'react';
import { generateReport, ReportData } from '@/app/actions';
import { TransactionType } from '@prisma/client';

export function ReportGenerator() {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<ReportData[] | null>(null);

  const handleGenerate = (period: 'day' | 'week' | 'month') => {
    startTransition(async () => {
      const data = await generateReport(period);
      setReport(data);
    });
  };

  // Форматтер нам все еще нужен, но для ДРУГИХ мест (если бы он был)
  // const currencyFormatter = new Intl.NumberFormat('ka-GE', {
  //   style: 'currency',
  //   currency: 'GEL',
  // });

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Генератор рапортов</h2>
      {isPending && (
        <p className="text-sm text-gray-500 animate-pulse">
          Генерация рапорта...
        </p>
      )}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handleGenerate('day')}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          День
        </button>
        <button
          onClick={() => handleGenerate('week')}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Неделя
        </button>
        <button
          onClick={() => handleGenerate('month')}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Месяц
        </button>
      </div>

      {report && (
        <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">Рапорт сгенерирован</h3>
              <button
                onClick={() => setReport(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-auto">
              <p className="text-sm text-gray-600 mb-2">
                Выделите таблицу (Ctrl+A / Cmd+A) и скопируйте (Ctrl+C /
                Cmd+C) в Excel.
              </p>
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                      Дата
                    </th>
                    <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                      Категория
                    </th>
                    <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                      Заметка
                    </th>
                    <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 border whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="p-2 border">{row.category}</td>
                      <td className="p-2 border">{row.notes}</td>
                      {/* 🔥 ВОТ ИЗМЕНЕНИЕ: */}
                      <td
                        className={`p-2 border font-medium ${
                          row.type === TransactionType.INCOME
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {/* Мы убрали 'currencyFormatter' и 'Number()'.
                            Мы вставляем ЧИСТОЕ ЧИСЛО (как "50" или "-50").
                            row.amount это Decimal, .toString() делает "50".
                            .negated() делает из "50" -> "-50".
                        */}
                        {row.type === TransactionType.INCOME
                          ? row.amount.toString()
                          : row.amount.negated().toString()}
                      </td>
                    </tr>
                  ))}
                  {report.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500">
                        Нет данных за выбранный период.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50 text-right">
              <button
                onClick={() => setReport(null)}
                className="rounded-md bg-gray-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-gray-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}