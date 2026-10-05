import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { ApiResponse, UserDto } from "@flysmart/contracts";
import { COOKIE_NAMES } from "@flysmart/contracts";
import type { Request, Response } from "express";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import type { Env } from "../../config/env.js";
import { UsersService } from "../users/users.service.js";
import { clearSessionCookies, setSessionCookies } from "./auth.cookies.js";
import { AuthService } from "./auth.service.js";
import { RequestOtpDto, VerifyOtpDto } from "./dto/auth.dto.js";

function refreshCookieOf(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[COOKIE_NAMES.refresh];
}

@Controller({ path: "auth", version: "1" })
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    config: ConfigService<Env, true>,
  ) {
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("otp/request")
  @HttpCode(204)
  async requestOtp(@Body() dto: RequestOtpDto): Promise<void> {
    await this.authService.requestOtp(dto.mobile);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("otp/verify")
  @HttpCode(200)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<{ user: UserDto }>> {
    const { user, tokens } = await this.authService.verifyOtp(dto.mobile, dto.code);
    setSessionCookies(res, tokens, this.isProd);
    return { data: { user } };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  @HttpCode(204)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      const tokens = await this.authService.refresh(refreshCookieOf(req));
      setSessionCookies(res, tokens, this.isProd);
    } catch (error: unknown) {
      clearSessionCookies(res, this.isProd);
      throw error;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(refreshCookieOf(req));
    clearSessionCookies(res, this.isProd);
  }

  @Get("me")
  async me(@CurrentUser() user: AuthUser): Promise<ApiResponse<{ user: UserDto }>> {
    return { data: { user: await this.usersService.getById(user.id) } };
  }
}
