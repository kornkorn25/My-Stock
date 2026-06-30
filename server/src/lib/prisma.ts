import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across warm serverless invocations (and dev
// hot-reloads) so we don't open a new connection pool on every request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
