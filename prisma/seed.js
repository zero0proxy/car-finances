// Файл: prisma/seed.js

const { PrismaClient, TransactionType } = require('@prisma/client');
const prisma = new PrismaClient();

// Список наших категорий
const categories = [
  // Доходы (INCOME)
  { name: 'მანქანის ქირა', type: TransactionType.INCOME },
  { name: 'იანდექსის საკომისიო', type: TransactionType.INCOME },
  { name: 'ბოლტის საკომისიო', type: TransactionType.INCOME },

  // Расходы (EXPENSE)
  { name: 'მანქანის შეკეთება', type: TransactionType.EXPENSE },
  { name: 'ტექ.დათვალიერება', type: TransactionType.EXPENSE },
  { name: 'საწვავი', type: TransactionType.EXPENSE },
  { name: 'ავტომობილის შეძენა', type: TransactionType.EXPENSE },
  { name: 'ზეთის შეცვლა', type: TransactionType.EXPENSE },
  { name: 'თანამშრომლების ანაზღაურება', type: TransactionType.EXPENSE },
  { name: 'ოფისის ქირა', type: TransactionType.EXPENSE },
  { name: 'კომუნალური ხარჯები', type: TransactionType.EXPENSE },
];

// Список кошельков
const wallets = [{ name: 'ბარათი' }, { name: 'ნაღდი' }];

async function main() {
  console.log('ვიწყებთ მონაცემთა ბაზის შექმნა...');

  // Создаем кошельки
  for (const wallet of wallets) {
    await prisma.wallet.upsert({
      where: { name: wallet.name },
      update: {},
      create: { name: wallet.name, balance: 0.0 },
    });
    console.log(`- შექმნილია ან ნაპოვნია საფულე: ${wallet.name}`);
  }

  // Создаем категории
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name }, // Ищем по уникальному имени
      update: {}, // Если нашли - ничего не обновляем
      create: category, // Если не нашли - создаем
    });
    console.log(`- შექმნილია ან ნაპოვნია კატეგორია: ${category.name}`);
  }

  console.log('შექმნა წარმატებით დასრულდა.');
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