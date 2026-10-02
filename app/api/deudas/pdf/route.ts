import { renderToBuffer } from "@react-pdf/renderer";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { DeudasPdf, type DeudasPdfData } from "@/lib/deudas-pdf";
import { obtenerDeudasPeriodo } from "@/lib/deudas";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pdfFilename(anio: number, mes: number) {
  const label = formatearPeriodo(anio, mes)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `deudas-${label}.pdf`;
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const period = await obtenerPeriodoOperativo();
  if (!period) {
    return Response.json(
      { error: "No hay un período operativo." },
      { status: 404 },
    );
  }

  const data: DeudasPdfData = {
    periodLabel: formatearPeriodo(period.anio, period.mes),
    generatedAt: new Date().toISOString(),
    debts: await obtenerDeudasPeriodo(period.id),
  };
  const buffer = await renderToBuffer(DeudasPdf({ data }));
  const bytes = Uint8Array.from(buffer);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename(period.anio, period.mes)}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
