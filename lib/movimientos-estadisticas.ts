import { TipoCuenta } from "@prisma/client";

type StatisticalMovement = {
  categoria: string;
  concepto: string;
  cuenta_origen_id: string | null;
  cuenta_destino_id: string | null;
  cuenta_origen?: { tipo: TipoCuenta } | null;
  cuenta_destino?: { tipo: TipoCuenta } | null;
};

export const CATEGORIA_LIQUIDACION_OBRA = "LIQUIDACION_OBRA";

export function esLiquidacionObra(movement: StatisticalMovement) {
  if (movement.categoria === CATEGORIA_LIQUIDACION_OBRA) return true;

  return (
    movement.categoria === "TRANSFERENCIA" &&
    movement.concepto.startsWith("Liquidacion de anticipo -") &&
    movement.cuenta_origen?.tipo === TipoCuenta.ANTICIPO &&
    movement.cuenta_destino?.tipo === TipoCuenta.COBRANZAS
  );
}

export function esIngresoComputable(movement: StatisticalMovement) {
  if (esLiquidacionObra(movement)) return true;

  return (
    movement.cuenta_origen_id === null &&
    movement.cuenta_destino_id !== null &&
    movement.cuenta_destino?.tipo !== TipoCuenta.ANTICIPO
  );
}

export function esEgresoReal(movement: StatisticalMovement) {
  return (
    movement.cuenta_origen_id !== null && movement.cuenta_destino_id === null
  );
}
