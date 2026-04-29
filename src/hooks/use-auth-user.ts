"use client";

import { useSession } from "next-auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Returns the authenticated Convex user and helper state for gated queries.
 */
export function useAuthUser() {
  const { status } = useSession();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.current, status === "authenticated" && isConvexAuthenticated ? {} : "skip");

  const isLoading =
    status === "loading" ||
    (status === "authenticated" && (isConvexAuthLoading || user === undefined));
  const isAuthenticated = status === "authenticated" && isConvexAuthenticated;
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
