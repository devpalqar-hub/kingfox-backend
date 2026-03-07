/*
  Warnings:

  - A unique constraint covering the columns `[exchange_invoice_id]` on the table `returns` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_RETURNED';

-- AlterEnum
ALTER TYPE "ReturnType" ADD VALUE 'PARTIAL_RETURN';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "return_credit" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "exchange_invoice_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "returns_exchange_invoice_id_key" ON "returns"("exchange_invoice_id");

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_exchange_invoice_id_fkey" FOREIGN KEY ("exchange_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
