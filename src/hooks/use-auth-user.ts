"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Returns the authenticated Convex user and helper state for gated queries.
 */
export function useAuthUser() {
  const { status } = useSession();
  const user = useQuery(api.users.current, status === "authenticated" ? {} : "skip");

  const isLoading = status === "loading" || (status === "authenticated" && user === undefined);
  const isAuthenticated = status === "authenticated";
  const userId = user?._id ?? null;

  function authArgs<T extends Record<string, unknown>>(args: T): T | "skip" {
    if (!isAuthenticated || !userId) {
      return "skip";
    }
    return args;
  }

  return {
    userId,
    user,
    isLoading,
    isAuthenticated,
    authArgs,
  };
}
