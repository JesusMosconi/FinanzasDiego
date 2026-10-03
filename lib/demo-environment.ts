import { createHash } from "node:crypto";

// Huella del host de producción observado al crear esta rama demo.
const productionHostHash =
  "161fdd56c16dbd33c1e1c5cefbfae2f1d3a78356382295700f72e23a43b5eced";

export function assertDemoDatabase() {
  const expectedHost = process.env.DEMO_DATABASE_HOST;
  const databaseUrl = process.env.DATABASE_URL;

  if (process.env.DEMO_MODE !== "true" || !expectedHost || !databaseUrl) {
    throw new Error(
      "La demo requiere DEMO_MODE y DEMO_DATABASE_HOST configurados.",
    );
  }

  let actualHost: string;
  try {
    actualHost = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("DATABASE_URL de la demo no es válida.");
  }

  if (!actualHost.endsWith(".neon.tech") || actualHost !== expectedHost) {
    throw new Error("DATABASE_URL no coincide con la rama Neon de la demo.");
  }

  const hostHash = createHash("sha256").update(actualHost).digest("hex");
  if (hostHash === productionHostHash) {
    throw new Error("La demo no puede utilizar la base de producción.");
  }

  if (process.env.DIRECT_URL) {
    const directHost = new URL(process.env.DIRECT_URL).hostname;
    if (directHost !== actualHost.replace("-pooler.", ".")) {
      throw new Error("DIRECT_URL no corresponde a la rama Neon de la demo.");
    }
  }
}
