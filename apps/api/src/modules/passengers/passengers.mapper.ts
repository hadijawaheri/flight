import type { PassengerDto } from "@flysmart/contracts";

import type { PassengerDocument } from "./schemas/passenger.schema.js";

export function toPassengerDto(doc: PassengerDocument): PassengerDto {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    firstNameFa: doc.firstNameFa,
    lastNameFa: doc.lastNameFa,
    firstNameEn: doc.firstNameEn,
    lastNameEn: doc.lastNameEn,
    nationalId: doc.nationalId,
    birthDate: doc.birthDate,
    gender: doc.gender,
    passengerType: doc.passengerType,
    passportNumber: doc.passportNumber ?? null,
    passportExpiry: doc.passportExpiry ?? null,
    isDefault: doc.isDefault ?? false,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}
