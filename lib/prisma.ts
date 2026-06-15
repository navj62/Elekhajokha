import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Polyfill WebSocket for Neon Serverless driver in Node environment
neonConfig.webSocketConstructor = ws;

/* ------------------------------------------------------------------ */
/* Global type                                                         */
/* ------------------------------------------------------------------ */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/* ------------------------------------------------------------------ */
/* Create client                                                       */
/* ------------------------------------------------------------------ */

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
};

/* ------------------------------------------------------------------ */
/* Singleton                                                           */
/* ------------------------------------------------------------------ */

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

/* ------------------------------------------------------------------ */
/* Prevent multiple instances in dev                                   */
/* ------------------------------------------------------------------ */

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}