// Файл: src/components/ReportGenerator.tsx
'use client';

import { useState, useTransition } from 'react';
import { generateReport, ReportData } from '@/app/actions';
import { TransactionType } from '@prisma/client';

export function ReportGenerator() {
  const [isPending, startTransition] = useTransition();

  // 1. 🔥 Мы храним не 'null', а объект, чтобы знать, какой рапорт (доход/расход) мы показываем
  const [report, setReport] = useState<{
    data: ReportData[];
    type: TransactionType;
  } | null>(null);

  // 2. 🔥 'handleGenerate' теперь принимает 2 параметра
  const handleGenerate = (
    period: 'day' | 'week' | 'month',
    type: TransactionType
  ) => {
    startTransition(async () => {
      const data = await generateReport(period, type);
      // 3. Сохраняем и данные, и тип
      setReport({ data: data, type: type });
    });
  };

  // Форматтер валюты нам здесь не нужен

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-semibold">რაპორტები</h2>
      {isPending && (
        <p className="text-sm text-gray-500 animate-pulse">
          Генерация рапорта...
        </p>
      )}

      {/* 4. 🔥 НОВЫЕ КНОПКИ (Блок Доходов) */}
      <div>
        <h3 className="text-lg font-medium mb-2">შემოსავლის რაპორტი</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleGenerate('day', TransactionType.INCOME)}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            დღიური
          </button>
          <button
            onClick={() => handleGenerate('week', TransactionType.INCOME)}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            კვირეული
          </button>
          <button
            onClick={() => handleGenerate('month', TransactionType.INCOME)}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            თვიური
          </button>
        </div>
      </div>

      {/* 5. 🔥 НОВЫЕ КНОПКИ (Блок Расходов) */}
      <div>
        <h3 className="text-lg font-medium mb-2">ხარჯების რაპორტი</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleGenerate('day', TransactionType.EXPENSE)}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            დღიური
          </button>
          <button
            onClick={() => handleGenerate('week', TransactionType.EXPENSE)}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            კვირეული
          </button>
          <button
            onClick={() => handleGenerate('month', TransactionType.EXPENSE)}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            თვიური
          </button>
        </div>
      </div>

      {/* 6. 🔥 Модальное окно (логика немного изменилась) */}
      {report && (() => {
        // 8. 🔥 ИСПРАВЛЕНИЕ: Определяем цвет ДО JSX через IIFE
        const isIncome = report.type === TransactionType.INCOME;
        
        return (
          <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-semibold">
                  {/* 7. Заголовок теперь динамический */}
                  Рапорт: {isIncome ? 'Доходы' : 'Расходы'}
                </h3>
                <button
                  onClick={() => setReport(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 overflow-auto">
                <p className="text-sm text-gray-600 mb-2">
                აღნიშნეთ თაბულო მაუსით და დააკოპირეთ (Ctrl+C) ჩასვით Excel-ში (Ctrl+V).
                </p>
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                        თარიღი
                      </th>
                      <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                        კატეგორია
                      </th>
                      <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                        დამატებითი ინფორმაცია
                      </th>
                      <th className="p-2 border text-left text-xs font-medium text-gray-500 uppercase">
                        თანხა
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 border whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="p-2 border">{row.category}</td>
                        <td className="p-2 border">{row.notes}</td>
                        {/* 9. Используем цвет (он будет одинаковый для всей таблицы) */}
                        <td
                          className={`p-2 border font-medium ${
                            isIncome ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {row.amount}
                        </td>
                      </tr>
                    ))}
                    {report.data.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500">
                          არჩეულ თარიღზე მონაცემები ვერ მოიძებნა.
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
                  დახურვა
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}