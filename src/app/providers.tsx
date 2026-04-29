"use client";

import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useConvexAuth as useConvexAuthState,
  useMutation,
} from "convex/react";
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

function useConvexTokenAuth() {
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

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("unauthorized");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function AuthBootstrap() {
  const { status } = useSession();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuthState();
  const syncCurrentUser = useMutation(api.users.syncCurrent);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      hasSynced.current = false;
      return;
    }

    if (isConvexAuthLoading || !isConvexAuthenticated || hasSynced.current) {
      return;
    }

    let cancelled = false;
    hasSynced.current = true;

    const runSync = async () => {
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await syncCurrentUser({});
          return;
        } catch (error) {
          lastError = error;
          if (!isUnauthorizedError(error) || attempt === 3) {
            break;
          }
          await wait(attempt * 250);
          if (cancelled) return;
        }
      }

      hasSynced.current = false;
      if (!cancelled) {
        console.error("Failed to sync current user after Convex auth", lastError);
      }
    };

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [isConvexAuthenticated, isConvexAuthLoading, status, syncCurrentUser]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useConvexTokenAuth}>
        <AuthBootstrap />
        {children}
      </ConvexProviderWithAuth>
    </SessionProvider>
  );
}
