// Файл: src/components/YandexSyncTransactionsButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { syncYandexTransactions } from '@/app/actions';

export function YandexSyncTransactionsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  const handleSync = () => {
    setMessage('');
    startTransition(async () => {
      const result = await syncYandexTransactions();
      setMessage(result.message);
      setIsSuccess(result.success);
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h12v4a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 8v4a2 2 0 002 2h8a2 2 0 002-2v-4H4zm12-2a2 2 0 01-2 2H6a2 2 0 01-2-2V8h12v2z" clipRule="evenodd" />
        </svg>
        Синхронизация Доходов
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Загрузить транзакции (доходы) водителей из Yandex за последние 24 часа.
      </p>

      <button
        onClick={handleSync}
        disabled={isPending}
        className="w-full rounded-md bg-green-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50 transition duration-150"
      >
        {isPending ? 'Загрузка...' : 'Начать Синхронизацию Доходов'}
      </button>

      {message && (
        <p className={`mt-3 text-sm font-medium ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}