import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { COOKIE_NAMES } from "@flysmart/contracts";

import type { Env } from "../../config/env.js";
import { IS_PUBLIC } from "../decorators/public.decorator.js";
import type { AuthedRequest, JwtPayload } from "../types/auth.js";

function extractBearer(req: AuthedRequest): string | undefined {
  const [type, token] = req.headers.authorization?.split(" ") ?? [];
  return type === "Bearer" ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = cookies?.[COOKIE_NAMES.access] ?? extractBearer(req);

    if (isPublic) {
      if (token) {
        try {
          const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
            secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
          });
          req.user = { id: payload.sub, role: payload.role };
        } catch {
          // Public endpoint: an expired token simply means "anonymous"
        }
      }
      return true;
    }

    if (!token) throw new UnauthorizedException("لطفاً وارد حساب خود شوید");

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      });
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException("نشست شما منقضی شده است");
    }
  }
}
