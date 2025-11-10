/*
  Warnings:

  - A unique constraint covering the columns `[yandexTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "yandexTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_yandexTransactionId_key" ON "Transaction"("yandexTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_yandexTransactionId_idx" ON "Transaction"("yandexTransactionId");
