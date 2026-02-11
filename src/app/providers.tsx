"use client";

import { ConvexProviderWithAuth, ConvexReactClient, useMutation } from "convex/react";
import { SessionProvider, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type DecodedJwt = {
  exp?: number;
};

function decodeJwtPayload(token: string): DecodedJwt | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}

function useConvexAuth() {
  const { status } = useSession();
  const tokenCache = useRef<{ token: string; expiresAtMs: number } | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const now = Date.now();
      if (!forceRefreshToken && tokenCache.current && tokenCache.current.expiresAtMs > now + 30_000) {
        return tokenCache.current.token;
      }

      const response = await fetch("/api/convex/token", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        tokenCache.current = null;
        return null;
      }

      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        tokenCache.current = null;
        return null;
      }

      const payload = decodeJwtPayload(data.token);
      const expiresAtMs = payload?.exp ? payload.exp * 1000 : now + 55 * 60_000;

      tokenCache.current = {
        token: data.token,
        expiresAtMs,
      };

      return data.token;
    },
    [],
  );

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    fetchAccessToken,
  };
}

function AuthBootstrap() {
  const { status } = useSession();
  const syncCurrentUser = useMutation(api.users.syncCurrent);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !hasSynced.current) {
      hasSynced.current = true;
      void syncCurrentUser({});
    }

    if (status !== "authenticated") {
      hasSynced.current = false;
    }
  }, [status, syncCurrentUser]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        <AuthBootstrap />
        {children}
      </ConvexProviderWithAuth>
    </SessionProvider>
  );
}
