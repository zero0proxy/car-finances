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