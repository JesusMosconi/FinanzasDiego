import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const demoEnv = parseEnv(readFileSync(".env.demo.local", "utf8"));
const expectedHost = demoEnv.DEMO_DATABASE_HOST;
const actualHost = new URL(demoEnv.DATABASE_URL).hostname;

if (
  demoEnv.DEMO_MODE !== "true" ||
  !expectedHost ||
  actualHost !== expectedHost
) {
  throw new Error("La configuración local no apunta a la rama demo esperada.");
}

const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
// Next expande los $ de las variables de entorno; proteger el hash bcrypt
// antes de que Next procese el entorno del proceso hijo.
const nextEnv = {
  ...demoEnv,
  PIN_HASH: demoEnv.PIN_HASH.replaceAll("$", "\\$"),
};
const child = spawn(process.execPath, [nextCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ...nextEnv },
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
