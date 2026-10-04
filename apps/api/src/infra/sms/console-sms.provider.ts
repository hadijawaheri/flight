import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

import { SmsProvider } from "./sms.provider.js";

@Injectable()
export class ConsoleSmsProvider extends SmsProvider {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  sendOtp(mobile: string, code: string): Promise<void> {
    // Dev only: env validation forbids this provider in production
    this.logger.info({ mobile, code }, "OTP (console provider)");
    return Promise.resolve();
  }

  sendNotification(mobile: string, message: string): Promise<void> {
    this.logger.info({ mobile, message }, "SMS Notification (console provider)");
    return Promise.resolve();
  }
}
