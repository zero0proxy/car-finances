// Файл: src/app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
// Нам нужен Decimal для безопасной работы с деньгами
import { Decimal } from '@prisma/client/runtime/library';

export async function deleteTransaction(
  transactionId: string,
  walletId: string,
  amountString: string, // Мы получаем сумму как строку от клиента
  type: TransactionType // Тип (INCOME или EXPENSE)
) {
  // 1. Конвертируем строку обратно в Decimal
  const amount = new Decimal(amountString);

  // 2. Определяем, как мы будем "откатывать" баланс
  // Если это был ДОХОД, мы должны ВЫЧЕСТЬ.
  // Если это был РАСХОД, мы должны ПРИБАВИТЬ.
  const amountToReverse =
    type === TransactionType.INCOME
      ? amount.negated() // -amount
      : amount; // +amount

  try {
    // 3. Запускаем $transaction (ОБЯЗАТЕЛЬНО)
    // Это гарантирует, что либо ОБЕ операции пройдут, либо ОБЕ отменятся.
    await prisma.$transaction([
      // Операция 1: Обновляем баланс кошелька
      prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: amountToReverse, // Применяем "откат"
          },
        },
      }),

      // Операция 2: Удаляем саму транзакцию
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
    ]);

    // 4. Обновляем кэш всей страницы
    // Это заставит Vercel заново загрузить все данные
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Ошибка при удалении транзакции:', error);
    return { success: false, error: 'Не удалось удалить транзакцию' };
  }
}

// --- 🔥 НОВЫЙ КОД НИЖЕ ---

// Тип для нашего рапорта
export type ReportData = {
  category: string;
  type: TransactionType;
  notes: string;
  amount: Decimal;
  date: string;
};

// Наша новая функция для генерации рапорта
export async function generateReport(
  period: 'day' | 'week' | 'month'
): Promise<ReportData[]> {
  // 1. Устанавливаем дату "с"
  const startDate = new Date();
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0); // Начало сегодняшнего дня
  } else if (period === 'week') {
    const day = startDate.getDay();
    // Находим начало недели (Понедельник)
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    startDate.setDate(1); // 1-е число месяца
    startDate.setHours(0, 0, 0, 0);
  }

  // 2. Ищем транзакции в этом периоде
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: startDate, // 'greater than or equal' (больше или равно)
      },
    },
    include: {
      category: {
        select: { name: true, type: true },
      },
    },
    orderBy: {
      createdAt: 'asc', // Сортируем от старых к новым
    },
  });

  // 3. Форматируем в простой массив объектов,
  // который легко превратить в таблицу
  const report: ReportData[] = transactions.map((tx) => ({
    date: tx.createdAt.toLocaleString('ru-RU'),
    category: tx.category.name,
    type: tx.category.type,
    notes: tx.notes || '',
    amount: tx.amount,
  }));

  return report;
}