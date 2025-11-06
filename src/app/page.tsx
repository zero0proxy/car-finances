// Файл: src/app/page.tsx

import { prisma } from '@/lib/prisma';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { IncomeStats } from '@/components/IncomeStats';
// 1. Мы импортируем TransactionType здесь, он понадобится
import { TransactionType } from '@prisma/client';

// Функция getWallets остается без изменений
async function getWallets() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { name: 'asc' },
  });
  return wallets;
}

// 2. 🔥 МЫ ПЕРЕНЕСЛИ getTransactions СЮДА
// Мы также убрали 'take: 10', чтобы загружать ВСЕ транзакции
async function getTransactions() {
  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      category: true,
      wallet: true,
    },
  });
  return transactions;
}

export default async function HomePage() {
  // 3. Теперь мы загружаем и кошельки, и транзакции здесь
  const wallets = await getWallets();
  const transactions = await getTransactions(); // <-- НОВОЕ

  return (
    <main className="container mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6">Мои Финансы</h1>

      <IncomeStats />

      {/* Блок Кошельков (без изменений) */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Кошельки</h2>
        <ul className="space-y-3">
          {wallets.map((wallet) => (
            <li
              key={wallet.id}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-lg font-medium">{wallet.name}</span>
              <span
                className={`text-xl font-bold ${
                  wallet.balance < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {Number(wallet.balance).toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <AddTransactionForm />

      {/* 4. 🔥 МЫ ПЕРЕДАЕМ ТРАНЗАКЦИИ В КОМПОНЕНТ КАК PROP */}
      <TransactionList transactions={transactions} />
    </main>
  );
}