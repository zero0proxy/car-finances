// src/components/TransactionList.tsx
'use client';

import { useState, useTransition } from 'react';
import { Transaction, Category, Wallet, TransactionType } from '@prisma/client';
import { deleteTransaction } from '@/app/actions';

type TransactionWithDetails = Transaction & {
  category: Category;
  wallet: Wallet;
};

export function TransactionList({
  transactions,
}: {
  transactions: TransactionWithDetails[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ФИЛЬТР: ТОЛЬКО РУЧНЫЕ ТРАНЗАКЦИИ (yandexEarningKey === null)
  const manualTransactions = transactions.filter(tx => !tx.yandexEarningKey);

  const visibleCount = 5;
  const visibleTransactions = isExpanded
    ? manualTransactions
    : manualTransactions.slice(0, visibleCount);

  const showButton = manualTransactions.length > visibleCount;

  const handleDelete = (
    txId: string,
    walletId: string,
    amountString: string,
    type: TransactionType
  ) => {
    if (!confirm('ნამდვილად გინდათ ოპერაციის ამოშლა?')) {
      return;
    }
    startTransition(async () => {
      await deleteTransaction(txId, walletId, amountString, type);
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4">ბოლო ოპერაციები (მხოლოდ ხელით)</h2>

      {isPending && (
        <p className="text-sm text-gray-500 text-center animate-pulse">
          ოპერაციის წაშლა...
        </p>
      )}

      <ul className="space-y-4">
        {manualTransactions.length === 0 && (
          <p className="text-gray-500">ამჟამად არ არის არც ერთი ხელით დამატებული ოპერაცია.</p>
        )}

        {visibleTransactions.map((tx) => {
          const isIncome = tx.category.type === TransactionType.INCOME;
          return (
            <li
              key={tx.id}
              className={`relative flex justify-between items-center p-4 bg-gray-50 rounded-lg pr-10 ${
                isPending ? 'opacity-50' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-lg">
                  {tx.category.name}
                </span>
                <span className="text-sm text-gray-600">
                  {tx.notes || <span className="italic">დამატებითი ინფორმაცია არ არის</span>}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  {new Date(tx.createdAt).toLocaleString('ka-GE')}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className={`text-xl font-bold ${
                    isIncome ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {Number(tx.amount).toLocaleString('ka-GE', {
                    style: 'currency',
                    currency: 'GEL',
                  })}
                </span>
                <span className="text-sm text-gray-500">{tx.wallet.name}</span>
              </div>

              <button
                onClick={() =>
                  handleDelete(
                    tx.id,
                    tx.walletId,
                    tx.amount.toString(),
                    tx.category.type
                  )
                }
                title="ოპერაციის წაშლა"
                disabled={isPending}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>

      {showButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 pt-2 text-center font-medium text-indigo-600 hover:text-indigo-800"
        >
          {isExpanded
            ? 'ჩაკეცვა'
            : `მეტის ნახვა ${manualTransactions.length - visibleCount}`}
        </button>
      )}
    </div>
  );
}