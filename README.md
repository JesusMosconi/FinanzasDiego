# Finanzas Taller

Esqueleto de una aplicacion Next.js con App Router, TypeScript, Tailwind CSS y Prisma para PostgreSQL.

## Setup

1. Instalar las dependencias:

   ```bash
   npm install
   ```

2. Copiar las variables de entorno y completar `DATABASE_URL` con la URL de PostgreSQL de Neon:

   ```bash
   cp .env.example .env
   ```

   Generar el hash bcrypt del PIN y guardarlo como `PIN_HASH`:

   ```bash
   node -e "console.log(require('bcryptjs').hashSync('TU_PIN', 12))"
   ```

   Generar un secreto aleatorio y guardarlo como `JWT_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   No guardar el PIN en texto plano. La sesion firmada permanece vigente durante 30 dias.

3. Generar el cliente de Prisma:

   ```bash
   npx prisma generate
   ```

4. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

La aplicacion queda disponible en [http://localhost:3000](http://localhost:3000).

## Deploy

El proyecto puede desplegarse directamente en Vercel. Configurar `DATABASE_URL` en las variables de entorno del proyecto antes del deploy.
