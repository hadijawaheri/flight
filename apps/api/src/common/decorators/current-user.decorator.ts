import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import type { AuthedRequest, AuthUser } from "../types/auth.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().user;
  },
);

/** For @Public() routes that personalise the answer when a valid session happens to exist. */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    return ctx.switchToHttp().getRequest<Partial<AuthedRequest>>().user;
  },
);
