// src/components/IncomeStats.tsx
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function IncomeStats() {
  const [totalIncome, totalExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { category: { type: TransactionType.INCOME }, yandexEarningKey: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { category: { type: TransactionType.EXPENSE }, yandexEarningKey: null },
      _sum: { amount: true },
    }),
  ]);

  const incomeTransactions = await prisma.transaction.findMany({
    where: {
      category: { type: TransactionType.INCOME },
      yandexEarningKey: null,
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  // ФИЛЬТР: убираем null + Decimal → number
  const validIncome = incomeTransactions
    .filter((tx): tx is typeof tx & { category: NonNullable<typeof tx.category> } =>
      tx.category !== null
    )
    .map(tx => ({
      ...tx,
      amount: Number(tx.amount),
    }));

  const stats = new Map<string, number>();
  let total = 0;

  for (const tx of validIncome) {
    total += tx.amount;
    const current = stats.get(tx.category.name) || 0;
    stats.set(tx.category.name, current + tx.amount);
  }

  const incomeSum = totalIncome._sum.amount || new Decimal(0);
  const expenseSum = totalExpense._sum.amount || new Decimal(0);
  const balance = incomeSum.sub(expenseSum);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4">ფინანსური მდგომარეობა</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm opacity-90">შემოსავალი</p>
          <p className="text-2xl font-bold">
            +{Number(incomeSum).toLocaleString('ka-GE', { style: 'currency', currency: 'GEL' })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm opacity-90">ხარჯი</p>
          <p className="text-2xl font-bold">
            -{Number(expenseSum).toLocaleString('ka-GE', { style: 'currency', currency: 'GEL' })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm opacity-90">ბალანსი</p>
          <p className={`text-2xl font-bold ${balance.isNegative() ? 'text-red-300' : 'text-green-300'}`}>
            {Number(balance).toLocaleString('ka-GE', { style: 'currency', currency: 'GEL' })}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm opacity-90 mb-2">შემოსავლები კატეგორიების მიხედვით:</p>
        {stats.size === 0 ? (
          <p className="text-sm italic">მონაცემები არ არის</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Array.from(stats.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([name, amount]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="font-medium">
                    +{amount.toLocaleString('ka-GE', { style: 'currency', currency: 'GEL' })}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}