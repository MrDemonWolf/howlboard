import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/api/auth`,
  plugins: [twoFactorClient()],
});

export const { signIn, signOut, signUp, useSession, twoFactor } = authClient;
