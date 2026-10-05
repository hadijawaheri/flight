process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-test-access-secret-0123";
process.env.OTP_HMAC_SECRET = "test-otp-secret-test-otp-secret-0123456";
process.env.OTP_FIXED_CODE = "123456";
process.env.THROTTLE_ENABLED ??= "false";
// Background sweepers would race with assertions on holds and alerts
process.env.ALERTS_WATCHER_ENABLED = "false";
process.env.BOOKING_EXPIRER_ENABLED = "false";
process.env.ANTHROPIC_API_KEY = "";
