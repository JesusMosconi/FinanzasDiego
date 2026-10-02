<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FinanzasDiego - guía del proyecto

## Cómo trabajar

- Antes de cambios no triviales, inspeccionar el código, explicar qué archivos y reglas se tocarán y esperar aprobación explícita.
- Respetar el alcance pedido; no rediseñar superficies vecinas ni alterar reglas financieras sin autorización.
- Preservar cambios ajenos o no relacionados del worktree. No hacer commit, push, deploy ni modificar datos reales salvo pedido explícito.
- Para diagnósticos, separar evidencia confirmada de hipótesis. No ocultar validaciones fallidas.
- En PowerShell usar `npm.cmd` y `npx.cmd`. Preferir parches pequeños y ejecutar `git diff --check` al finalizar.

## Propósito y arquitectura

Aplicación privada, mobile-first y PWA para administrar la tesorería personal/familiar de Diego. Usa Next.js App Router con Server Components para lecturas, Client Components para interacción y Server Actions para mutaciones. La base es PostgreSQL en Neon mediante Prisma.

Puntos centrales:

- `app/`: rutas, páginas, API y acciones.
- `components/`: navegación, modales, selectores, transiciones, toasts y PWA.
- `lib/finanzas.ts`: núcleo transaccional de cuentas, movimientos, gastos, obras y cierres.
- `lib/periodos.ts`: período operativo y formato de mes en `America/Argentina/Buenos_Aires`.
- `lib/movimientos-estadisticas.ts`: clasificación compartida de ingresos computables, egresos y liquidaciones.
- `lib/deudas.ts` y `lib/deudas-pdf.tsx`: consulta única de deudas y documento PDF.
- `prisma/schema.prisma` y `prisma/migrations/`: modelo y evolución de la base.
- `proxy.ts`: protege `/app/:path*`.

## Tecnologías

- Next.js 16.3.4, React 19.2, TypeScript estricto y App Router.
- Tailwind CSS 4, Motion 13 y diseño mobile-first.
- Prisma 6.12 con PostgreSQL/Neon.
- `jose` para JWT y `bcryptjs` para el PIN.
- `@react-pdf/renderer` para PDFs generados en servidor.
- Vercel como destino de despliegue.

## Rutas y funciones actuales

- `/login`: autenticación mediante PIN.
- `/app`: patrimonio, cajas, pagos pendientes, ritmo semanal, cierre y actividad reciente.
- `/app/movimientos`: historial del período operativo, búsqueda y filtros.
- `/app/obras`: alta, edición, eliminación condicionada, historial de anticipo y cierre.
- `/app/fijos`: obligaciones, pagos parciales, edición, archivado y duplicación mensual.
- `/app/deudas`: lista pendiente de solo lectura y descarga PDF.
- `/app/historial`: consulta de períodos cerrados, estadísticas, comparaciones y movimientos.
- `/api/deudas/pdf`: PDF protegido de las deudas del período operativo.
- `/api/auth/login` y `/api/auth/logout`: sesión.

La barra inferior usa siete columnas: Inicio, Actividad, Obras, botón central de registro, Fijos, Deudas e Historial. Mantener esa estructura y el lenguaje visual existente.

## Modelo financiero e invariantes

Tipos de cuenta:

- `CAJA_DIARIA`: gastos corrientes.
- `RESIDUALES`: ahorro o excedentes.
- `COBRANZAS`: fondos cobrados pendientes de distribución.
- `ANTICIPO`: una cuenta asociada a una obra.

Reglas:

- Ingreso externo: origen nulo y destino presente.
- Egreso real: origen presente y destino nulo.
- Pase interno: origen y destino presentes; no modifica el resultado neto.
- Los saldos se recalculan desde todos los movimientos, no mediante incrementos manuales.
- No asumir que un saldo negativo está prohibido globalmente; una obra sí debe tener saldo no negativo para cerrarse.
- Toda mutación financiera debe verificar sesión y período abierto. Un período cerrado es de solo lectura.

## Anticipos, obras y estadísticas

- Crear una obra crea su cuenta `ANTICIPO` y un movimiento inicial.
- Todo ingreso externo cuyo destino sea `ANTICIPO` aumenta caja y patrimonio, pero no es ingreso computable ni ganancia.
- Al cerrar una obra, el remanente se transfiere a la única cuenta general de Cobranzas con categoría `LIQUIDACION_OBRA`.
- Una liquidación es una transferencia para los saldos y una ganancia para las estadísticas.
- Las liquidaciones antiguas se reconocen por transferencia `ANTICIPO -> COBRANZAS` y concepto `Liquidacion de anticipo - ...`.
- El resultado histórico es: ingresos externos computables + liquidaciones - egresos reales.
- Comparar resultados mensuales por esa fórmula; no usar la variación patrimonial, porque los anticipos la distorsionan.
- Una obra solo se elimina si no tiene actividad aparte del anticipo inicial. Al cerrarla, el remanente pasa a Cobranzas.

## Gastos fijos y deudas

- `GastoFijo` no guarda un monto pagado manual. Derivarlo siempre de sus movimientos vinculados.
- Pendiente = `max(monto_total - suma de pagos, 0)`.
- Editar nunca puede reducir el total por debajo de lo pagado y debe conservar el historial.
- Eliminar desde la interfaz significa archivar (`archivado = true`), no borrar; los pagos permanecen relacionados.
- Inicio, Fijos y Deudas excluyen obligaciones archivadas.
- Los pagos fijos son egresos y no deben contarse otra vez como gasto diario en el cierre.
- `obtenerDeudasPeriodo()` es la fuente compartida entre la pantalla y el PDF.

## Períodos e Historial

- `obtenerPeriodoOperativo()` busca el mes actual abierto y, si no existe, el abierto más reciente.
- El cierre guarda diferencia y saldos finales de Diarios/Residuales, crea o reutiliza el mes siguiente y copia esos saldos como iniciales.
- Los movimientos permanecen asociados al período cerrado; no se borran ni trasladan.
- Historial muestra solo períodos cerrados y es completamente de consulta.
- Patrimonio histórico incluye todas las cajas, incluidos Anticipos; resultado neto excluye anticipos no liquidados.
- Historial muestra inicialmente cuatro movimientos y permite `Ver todos`/`Ver menos`.

## PDF de Deudas

- Se genera en Node.js con `@react-pdf/renderer`; no guardar PDFs reales en la base ni en el servidor.
- El endpoint debe verificar la cookie JWT por sí mismo.
- El documento incluye período, generación, obligación, grupo, pendiente, cantidad, total y paginación.
- La descarga usa siempre los mismos datos y cálculo que `/app/deudas`.

## Autenticación, PWA y seguridad

- Cookie: `finanzas-taller-session`, JWT HS256, sujeto `owner`, duración 30 días, `httpOnly`, `sameSite=lax` y `secure` en producción.
- Cada Server Action y Route Handler sensible debe autenticar; no confiar solo en `proxy.ts`.
- El service worker cachea únicamente recursos estáticos declarados. La aplicación financiera no funciona offline.
- `npm audit` marca Next.js 16.3.4 por GHSA-vcvr-r3jv-pc5j. El flujo vulnerable (`next/og`/`ImageResponse` Node con SVG controlado por atacante) no se usa actualmente; actualizar Next y `eslint-config-next` juntos antes de incorporar imágenes OG dinámicas.

## Variables de entorno

Documentar solo nombres, nunca valores:

- `DATABASE_URL`: conexión pooled de Neon para runtime.
- `DIRECT_URL`: conexión directa, sin pooler, para migraciones.
- `PIN_HASH`: hash bcrypt del PIN.
- `JWT_SECRET`: secreto de firma de sesión.

## Comandos y validación

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run format:check
npx.cmd prisma format
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npx.cmd tsx --test lib/movimientos-estadisticas.test.ts
```

- `npm.cmd run db:seed` es destructivo: elimina movimientos, cobranzas, gastos, períodos, cuentas, obras y trabajos; solo ejecutarlo con autorización explícita y destino confirmado.
- Para migraciones usar `DIRECT_URL`. Una copia de seguridad o un seed preparado no demuestra que un reset terminó.
- La migración `20261001120000_archivar_gastos_fijos` agrega `GastoFijo.archivado`; fue aplicada al Neon configurado el 2026-10-01, pero verificar siempre el destino y `prisma migrate status` antes de asumir estado remoto.
- Validación mínima para cambios funcionales: prueba específica si existe, lint, build y `git diff --check`. Para PDFs, generar una muestra multipágina y revisar visualmente cortes, montos y legibilidad.

## Estado funcional reciente

- Historial mensual de solo lectura con selector, ingresos computables, egresos, resultado, patrimonio, saldos, semanas, fijos, principales egresos, comparación y actividad.
- Navegación inferior con Historial y lista histórica compacta.
- Obligaciones archivables sin perder pagos y protección reforzada de períodos cerrados.
- Anticipos excluidos de la ganancia; liquidaciones de obra incluidas.
- Descarga protegida y paginada del PDF de Deudas.
