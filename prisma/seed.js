// Файл: prisma/seed.js

const { PrismaClient, TransactionType } = require('@prisma/client');
const prisma = new PrismaClient();

// Список наших категорий
const categories = [
  // Доходы (INCOME)
  { name: 'Аренда автомобиля', type: TransactionType.INCOME },
  { name: 'Комиссия Yandex', type: TransactionType.INCOME },
  { name: 'Комиссия Bolt', type: TransactionType.INCOME },

  // Расходы (EXPENSE)
  { name: 'Ремонт автомобиля', type: TransactionType.EXPENSE },
  { name: 'Техосмотр', type: TransactionType.EXPENSE },
  { name: 'Топливо', type: TransactionType.EXPENSE },
  { name: 'Покупка автомобиля', type: TransactionType.EXPENSE },
  { name: 'Замена масла', type: TransactionType.EXPENSE },
  { name: 'Зарплата сотрудникам', type: TransactionType.EXPENSE },
  { name: 'Оплата аренды', type: TransactionType.EXPENSE },
  { name: 'Коммунальные услуги', type: TransactionType.EXPENSE },
];

// Список кошельков
const wallets = [{ name: 'Карта' }, { name: 'Наличные' }];

async function main() {
  console.log('Начинаем "посев" базы данных...');

  // Создаем кошельки
  for (const wallet of wallets) {
    await prisma.wallet.upsert({
      where: { name: wallet.name },
      update: {},
      create: { name: wallet.name, balance: 0.0 },
    });
    console.log(`- Создан или найден кошелек: ${wallet.name}`);
  }

  // Создаем категории
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name }, // Ищем по уникальному имени
      update: {}, // Если нашли - ничего не обновляем
      create: category, // Если не нашли - создаем
    });
    console.log(`- Создана или найдена категория: ${category.name}`);
  }

  console.log('Посев завершен.');
}

// Запускаем main и обрабатываем ошибки
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect(); // Обязательно отключаемся от базы
  });