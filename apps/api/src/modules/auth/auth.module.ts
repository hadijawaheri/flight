import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { Otp, OtpSchema } from "./schemas/otp.schema.js";
import { RefreshToken, RefreshTokenSchema } from "./schemas/refresh-token.schema.js";

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
