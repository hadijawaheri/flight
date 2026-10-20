import { SetMetadata } from "@nestjs/common";

export const ALLOW_CROSS_SITE = "allowCrossSite";
// Only for endpoints another site must POST to by design, e.g. a payment gateway callback
// that verifies its own signature. Never for anything that trusts the session cookie alone.
export const AllowCrossSite = () => SetMetadata(ALLOW_CROSS_SITE, true);
