// Файл: src/app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { Driver } from '@prisma/client'; // Импортируем новую модель Driver

// --- 🔥 YANDEX API КОНСТАНТЫ 🔥 ---
// Внимание: В реальном проекте используйте process.env для скрытия ключей!
const YANDEX_FULL_CLID = 'taxi/park/e401f44327704c4f925abfabd07c6e86'; // Полный CLID
const YANDEX_PARK_ID = 'e401f44327704c4f925abfabd07c6e86'; // Чистый ID парка
const YANDEX_API_KEY = 'CEyTqBABdsgHugLBmHjEHOcWjbSfyHWP';
const YANDEX_BASE_URL = 'https://fleet-api.taxi.yandex.net';

// Вспомогательный тип для ответа API (упрощенный)
type YandexDriverProfile = {
  driver_profile: {
    id: string;
    first_name: string;
    last_name: string;
    phones: { number: string }[];
  };
};

// --- ОСНОВНЫЕ СЕРВЕРНЫЕ ДЕЙСТВИЯ ---

export async function deleteTransaction(
  transactionId: string,
  walletId: string,
  amountString: string,
  type: TransactionType
) {
  // ... (логика deleteTransaction остается без изменений) ...
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
  amount: string;
  date: string;
};

export async function generateReport(
  period: 'day' | 'week' | 'month',
  reportType: TransactionType
): Promise<ReportData[]> {
  // ... (логика generateReport остается без изменений) ...
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


// --- 🔥 НОВАЯ ACTION ДЛЯ СИНХРОНИЗАЦИИ ВОДИТЕЛЕЙ 🔥 ---

export async function syncYandexDrivers(): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${YANDEX_BASE_URL}/v1/parks/driver-profiles/list`;

    // 1. Запрос к Yandex API для получения списка водителей
    const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Accept-Language': 'ru',
    'X-Park-ID': YANDEX_PARK_ID,
    'X-Client-ID': YANDEX_FULL_CLID,  // ← Полный CLID (taxi/park/...)
    'X-API-Key': YANDEX_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: {
      park: { id: YANDEX_PARK_ID },
    },
  }),
});

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API Yandex: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const profiles: YandexDriverProfile[] = data.driver_profiles || [];

    let createdCount = 0;
    let updatedCount = 0;

    // 3. Массовое обновление/создание водителей в твоей базе
    for (const profile of profiles) {
      const driverData = profile.driver_profile;
      
      const fullName = `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim();
      const phoneNumber = driverData.phones[0]?.number;

      // 🔥 ИСПРАВЛЕНИЕ: Добавляем блок 'select' для получения createdAt и updatedAt
      const result = await prisma.driver.upsert({
        where: { yandexId: driverData.id },
        select: {
          id: true, // Всегда возвращаем ID
          createdAt: true, // <--- ЭТО ПОЛЕ НАМ НУЖНО
          updatedAt: true, // <--- И ЭТО ТОЖЕ
        },
        update: {
          name: fullName,
          phone: phoneNumber,
        },
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
  };
}