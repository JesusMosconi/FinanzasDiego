# FinanzasApp Demo

Esta rama muestra datos ficticios y oculta Obras y Anticipos. El PIN público de acceso es `1234`.

## Base de datos

Crear en Neon una rama **solo esquema** desde la rama principal, o una base nueva vacía con las migraciones del proyecto. Una rama normal hereda los datos reales y no sirve para la demo. No conectar Vercel ni abrir la demo al público hasta comprobar que las tablas de datos están vacías y que el host es distinto del productivo.

Crear `.env.demo.local` a partir de `.env.example` con conexiones de la rama demo: `DATABASE_URL` pooled y `DIRECT_URL` directa. El archivo está ignorado por Git y solo lo cargan los comandos `demo:*`, así que no sobreescribe la configuración habitual al cambiar de rama. `DEMO_DATABASE_HOST` debe ser exactamente el hostname de `DATABASE_URL`. La aplicación rechaza el host productivo conocido y no arranca sin `DEMO_MODE=true`. Usar un `JWT_SECRET` distinto del original y un `PIN_HASH` bcrypt de `1234`.

Para generar el hash localmente:

```powershell
node -e "require('bcryptjs').hash('1234', 12).then(console.log)"
```

En `.env.demo.local`, dejar el hash bcrypt con sus `$` normales: los comandos `demo:*` cargan el archivo con Node antes de iniciar Next.

Verificar el destino de ambas URL antes de usar Prisma. En una rama solo esquema, inspeccionar el estado de `_prisma_migrations` antes de intentar `prisma migrate deploy`: el esquema puede existir aunque la tabla de migraciones no tenga registros.

## Datos de ejemplo

Con la rama demo configurada y verificada:

```powershell
npm.cmd run demo:inspect
npm.cmd run demo:seed
npm.cmd run demo:build
npm.cmd run demo:start
```

El cargador no borra nada. Exige `DEMO_SEED_CONFIRM=CREAR_DATOS_FICTICIOS` y todas las tablas de datos vacías; si encuentra algún registro, aborta la transacción. Crea tres meses con ingresos, egresos, pases, obligaciones y pagos ficticios. `npm.cmd run db:seed` sigue siendo un reset destructivo y no se usa para la demo.

El código de esta rama no debe desplegarse con las variables de producción. El PIN visible es público y no protege datos confidenciales; mantener exclusivamente datos ficticios en la base demo.
