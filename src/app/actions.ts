'use server';

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

// --- YANDEX API КОНСТАНТЫ ---
const YANDEX_FULL_CLID = 'taxi/park/e401f44327704c4f925abfabd07c6e86';
const YANDEX_PARK_ID = 'e401f44327704c4f925abfabd07c6e86';
const YANDEX_API_KEY = 'CEyTqBABdsgHugLBmHjEHOcWjbSfyHWP';
const YANDEX_BASE_URL = 'https://fleet-api.taxi.yandex.net';

// --- УТИЛИТЫ (исправлено: startDate = new Date() для правильного периода) ---
function getPeriodStart(period: 'day' | 'week' | 'month'): Date {
  const now = new Date(); // Текущая дата
  let startDate = new Date(now); // Копируем
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0); // Сегодня с 00:00
  } else if (period === 'week') {
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0); // Начало недели
  } else if (period === 'month') {
    startDate.setDate(1); // 1-е число месяца
    startDate.setHours(0, 0, 0, 0);
  }
  return startDate;
}

// --- ДЕЙСТВИЯ (без изменений) ---
export async function deleteTransaction(
  transactionId: string,
  walletId: string,
  amountString: string,
  type: TransactionType
) {
  const amount = new Decimal(amountString);
  const amountToReverse = type === TransactionType.INCOME ? amount.negated() : amount;
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
  category: string;
  type: TransactionType;
  notes: string;
  amount: string;
  date: string;
};

// --- ОТЧЁТЫ (ИСПРАВЛЕНО: проверка на null) ---
export async function generateReport(
  period: 'day' | 'week' | 'month',
  reportType: TransactionType
): Promise<ReportData[]> {
  const startDate = getPeriodStart(period);
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: startDate },
      yandexEarningKey: null,
      category: { type: reportType },
    },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  return transactions
    .filter(tx => tx.category !== null) // ФИЛЬТР: убираем null
    .map((tx) => {
      const isIncome = tx.category!.type === TransactionType.INCOME;
      const amountString = isIncome
        ? tx.amount.toString()
        : tx.amount.negated().toString();

      return {
        date: tx.createdAt.toLocaleDateString('ka-GE'),
        category: tx.category!.name,
        type: tx.category!.type,
        notes: tx.notes || '',
        amount: amountString,
      };
    });
}

// --- СИНХРОНИЗАЦИЯ ВОДИТЕЛЕЙ (без изменений) ---
export async function syncYandexDrivers(): Promise<{ success: boolean; message: string }> {
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
      const fullName = `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim();
      const phoneNumber = driverData.phones[0]?.number;
      const result = await prisma.driver.upsert({
        where: { yandexId: driverData.id },
        select: { id: true, createdAt: true, updatedAt: true },
        update: { name: fullName, phone: phoneNumber },
        create: { yandexId: driverData.id, name: fullName, phone: phoneNumber },
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) createdCount++;
      else updatedCount++;
    }
    revalidatePath('/');
    return {
      success: true,
      message: `Синхронизация завершена. Создано: ${createdCount}, Обновлено: ${updatedCount} водителей.`,
    };
  } catch (error: any) {
    console.error('Ошибка синхронизации с Yandex:', error);
    return { success: false, message: `Сбой синхронизации: ${error.message}` };
  }
}

// --- ИСПРАВЛЕННАЯ СИНХРОНИЗАЦИЯ: partner_ride_fee = ТВОИ 6% ---
export async function syncYandexEarnings(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('=== СИНХРОНИЗАЦИЯ: ТВОИ 6% (partner_ride_fee) + АРЕНДА ===');
    
    const wallet = await prisma.wallet.findUnique({ where: { name: 'ბარათი' } });
    const commCat = await prisma.category.findUnique({ where: { name: 'იანდექსის საკომისიო' } });
    const rentalCat = await prisma.category.findUnique({ where: { name: 'ავტომობილის ქირაობა' } });

    if (!wallet || !commCat || !rentalCat) {
      return { success: false, message: 'Нет кошелька или категорий.' };
    }

    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - 30);

    const url = `${YANDEX_BASE_URL}/v2/parks/transactions/list`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Client-ID': YANDEX_FULL_CLID,
        'X-API-Key': YANDEX_API_KEY,
        'X-Park-ID': YANDEX_PARK_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          park: {
            id: YANDEX_PARK_ID,
            transaction: {
              event_at: {
                from: from.toISOString(),
                to: to.toISOString(),
              },
              // ФИЛЬТР: только partner_ride_fee и аренда
              category_id: { in: ['partner_ride_fee', 'rental_deduction', 'driver_deduction_rental'] },
            },
          },
        },
        limit: 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, message: `Ошибка API: ${response.status}` };
    }

    const data = await response.json();
    const transactions = data.transactions || [];
    console.log(`Получено транзакций: ${transactions.length}`);

    let newComm = 0;
    let newRental = 0;

    for (const tx of transactions) {
      console.log('Транзакция:', { id: tx.id, amount: tx.amount, category_id: tx.category_id });

      const driver = await prisma.driver.findUnique({
        where: { yandexId: tx.driver_profile_id },
      });
      if (!driver) continue;

      const key = `yandex_${tx.category_id}_${tx.id}`;
      const exists = await prisma.transaction.findUnique({ where: { yandexEarningKey: key } });
      if (exists) continue;

      const rawAmount = new Decimal(tx.amount);
      const amount = rawAmount.abs(); // Берем модуль — partner_ride_fee всегда отрицательный

      if (tx.category_id === 'partner_ride_fee') {
        await prisma.transaction.create({
          data: {
            amount: amount,
            type: TransactionType.INCOME,
            categoryId: commCat.id,
            walletId: wallet.id,
            driverId: driver.id,
            yandexEarningKey: key,
            notes: `6% комиссия: ${driver.name}`,
            createdAt: new Date(tx.event_at),
          },
        });
        newComm++;
        console.log(`ЗАГРУЖЕНА КОМИССИЯ: +${amount} GEL от ${driver.name}`);
      } 
      else if (tx.category_id.includes('rental') || tx.category_id.includes('deduction')) {
        await prisma.transaction.create({
          data: {
            amount: amount,
            type: TransactionType.INCOME,
            categoryId: rentalCat.id,
            walletId: wallet.id,
            driverId: driver.id,
            yandexEarningKey: key,
            notes: `Аренда авто: ${driver.name}`,
            createdAt: new Date(tx.event_at),
          },
        });
        newRental++;
        console.log(`ЗАГРУЖЕНА АРЕНДА: +${amount} GEL от ${driver.name}`);
      }
    }

    revalidatePath('/');
    return { success: true, message: `Загружено: ${newComm} комиссий 6% + ${newRental} аренд.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- ОТЧЁТ ПО КОМИССИЯМ 6% (ИСПРАВЛЕНО: null check + синтаксис) ---
export async function generateCommissionReport(
  period: 'day' | 'week' | 'month'
): Promise<Array<{ driver: string; amount: string }>> {
  const startDate = getPeriodStart(period);

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: startDate },
      category: { name: 'იანდექსის საკომისიო' },
      driverId: { not: null },
    },
    include: { driver: true, category: true },
  });

  // ФИЛЬТР: убираем null
  const validTransactions = transactions.filter(
    (tx): tx is typeof tx & { category: NonNullable<typeof tx.category>; driver: NonNullable<typeof tx.driver> } =>
      tx.category !== null && tx.driver !== null
  );

  const byDriver = new Map<string, Decimal>();
  for (const tx of validTransactions) {
    const key = tx.driver.id;
    const current = byDriver.get(key) || new Decimal(0);
    byDriver.set(key, current.plus(tx.amount));
  }

  return Array.from(byDriver.entries())
    .map(([driverId, amount]) => {
      const driver = validTransactions.find(t => t.driver.id === driverId)?.driver!;
      return {
        driver: driver.name,
        amount: amount.toFixed(2),
      };
    })
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
}

// --- ДОБАВЛЕНИЕ ТРАНЗАКЦИИ (ручное) ---
export async function addTransaction(formData: FormData) {
  'use server';

  const amount = Number(formData.get('amount'));
  const notes = formData.get('notes') as string;
  const walletId = formData.get('walletId') as string;
  const categoryId = formData.get('categoryId') as string;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    console.error('კატეგორია არ მოიძებნა');
    return;
  }

  const amountToUpdate = category.type === TransactionType.INCOME ? amount : -amount;

  try {
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          amount,
          notes: notes || null,
          walletId,
          categoryId,
          type: category.type,
        },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amountToUpdate } },
      }),
    ]);

    revalidatePath('/');
  } catch (error) {
    console.error('ტრანზაქციის დამატების დროს მოხდა შეცდომა:', error);
  }
}