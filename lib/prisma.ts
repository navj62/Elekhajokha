import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};
neonConfig.webSocketConstructor = ws;

const createPrismaClient = () => {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL as string,
  });
  
  return new PrismaClient({
    adapter,
    log: ["error"], // ← only log errors, not every query
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}