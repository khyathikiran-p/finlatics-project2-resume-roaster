// Prisma client — instantiated only when DATABASE_URL is configured.
// This lets the app run (and deploy) with no database at all.
import { PrismaClient } from "@prisma/client";

export const dbEnabled = Boolean(process.env.DATABASE_URL);

let prisma = null;

if (dbEnabled) {
  const globalForPrisma = globalThis;
  prisma = globalForPrisma._prisma || new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma._prisma = prisma;
  }
}

export default prisma;
