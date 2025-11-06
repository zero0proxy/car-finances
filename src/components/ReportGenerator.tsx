// Файл: src/components/ReportGenerator.tsx
'use client';

import { useState, useTransition } from 'react';
// Импортируем нашу action-функцию и тип
import { generateReport, ReportData } from '@/app/actions';
import { TransactionType } from '@prisma/client';

export function ReportGenerator() {
  const [isPending, startTransition] = useTransition();
  // 'null' - окно закрыто, 'ReportData[]' - окно открыто с данными
  const [report, setReport] = useState<ReportData[] | null>(null);

  const handleGenerate = (period: 'day' | 'week' | 'month') => {
    // Используем 'startTransition' для плавности
    startTransition(async () => {
      const data = await generateReport(period);
      setReport(data); // Открываем модальное окно с данными
    });
  };

  // Форматтер для валюты
  const currencyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Генератор рапортов</h2>
      {isPending && (
        <p className="text-sm text-gray-500 animate-pulse">
          Генерация рапорта...
        </p>
      )}
      {/* Кнопки */}
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

      {/* Модальное окно (появляется, когда 'report' не 'null') */}
      {report && (
        <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            {/* Заголовок окна */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">Рапорт сгенерирован</h3>
              <button
                onClick={() => setReport(null)} // Закрыть окно
                className="text-gray-400 hover:text-gray-700"
              >
                &times; {/* Иконка 'X' */}
              </button>
            </div>

            {/* Контент (Таблица) */}
            <div className="p-4 overflow-auto">
              <p className="text-sm text-gray-600 mb-2">
                Выделите таблицу (Ctrl+A / Cmd+A) и скопируйте (Ctrl+C /
                Cmd+C) в Excel.
              </p>
              {/* Вот эта таблица идеально копируется в Excel */}
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
                      <td
                        className={`p-2 border font-medium ${
                          row.type === TransactionType.INCOME
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {row.type === TransactionType.INCOME ? '+' : '-'}
                        {currencyFormatter.format(Number(row.amount))}
                      </td>
                    </tr>
                  ))}
                  {/* Заглушка, если рапорт пустой */}
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

            {/* Футер окна */}
            <div className="p-4 border-t bg-gray-50 text-right">
              <button
                onClick={() => setReport(null)} // Закрыть окно
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