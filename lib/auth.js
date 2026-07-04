// NextAuth configuration.
// OAuth providers (GitHub and/or Google) are enabled only when their
// client id/secret are present. The Prisma adapter is used only when a
// database is configured. With no provider set, the app runs in guest mode.
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma, { dbEnabled } from "./db";

const providers = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// True when at least one OAuth provider is configured. When true, /api/roast
// requires a session (getServerSession); when false, the app is open (guest).
export const authConfigured = providers.length > 0;

export const authOptions = {
  providers,
  ...(dbEnabled && prisma ? { adapter: PrismaAdapter(prisma) } : {}),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: dbEnabled ? "database" : "jwt" },
  callbacks: {
    // Expose the user id on the session for rate-limiting / persistence.
    async session({ session, token, user }) {
      if (session?.user) session.user.id = user?.id || token?.sub || null;
      return session;
    },
  },
};
