// src/app/page.tsx
import { prisma } from '@/lib/prisma';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { IncomeStats } from '@/components/IncomeStats';
import { TransactionType } from '@prisma/client';
import { ReportGenerator } from '@/components/ReportGenerator';
import { YandexSyncButton } from '@/components/YandexSyncButton';
import { YandexSyncEarningsButton } from '@/components/YandexSyncEarningsButton';
import { CommissionReport } from '@/components/CommissionReport';
import { MonthlyDriverReport } from '@/components/MonthlyDriverReport';

async function getWallets() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { name: 'asc' },
  });
  return wallets;
}

// Только ручные транзакции + Decimal → number + category не null
async function getTransactions() {
  const transactions = await prisma.transaction.findMany({
    where: { yandexEarningKey: null },
    orderBy: { createdAt: 'desc' },
    include: { category: true, wallet: true },
  });

  // ФИЛЬТР + КОНВЕРТАЦИЯ
  return transactions
    .filter(
      (tx): tx is typeof tx & { category: NonNullable<typeof tx.category> } =>
        tx.category !== null
    )
    .map(tx => ({
      ...tx,
      amount: Number(tx.amount), // ← Decimal → number
    }));
}

// ДАННЫЕ ДЛЯ ФОРМЫ (выпадающие списки)
async function getFormData() {
  const [wallets, categories] = await Promise.all([
    prisma.wallet.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true, type: true } }),
  ]);

  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

  return { wallets, incomeCategories, expenseCategories };
}

export default async function HomePage() {
  const wallets = await getWallets();
  const transactions = await getTransactions();
  const formData = await getFormData();

  return (
    <main className="container mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6">Мои Финансы</h1>

      <IncomeStats />

      {/* Блок Кошельков */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4">საფულეები</h2>
        <ul className="space-y-3">
          {wallets.map((wallet) => (
            <li
              key={wallet.id}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-lg font-medium">{wallet.name}</span>
              <span
                className={`text-xl font-bold ${
                  wallet.balance.isNegative() ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {Number(wallet.balance).toLocaleString('ka-GE', {
                  style: 'currency',
                  currency: 'GEL',
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Синхронизация */}
      <YandexSyncButton />
      <YandexSyncEarningsButton />

      {/* Рапорты */}
      <ReportGenerator />
      <CommissionReport />
      <MonthlyDriverReport />

      {/* РУЧНОЕ ДОБАВЛЕНИЕ */}
      <AddTransactionForm {...formData} />

      {/* История */}
      <TransactionList transactions={transactions} />
    </main>
  );
}