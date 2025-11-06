// Файл: src/app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

// ... (Твой код deleteTransaction остается здесь без изменений) ...
export async function deleteTransaction(
  transactionId: string,
  walletId: string,
  amountString: string,
  type: TransactionType
) {
  const amount = new Decimal(amountString);
  const amountToReverse =
    type === TransactionType.INCOME ? amount.negated() : amount;

  try {
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: amountToReverse,
          },
        },
      }),
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
    ]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Ошибка при удалении транзакции:', error);
    return { success: false, error: 'Не удалось удалить транзакцию' };
  }
}

// --- 🔥 ИЗМЕНЕНИЯ НИЖЕ ---

// Тип 'amount' по-прежнему 'string', т.к. мы готовим его для клиента
export type ReportData = {
  category: string;
  type: TransactionType; // Мы все еще передаем 'type'
  notes: string;
  amount: string;
  date: string;
};

// 1. 🔥 Добавляем 'reportType' как ОБЯЗАТЕЛЬНЫЙ параметр
export async function generateReport(
  period: 'day' | 'week' | 'month',
  reportType: TransactionType // <-- НОВЫЙ ПАРАМЕТР
): Promise<ReportData[]> {
  const startDate = new Date();
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
      // 2. 🔥 МЫ ФИЛЬТРУЕМ ПО ТИПУ!
      // Ищем только транзакции с нужным типом категории
      category: {
        type: reportType,
      },
    },
    include: {
      category: {
        select: { name: true, type: true },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 3. 🔥 Логика конвертации в строку остается той же
  const report: ReportData[] = transactions.map((tx) => {
    const amountString =
      tx.category.type === TransactionType.INCOME
        ? tx.amount.toString()
        : tx.amount.negated().toString();

    return {
      date: tx.createdAt.toLocaleDateString('ru-RU'),
      category: tx.category.name,
      type: tx.category.type,
      notes: tx.notes || '',
      amount: amountString,
    };
  });

  return report;
}