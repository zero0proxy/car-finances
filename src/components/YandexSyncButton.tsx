// Файл: src/components/YandexSyncButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { syncYandexDrivers } from '@/app/actions';

export function YandexSyncButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  const handleSync = () => {
    setMessage('');
    startTransition(async () => {
      const result = await syncYandexDrivers();
      setMessage(result.message);
      setIsSuccess(result.success);
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/>
        </svg>
        Yandex Fleet სინქრონიზაცია
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        დაჭერისას სისტემაში გადმოთვირთავთ არსებული მძღოლების სიას.
      </p>

      <button
        onClick={handleSync}
        disabled={isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition duration-150"
      >
        {isPending ? 'სინქრონიზაცია მიმდინარეობს...' : 'მძღოლების შემოსავლების სინქრონიზაცია'}
      </button>

      {message && (
        <p className={`mt-3 text-sm font-medium ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}