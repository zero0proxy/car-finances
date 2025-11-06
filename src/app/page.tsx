// Файл: src/app/page.tsx

import { prisma } from '@/lib/prisma';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { IncomeStats } from '@/components/IncomeStats';
import { TransactionType } from '@prisma/client';
import { ReportGenerator } from '@/components/ReportGenerator';

async function getWallets() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { name: 'asc' },
  });
  return wallets;
}

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
  const wallets = await getWallets();
  const transactions = await getTransactions();

  return (
    <main className="container mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6">Мои Финансы</h1>

      <IncomeStats />

      {/* Блок Кошельков */}
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
                  wallet.balance.isNegative()
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {Number(wallet.balance).toLocaleString('ka-GE', {
                  style: 'currency',
                  currency: 'GEL', // <-- ИЗМЕНЕНО
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ReportGenerator />

      <AddTransactionForm />

      <TransactionList transactions={transactions} />
    </main>
  );
}