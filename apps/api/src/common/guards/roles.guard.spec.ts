import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RolesGuard } from "./roles.guard.js";

function contextWith(role: string, required?: string[]) {
  const reflector = new Reflector();
  vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(required);
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: "1", role } }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe("RolesGuard", () => {
  it("allows routes without required roles", () => {
    const { guard, ctx } = contextWith("user");
    expect(guard.canActivate(ctx)).toBe(true);
  });
  it("allows a matching role", () => {
    const { guard, ctx } = contextWith("admin", ["admin"]);
    expect(guard.canActivate(ctx)).toBe(true);
  });
  it("forbids a non-matching role", () => {
    const { guard, ctx } = contextWith("user", ["admin"]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
