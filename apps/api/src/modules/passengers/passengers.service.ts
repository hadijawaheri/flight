import type { PassengerDto } from "@flysmart/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import type { CreatePassengerDto } from "./dto/create-passenger.dto.js";
import type { UpdatePassengerDto } from "./dto/update-passenger.dto.js";
import { toPassengerDto } from "./passengers.mapper.js";
import { Passenger, type PassengerDocument } from "./schemas/passenger.schema.js";

@Injectable()
export class PassengersService {
  constructor(
    @InjectModel(Passenger.name)
    private readonly passengerModel: Model<PassengerDocument>,
  ) {}

  async listByUser(userId: string): Promise<PassengerDto[]> {
    const docs = await this.passengerModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();

    return docs.map(toPassengerDto);
  }

  async getById(userId: string, passengerId: string): Promise<PassengerDto> {
    const doc = await this.passengerModel
      .findOne({
        _id: new Types.ObjectId(passengerId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();

    if (!doc) {
      throw new NotFoundException("مسافر مورد نظر یافت نشد");
    }

    return toPassengerDto(doc);
  }

  async create(userId: string, input: CreatePassengerDto): Promise<PassengerDto> {
    const userObjId = new Types.ObjectId(userId);

    // If this is marked as default, unset existing default
    if (input.isDefault) {
      await this.passengerModel.updateMany({ userId: userObjId }, { isDefault: false }).exec();
    }

    const created = await this.passengerModel.create({
      ...input,
      userId: userObjId,
    });

    return toPassengerDto(created);
  }

  async update(
    userId: string,
    passengerId: string,
    input: UpdatePassengerDto,
  ): Promise<PassengerDto> {
    const userObjId = new Types.ObjectId(userId);

    if (input.isDefault) {
      await this.passengerModel.updateMany({ userId: userObjId }, { isDefault: false }).exec();
    }

    const doc = await this.passengerModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(passengerId),
          userId: userObjId,
          deletedAt: null,
        },
        { $set: input },
        { new: true },
      )
      .exec();

    if (!doc) {
      throw new NotFoundException("مسافر مورد نظر یافت نشد");
    }

    return toPassengerDto(doc);
  }

  async delete(userId: string, passengerId: string): Promise<void> {
    const doc = await this.passengerModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(passengerId),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } },
      )
      .exec();

    if (!doc) {
      throw new NotFoundException("مسافر مورد نظر یافت نشد");
    }
  }
}
