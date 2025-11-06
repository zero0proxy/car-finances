// Файл: src/components/TransactionList.tsx

// 1. 🔥 Это ОБЯЗАТЕЛЬНО. Превращаем в Клиентский Компонент
'use client';

// 2. Импортируем 'useState' для управления состоянием
import { useState } from 'react';
// 3. Импортируем типы, чтобы TypeScript "понимал" наши props
import { Transaction, Category, Wallet, TransactionType } from '@prisma/client';

// 4. Определяем тип для наших 'props' (транзакций)
type TransactionWithDetails = Transaction & {
  category: Category;
  wallet: Wallet;
};

// 5. Компонент теперь ПРИНИМАЕТ 'transactions' как prop
export function TransactionList({
  transactions,
}: {
  transactions: TransactionWithDetails[];
}) {
  // 6. 🔥 Наше состояние: "развернут" ли список?
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleCount = 5; // Сколько операций показывать по умолчанию

  // 7. Определяем, какие транзакции показывать
  const visibleTransactions = isExpanded
    ? transactions // Если "развернут",_показываем все
    : transactions.slice(0, visibleCount); // Иначе - только первые 5

  // 8. Нужно ли вообще показывать кнопку?
  const showButton = transactions.length > visibleCount;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Последние операции</h2>
      <ul className="space-y-4">
        {/* Если транзакций нет, покажем заглушку */}
        {transactions.length === 0 && (
          <p className="text-gray-500">Пока нет ни одной операции.</p>
        )}

        {/* 9. 🔥 Мы используем 'visibleTransactions' для рендера */}
        {visibleTransactions.map((tx) => {
          const isIncome = tx.category.type === TransactionType.INCOME;
          return (
            <li
              key={tx.id}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              {/* Левая часть */}
              <div className="flex flex-col">
                <span className="font-semibold text-lg">
                  {tx.category.name}
                </span>
                <span className="text-sm text-gray-600">
                  {tx.notes || <span className="italic">Нет заметки</span>}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  {/* Форматируем дату */}
                  {new Date(tx.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>

              {/* Правая часть */}
              <div className="flex flex-col items-end">
                <span
                  className={`text-xl font-bold ${
                    isIncome ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {Number(tx.amount).toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  })}
                </span>
                <span className="text-sm text-gray-500">{tx.wallet.name}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 10. 🔥 Наша новая кнопка! */}
      {showButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)} // Переключаем состояние
          className="w-full mt-4 pt-2 text-center font-medium text-indigo-600 hover:text-indigo-800"
        >
          {isExpanded ? 'Свернуть' : `Показать еще ${transactions.length - visibleCount}`}
        </button>
      )}
    </div>
  );
}