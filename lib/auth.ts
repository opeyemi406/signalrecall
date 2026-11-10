import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { upsertUser } from "@/lib/server/storage";

export function isGoogleAuthConfigured(): boolean {
  const id = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(id && secret && id.trim().length > 0 && secret.trim().length > 0);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        try {
          await upsertUser({
            id: user.id || account.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
          });
        } catch (err) {
          console.error("[Auth] Failed to persist user into user store:", err);
        }
      }
      return true;
    },
  },
  secret: process.env.AUTH_SECRET || "signalrecall_auth_dev_secret_replace_in_env_32chars",
  trustHost: true,
});
