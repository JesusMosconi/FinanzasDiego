-- DropForeignKey
ALTER TABLE "Movimiento" DROP CONSTRAINT "Movimiento_cuenta_origen_id_fkey";

-- AlterTable
ALTER TABLE "Movimiento" ALTER COLUMN "cuenta_origen_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_cuenta_origen_id_fkey" FOREIGN KEY ("cuenta_origen_id") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
