import type { PriceAlertDto } from "@flysmart/contracts";

import type { PriceAlertDocument } from "./schemas/price-alert.schema.js";

export function toPriceAlertDto(doc: PriceAlertDocument): PriceAlertDto {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    origin: doc.origin,
    originName: doc.originName,
    destination: doc.destination,
    destinationName: doc.destinationName,
    targetMaxPrice: doc.targetMaxPrice,
    targetDate: doc.targetDate ?? undefined,
    currentLowestPrice: doc.currentLowestPrice,
    notifyViaSms: doc.notifyViaSms,
    isActive: doc.isActive,
    lastTriggeredAt: doc.lastTriggeredAt ? doc.lastTriggeredAt.toISOString() : undefined,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
}
