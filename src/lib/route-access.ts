export const AUTH_ROUTES = ["/auth/signin", "/auth/error"] as const;
export const PROTECTED_PREFIXES = ["/", "/child", "/dictionary"] as const;

export function isProtectedPath(pathname: string) {
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some((prefix) => prefix !== "/" && pathname.startsWith(prefix));
}

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export function shouldRedirectFromAuthRoute(pathname: string, isAuthenticated: boolean) {
  return isAuthenticated && isAuthRoute(pathname);
}

export function shouldRequireSignIn(pathname: string, isAuthenticated: boolean) {
  return !isAuthenticated && isProtectedPath(pathname);
}
