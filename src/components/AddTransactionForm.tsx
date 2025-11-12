// src/components/AddTransactionForm.tsx (обновлённая версия)
'use client';

import { useState, useTransition, useRef } from 'react';
import { addTransaction } from '@/app/actions';

export function AddTransactionForm({
  wallets,
  incomeCategories,
  expenseCategories,
}: {
  wallets: { id: string; name: string }[];
  incomeCategories: { id: string; name: string }[];
  expenseCategories: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ФИЛЬТР: Убираем "იანდექსის საკომისიო" из доходов
  const filteredIncomeCategories = incomeCategories.filter(
    cat => cat.name !== 'იანდექსის საკომისიო'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await addTransaction(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      formRef.current?.reset();
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-md space-y-4"
    >
      <h2 className="text-2xl font-semibold">ტრანზაქციის დამატება</h2>

      {showSuccess && (
        <div className="bg-green-100 text-green-800 p-2 rounded text-sm">
          წარმატებით დამატებულია!
        </div>
      )}

      <div>
        <label htmlFor="amount" className="block text-sm font-medium">
          თანხა
        </label>
        <input
          type="number"
          name="amount"
          id="amount"
          required
          step="0.01"
          disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
          placeholder="1000"
        />
      </div>

      <div>
        <label htmlFor="walletId" className="block text-sm font-medium">
          საფულე
        </label>
        <select
          name="walletId"
          id="walletId"
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
        >
          <option value="">— აირჩიეთ —</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium">
          კატეგორია
        </label>
        <select
          name="categoryId"
          id="categoryId"
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
        >
          <option value="">— აირჩიეთ —</option>
          <optgroup label="შემოსავალი">
            {filteredIncomeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="ხარჯი">
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          შენიშვნა (არაა აუცილებელი)
        </label>
        <input
          type="text"
          name="notes"
          id="notes"
          disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
          placeholder="მაგ. ჯარიმა YJ175YJ"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'მიმდინარეობს...' : 'დამატება'}
      </button>
    </form>
  );
}