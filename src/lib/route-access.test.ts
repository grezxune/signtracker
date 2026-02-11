import { describe, expect, it } from "bun:test";
import {
  isAuthRoute,
  isProtectedPath,
  shouldRedirectFromAuthRoute,
  shouldRequireSignIn,
} from "./route-access";

describe("route access helpers", () => {
  it("detects protected and auth paths", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/child/abc")).toBe(true);
    expect(isProtectedPath("/dictionary")).toBe(true);
    expect(isProtectedPath("/public")).toBe(false);

    expect(isAuthRoute("/auth/signin")).toBe(true);
    expect(isAuthRoute("/auth/error?code=foo")).toBe(true);
    expect(isAuthRoute("/dictionary")).toBe(false);
  });

  it("returns redirect decisions based on auth state", () => {
    expect(shouldRedirectFromAuthRoute("/auth/signin", true)).toBe(true);
    expect(shouldRedirectFromAuthRoute("/auth/signin", false)).toBe(false);

    expect(shouldRequireSignIn("/", false)).toBe(true);
    expect(shouldRequireSignIn("/child/abc", false)).toBe(true);
    expect(shouldRequireSignIn("/public", false)).toBe(false);
    expect(shouldRequireSignIn("/", true)).toBe(false);
  });
});
