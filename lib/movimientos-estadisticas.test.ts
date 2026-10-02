import assert from "node:assert/strict";
import test from "node:test";

import { TipoCuenta } from "@prisma/client";

import {
  CATEGORIA_LIQUIDACION_OBRA,
  esIngresoComputable,
  esLiquidacionObra,
} from "./movimientos-estadisticas";

test("un anticipo externo aumenta caja pero no es ingreso computable", () => {
  assert.equal(
    esIngresoComputable({
      categoria: "ANTICIPO",
      concepto: "Anticipo inicial",
      cuenta_origen_id: null,
      cuenta_destino_id: "anticipo",
      cuenta_destino: { tipo: TipoCuenta.ANTICIPO },
    }),
    false,
  );
});

test("un ingreso externo a una caja general es computable", () => {
  assert.equal(
    esIngresoComputable({
      categoria: "INGRESO",
      concepto: "Cobro",
      cuenta_origen_id: null,
      cuenta_destino_id: "cobranzas",
      cuenta_destino: { tipo: TipoCuenta.COBRANZAS },
    }),
    true,
  );
});

test("una liquidación nueva es ganancia aunque sea una transferencia", () => {
  const movement = {
    categoria: CATEGORIA_LIQUIDACION_OBRA,
    concepto: "Liquidacion de anticipo - Cliente",
    cuenta_origen_id: "anticipo",
    cuenta_destino_id: "cobranzas",
    cuenta_origen: { tipo: TipoCuenta.ANTICIPO },
    cuenta_destino: { tipo: TipoCuenta.COBRANZAS },
  };

  assert.equal(esLiquidacionObra(movement), true);
  assert.equal(esIngresoComputable(movement), true);
});

test("una liquidación histórica también se reconoce", () => {
  assert.equal(
    esLiquidacionObra({
      categoria: "TRANSFERENCIA",
      concepto: "Liquidacion de anticipo - Cliente",
      cuenta_origen_id: "anticipo",
      cuenta_destino_id: "cobranzas",
      cuenta_origen: { tipo: TipoCuenta.ANTICIPO },
      cuenta_destino: { tipo: TipoCuenta.COBRANZAS },
    }),
    true,
  );
});
