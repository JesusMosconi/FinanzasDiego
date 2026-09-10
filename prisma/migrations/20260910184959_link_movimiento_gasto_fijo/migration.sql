/*
  Warnings:

  - You are about to drop the column `monto_pagado` on the `GastoFijo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GastoFijo" DROP COLUMN "monto_pagado";

-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "gasto_fijo_id" TEXT;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_gasto_fijo_id_fkey" FOREIGN KEY ("gasto_fijo_id") REFERENCES "GastoFijo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
