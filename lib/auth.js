// NextAuth configuration.
// Google sign-in is enabled only when GOOGLE_CLIENT_ID/SECRET are present.
// The Prisma adapter is used only when a database is configured.
// With neither set, the app runs in guest mode (no login required).
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma, { dbEnabled } from "./db";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  providers,
  ...(dbEnabled && prisma ? { adapter: PrismaAdapter(prisma) } : {}),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: dbEnabled ? "database" : "jwt" },
  pages: {},
};
