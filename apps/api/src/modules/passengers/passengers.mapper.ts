import type { PassengerDto } from "@flysmart/contracts";

import type { Passenger } from "./schemas/passenger.schema.js";

export function toPassengerDto(passenger: Passenger): PassengerDto {
  return {
    id: passenger._id.toString(),
    firstNameFa: passenger.firstNameFa,
    lastNameFa: passenger.lastNameFa,
    firstNameEn: passenger.firstNameEn,
    lastNameEn: passenger.lastNameEn,
    nationalId: passenger.nationalId,
    birthDate: passenger.birthDate,
    gender: passenger.gender,
    passportNumber: passenger.passportNumber,
    passportExpiry: passenger.passportExpiry,
    isDefault: passenger.isDefault,
    createdAt: passenger.createdAt.toISOString(),
    updatedAt: passenger.updatedAt.toISOString(),
  };
}
