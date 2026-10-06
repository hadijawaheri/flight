import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type { UserDto } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import type { JwtPayload } from "../../common/types/auth.js";
import type { Env } from "../../config/env.js";
import { SmsProvider } from "../../infra/sms/sms.provider.js";
import { UsersService } from "../users/users.service.js";
import type { SessionTokens } from "./auth.cookies.js";
import { ACCESS_TTL_MS, REFRESH_TTL_MS } from "./auth.cookies.js";
import type { OtpDocument } from "./schemas/otp.schema.js";
import { Otp } from "./schemas/otp.schema.js";
import type { RefreshTokenDocument } from "./schemas/refresh-token.schema.js";
import { RefreshToken } from "./schemas/refresh-token.schema.js";

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_COOLDOWN_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
// Parallel requests (RSC prefetch, several tabs) can present the same refresh token at once
const REFRESH_REUSE_GRACE_MS = 10 * 1000;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshModel: Model<RefreshTokenDocument>,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: SmsProvider,
  ) {}

  async requestOtp(mobile: string): Promise<void> {
    const now = Date.now();
    const existing = await this.otpModel.findOne({ mobile }).lean();
    if (existing && now - existing.sentAt.getTime() < OTP_COOLDOWN_MS) {
      throw new AppException(429, "RATE_LIMITED", "برای دریافت کد جدید کمی صبر کنید");
    }

    const code =
      this.config.get("OTP_FIXED_CODE", { infer: true }) ??
      randomInt(100_000, 1_000_000).toString();
    await this.otpModel.findOneAndUpdate(
      { mobile },
      {
        $set: {
          codeHash: this.hashOtp(mobile, code),
          sentAt: new Date(now),
          expiresAt: new Date(now + OTP_TTL_MS),
          attempts: 0,
        },
      },
      { upsert: true },
    );

    try {
      await this.sms.sendOtp(mobile, code);
    } catch (error) {
      await this.otpModel.deleteOne({ mobile });
      throw error;
    }
  }

  async verifyOtp(mobile: string, code: string): Promise<{ user: UserDto; tokens: SessionTokens }> {
    // Increment first so concurrent guesses cannot exceed the attempt limit
    const otp = await this.otpModel
      .findOneAndUpdate({ mobile }, { $inc: { attempts: 1 } }, { returnDocument: "after" })
      .lean();
    if (!otp || otp.expiresAt.getTime() < Date.now() || otp.attempts > OTP_MAX_ATTEMPTS) {
      throw new AppException(400, "OTP_EXPIRED", "کد تأیید منقضی شده است؛ کد جدید بگیرید");
    }

    const candidate = Buffer.from(this.hashOtp(mobile, code));
    const stored = Buffer.from(otp.codeHash);
    if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
      throw new AppException(400, "OTP_INVALID", "کد تأیید نادرست است");
    }

    await this.otpModel.deleteOne({ mobile });
    const user = await this.usersService.findOrCreateByMobile(mobile);
    return { user, tokens: await this.issueSession(user, randomUUID()) };
  }

  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    const unauthenticated = () =>
      new AppException(401, "UNAUTHENTICATED", "نشست شما منقضی شده است");
    if (!refreshToken) throw unauthenticated();

    const tokenHash = sha256(refreshToken);
    const now = new Date();

    // Atomic rotate: only one concurrent caller wins the revokedAt flip
    const rotated = await this.refreshModel
      .findOneAndUpdate(
        { tokenHash, revokedAt: null, familyRevoked: false, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { returnDocument: "after" },
      )
      .lean();

    let userId: string;
    let familyId: string;

    if (rotated) {
      userId = rotated.userId.toString();
      familyId = rotated.familyId;
    } else {
      const previous = await this.refreshModel.findOne({ tokenHash }).lean();
      if (!previous || previous.expiresAt < now || previous.familyRevoked) throw unauthenticated();

      const withinGrace =
        previous.revokedAt !== null &&
        now.getTime() - previous.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
      if (!withinGrace) {
        // Reuse of a rotated token outside the grace window means the token leaked
        await this.revokeFamily(previous.familyId);
        throw unauthenticated();
      }
      userId = previous.userId.toString();
      familyId = previous.familyId;
    }

    const user = await this.usersService.getById(userId).catch(() => {
      throw unauthenticated();
    });
    return this.issueSession(user, familyId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const token = await this.refreshModel.findOne({ tokenHash: sha256(refreshToken) }).lean();
    if (token) await this.revokeFamily(token.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshModel.updateMany(
      { familyId },
      { $set: { familyRevoked: true, revokedAt: new Date() } },
    );
  }

  private async issueSession(user: UserDto, familyId: string): Promise<SessionTokens> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
    });

    const refreshToken = randomBytes(32).toString("base64url");
    await this.refreshModel.create({
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return { accessToken, refreshToken };
  }

  private hashOtp(mobile: string, code: string): string {
    return createHmac("sha256", this.config.get("OTP_HMAC_SECRET", { infer: true }))
      .update(`${mobile}:${code}`)
      .digest("hex");
  }
}
