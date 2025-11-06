// Файл: tailwind.config.ts

import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    // Это самое важное: говорим, где искать классы
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Здесь позже будет glassmorphism
    },
  },
  plugins: [
    forms,
  ],
};
export default config;