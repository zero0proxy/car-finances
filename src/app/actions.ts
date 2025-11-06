// Файл: src/app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

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

export type ReportData = {
  category: string;
  type: TransactionType;
  notes: string;
  amount: Decimal;
  date: string;
};

export async function generateReport(
  period: 'day' | 'week' | 'month'
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

  const report: ReportData[] = transactions.map((tx) => ({
    // 🔥 ВОТ ИЗМЕНЕНИЕ:
    // .toLocaleString() заменен на .toLocaleDateString()
    date: tx.createdAt.toLocaleDateString('ru-RU'),
    category: tx.category.name,
    type: tx.category.type,
    notes: tx.notes || '',
    amount: tx.amount,
  }));

  return report;
}