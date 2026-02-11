import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

const isE2ETestMode = process.env.E2E_TEST_MODE === "true";

const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  }),
];

if (isE2ETestMode) {
  providers.push(
    Credentials({
      name: "E2E Test",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase().trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        const allowedEmail = process.env.E2E_TEST_EMAIL?.toLowerCase().trim() || "e2e@example.com";
        const allowedPassword = process.env.E2E_TEST_PASSWORD || "e2e-password";

        if (email === allowedEmail && password === allowedPassword) {
          return {
            id: `e2e-${allowedEmail}`,
            email: allowedEmail,
            name: "E2E Test User",
            image: null,
          };
        }

        return null;
      },
    }),
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
