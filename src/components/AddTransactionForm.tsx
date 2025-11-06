// Файл: src/components/AddTransactionForm.tsx

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Компонент по-прежнему загружает данные для ВЫПАДАЮЩИХ СПИСКОВ
export async function AddTransactionForm() {
  const wallets = await prisma.wallet.findMany();
  const categories = await prisma.category.findMany();

  const incomeCategories = categories.filter(
    (cat) => cat.type === TransactionType.INCOME
  );
  const expenseCategories = categories.filter(
    (cat) => cat.type === TransactionType.EXPENSE
  );

  // 🔥 НАШЕ СЕРВЕРНОЕ ДЕЙСТВИЕ (SERVER ACTION) 🔥
  async function addTransaction(formData: FormData) {
    'use server'; 

    // 1. Получаем данные из формы
    const amount = Number(formData.get('amount'));
    const notes = formData.get('notes') as string;
    const walletId = formData.get('walletId') as string;
    const categoryId = formData.get('categoryId') as string;

    // 2. 🔥 ИСПРАВЛЕНИЕ:
    // Мы больше не используем 'categories.find()'.
    // Вместо этого Server Action САМ обращается к базе данных,
    // чтобы быть полностью автономным.
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      console.error('კატეგორია არ მოიძებნა');
      return; // Ошибка
    }

    // 3. Определяем, прибавляем мы или вычитаем
    const amountToUpdate =
      category.type === TransactionType.INCOME ? amount : -amount;

    // 4. Выполняем 2 запроса в базе данных в ОДНОЙ транзакции
    try {
      await prisma.$transaction([
        // Запрос 1: Создаем саму транзакцию
        prisma.transaction.create({
          data: {
            amount: amount,
            notes: notes,
            walletId: walletId,
            categoryId: categoryId,
          },
        }),
        // Запрос 2: Обновляем баланс кошелька
        prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: {
              increment: amountToUpdate, // Прибавляем (или вычитаем)
            },
          },
        }),
      ]);

      // 5. Говорим Next.js обновить главную страницу
      revalidatePath('/');
      
    } catch (error) {
      console.error('ტრანზაქციის დამატების დროს მოხდა შეცდომა:', error);
    }
  }

  // JSX остается точно таким же
  return (
    <form
      action={addTransaction}
      className="bg-white p-6 rounded-xl shadow-md space-y-4"
    >
      <h2 className="text-2xl font-semibold">ტრანზაქციის დამატება</h2>

      {/* Выбор суммы */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium">
          თანხა
        </label>
        <input
          type="number"
          name="amount"
          id="amount"
          required
          step="0.01"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="1000"
        />
      </div>

      {/* Выбор кошелька */}
      <div>
        <label htmlFor="walletId" className="block text-sm font-medium">
          საფულე
        </label>
        <select
          name="walletId"
          id="walletId"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>
      </div>

      {/* Выбор категории */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium">
          კატეგორია
        </label>
        <select
          name="categoryId"
          id="categoryId"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <optgroup label="შემოსავალი">
            {incomeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="ხარჯი">
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Заметки */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          დამატებითი ინფორმაცია (არაა აუცილებელი)
        </label>
        <input
          type="text"
          name="notes"
          id="notes"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="მაგ.ჯარიმა YJ175YJ"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700"
      >
        დამატება
      </button>
    </form>
  );
}