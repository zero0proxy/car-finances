// Файл: src/app/layout.tsx

import type { Metadata } from 'next';
// 1. Мы импортируем 'Inter' вместо 'Geist'
import { Inter } from 'next/font/google';
import './globals.css';

// 2. Мы инициализируем Inter
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Car Finances', // Я добавил заголовок
  description: 'ფინანსური სტატისტიკა',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. Я поменял lang="en" на "ru"
    <html lang="ru">
      {/* 4. Мы применяем класс шрифта inter, а не geist */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}