/** The variables of a price-alert text; each provider decides how to word or template them. */
export interface PriceAlertSms {
  /** e.g. "تهران به مشهد" */
  route: string;
  /** Jalali flight date, e.g. "۲۰ آبان" */
  date: string;
  /** e.g. "۱٬۸۵۰٬۰۰۰ تومان" */
  price: string;
}

/** SENT: the operator accepted it. SKIPPED: this deployment has no channel for alert texts. */
export type SmsDelivery = "SENT" | "SKIPPED";

export abstract class SmsProvider {
  abstract sendOtp(mobile: string, code: string): Promise<void>;
  abstract sendPriceAlert(mobile: string, alert: PriceAlertSms): Promise<SmsDelivery>;
}

export function priceAlertText(alert: PriceAlertSms): string {
  return `پرواز پلاس: بلیت ${alert.route} برای ${alert.date} به ${alert.price} رسید. برای خرید وارد سایت شوید.`;
}
