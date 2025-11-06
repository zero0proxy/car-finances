// Файл: src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// Эта магия нужна, чтобы в режиме разработки (dev)
// не создавались новые подключения при каждом "hot reload"
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // Будем видеть запросы к базе в терминале
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;