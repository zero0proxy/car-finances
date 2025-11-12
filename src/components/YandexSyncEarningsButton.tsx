// src/components/YandexSyncEarningsButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { syncYandexEarnings } from '@/app/actions';

export function YandexSyncEarningsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  const handleSync = () => {
    setMessage('');
    startTransition(async () => {
      const result = await syncYandexEarnings();
      setMessage(result.message);
      setIsSuccess(result.success);
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-green-700">
        მძღოლების შემოსავალის სინქრონიზირება
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        ბოლო ერთი თვის შემოსავალის ჩამოთვირთვა
      </p>
      <button
        onClick={handleSync}
        disabled={isPending}
        className="w-full rounded-md bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? 'ითვირთება...' : 'შემოსავალის სინქრონიზაცია'}
      </button>
      {message && (
        <p className={`mt-3 text-sm font-medium ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}