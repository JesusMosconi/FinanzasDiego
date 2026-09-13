import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../lib/prisma";

async function main() {
  const backup = {
    exportedAt: new Date().toISOString(),
    periodos: await prisma.periodo.findMany(),
    periodoCuentas: await prisma.periodoCuenta.findMany(),
    cuentas: await prisma.cuenta.findMany(),
    obras: await prisma.obra.findMany(),
    movimientos: await prisma.movimiento.findMany(),
    cobranzas: await prisma.cobranza.findMany(),
    gastosFijos: await prisma.gastoFijo.findMany(),
    trabajosConfirmados: await prisma.trabajoConfirmado.findMany(),
  };
  const directory = path.join(process.cwd(), "backups");
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const destination = path.join(directory, `antes-del-reinicio-${timestamp}.json`);

  await mkdir(directory, { recursive: true });
  await writeFile(destination, JSON.stringify(backup, null, 2), "utf8");
  console.log(destination);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
