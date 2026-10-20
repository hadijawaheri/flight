import type { PassengerDto } from "@flysmart/contracts";
import { isIranian, passengerIdentityIssues } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { parseObjectId } from "../../common/database/object-id.js";
import type { CreatePassengerDto, UpdatePassengerDto } from "./dto/passenger.dto.js";
import { toPassengerDto } from "./passengers.mapper.js";
import type { PassengerDocument } from "./schemas/passenger.schema.js";
import { Passenger } from "./schemas/passenger.schema.js";

export const MAX_SAVED_PASSENGERS = 30;
const DUPLICATE_KEY = 11000;

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === DUPLICATE_KEY
  );
}

const NOT_FOUND = "مسافر یافت نشد";

function duplicateMessage(error: unknown): string {
  const pattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return pattern && "passportNumber" in pattern
    ? "مسافری با این شماره گذرنامه قبلاً ذخیره شده است"
    : "مسافری با این کد ملی قبلاً ذخیره شده است";
}

@Injectable()
export class PassengersService {
  constructor(
    @InjectModel(Passenger.name) private readonly passengerModel: Model<PassengerDocument>,
  ) {}

  async list(userId: string): Promise<PassengerDto[]> {
    const passengers = await this.passengerModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: 1 })
      .lean();
    return passengers.map(toPassengerDto);
  }

  async create(userId: string, dto: CreatePassengerDto): Promise<PassengerDto> {
    const owner = new Types.ObjectId(userId);
    const count = await this.passengerModel.countDocuments({ userId: owner });
    if (count >= MAX_SAVED_PASSENGERS) {
      throw new AppException(
        409,
        "CONFLICT",
        `حداکثر ${MAX_SAVED_PASSENGERS} مسافر ذخیره‌شده مجاز است`,
      );
    }

    // The first saved traveler becomes the default so the booking form can prefill it
    const isDefault = dto.isDefault || count === 0;
    try {
      const created = await this.passengerModel.create({
        ...dto,
        firstNameFa: dto.firstNameFa ?? "",
        lastNameFa: dto.lastNameFa ?? "",
        // A foreigner's field can only hold junk, and a stored value would claim a national identity
        nationalId: isIranian(dto.nationality) ? (dto.nationalId ?? null) : null,
        userId: owner,
        isDefault,
      });
      if (isDefault) await this.clearOtherDefaults(owner, created._id);
      return toPassengerDto(created.toObject());
    } catch (error: unknown) {
      if (isDuplicateKey(error)) throw new AppException(409, "CONFLICT", duplicateMessage(error));
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdatePassengerDto): Promise<PassengerDto> {
    const owner = new Types.ObjectId(userId);
    const passengerId = parseObjectId(id, "PASSENGER_NOT_FOUND", NOT_FOUND);

    // The body is partial, so only the merged result can say whether the passenger is still
    // identifiable (an Iranian needs a national code, a foreigner a passport)
    const existing = await this.passengerModel.findOne({ _id: passengerId, userId: owner }).lean();
    if (!existing) throw new AppException(404, "PASSENGER_NOT_FOUND", NOT_FOUND);
    const nationality = dto.nationality ?? existing.nationality;
    const issues = passengerIdentityIssues({
      nationality,
      firstNameFa: dto.firstNameFa ?? existing.firstNameFa,
      lastNameFa: dto.lastNameFa ?? existing.lastNameFa,
      nationalId: dto.nationalId === undefined ? existing.nationalId : dto.nationalId,
      passportNumber:
        dto.passportNumber === undefined ? existing.passportNumber : dto.passportNumber,
      passportExpiry:
        dto.passportExpiry === undefined ? existing.passportExpiry : dto.passportExpiry,
    });
    const [first] = issues;
    if (first) throw new AppException(400, "VALIDATION_FAILED", first.message, issues);

    try {
      const updated = await this.passengerModel
        .findOneAndUpdate(
          { _id: passengerId, userId: owner },
          { $set: isIranian(nationality) ? dto : { ...dto, nationalId: null } },
          { returnDocument: "after" },
        )
        .lean();
      if (!updated) throw new AppException(404, "PASSENGER_NOT_FOUND", NOT_FOUND);
      if (dto.isDefault) await this.clearOtherDefaults(owner, passengerId);
      return toPassengerDto(updated);
    } catch (error: unknown) {
      if (isDuplicateKey(error)) throw new AppException(409, "CONFLICT", duplicateMessage(error));
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const owner = new Types.ObjectId(userId);
    const passengerId = parseObjectId(id, "PASSENGER_NOT_FOUND", NOT_FOUND);
    const removed = await this.passengerModel
      .findOneAndUpdate(
        { _id: passengerId, userId: owner },
        { $set: { deletedAt: new Date(), isDefault: false } },
      )
      .lean();
    if (!removed) throw new AppException(404, "PASSENGER_NOT_FOUND", NOT_FOUND);

    if (removed.isDefault) {
      const next = await this.passengerModel
        .findOne({ userId: owner })
        .sort({ createdAt: 1 })
        .lean();
      if (next)
        await this.passengerModel.updateOne({ _id: next._id }, { $set: { isDefault: true } });
    }
  }

  private async clearOtherDefaults(owner: Types.ObjectId, keep: Types.ObjectId): Promise<void> {
    await this.passengerModel.updateMany(
      { userId: owner, _id: { $ne: keep }, isDefault: true },
      { $set: { isDefault: false } },
    );
  }
}
