import { describe, expect, it } from "bun:test";
import { shouldRedirectFromAuthRoute, shouldRequireSignIn } from "../../src/lib/route-access";

describe("middleware route access integration", () => {
  it("matches expected protection matrix", () => {
    const scenarios = [
      { path: "/", auth: false, signIn: true, awayFromAuth: false },
      { path: "/dictionary", auth: false, signIn: true, awayFromAuth: false },
      { path: "/child/123", auth: false, signIn: true, awayFromAuth: false },
      { path: "/auth/signin", auth: true, signIn: false, awayFromAuth: true },
      { path: "/auth/signin", auth: false, signIn: false, awayFromAuth: false },
      { path: "/robots.txt", auth: false, signIn: false, awayFromAuth: false },
    ];

    for (const scenario of scenarios) {
      expect(shouldRequireSignIn(scenario.path, scenario.auth)).toBe(scenario.signIn);
      expect(shouldRedirectFromAuthRoute(scenario.path, scenario.auth)).toBe(scenario.awayFromAuth);
    }
  });
});
