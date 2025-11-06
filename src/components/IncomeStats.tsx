// Файл: src/components/IncomeStats.tsx

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Форматтер для валюты
const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0, // Убираем копейки для красоты
});

// Асинхронная функция для получения данных
async function getIncomeStats() {
  // 1. Определяем начало текущего месяца
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  // 2. Ищем все транзакции ДОХОДА с начала месяца
  const incomeTransactions = await prisma.transaction.findMany({
    where: {
      category: {
        type: TransactionType.INCOME,
      },
      createdAt: {
        gte: startDate, // gte = 'greater than or equal'
      },
    },
    include: {
      category: {
        select: { name: true }, // Нам нужно только имя категории
      },
    },
  });

  // 3. Группируем в JavaScript
  const stats = new Map<string, Decimal>();
  let totalIncome = new Decimal(0);

  for (const tx of incomeTransactions) {
    totalIncome = totalIncome.add(tx.amount);
    const categoryName = tx.category.name;
    const currentSum = stats.get(categoryName) || new Decimal(0);
    stats.set(categoryName, currentSum.add(tx.amount));
  }

  // Конвертируем Map в массив для удобства в JSX
  const incomeBySource = Array.from(stats.entries()).map(([name, sum]) => ({
    name,
    sum,
  }));

  return { totalIncome, incomeBySource };
}

// Наш компонент
export async function IncomeStats() {
  const { totalIncome, incomeBySource } = await getIncomeStats();

  // Стиль для карточек Glassmorphism
  const cardStyle =
    'p-6 rounded-2xl shadow-lg backdrop-blur-lg bg-white/50 border border-white/30';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Доходы (Текущий месяц)</h2>

      {/* 1. Карточка "Общий Доход" */}
      <div
        className={`${cardStyle} bg-gradient-to-r from-green-500 to-emerald-500 text-white`}
      >
        <div className="text-sm font-medium opacity-80">Общий доход</div>
        <div className="text-4xl font-bold">
          {currencyFormatter.format(Number(totalIncome))}
        </div>
      </div>

      {/* 2. Карточки по источникам */}
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