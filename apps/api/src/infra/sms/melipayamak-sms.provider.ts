import { PinoLogger } from "nestjs-pino";

import type { PriceAlertSms, SmsDelivery } from "./sms.provider.js";
import { priceAlertText, SmsProvider } from "./sms.provider.js";

const BASE_URL = "https://console.melipayamak.com/api/send";
const TIMEOUT_MS = 10_000;

export interface MelipayamakOptions {
  apiKey: string;
  /** Approved pattern ("shared" service) whose only variable is the code. */
  otpBodyId: number;
  /**
   * Approved pattern for price alerts with three variables in this order: route, date, price.
   * Preferred: operators deliver patterns from the shared line and do not filter them.
   */
  alertBodyId: number | undefined;
  /** Dedicated line for a free-text alert when no pattern is approved yet. */
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

  async sendPriceAlert(mobile: string, alert: PriceAlertSms): Promise<SmsDelivery> {
    if (this.options.alertBodyId) {
      await this.post("shared", {
        bodyId: this.options.alertBodyId,
        to: mobile,
        args: [alert.route, alert.date, alert.price],
      });
      return "SENT";
    }
    if (this.options.from) {
      await this.post("simple", {
        from: this.options.from,
        to: mobile,
        text: priceAlertText(alert),
      });
      return "SENT";
    }
    this.logger.warn(
      "Price alert SMS skipped: set MELIPAYAMAK_ALERT_BODY_ID (or MELIPAYAMAK_FROM)",
    );
    return "SKIPPED";
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
