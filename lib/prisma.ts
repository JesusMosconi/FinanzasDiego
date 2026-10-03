import { PrismaClient } from "@prisma/client";
import { assertDemoDatabase } from "@/lib/demo-environment";

assertDemoDatabase();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
