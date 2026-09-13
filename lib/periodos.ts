import { prisma } from "@/lib/prisma";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

function obtenerAnioMes(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "numeric",
    timeZone: TIME_ZONE,
  }).formatToParts(fecha);

  return {
    anio: Number(partes.find((parte) => parte.type === "year")?.value),
    mes: Number(partes.find((parte) => parte.type === "month")?.value),
  };
}

export async function obtenerPeriodoOperativo(fecha = new Date()) {
  const { anio, mes } = obtenerAnioMes(fecha);
  const periodoActual = await prisma.periodo.findFirst({
    where: { anio, mes, cerrado: false },
  });

  if (periodoActual) return periodoActual;

  return prisma.periodo.findFirst({
    where: { cerrado: false },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });
}

export function formatearPeriodo(anio: number, mes: number) {
  return monthName
    .format(new Date(Date.UTC(anio, mes - 1, 15, 12)))
    .replace(" de ", " ");
}
