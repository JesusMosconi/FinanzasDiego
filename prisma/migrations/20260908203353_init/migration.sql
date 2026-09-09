-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('CAJA_DIARIA', 'RESIDUALES', 'COBRANZAS', 'ANTICIPO');

-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoCobranza" AS ENUM ('MANO_OBRA', 'RESIDUAL', 'FAMILIA');

-- CreateEnum
CREATE TYPE "EstadoTrabajoConfirmado" AS ENUM ('EN_PROCESO', 'LISTO_PARA_ENTREGAR', 'CERTIFICADO_PARCIAL');

-- CreateTable
CREATE TABLE "Periodo" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_cierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoCuenta" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "saldo_inicial" DECIMAL(65,30) NOT NULL,
    "saldo_final" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "tipo" "TipoCuenta" NOT NULL,
    "obra_id" TEXT,
    "saldo_actual" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoObra" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "cuenta_origen_id" TEXT NOT NULL,
    "cuenta_destino_id" TEXT,
    "periodo_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "categoria" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranza" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT,
    "periodo_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "tipo" "TipoCobranza" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobranza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoFijo" (
    "id" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "obligacion" TEXT NOT NULL,
    "monto_total" DECIMAL(65,30) NOT NULL,
    "monto_pagado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "vence_dia" INTEGER NOT NULL,
    "fecha_pago" TIMESTAMP(3),
    "periodo_id" TEXT NOT NULL,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrabajoConfirmado" (
    "id" TEXT NOT NULL,
    "numero_cotizacion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto_neto" DECIMAL(65,30) NOT NULL,
    "estado" "EstadoTrabajoConfirmado" NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrabajoConfirmado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PeriodoCuenta" ADD CONSTRAINT "PeriodoCuenta_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoCuenta" ADD CONSTRAINT "PeriodoCuenta_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuenta" ADD CONSTRAINT "Cuenta_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_cuenta_origen_id_fkey" FOREIGN KEY ("cuenta_origen_id") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_cuenta_destino_id_fkey" FOREIGN KEY ("cuenta_destino_id") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranza" ADD CONSTRAINT "Cobranza_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranza" ADD CONSTRAINT "Cobranza_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoFijo" ADD CONSTRAINT "GastoFijo_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
