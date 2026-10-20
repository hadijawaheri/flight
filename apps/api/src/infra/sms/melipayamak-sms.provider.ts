import { PinoLogger } from "nestjs-pino";

import { SmsProvider } from "./sms.provider.js";

const BASE_URL = "https://console.melipayamak.com/api/send";
const TIMEOUT_MS = 10_000;

export interface MelipayamakOptions {
  apiKey: string;
  /** Approved pattern ("shared" service) whose only variable is the code. */
  otpBodyId: number;
  /** Dedicated line for free-text notifications; without it they are logged and skipped. */
  from: string | undefined;
}

interface MelipayamakResponse {
  recId?: number;
  status?: string;
}

/**
 * Melipayamak console REST API. OTPs go through an approved pattern because Iranian operators
 * filter free-text OTP messages; a recId above 1000 means the message was accepted.
 */
export class MelipayamakSmsProvider extends SmsProvider {
  constructor(
    private readonly options: MelipayamakOptions,
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async sendOtp(mobile: string, code: string): Promise<void> {
    await this.post("shared", { bodyId: this.options.otpBodyId, to: mobile, args: [code] });
  }

  async sendNotification(mobile: string, message: string): Promise<void> {
    if (!this.options.from) {
      this.logger.warn({ mobile }, "SMS notification skipped: MELIPAYAMAK_FROM is not set");
      return;
    }
    await this.post("simple", { from: this.options.from, to: mobile, text: message });
  }

  private async post(service: "shared" | "simple", body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${BASE_URL}/${service}/${this.options.apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = (await response.json().catch(() => ({}))) as MelipayamakResponse;
    if (!response.ok || (result.recId ?? 0) <= 1000) {
      // The key is part of the URL, so only the status goes to the log
      this.logger.error({ status: response.status, result }, "Melipayamak rejected the SMS");
      throw new Error(`SMS was not sent (${result.status ?? response.status})`);
    }
  }
}
