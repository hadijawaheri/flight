export abstract class SmsProvider {
  abstract sendOtp(mobile: string, code: string): Promise<void>;
  abstract sendNotification(mobile: string, message: string): Promise<void>;
}
