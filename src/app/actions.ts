// Файл: src/app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { Driver } from '@prisma/client';

// --- YANDEX API КОНСТАНТЫ ---
const YANDEX_FULL_CLID = 'taxi/park/e401f44327704c4f925abfabd07c6e86';
const YANDEX_PARK_ID = 'e401f44327704c4f925abfabd07c6e86';
const YANDEX_API_KEY = 'CEyTqBABdsgHugLBmHjEHOcWjbSfyHWP';
const YANDEX_BASE_URL = 'https://fleet-api.taxi.yandex.net';

// --- Вспомогательные функции (без изменений) ---

export async function deleteTransaction(
  transactionId: string,
  walletId: string,
  amountString: string,
  type: TransactionType
) {
  // ... (код deleteTransaction без изменений) ...
  const amount = new Decimal(amountString);
  const amountToReverse =
    type === TransactionType.INCOME ? amount.negated() : amount;
  try {
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amountToReverse } },
      }),
      prisma.transaction.delete({ where: { id: transactionId } }),
    ]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Ошибка при удалении транзакции:', error);
    return { success: false, error: 'Не удалось удалить транзакцию' };
  }
}

export type ReportData = {
  category: string,
  type: TransactionType,
  notes: string,
  amount: string,
  date: string,
};

export async function generateReport(
  period: 'day' | 'week' | 'month',
  reportType: TransactionType
): Promise<ReportData[]> {
  // ... (код generateReport без изменений) ...
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
      createdAt: { gte: startDate },
      category: { type: reportType },
    },
    include: { category: { select: { name: true, type: true } } },
    orderBy: { createdAt: 'asc' },
  });
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

export async function syncYandexDrivers(): Promise<{
  success: boolean;
  message: string;
}> {
  // ... (код syncYandexDrivers без изменений) ...
  try {
    const url = `${YANDEX_BASE_URL}/v1/parks/driver-profiles/list`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept-Language': 'ru',
        'X-Park-ID': YANDEX_PARK_ID,
        'X-Client-ID': YANDEX_FULL_CLID,
        'X-API-Key': YANDEX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { park: { id: YANDEX_PARK_ID } },
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API Yandex: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const profiles: any[] = data.driver_profiles || [];
    let createdCount = 0;
    let updatedCount = 0;
    for (const profile of profiles) {
      const driverData = profile.driver_profile;
      const fullName =
        `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim();
      const phoneNumber = driverData.phones[0]?.number;
      const result = await prisma.driver.upsert({
        where: { yandexId: driverData.id },
        select: { id: true, createdAt: true, updatedAt: true },
        update: { name: fullName, phone: phoneNumber },
        create: {
          yandexId: driverData.id,
          name: fullName,
          phone: phoneNumber,
        },
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }
    revalidatePath('/');
    return {
      success: true,
      message: `Синхронизация завершена. Создано: ${createdCount}, Обновлено: ${updatedCount} водителей.`,
    };
  } catch (error: any) {
    console.error('Ошибка синхронизации с Yandex:', error);
    return {
      success: false,
      message: `Сбой синхронизации: ${error.message || 'Неизвестная ошибка.'}`,
    };
  }
}

// --- 🔥 НОВАЯ ФУНКЦИЯ: СИНХРОНИЗАЦИЯ ДОХОДОВ 🔥 ---

export async function syncYandexTransactions(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 1. Находим "Кошелек" и "Категорию" по умолчанию в нашей базе
    const defaultWallet = await prisma.wallet.findUnique({
      where: { name: 'ბარათი' }, // 'Карта' на грузинском
    });
    const defaultCategory = await prisma.category.findUnique({
      where: { name: 'იანდექსის საკომისიო' }, // 'Комиссия Yandex' на грузинском
    });

    if (!defaultWallet || !defaultCategory) {
      throw new Error(
        'Не найден кошелек "ბარათი" или категория "იანდექსის საკომისიო". Сначала запустите "seed".'
      );
    }

    // 2. Устанавливаем диапазон дат (последние 24 часа)
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);

    // 3. Формируем запрос к API Яндекса
    const url = `${YANDEX_BASE_URL}/v2/parks/transactions/list`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept-Language': 'ru',
        'X-Park-ID': YANDEX_PARK_ID,
        'X-Client-ID': YANDEX_FULL_CLID,
        'X-API-Key': YANDEX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          park: {
            id: YANDEX_PARK_ID,
            transaction: {
              // Загружаем транзакции за последние 24 часа
              event_at: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
              },
            },
          },
        },
        limit: 1000, // Максимум 1000 транзакций за раз
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API Yandex: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const yandexTransactions: any[] = data.transactions || [];
    let newTransactionsCount = 0;

    // 4. Обрабатываем каждую транзакцию
    for (const yandexTx of yandexTransactions) {
      // --- ВАЖНЫЙ ФИЛЬТР ---
      // Нам нужны ТОЛЬКО доходы водителей, а не списания парка.
      // Это наша *догадка*. Возможно, 'order' - это то, что нам нужно.
      // Если это не сработает, нам нужно будет посмотреть, какие 'category_id' приходят.
      if (
        yandexTx.category_id !== 'order' &&
        yandexTx.category_id !== 'payment'
      ) {
        continue; // Пропускаем эту транзакцию (это комиссия, штраф и т.д.)
      }

      // 5. Проверяем, нет ли УЖЕ такой транзакции (защита от дубликатов)
      const existingTx = await prisma.transaction.findUnique({
        where: { yandexTransactionId: yandexTx.id },
      });

      if (existingTx) {
        continue; // Эту транзакцию мы уже импортировали, пропускаем
      }

      // 6. Находим водителя в нашей базе
      const driver = await prisma.driver.findUnique({
        where: { yandexId: yandexTx.driver_profile_id },
      });

      if (!driver) {
        console.warn(`Водитель ${yandexTx.driver_profile_id} не найден в базе, пропускаем.`);
        continue; // Мы не знаем этого водителя, пропускаем
      }

      // 7. Готовим транзакцию для нашей базы
      const amount = new Decimal(yandexTx.amount);
      const notes = `Yandex: ${yandexTx.category_id || 'Доход'}. ID: ${
        yandexTx.id
      }`;

      // 8. Сохраняем транзакцию и обновляем баланс (в $transaction)
      await prisma.$transaction([
        // Запрос 1: Создаем транзакцию
        prisma.transaction.create({
          data: {
            amount: amount,
            notes: notes,
            createdAt: new Date(yandexTx.event_at), // Дата из Яндекса
            yandexTransactionId: yandexTx.id, // Наш "ключ" для защиты от дублей
            walletId: defaultWallet.id,
            categoryId: defaultCategory.id,
            driverId: driver.id,
          },
        }),
        // Запрос 2: Обновляем баланс кошелька
        prisma.wallet.update({
          where: { id: defaultWallet.id },
          data: {
            balance: {
              increment: amount, // Прибавляем доход
            },
          },
        }),
      ]);

      newTransactionsCount++;
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Синхронизация доходов завершена. Загружено ${newTransactionsCount} новых транзакций.`,
    };
  } catch (error: any) {
    console.error('Ошибка синхронизации транзакций Yandex:', error);
    return {
      success: false,
      message: `Сбой синхронизации: ${error.message || 'Неизвестная ошибка.'}`,
    };
  }
}