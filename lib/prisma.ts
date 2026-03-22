import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. We create a helper function to initialize the new adapter and client
const createPrismaClient = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool as any);
  
  return new PrismaClient({
    adapter,
    log: ["query"], // Kept your original logging!
  });
};

// 2. We use your exact same global check
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 3. We keep your exact same hot-reloading safeguard
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}