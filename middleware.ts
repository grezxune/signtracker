import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/auth";
import { shouldRedirectFromAuthRoute, shouldRequireSignIn } from "./src/lib/route-access";

function buildSignInRedirect(request: NextRequest) {
  const signInUrl = new URL("/auth/signin", request.url);
  const callback = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callback || "/");
  return NextResponse.redirect(signInUrl);
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(request.auth?.user);

  if (shouldRedirectFromAuthRoute(pathname, isAuthenticated)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (shouldRequireSignIn(pathname, isAuthenticated)) {
    return buildSignInRedirect(request);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
