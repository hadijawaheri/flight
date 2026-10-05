import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { PassengerDto } from "@flysmart/contracts";
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
      const created = await this.passengerModel.create({ ...dto, userId: owner, isDefault });
      if (isDefault) await this.clearOtherDefaults(owner, created._id);
      return toPassengerDto(created.toObject());
    } catch (error: unknown) {
      if (isDuplicateKey(error)) {
        throw new AppException(409, "CONFLICT", "مسافری با این کد ملی قبلاً ذخیره شده است");
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdatePassengerDto): Promise<PassengerDto> {
    const owner = new Types.ObjectId(userId);
    const passengerId = parseObjectId(id, "PASSENGER_NOT_FOUND", NOT_FOUND);
    try {
      const updated = await this.passengerModel
        .findOneAndUpdate(
          { _id: passengerId, userId: owner },
          { $set: dto },
          { returnDocument: "after" },
        )
        .lean();
      if (!updated) throw new AppException(404, "PASSENGER_NOT_FOUND", NOT_FOUND);
      if (dto.isDefault) await this.clearOtherDefaults(owner, passengerId);
      return toPassengerDto(updated);
    } catch (error: unknown) {
      if (isDuplicateKey(error)) {
        throw new AppException(409, "CONFLICT", "مسافری با این کد ملی قبلاً ذخیره شده است");
      }
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
