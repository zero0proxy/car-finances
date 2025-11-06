// Файл: src/components/IncomeStats.tsx

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Форматтер для валюты
const currencyFormatter = new Intl.NumberFormat('ka-GE', {
  style: 'currency',
  currency: 'GEL', // <-- ИЗМЕНЕНО
  maximumFractionDigits: 0,
});

async function getIncomeStats() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const incomeTransactions = await prisma.transaction.findMany({
    where: {
      category: {
        type: TransactionType.INCOME,
      },
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      category: {
        select: { name: true },
      },
    },
  });

  const stats = new Map<string, Decimal>();
  let totalIncome = new Decimal(0);

  for (const tx of incomeTransactions) {
    totalIncome = totalIncome.add(tx.amount);
    const categoryName = tx.category.name;
    const currentSum = stats.get(categoryName) || new Decimal(0);
    stats.set(categoryName, currentSum.add(tx.amount));
  }

  const incomeBySource = Array.from(stats.entries()).map(([name, sum]) => ({
    name,
    sum,
  }));

  return { totalIncome, incomeBySource };
}

export async function IncomeStats() {
  const { totalIncome, incomeBySource } = await getIncomeStats();

  const cardStyle =
    'p-6 rounded-2xl shadow-lg backdrop-blur-lg bg-white/50 border border-white/30';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Доходы (Текущий месяц)</h2>

      <div
        className={`${cardStyle} bg-gradient-to-r from-green-500 to-emerald-500 text-white`}
      >
        <div className="text-sm font-medium opacity-80">Общий доход</div>
        <div className="text-4xl font-bold">
          {currencyFormatter.format(Number(totalIncome))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incomeBySource.map((source) => (
          <div key={source.name} className={cardStyle}>
            <div className="text-sm font-medium text-gray-600">
              {source.name}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {currencyFormatter.format(Number(source.sum))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}