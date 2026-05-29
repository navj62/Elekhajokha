import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";


/* ------------------------------------------------------------------ */
/* Global type                                                        */
/* ------------------------------------------------------------------ */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

<<<<<<< HEAD
/* ------------------------------------------------------------------ */
/* Create client                                                      */
/* ------------------------------------------------------------------ */
=======
>>>>>>> main

const createPrismaClient = () => {

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not defined"
    );
  }

  const adapter = new PrismaNeon({
    connectionString:
      process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,

    // only log errors
    log: ["error"],
  });
};

/* ------------------------------------------------------------------ */
/* Singleton                                                          */
/* ------------------------------------------------------------------ */

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

/* ------------------------------------------------------------------ */
/* Prevent multiple instances in dev                                  */
/* ------------------------------------------------------------------ */

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma =
    prisma;
}